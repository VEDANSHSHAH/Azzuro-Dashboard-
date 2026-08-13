use std::sync::Arc;

use serde_json::Value;
use tauri::State;

use crate::NativeState;

type CommandResult<T> = Result<T, String>;

fn task_failed(error: impl std::fmt::Display) -> String {
    format!("The native operation could not be completed: {error}")
}

#[tauri::command]
pub async fn load_state(native_state: State<'_, NativeState>) -> CommandResult<Value> {
    let store = Arc::clone(&native_state.state_store);

    tauri::async_runtime::spawn_blocking(move || store.load())
        .await
        .map_err(task_failed)?
}

#[tauri::command]
pub async fn save_state(state: Value, native_state: State<'_, NativeState>) -> CommandResult<()> {
    let store = Arc::clone(&native_state.state_store);

    tauri::async_runtime::spawn_blocking(move || store.save(&state))
        .await
        .map_err(task_failed)?
}

#[tauri::command(rename_all = "camelCase")]
pub async fn set_secret(
    secret_id: String,
    secret: String,
    native_state: State<'_, NativeState>,
) -> CommandResult<()> {
    let store = Arc::clone(&native_state.secret_store);

    tauri::async_runtime::spawn_blocking(move || store.set(&secret_id, secret))
        .await
        .map_err(task_failed)?
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_secret(
    secret_id: String,
    native_state: State<'_, NativeState>,
) -> CommandResult<Option<String>> {
    let store = Arc::clone(&native_state.secret_store);

    tauri::async_runtime::spawn_blocking(move || store.get(&secret_id))
        .await
        .map_err(task_failed)?
}

#[tauri::command(rename_all = "camelCase")]
pub async fn delete_secret(
    secret_id: String,
    native_state: State<'_, NativeState>,
) -> CommandResult<()> {
    let store = Arc::clone(&native_state.secret_store);

    tauri::async_runtime::spawn_blocking(move || store.delete(&secret_id))
        .await
        .map_err(task_failed)?
}
