#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      resize_for_modal,
      resize_to_toolbar,
      capture_fullscreen,
      get_window_sources,
      capture_window,
      open_overlay,
      open_image_file,
      new_canvas_create,
      select_batch_files,
      select_output_dir,
      select_watermark_image,
      batch_convert,
      open_permission_settings,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

// ── Toolbar IPC stubs ──────────────────────────────────────────────────────

#[tauri::command]
async fn resize_for_modal(_width: u32, _height: u32) -> Result<(), String> {
  Ok(())
}

#[tauri::command]
async fn resize_to_toolbar() -> Result<(), String> {
  Ok(())
}

#[tauri::command]
async fn capture_fullscreen() -> Result<serde_json::Value, String> {
  Ok(serde_json::json!({ "awaitingSelection": false, "error": "not implemented" }))
}

#[tauri::command]
async fn get_window_sources() -> Result<Vec<serde_json::Value>, String> {
  Ok(vec![])
}

#[tauri::command]
async fn capture_window(_source_id: String) -> Result<serde_json::Value, String> {
  Ok(serde_json::json!({ "error": "not implemented" }))
}

#[tauri::command]
async fn open_overlay() -> Result<(), String> {
  Ok(())
}

#[tauri::command]
async fn open_image_file() -> Result<(), String> {
  Ok(())
}

#[tauri::command]
async fn new_canvas_create(_width: u32, _height: u32, _bg: String) -> Result<(), String> {
  Ok(())
}

#[tauri::command]
async fn select_batch_files() -> Result<Vec<String>, String> {
  Ok(vec![])
}

#[tauri::command]
async fn select_output_dir() -> Result<String, String> {
  Ok(String::new())
}

#[tauri::command]
async fn select_watermark_image() -> Result<String, String> {
  Ok(String::new())
}

#[tauri::command]
async fn batch_convert(_payload: serde_json::Value) -> Result<serde_json::Value, String> {
  Ok(serde_json::json!({ "ok": 0, "err": 0 }))
}

#[tauri::command]
async fn open_permission_settings() -> Result<(), String> {
  Ok(())
}
