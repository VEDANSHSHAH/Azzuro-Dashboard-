use std::{
    path::Path,
    sync::{Mutex, MutexGuard},
    time::Duration,
};

use rusqlite::{Connection, OpenFlags};
use serde_json::Value;

/// Read-only importer for workspaces created by MYWORK AZZURO 0.4 and earlier.
/// New desktop builds never create or write this SQLite file; Supabase Postgres
/// is the durable workspace store from 0.5 onward.
pub(crate) struct LegacyStateStore {
    connection: Mutex<Connection>,
}

impl LegacyStateStore {
    pub(crate) fn open_if_present(path: impl AsRef<Path>) -> rusqlite::Result<Option<Self>> {
        let path = path.as_ref();
        if !path.is_file() {
            return Ok(None);
        }

        let connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;
        connection.busy_timeout(Duration::from_secs(5))?;

        Ok(Some(Self {
            connection: Mutex::new(connection),
        }))
    }

    pub(crate) fn load(&self) -> Result<Value, String> {
        let connection = self.connection()?;
        let json = connection
            .query_row("SELECT state_json FROM app_state WHERE id = 1", [], |row| {
                row.get::<_, String>(0)
            })
            .map_err(|error| format!("Could not read the legacy local workspace: {error}"))?;

        serde_json::from_str(&json)
            .map_err(|error| format!("The legacy workspace data is not valid JSON: {error}"))
    }

    fn connection(&self) -> Result<MutexGuard<'_, Connection>, String> {
        self.connection
            .lock()
            .map_err(|_| "The legacy workspace is temporarily unavailable.".to_owned())
    }
}
