use tauri::Manager;
use tauri::Emitter;
use tauri::window::Color;
use tauri_plugin_dialog::DialogExt;

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
      // Explicitly clear WebView background — transparent:true alone is insufficient on macOS
      if let Some(win) = app.get_webview_window("toolbar") {
        let _ = win.set_background_color(Some(Color(0, 0, 0, 0)));
      }

      // macOS: allow CSS :hover without focus — NSWindow must accept mouse moved events
      #[cfg(target_os = "macos")]
      if let Some(win) = app.get_webview_window("toolbar") {
        let _ = win.with_webview(|wv| unsafe {
          use objc::{msg_send, sel, sel_impl};
          use objc::runtime::YES;
          let ns_win = wv.ns_window() as *mut objc::runtime::Object;
          let _: () = msg_send![ns_win, setAcceptsMouseMovedEvents: YES];
        });
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
    .plugin(tauri_plugin_dialog::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

// ── Toolbar IPC stubs ──────────────────────────────────────────────────────

#[tauri::command]
async fn resize_for_modal(app: tauri::AppHandle, width: u32, height: u32) -> Result<(), String> {
  if let Some(win) = app.get_webview_window("toolbar") {
    win.set_size(tauri::Size::Logical(tauri::LogicalSize { width: width as f64, height: height as f64 }))
      .map_err(|e: tauri::Error| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
async fn resize_to_toolbar(app: tauri::AppHandle) -> Result<(), String> {
  if let Some(win) = app.get_webview_window("toolbar") {
    win.set_size(tauri::Size::Logical(tauri::LogicalSize { width: 520.0, height: 68.0 }))
      .map_err(|e: tauri::Error| e.to_string())?;
  }
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
async fn open_image_file(app: tauri::AppHandle) -> Result<(), String> {
  let (tx, rx) = tokio::sync::oneshot::channel();
  app.dialog()
    .file()
    .add_filter("Images", &["png", "jpg", "jpeg", "gif", "bmp", "webp", "tiff"])
    .pick_file(move |path| { let _ = tx.send(path); });
  if let Some(p) = rx.await.map_err(|e| e.to_string())? {
    // TODO: open editor window — emit event for now
    app.emit("open-image-result", p.to_string()).ok();
  }
  Ok(())
}

#[tauri::command]
async fn new_canvas_create(_width: u32, _height: u32, _bg: String) -> Result<(), String> {
  Ok(())
}

#[tauri::command]
async fn select_batch_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
  let (tx, rx) = tokio::sync::oneshot::channel();
  app.dialog()
    .file()
    .add_filter("Images", &["png", "jpg", "jpeg", "gif", "bmp", "webp", "tiff"])
    .pick_files(move |paths| { let _ = tx.send(paths); });
  let result = rx.await.map_err(|e| e.to_string())?;
  Ok(result.unwrap_or_default()
    .into_iter()
    .take(100)
    .map(|p| p.to_string())
    .collect())
}

#[tauri::command]
async fn select_output_dir(app: tauri::AppHandle) -> Result<String, String> {
  let (tx, rx) = tokio::sync::oneshot::channel();
  app.dialog()
    .file()
    .pick_folder(move |path| { let _ = tx.send(path); });
  let result = rx.await.map_err(|e| e.to_string())?;
  Ok(result.map(|p| p.to_string()).unwrap_or_default())
}

#[tauri::command]
async fn select_watermark_image(app: tauri::AppHandle) -> Result<String, String> {
  let (tx, rx) = tokio::sync::oneshot::channel();
  app.dialog()
    .file()
    .add_filter("Images", &["png", "jpg", "jpeg", "gif", "bmp", "webp"])
    .pick_file(move |path| { let _ = tx.send(path); });
  let result = rx.await.map_err(|e| e.to_string())?;
  Ok(result.map(|p| p.to_string()).unwrap_or_default())
}

#[tauri::command]
async fn batch_convert(app: tauri::AppHandle, payload: serde_json::Value) -> Result<Vec<serde_json::Value>, String> {
  let files: Vec<String> = payload["files"]
    .as_array().ok_or("missing files")?
    .iter().filter_map(|v| v.as_str().map(String::from)).collect();

  let format       = payload["format"].as_str().unwrap_or("png").to_lowercase();
  let quality      = payload["quality"].as_u64().unwrap_or(90) as u8;
  let output_mode  = payload["outputMode"].as_str().unwrap_or("same").to_string();
  let output_dir   = payload["outputDir"].as_str().map(String::from);
  let delete_orig  = payload["deleteOriginals"].as_bool().unwrap_or(false);
  let resize_val   = payload.get("resize").cloned();

  let mut results = Vec::new();
  let total = files.len();

  for (idx, file_path) in files.iter().enumerate() {
    let src  = std::path::Path::new(file_path.as_str());
    let ext  = format_ext(&format);
    let stem = src.file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_default();
    let new_name = format!("{}.{}", stem, ext);

    let out_path = match output_mode.as_str() {
      "custom" => {
        let dir = output_dir.as_deref()
          .filter(|d| !d.is_empty())
          .unwrap_or_else(|| src.parent().and_then(|p| p.to_str()).unwrap_or("."));
        std::path::PathBuf::from(dir).join(&new_name)
      }
      _ => src.parent().map(|p| p.join(&new_name))
               .unwrap_or_else(|| std::path::PathBuf::from(&new_name)),
    };

    let mut r = match convert_single(src, &out_path, &format, quality, &resize_val) {
      Ok(()) => {
        if delete_orig && src.to_string_lossy() != out_path.to_string_lossy() {
          let _ = std::fs::remove_file(src);
        }
        serde_json::json!({ "success": true,  "path": file_path, "outPath": out_path.to_string_lossy() })
      }
      Err(e) => serde_json::json!({ "success": false, "path": file_path, "error": e }),
    };

    r["done"]  = serde_json::json!(idx + 1);
    r["total"] = serde_json::json!(total);
    app.emit("batch-progress", &r).ok();
    results.push(r);
  }

  Ok(results)
}

fn format_ext(fmt: &str) -> &'static str {
  match fmt { "jpg" | "jpeg" => "jpg", "png" => "png", "webp" => "webp",
              "bmp" => "bmp", "gif" => "gif", "tiff" | "tif" => "tiff", _ => "png" }
}

fn convert_single(
  src: &std::path::Path, dst: &std::path::Path,
  format: &str, quality: u8, resize: &Option<serde_json::Value>,
) -> Result<(), String> {
  let mut img = image::open(src).map_err(|e| format!("無法開啟：{e}"))?;

  if let Some(r) = resize {
    if let (Some(axis), Some(val)) = (r["axis"].as_str(), r["value"].as_u64()) {
      img = resize_img(img, axis, val as u32);
    }
  }

  if let Some(parent) = dst.parent() {
    if !parent.as_os_str().is_empty() {
      std::fs::create_dir_all(parent).map_err(|e| format!("無法建立目錄：{e}"))?;
    }
  }

  match format {
    "jpg" | "jpeg" => {
      let out = std::fs::File::create(dst).map_err(|e| e.to_string())?;
      let enc = image::codecs::jpeg::JpegEncoder::new_with_quality(out, quality);
      img.write_with_encoder(enc).map_err(|e| e.to_string())?;
    }
    _ => {
      let fmt = match format {
        "png"  => image::ImageFormat::Png,  "webp" => image::ImageFormat::WebP,
        "bmp"  => image::ImageFormat::Bmp,  "gif"  => image::ImageFormat::Gif,
        "tiff" | "tif" => image::ImageFormat::Tiff, _ => image::ImageFormat::Png,
      };
      img.save_with_format(dst, fmt).map_err(|e| e.to_string())?;
    }
  }
  Ok(())
}

fn resize_img(img: image::DynamicImage, axis: &str, value: u32) -> image::DynamicImage {
  let (w, h) = (img.width(), img.height());
  if w == 0 || h == 0 || value == 0 { return img; }
  let (nw, nh) = match axis {
    "width"  => { let nh = ((h as f64 * value as f64) / w as f64).round() as u32; (value, nh.max(1)) }
    "height" => { let nw = ((w as f64 * value as f64) / h as f64).round() as u32; (nw.max(1), value) }
    _ => {  // "longest"
      if w >= h { let nh = ((h as f64 * value as f64) / w as f64).round() as u32; (value, nh.max(1)) }
      else      { let nw = ((w as f64 * value as f64) / h as f64).round() as u32; (nw.max(1), value) }
    }
  };
  img.resize_exact(nw, nh, image::imageops::FilterType::Lanczos3)
}

#[tauri::command]
async fn open_permission_settings() -> Result<(), String> {
  Ok(())
}
