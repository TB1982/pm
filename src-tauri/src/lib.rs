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
  let resize_val    = payload.get("resize").cloned();
  let watermark_val = if payload["watermark"].is_null() { None } else { payload.get("watermark").cloned() };

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

    let mut r = match convert_single(src, &out_path, &format, quality, &resize_val, &watermark_val) {
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
  watermark: &Option<serde_json::Value>,
) -> Result<(), String> {
  let mut img = image::open(src).map_err(|e| format!("無法開啟：{e}"))?;

  if let Some(r) = resize {
    if let (Some(axis), Some(val)) = (r["axis"].as_str(), r["value"].as_u64()) {
      img = resize_img(img, axis, val as u32);
    }
  }

  if let Some(wm) = watermark {
    apply_watermarks(&mut img, wm);
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

// ── Watermark helpers ─────────────────────────────────────────────────────────

fn apply_watermarks(img: &mut image::DynamicImage, wm: &serde_json::Value) {
  // Shared margin; each layer has its own position
  let margin = wm["margin"].as_u64().unwrap_or(20) as u32;

  // Text layer first (underneath), then image layer on top — per spec
  let text_wm = &wm["text"];
  if text_wm["enabled"].as_bool().unwrap_or(false) {
    let content = text_wm["content"].as_str().unwrap_or("");
    if !content.is_empty() {
      let size      = text_wm["size"].as_u64().unwrap_or(32) as f32;
      let color_hex = text_wm["color"].as_str().unwrap_or("#ffffff");
      let opacity   = text_wm["opacity"].as_u64().unwrap_or(80) as f64 / 100.0;
      let position  = text_wm["position"].as_str().unwrap_or("southeast");
      apply_text_watermark(img, content, size, color_hex, opacity, position, margin);
    }
  }

  let img_wm = &wm["img"];
  if img_wm["enabled"].as_bool().unwrap_or(false) {
    let path = img_wm["path"].as_str().unwrap_or("");
    if !path.is_empty() {
      let size_pct = img_wm["sizePercent"].as_u64().unwrap_or(20) as f64 / 100.0;
      let opacity  = img_wm["opacity"].as_u64().unwrap_or(80) as f64 / 100.0;
      let position = img_wm["position"].as_str().unwrap_or("southeast");
      apply_image_watermark(img, path, size_pct, opacity, position, margin);
    }
  }
}

/// Calculate top-left offset of a watermark element inside the base image.
fn wm_offset(base_w: u32, base_h: u32, el_w: u32, el_h: u32, position: &str, margin: u32) -> (i64, i64) {
  let (bw, bh) = (base_w as i64, base_h as i64);
  let (ew, eh) = (el_w  as i64, el_h  as i64);
  let m = margin as i64;
  let x = match position {
    "northeast" | "east" | "southeast" => bw - ew - m,
    "northwest" | "west" | "southwest" => m,
    _                                   => (bw - ew) / 2,
  };
  let y = match position {
    "northwest" | "north" | "northeast" => m,
    "southwest" | "south" | "southeast" => bh - eh - m,
    _                                    => (bh - eh) / 2,
  };
  (x.max(0), y.max(0))
}

fn apply_image_watermark(
  img: &mut image::DynamicImage, path: &str,
  size_pct: f64, opacity: f64, position: &str, margin: u32,
) {
  let wm_src = match image::open(path) { Ok(i) => i, Err(_) => return };
  let target_w = ((img.width() as f64) * size_pct).round() as u32;
  if target_w == 0 { return; }
  let target_h = {
    let ratio = target_w as f64 / wm_src.width() as f64;
    ((wm_src.height() as f64) * ratio).round() as u32
  };
  let mut wm_rgba = image::imageops::resize(
    &wm_src.to_rgba8(), target_w, target_h.max(1), image::imageops::FilterType::Lanczos3,
  );
  // Apply opacity via alpha channel
  for px in wm_rgba.pixels_mut() { px[3] = ((px[3] as f64) * opacity) as u8; }
  let (x, y) = wm_offset(img.width(), img.height(), wm_rgba.width(), wm_rgba.height(), position, margin);
  let mut base = img.to_rgba8();
  image::imageops::overlay(&mut base, &wm_rgba, x, y);
  *img = image::DynamicImage::ImageRgba8(base);
}

/// Load the best available macOS system font, preferring CJK-capable fonts.
/// Tries TTC (TrueType Collection) files with index 0, then plain TTF/OTF.
fn load_best_font() -> Option<ab_glyph::FontVec> {
  struct Candidate { path: &'static str, is_ttc: bool }
  let candidates = [
    // CJK-capable — covers zh/ja/ko + Latin
    Candidate { path: "/System/Library/Fonts/PingFang.ttc",              is_ttc: true  },
    Candidate { path: "/System/Library/Fonts/Hiragino Sans GB.ttc",      is_ttc: true  },
    Candidate { path: "/System/Library/Fonts/STHeiti Light.ttc",         is_ttc: true  },
    Candidate { path: "/Library/Fonts/Arial Unicode MS.ttf",             is_ttc: false },
    // Latin fallback
    Candidate { path: "/System/Library/Fonts/Supplemental/Arial.ttf",    is_ttc: false },
    Candidate { path: "/Library/Fonts/Arial.ttf",                        is_ttc: false },
    Candidate { path: "/System/Library/Fonts/Geneva.ttf",                is_ttc: false },
  ];
  for c in &candidates {
    if let Ok(data) = std::fs::read(c.path) {
      let result = if c.is_ttc {
        ab_glyph::FontVec::try_from_vec_and_index(data, 0)
      } else {
        ab_glyph::FontVec::try_from_vec(data)
      };
      if let Ok(font) = result { return Some(font); }
    }
  }
  None
}

fn apply_text_watermark(
  img: &mut image::DynamicImage, text: &str, font_size: f32,
  color_hex: &str, opacity: f64, position: &str, margin: u32,
) {
  use ab_glyph::{FontVec, PxScale, Font as AbFont, ScaleFont, Glyph, point};

  // Prefer CJK-capable fonts so Chinese/Japanese/Korean characters render correctly.
  // TTC (TrueType Collection) files must be loaded with try_from_vec_and_index.
  let font = load_best_font();
  let font = match font { Some(f) => f, None => return };

  let scale  = PxScale::from(font_size);
  let scaled = font.as_scaled(scale);

  // Measure text bounding box
  let text_w: f32 = text.chars().map(|c| scaled.h_advance(font.glyph_id(c))).sum();
  let text_h = (scaled.ascent() - scaled.descent()).ceil() as u32;

  let (ox, oy) = wm_offset(img.width(), img.height(), text_w as u32, text_h, position, margin);

  // Parse hex color
  let hex = color_hex.trim_start_matches('#');
  let cr = u8::from_str_radix(hex.get(0..2).unwrap_or("ff"), 16).unwrap_or(255);
  let cg = u8::from_str_radix(hex.get(2..4).unwrap_or("ff"), 16).unwrap_or(255);
  let cb = u8::from_str_radix(hex.get(4..6).unwrap_or("ff"), 16).unwrap_or(255);

  let mut base = img.to_rgba8();
  let img_w = base.width() as i32;
  let img_h = base.height() as i32;

  // Baseline: top of bounding box + ascent
  let baseline_y = oy as f32 + scaled.ascent();
  let mut cursor_x = ox as f32;

  for ch in text.chars() {
    let glyph_id = font.glyph_id(ch);
    let advance  = scaled.h_advance(glyph_id);
    let glyph    = Glyph { id: glyph_id, scale, position: point(cursor_x, baseline_y) };
    if let Some(outlined) = font.outline_glyph(glyph) {
      let bounds = outlined.px_bounds();
      outlined.draw(|px, py, coverage| {
        let ix = bounds.min.x as i32 + px as i32;
        let iy = bounds.min.y as i32 + py as i32;
        if ix >= 0 && iy >= 0 && ix < img_w && iy < img_h {
          // Porter-Duff src-over alpha compositing
          let src_a = (opacity as f32) * coverage;
          let pixel = base.get_pixel_mut(ix as u32, iy as u32);
          let dst_a = pixel[3] as f32 / 255.0;
          let out_a = src_a + dst_a * (1.0 - src_a);
          if out_a > 0.0 {
            pixel[0] = ((cr as f32 * src_a + pixel[0] as f32 * dst_a * (1.0 - src_a)) / out_a) as u8;
            pixel[1] = ((cg as f32 * src_a + pixel[1] as f32 * dst_a * (1.0 - src_a)) / out_a) as u8;
            pixel[2] = ((cb as f32 * src_a + pixel[2] as f32 * dst_a * (1.0 - src_a)) / out_a) as u8;
            pixel[3] = (out_a * 255.0) as u8;
          }
        }
      });
    }
    cursor_x += advance;
  }
  *img = image::DynamicImage::ImageRgba8(base);
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
