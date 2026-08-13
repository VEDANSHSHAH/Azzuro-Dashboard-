mod commands;
mod secrets;
mod storage;

use std::sync::Arc;

use secrets::SecretStore;
use storage::LegacyStateStore;
use tauri::Manager;

const DATABASE_FILE_NAME: &str = "mywork-azzuro.sqlite3";

pub(crate) struct NativeState {
    pub(crate) legacy_state_store: Option<Arc<LegacyStateStore>>,
    pub(crate) secret_store: Arc<SecretStore>,
}

impl NativeState {
    fn new(legacy_state_store: Option<LegacyStateStore>) -> Self {
        Self {
            legacy_state_store: legacy_state_store.map(Arc::new),
            secret_store: Arc::new(SecretStore::new()),
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let legacy_state_store =
                LegacyStateStore::open_if_present(app_data_dir.join(DATABASE_FILE_NAME))?;
            app.manage(NativeState::new(legacy_state_store));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_state,
            commands::set_secret,
            commands::get_secret,
            commands::delete_secret,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run MYWORK AZZURO");
}
