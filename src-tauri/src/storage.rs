use std::{
    path::Path,
    sync::{Mutex, MutexGuard},
    time::Duration,
};

use rusqlite::{params, Connection};
use serde_json::Value;

const MAX_STATE_BYTES: usize = 16 * 1024 * 1024;
const INITIAL_STATE: &str = "{}";

pub(crate) struct StateStore {
    connection: Mutex<Connection>,
}

impl StateStore {
    pub(crate) fn open(path: impl AsRef<Path>) -> rusqlite::Result<Self> {
        let connection = Connection::open(path)?;
        connection.busy_timeout(Duration::from_secs(5))?;
        connection.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;
             PRAGMA secure_delete = ON;

             CREATE TABLE IF NOT EXISTS app_state (
                 id INTEGER PRIMARY KEY CHECK (id = 1),
                 schema_version INTEGER NOT NULL,
                 state_json TEXT NOT NULL,
                 updated_at TEXT NOT NULL
             );

             PRAGMA user_version = 1;",
        )?;

        connection.execute(
            "INSERT OR IGNORE INTO app_state (id, schema_version, state_json, updated_at)
             VALUES (1, 1, ?1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
            params![INITIAL_STATE],
        )?;

        Ok(Self {
            connection: Mutex::new(connection),
        })
    }

    pub(crate) fn load(&self) -> Result<Value, String> {
        let connection = self.connection()?;
        let json = connection
            .query_row("SELECT state_json FROM app_state WHERE id = 1", [], |row| {
                row.get::<_, String>(0)
            })
            .map_err(|error| format!("Could not read the local workspace: {error}"))?;

        serde_json::from_str(&json)
            .map_err(|error| format!("The saved workspace data is not valid JSON: {error}"))
    }

    pub(crate) fn save(&self, state: &Value) -> Result<(), String> {
        validate_state(state)?;

        let json = serde_json::to_string(state)
            .map_err(|error| format!("Could not prepare the workspace for saving: {error}"))?;

        if json.len() > MAX_STATE_BYTES {
            return Err("The workspace is too large to save (16 MB maximum).".to_owned());
        }

        let connection = self.connection()?;
        connection
            .execute(
                "INSERT INTO app_state (id, schema_version, state_json, updated_at)
                 VALUES (1, 1, ?1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
                 ON CONFLICT(id) DO UPDATE SET
                     schema_version = excluded.schema_version,
                     state_json = excluded.state_json,
                     updated_at = excluded.updated_at",
                params![json],
            )
            .map_err(|error| format!("Could not save the local workspace: {error}"))?;

        Ok(())
    }

    fn connection(&self) -> Result<MutexGuard<'_, Connection>, String> {
        self.connection
            .lock()
            .map_err(|_| "The local workspace database is temporarily unavailable.".to_owned())
    }
}

fn validate_state(state: &Value) -> Result<(), String> {
    if !state.is_object() {
        return Err("The workspace state must be a JSON object.".to_owned());
    }

    reject_plaintext_secrets(state, "$")
}

fn reject_plaintext_secrets(value: &Value, path: &str) -> Result<(), String> {
    match value {
        Value::Object(object) => {
            for (key, child) in object {
                if child.is_string() && is_plaintext_secret_key(key) {
                    return Err(format!(
                        "Refusing to save a plaintext secret at {path}.{key}. Use set_secret instead."
                    ));
                }

                let child_path = format!("{path}.{key}");
                reject_plaintext_secrets(child, &child_path)?;
            }
        }
        Value::Array(items) => {
            for (index, child) in items.iter().enumerate() {
                let child_path = format!("{path}[{index}]");
                reject_plaintext_secrets(child, &child_path)?;
            }
        }
        _ => {}
    }

    Ok(())
}

fn is_plaintext_secret_key(key: &str) -> bool {
    let normalized: String = key
        .chars()
        .filter(|character| character.is_ascii_alphanumeric())
        .map(|character| character.to_ascii_lowercase())
        .collect();

    matches!(
        normalized.as_str(),
        "password"
            | "secret"
            | "passwordvalue"
            | "secretvalue"
            | "plaintextpassword"
            | "plaintextsecret"
            | "credentialpassword"
            | "linkpassword"
    )
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::validate_state;

    #[test]
    fn accepts_secret_references_and_password_flags() {
        let state = json!({
            "links": [{
                "secretId": "link-42",
                "hasPassword": true,
                "passwordUpdatedAt": "2026-08-12T10:00:00Z"
            }]
        });

        assert!(validate_state(&state).is_ok());
    }

    #[test]
    fn rejects_nested_plaintext_passwords() {
        let state = json!({"links": [{"password": "do-not-store-this"}]});

        assert!(validate_state(&state).is_err());
    }
}
