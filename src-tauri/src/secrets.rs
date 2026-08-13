use std::sync::Mutex;

use zeroize::Zeroize;

const MAX_SECRET_ID_BYTES: usize = 128;
const MAX_SECRET_BYTES: usize = 2_048;

pub(crate) struct SecretStore {
    gate: Mutex<()>,
}

impl SecretStore {
    pub(crate) fn new() -> Self {
        Self {
            gate: Mutex::new(()),
        }
    }

    pub(crate) fn set(&self, secret_id: &str, mut secret: String) -> Result<(), String> {
        let result = (|| {
            validate_secret_id(secret_id)?;

            if secret.is_empty() {
                return Err("A password cannot be empty; delete it instead.".to_owned());
            }
            if secret.len() > MAX_SECRET_BYTES {
                return Err("The password is too large for secure storage.".to_owned());
            }

            self.with_lock(|| platform::set(secret_id, &secret))
        })();

        secret.zeroize();
        result
    }

    pub(crate) fn get(&self, secret_id: &str) -> Result<Option<String>, String> {
        validate_secret_id(secret_id)?;
        self.with_lock(|| platform::get(secret_id))
    }

    pub(crate) fn delete(&self, secret_id: &str) -> Result<(), String> {
        validate_secret_id(secret_id)?;
        self.with_lock(|| platform::delete(secret_id))
    }

    fn with_lock<T>(&self, operation: impl FnOnce() -> Result<T, String>) -> Result<T, String> {
        let _guard = self
            .gate
            .lock()
            .map_err(|_| "Secure credential storage is temporarily unavailable.".to_owned())?;
        operation()
    }
}

fn validate_secret_id(secret_id: &str) -> Result<(), String> {
    if secret_id.is_empty() || secret_id.len() > MAX_SECRET_ID_BYTES {
        return Err("The secret ID must contain between 1 and 128 characters.".to_owned());
    }

    if !secret_id
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':'))
    {
        return Err(
            "The secret ID may only contain letters, numbers, dashes, underscores, dots, and colons."
                .to_owned(),
        );
    }

    Ok(())
}

#[cfg(target_os = "windows")]
mod platform {
    use keyring::{Entry, Error};

    const SERVICE_NAME: &str = "com.azzuro.mywork.links";

    pub(super) fn set(secret_id: &str, secret: &str) -> Result<(), String> {
        entry(secret_id)?
            .set_password(secret)
            .map_err(|error| credential_error("save", error))
    }

    pub(super) fn get(secret_id: &str) -> Result<Option<String>, String> {
        match entry(secret_id)?.get_password() {
            Ok(secret) => Ok(Some(secret)),
            Err(Error::NoEntry) => Ok(None),
            Err(error) => Err(credential_error("read", error)),
        }
    }

    pub(super) fn delete(secret_id: &str) -> Result<(), String> {
        match entry(secret_id)?.delete_credential() {
            Ok(()) | Err(Error::NoEntry) => Ok(()),
            Err(error) => Err(credential_error("delete", error)),
        }
    }

    fn entry(secret_id: &str) -> Result<Entry, String> {
        Entry::new(SERVICE_NAME, secret_id).map_err(|error| credential_error("open", error))
    }

    fn credential_error(action: &str, error: Error) -> String {
        format!("Could not {action} the password in Windows Credential Manager: {error}")
    }
}

#[cfg(not(target_os = "windows"))]
mod platform {
    const UNSUPPORTED: &str =
        "Secure password storage is currently available only in the Windows desktop build.";

    pub(super) fn set(_secret_id: &str, _secret: &str) -> Result<(), String> {
        Err(UNSUPPORTED.to_owned())
    }

    pub(super) fn get(_secret_id: &str) -> Result<Option<String>, String> {
        Err(UNSUPPORTED.to_owned())
    }

    pub(super) fn delete(_secret_id: &str) -> Result<(), String> {
        Err(UNSUPPORTED.to_owned())
    }
}

#[cfg(test)]
mod tests {
    use super::validate_secret_id;

    #[test]
    fn accepts_uuid_style_ids() {
        assert!(validate_secret_id("link:62fb4660-40b2-4bee-a98f-68f4dcdd537d").is_ok());
    }

    #[test]
    fn rejects_ids_that_could_be_ambiguous() {
        assert!(validate_secret_id("link id/with spaces").is_err());
    }
}
