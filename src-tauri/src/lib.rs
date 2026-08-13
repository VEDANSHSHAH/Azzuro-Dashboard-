mod commands;
mod secrets;
mod storage;

use std::sync::Arc;

use secrets::SecretStore;
use storage::StateStore;
use tauri::Manager;

const DATABASE_FILE_NAME: &str = "mywork-azzuro.sqlite3";

pub(crate) struct NativeState {
    pub(crate) state_store: Arc<StateStore>,
    pub(crate) secret_store: Arc<SecretStore>,
}

impl NativeState {
    fn new(state_store: StateStore) -> Self {
        Self {
            state_store: Arc::new(state_store),
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
            std::fs::create_dir_all(&app_data_dir)?;

            let state_store = StateStore::open(app_data_dir.join(DATABASE_FILE_NAME))?;
            app.manage(NativeState::new(state_store));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_state,
            commands::save_state,
            commands::set_secret,
            commands::get_secret,
            commands::delete_secret,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run MYWORK AZZURO");
}
