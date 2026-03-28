'use strict'

const lang = (typeof navigator !== 'undefined' && navigator.language)
  ? (navigator.language.startsWith('zh') ? 'zh' : 'en')
  : 'zh'

const STRINGS = {
  zh: {
    // ── Toolbar ──────────────────────────────────────────────────
    fullscreen: '全螢幕',
    window: '視窗',
    region: '矩形',
    delay: '延遲',
    open: '開啟',
    whiteboard: '白板',
    batch: '批次轉',
    esc_cancel: 'Esc 取消',

    // ── Help modal ───────────────────────────────────────────────
    help_title: '快捷鍵說明',
    help_global: '全域快捷鍵',
    help_editor: '編輯器工具',
    help_general: '通用操作',
    help_fullscreen_capture: '全螢幕截圖',
    help_window_capture: '視窗截圖',
    help_region_capture: '矩形選取截圖',
    help_rect: '矩形框',
    help_line: '線條',
    help_text: '文字',
    help_number: '編號標記',
    help_overlay: '疊入圖片',
    help_resize: '調整大小',
    help_crop: '裁切',
    help_undo: '撤銷',
    help_redo: '重做',
    help_delete: '刪除選取元素',
    help_escape: '取消 / 離開工具',
    help_save: '儲存',
    help_save_as: '另存新檔',

    // ── Window picker ────────────────────────────────────────────
    picker_title: '選擇視窗',

    // ── Batch modal ──────────────────────────────────────────────
    batch_title: '批次格式轉換',
    batch_drop_hint: '拖曳圖片至此，或',
    batch_select_btn: '選取檔案',
    batch_add_more: '+ 新增檔案',
    batch_convert_to: '轉換為',
    batch_quality: '品質',
    batch_svg_width: 'SVG 輸出寬度',
    batch_resize_all: '統一調整尺寸',
    batch_fix: '固定',
    batch_width: '寬度',
    batch_height: '高度',
    batch_to: '為',
    batch_output: '輸出位置',
    batch_same_dir: '同原始檔案目錄',
    batch_custom_dir: '指定目錄',
    batch_choose: '選擇…',
    batch_not_selected: '尚未選擇',
    batch_delete_orig: '轉換完成後刪除原始檔',
    batch_same_format_title: '以下檔案已是目標格式：',
    batch_skip: '略過這些，繼續轉換',
    batch_cancel_all: '取消全部',
    batch_remove: '從清單移除',
    batch_dismiss: '忽略提示',
    batch_start: '開始轉換',
    batch_n_files: (n) => `共 ${n} 個檔案`,
    batch_limit_reached: (max) => `批次轉換上限為 ${max} 張，多餘的檔案已略過`,
    batch_wm_enable:      '加入浮水印',
    batch_wm_text:        '文字',
    batch_wm_text_placeholder: '輸入浮水印文字',
    batch_wm_img:         '圖片（Logo）',
    batch_wm_choose_img:  '選取圖片…',
    batch_wm_size:        '字級',
    batch_wm_opacity:     '不透明',
    batch_wm_img_size:    '寬度佔比',
    batch_wm_position:    '位置',
    batch_wm_margin:      '邊距',

    // ── Toast messages (renderer) ────────────────────────────────
    toast_copied: (w, h) => `已複製到剪貼簿  ${w} × ${h} px`,
    toast_capture_fail: '截圖失敗',
    toast_no_windows: '未找到可截圖的視窗',
    toast_permission: '需要「螢幕錄製」權限  ',
    toast_open_settings: '開啟系統設定',
    toast_select_files: '請先選取要轉換的檔案',
    toast_select_dir: '請先選擇輸出目錄',
    toast_no_files: '沒有可轉換的檔案',
    toast_done: (ok, err) => `完成：${ok} 個成功，${err} 個失敗`,
    toast_converted: (n) => `已轉換 ${n} 個檔案`,

    // ── Editor options bar ───────────────────────────────────────
    opt_color: '顏色',
    opt_solid: '實色',
    opt_gradient: '漸層',
    opt_opacity: '透明度',
    opt_border: '邊框',
    opt_style: '風格',
    opt_limit: (n) => `上限：${n}`,
    opt_size: '大小',
    opt_small: '小',
    opt_medium: '標準',
    opt_large: '大',
    opt_next: '下一個',
    opt_reset: '重置',
    opt_value: '數值',
    opt_thickness: '粗細',
    opt_stroke: '描邊',
    opt_line_style: '線條',
    opt_radius: '圓角',
    opt_start: '起點',
    opt_end: '終點',
    opt_stroke_opacity: '不透明',
    opt_outline: '外框',
    opt_orthogonal: '直角',
    opt_font: '字體',
    opt_font_system: '系統預設',
    opt_font_mono: '等寬 Menlo',
    opt_bold: '粗體',
    opt_italic: '斜體',
    opt_underline: '底線',
    opt_strikethrough: '刪除線',
    align_left: '左',
    align_center: '中',
    align_right: '右',
    opt_align_left: '靠左對齊',
    opt_align_center: '置中對齊',
    opt_align_right: '靠右對齊',
    opt_text_stroke: '描邊',
    opt_text_bg: '背景',
    opt_shadow: '陰影',
    opt_zoom: '縮放比例',
    opt_transparent: '透明',

    // ── Line dash styles ─────────────────────────────────────────
    dash_solid: '────  實線',
    dash_dash: '╌╌╌╌  短虛線',
    'dash_dash-lg': '─ ─ ─  長虛線',
    dash_dot: '······  點線',
    'dash_dot-dash': '·─·─  點虛線',
    'dash_dash-dot-dot': '─··─··  長點點',

    // ── Crop confirm ─────────────────────────────────────────────
    crop_confirm: '確認裁切',
    crop_cancel: '取消',
    crop_dbl_hint: '或雙擊',

    // ── Crop / OCR / BoxSelect labels ────────────────────────────
    crop_drag: '請拖曳選取範圍',
    ocr_drag: '請拖曳選取辨識區域',
    box_drag: '請拖曳選取區域',
    box_copy: (w, h) => `${w} × ${h} px　Cmd+C 複製`,

    // ── Mosaic tool ──────────────────────────────────────────────
    mosaic: '馬賽克',
    mosaic_blur: '模糊',
    mosaic_block: '區塊：',
    mosaic_intensity: '強度：',

    // ── Symbol tab titles ────────────────────────────────────────
    sym_shape: '形狀',
    sym_letter: '字母',
    sym_arrow: '箭頭',
    sym_misc: '其他',

    // ── Number style labels (for toast) ─────────────────────────
    style_dot: '實心圓點',
    style_circle: '空心圓圈①',
    style_circle_fill: '實心圓圈➊',
    style_roman: '羅馬數字Ⅰ',
    style_cjk_paren: '中文括號㈠',
    style_cjk_circle: '中文圓圈㊀',

    // ── Thickness label (dynamic) ────────────────────────────────
    thickness_stroke: '描邊',
    thickness_line: '粗細',

    // ── Extend canvas direction labels ───────────────────────────
    extend_left: '向左延伸',
    extend_right: '向右延伸',
    extend_up: '向上延伸',
    extend_down: '向下延伸',
    extend_all: '四邊延伸',

    // ── Editor tool button titles ────────────────────────────────
    tool_select: '選取 (V)',
    tool_boxselect: '框型選取 (M)',
    tool_pen: '筆型 (P)',
    tool_line: '線條 (L)',
    tool_rect: '矩形框 (R)',
    tool_fillrect: '色塊 (B)',
    tool_text: '文字 (T)',
    tool_text_pro: '去背（Pro 版功能）',
    tool_privacymask: '隱私遮蔽 (K)',
    privacy_mode_label: '遮蔽方式：',
    privacy_hint: 'K = 全圖掃描　拖曳 = 指定區域',
    toast_privacy_scanning: '偵測敏感資訊中…',
    toast_privacy_done: n => `已遮蔽 ${n} 處`,
    toast_privacy_none: '未偵測到敏感資訊',
    toast_privacy_fail: '偵測失敗',
    tool_number: '編號 (N)',
    tool_symbol: '符號印章 (U)',
    tool_ocr: 'OCR 文字辨識 (G)',
    tool_mosaic: '馬賽克/模糊 (X)',
    tool_zoom_in: '放大 (⌘=)',
    tool_zoom_out: '縮小 (⌘-)',
    tool_fit: '適合視窗 (⌘0)',
    tool_crop: '裁切 (C)',
    tool_open_menu: '開啟 / 新畫布',
    tool_resize: '調整大小 (S)',
    tool_extend: '延伸畫布 (E)',
    tool_overlay: '疊入圖片 (O)',
    tool_template: '一鍵套版',
    tool_undo: '撤銷 (⌘Z)',
    tool_redo: '重做 (⌘⇧Z)',

    // ── Bottom bar ───────────────────────────────────────────────
    btn_history: '歷史',
    btn_history_title: '歷史截圖',
    history_title: '歷史截圖',
    history_empty: '尚無紀錄',
    history_copied_label: '已複製',
    history_file_not_found: '檔案已移動或刪除',
    btn_copy: '複製',
    btn_copy_title: '複製最終圖片到剪貼簿 (⌘⇧C)',
    btn_save: '完成並儲存',

    // ── Flip ─────────────────────────────────────────────────────
    opt_flip_h: '水平鏡射',
    opt_flip_v: '垂直鏡射',

    // ── Open menu & New Canvas modal ─────────────────────────────
    open_menu_new: '新開畫布',
    open_menu_file: '開啟檔案',
    newcanvas_title: '新開畫布',
    newcanvas_preset: '預設尺寸',
    newcanvas_custom: '自訂',
    newcanvas_bg: '背景顏色',
    newcanvas_transparent: '透明',
    newcanvas_create: '建立',
    toast_new_canvas: (w, h) => `已建立 ${w} × ${h} 畫布`,

    // ── Resize modal ─────────────────────────────────────────────
    resize_title: '調整尺寸',
    resize_width: '寬度',
    resize_height: '高度',
    resize_height_hint: 'px（等比例自動計算）',
    resize_cancel: '取消',
    resize_apply: '套用',

    // ── Extend modal ─────────────────────────────────────────────
    extend_title: '延伸畫布',
    extend_direction: '延伸方向',
    extend_cancel: '取消',
    extend_confirm: '確認延伸',

    // ── Save format modal ────────────────────────────────────────
    save_title: '儲存格式',
    save_png_desc: '無損，支援透明背景',
    save_jpg_desc: '有損壓縮，檔案較小',
    save_webp_desc: '現代格式，支援透明',
    save_cancel: '取消',
    save_confirm: '儲存',

    // ── OCR download modal ───────────────────────────────────────
    ocr_dl_title: 'OCR 語言包',
    ocr_dl_body: '首次使用 OCR 需下載語言資料：\n繁體中文 (~18 MB) + 英文 (~4 MB)\n下載後離線即可使用，無需重複下載。',
    ocr_dl_cancel: '取消',
    ocr_dl_confirm: '確認下載並辨識',

    // ── OCR panel ────────────────────────────────────────────────
    ocr_result_title: 'OCR 辨識結果',
    ocr_preparing: '準備中...',
    ocr_recognizing: (pct) => `辨識中... ${pct}%`,
    ocr_downloading: (pct) => `下載語言包 ${pct}%`,
    ocr_initialized: '初始化完成',
    ocr_placeholder: '辨識結果將顯示在此...',
    ocr_copy: '複製',
    ocr_copy_close: '複製並關閉',
    ocr_recognizing_label: '辨識中...',

    // ── Color picker ─────────────────────────────────────────────
    cpp_standard: '標準色彩',
    cpp_recent: '最近使用',
    cpp_brand: '品牌色庫',
    cpp_brand_add_title: '將目前顏色加入品牌色庫',
    cpp_brand_empty: '尚未儲存品牌色',
    cpp_brand_remove: '移除此品牌色',
    cpp_eyedropper: '滴管選色（從螢幕取色）',
    cpp_hex: '色碼（16 進位）',

    // ── Template panel ───────────────────────────────────────────
    tpl_title: '一鍵套版',
    tpl_background: '背景',
    tpl_adjust: '調整',
    tpl_padding: '留白',
    tpl_radius: '圓角',
    tpl_shadow: '外框',
    tpl_social: '社群尺寸（選用）',
    tpl_apple_red: 'Apple 紅',
    tpl_apple_orange: 'Apple 橙',
    tpl_apple_yellow: 'Apple 黃',
    tpl_apple_green: 'Apple 綠',
    tpl_apple_blue: 'Apple 藍',
    tpl_apple_purple: 'Apple 紫',

    // ── Drop overlay ─────────────────────────────────────────────
    drop_overlay_label: '放開以匯入圖片',

    // ── Context menu ─────────────────────────────────────────────
    ctx_to_top: '移到最上層',
    ctx_move_up: '上移一層',
    ctx_move_down: '下移一層',
    ctx_to_bottom: '移到最下層',

    // ── Float drag export ────────────────────────────────────────
    float_drag_export_title: '拖曳匯出到 Line / Slack / Finder 等',
    float_drag_move_title: '拖曳移動按鈕位置',
    float_drag_label: '⬆ 拖曳匯出',

    // ── Toast messages (editor) ──────────────────────────────────
    toast_extended: (w, h) => `已延伸：${w} × ${h} px`,
    toast_overlay_exists: '請先刪除現有疊入圖（Delete 鍵），再插入新圖',
    toast_overlay_inserted: '疊入圖片已插入，拖動可移動，拖角落可等比縮放',
    toast_num_reset: '編號已重置，下一個從 1 開始',
    toast_num_limit: (style, limit) => `已達「${style}」上限（${limit}），編號重置為 1`,
    toast_saved: (name) => `已儲存：${name}`,
    toast_save_fail: '儲存失敗',
    toast_save_fail_detail: (msg) => `儲存失敗：${msg}`,
    toast_crop_first: '請先拖曳選取裁切範圍',
    toast_crop_oob: '裁切範圍超出圖片邊界',
    toast_cropped: (w, h) => `已裁切：${w} × ${h} px`,
    toast_box_copied: (w, h) => `已複製 ${w} × ${h} px，Cmd+V 貼上為浮動圖層`,
    toast_ocr_no_text: 'OCR 未辨識到文字，請嘗試更清晰的區域',
    toast_ocr_fail: 'OCR 辨識失敗',
    toast_text_copied: '文字已複製到剪貼簿',
    toast_template_applied: '套版已套用',
    toast_load_image_first: '請先載入圖片',
    toast_resized: (w, h) => `已調整尺寸：${w} × ${h} px`,
    toast_no_image: '尚未載入圖片',
    toast_img_copied: '圖片已複製到剪貼簿',
    toast_drop_images: '請拖曳圖片檔案（PNG / JPG / WebP / GIF）',
    toast_imported: (name) => `已匯入：${name}`,
    qr_toast_msg: (url) => `偵測到 QR Code：${url}`,
    qr_toast_open: '開啟',
    qr_toast_copied: 'QR Code 內容已複製到剪貼簿',
    action_toast_dismiss: '略過',

    // ── Align toolbar ────────────────────────────────────────
    align_group_label:   '對齊',
    align_btn_left:      '齊左',
    align_btn_hcenter:   '水中',
    align_btn_right:     '齊右',
    align_btn_top:       '齊上',
    align_btn_vcenter:   '垂中',
    align_btn_bottom:    '齊下',
    align_btn_dist_h:    '水均',
    align_btn_dist_v:    '垂均',
    align_to_canvas:     '對齊中線',
    align_left_title:    '靠左',
    align_hcenter_title: '水平置中',
    align_right_title:   '靠右',
    align_top_title:     '靠上',
    align_vcenter_title: '垂直置中',
    align_bottom_title:  '靠下',
    align_dist_h_title:  '水平均分',
    align_dist_v_title:  '垂直均分',

    // ── Shape / fill tool tooltips ───────────────────────────
    shape_rect_title:    '矩形框',
    shape_ellipse_title: '橢圓框',
    fill_rect_title:     '矩形色塊',
    fill_ellipse_title:  '橢圓色塊',

    // ── Gradient direction ───────────────────────────────────
    grad_dir_h:  '左→右',
    grad_dir_v:  '上→下',
    grad_dir_dr: '左上→右下',
    grad_dir_ur: '左下→右上',

    // ── Text formatting (title tooltips) ────────────────────
    opt_bold_title:          '粗體',
    opt_italic_title:        '斜體',
    opt_underline_title:     '底線',
    opt_strikethrough_title: '刪除線',

    // ── Color picker tooltips ────────────────────────────────
    click_to_pick:              '點擊選色',
    click_to_pick_transparent:  '點擊選色（透明=無外框）',
    stroke_color_title:         '描邊顏色',
    symbol_reopen_title:        '點擊重開面板',
    btn_close_title:            '關閉',

    // ── Aria labels ──────────────────────────────────────────
    aria_color_picker:   '選色面板',
    aria_symbol_picker:  '符號選取面板',
    aria_template_panel: '套版選擇',
    aria_remove_file:    (name) => `移除 ${name}`,

    // ── Font names ───────────────────────────────────────────
    font_pingfang: '蘋方-繁',
    font_heiti:    '黑體-繁',
    font_songti:   '宋體-繁',
    font_kaiti:    '楷體-繁',

    // ── Number style tooltips ────────────────────────────────
    ns_title_dot:         '實心圓點（無限）',
    ns_title_circle:      '空心圓圈 ①②③（上限 50）',
    ns_title_circle_fill: '實心圓圈 ➊➋➌（上限 10）',
    ns_title_roman:       '羅馬數字 Ⅰ Ⅱ Ⅲ（上限 12）',
    ns_title_cjk_paren:   '中文括號 ㈠㈡㈢（上限 10）',
    ns_title_cjk_circle:  '中文圓圈 ㊀㊁㊂（上限 10）',

    // ── OCR detail ───────────────────────────────────────────
    ocr_fail_detail: (msg) => `辨識失敗：${msg}`,
  },

  en: {
    // ── Toolbar ──────────────────────────────────────────────────
    fullscreen: 'Fullscreen',
    window: 'Window',
    region: 'Region',
    delay: 'Delay',
    open: 'Open',
    whiteboard: 'Canvas',
    batch: 'Batch',
    esc_cancel: 'Esc cancel',

    // ── Help modal ───────────────────────────────────────────────
    help_title: 'Keyboard Shortcuts',
    help_global: 'Global Shortcuts',
    help_editor: 'Editor Tools',
    help_general: 'General',
    help_fullscreen_capture: 'Full Screen Capture',
    help_window_capture: 'Window Capture',
    help_region_capture: 'Region Select',
    help_rect: 'Rectangle',
    help_line: 'Line',
    help_text: 'Text',
    help_number: 'Number Marker',
    help_overlay: 'Overlay Image',
    help_resize: 'Resize',
    help_crop: 'Crop',
    help_undo: 'Undo',
    help_redo: 'Redo',
    help_delete: 'Delete Selected',
    help_escape: 'Cancel / Exit Tool',
    help_save: 'Save',
    help_save_as: 'Save As',

    // ── Window picker ────────────────────────────────────────────
    picker_title: 'Select Window',

    // ── Batch modal ──────────────────────────────────────────────
    batch_title: 'Batch Format Convert',
    batch_drop_hint: 'Drop images here, or',
    batch_select_btn: 'Select Files',
    batch_add_more: '+ Add Files',
    batch_convert_to: 'Convert to',
    batch_quality: 'Quality',
    batch_svg_width: 'SVG Output Width',
    batch_resize_all: 'Resize All',
    batch_fix: 'Fix',
    batch_width: 'Width',
    batch_height: 'Height',
    batch_to: 'to',
    batch_output: 'Output',
    batch_same_dir: 'Same as source',
    batch_custom_dir: 'Custom directory',
    batch_choose: 'Choose…',
    batch_not_selected: 'Not selected',
    batch_delete_orig: 'Delete originals after conversion',
    batch_same_format_title: 'These files are already in target format:',
    batch_skip: 'Skip & continue',
    batch_cancel_all: 'Cancel all',
    batch_remove: 'Remove from list',
    batch_dismiss: 'Dismiss',
    batch_start: 'Start Convert',
    batch_n_files: (n) => `${n} file${n === 1 ? '' : 's'}`,
    batch_limit_reached: (max) => `Batch limit is ${max} files — extra files were skipped`,
    batch_wm_enable:      'Add Watermark',
    batch_wm_text:        'Text',
    batch_wm_text_placeholder: 'Enter watermark text',
    batch_wm_img:         'Image (Logo)',
    batch_wm_choose_img:  'Choose image…',
    batch_wm_size:        'Font size',
    batch_wm_opacity:     'Opacity',
    batch_wm_img_size:    'Width %',
    batch_wm_position:    'Position',
    batch_wm_margin:      'Margin',

    // ── Toast messages (renderer) ────────────────────────────────
    toast_copied: (w, h) => `Copied to clipboard  ${w} × ${h} px`,
    toast_capture_fail: 'Capture failed',
    toast_no_windows: 'No capturable windows found',
    toast_permission: 'Screen Recording permission required  ',
    toast_open_settings: 'Open System Settings',
    toast_select_files: 'Please select files to convert',
    toast_select_dir: 'Please select an output directory',
    toast_no_files: 'No files to convert',
    toast_done: (ok, err) => `Done: ${ok} succeeded, ${err} failed`,
    toast_converted: (n) => `Converted ${n} file${n === 1 ? '' : 's'}`,

    // ── Editor options bar ───────────────────────────────────────
    opt_color: 'Color',
    opt_solid: 'Solid',
    opt_gradient: 'Gradient',
    opt_opacity: 'Opacity',
    opt_border: 'Border',
    opt_style: 'Style',
    opt_limit: (n) => `Limit: ${n}`,
    opt_size: 'Size',
    opt_small: 'S',
    opt_medium: 'M',
    opt_large: 'L',
    opt_next: 'Next',
    opt_reset: 'Reset',
    opt_value: 'Value',
    opt_thickness: 'Width',
    opt_stroke: 'Stroke',
    opt_line_style: 'Line',
    opt_radius: 'Radius',
    opt_start: 'Start',
    opt_end: 'End',
    opt_stroke_opacity: 'Opacity',
    opt_outline: 'Outline',
    opt_orthogonal: 'Ortho',
    opt_font: 'Font',
    opt_font_system: 'System',
    opt_font_mono: 'Menlo (Mono)',
    opt_bold: 'Bold',
    opt_italic: 'Italic',
    opt_underline: 'Underline',
    opt_strikethrough: 'Strikethrough',
    align_left: 'L',
    align_center: 'C',
    align_right: 'R',
    opt_align_left: 'Left',
    opt_align_center: 'Center',
    opt_align_right: 'Right',
    opt_text_stroke: 'Stroke',
    opt_text_bg: 'Background',
    opt_shadow: 'Shadow',
    opt_zoom: 'Zoom',
    opt_transparent: 'Transparent',

    // ── Line dash styles ─────────────────────────────────────────
    dash_solid: '────  Solid',
    dash_dash: '╌╌╌╌  Dashed',
    'dash_dash-lg': '─ ─ ─  Long Dash',
    dash_dot: '······  Dotted',
    'dash_dot-dash': '·─·─  Dot-Dash',
    'dash_dash-dot-dot': '─··─··  Dash-Dot-Dot',

    // ── Crop confirm ─────────────────────────────────────────────
    crop_confirm: 'Apply Crop',
    crop_cancel: 'Cancel',
    crop_dbl_hint: 'or double-click',

    // ── Crop / OCR / BoxSelect labels ────────────────────────────
    crop_drag: 'Drag to select crop area',
    ocr_drag: 'Drag to select OCR area',
    box_drag: 'Drag to select area',
    box_copy: (w, h) => `${w} × ${h} px　Cmd+C to copy`,

    // ── Mosaic tool ──────────────────────────────────────────────
    mosaic: 'Mosaic',
    mosaic_blur: 'Blur',
    mosaic_block: 'Block:',
    mosaic_intensity: 'Intensity:',

    // ── Symbol tab titles ────────────────────────────────────────
    sym_shape: 'Shapes',
    sym_letter: 'Letters',
    sym_arrow: 'Arrows',
    sym_misc: 'Misc',

    // ── Number style labels (for toast) ─────────────────────────
    style_dot: 'Filled dot',
    style_circle: 'Circle ①',
    style_circle_fill: 'Filled circle ➊',
    style_roman: 'Roman Ⅰ',
    style_cjk_paren: 'CJK paren ㈠',
    style_cjk_circle: 'CJK circle ㊀',

    // ── Thickness label (dynamic) ────────────────────────────────
    thickness_stroke: 'Stroke',
    thickness_line: 'Width',

    // ── Extend canvas direction labels ───────────────────────────
    extend_left: 'Extend Left',
    extend_right: 'Extend Right',
    extend_up: 'Extend Up',
    extend_down: 'Extend Down',
    extend_all: 'Extend All',

    // ── Editor tool button titles ────────────────────────────────
    tool_select: 'Select (V)',
    tool_boxselect: 'Box Select (M)',
    tool_pen: 'Pen (P)',
    tool_line: 'Line (L)',
    tool_rect: 'Rectangle (R)',
    tool_fillrect: 'Fill (B)',
    tool_text: 'Text (T)',
    tool_text_pro: 'Remove BG (Pro)',
    tool_privacymask: 'Privacy Mask (K)',
    privacy_mode_label: 'Mask mode:',
    privacy_hint: 'K = full scan   drag = region scan',
    toast_privacy_scanning: 'Detecting sensitive info…',
    toast_privacy_done: n => `${n} region(s) masked`,
    toast_privacy_none: 'No sensitive info detected',
    toast_privacy_fail: 'Detection failed',
    tool_number: 'Number (N)',
    tool_symbol: 'Stamp (U)',
    tool_ocr: 'OCR (G)',
    tool_mosaic: 'Mosaic/Blur (X)',
    tool_zoom_in: 'Zoom In (⌘=)',
    tool_zoom_out: 'Zoom Out (⌘-)',
    tool_fit: 'Fit to Window (⌘0)',
    tool_crop: 'Crop (C)',
    tool_open_menu: 'Open / New Canvas',
    tool_resize: 'Resize (S)',
    tool_extend: 'Extend Canvas (E)',
    tool_overlay: 'Overlay Image (O)',
    tool_template: 'Template',
    tool_undo: 'Undo (⌘Z)',
    tool_redo: 'Redo (⌘⇧Z)',

    // ── Bottom bar ───────────────────────────────────────────────
    btn_history: 'History',
    btn_history_title: 'Screenshot History',
    history_title: 'Screenshot History',
    history_empty: 'No history yet',
    history_copied_label: 'Copied',
    history_file_not_found: 'File moved or deleted',
    btn_copy: 'Copy',
    btn_copy_title: 'Copy to Clipboard (⌘⇧C)',
    btn_save: 'Save',

    // ── Flip ─────────────────────────────────────────────────────
    opt_flip_h: 'Flip Horizontal',
    opt_flip_v: 'Flip Vertical',

    // ── Open menu & New Canvas modal ─────────────────────────────
    open_menu_new: 'New Canvas',
    open_menu_file: 'Open File',
    newcanvas_title: 'New Canvas',
    newcanvas_preset: 'Preset',
    newcanvas_custom: 'Custom',
    newcanvas_bg: 'Background',
    newcanvas_transparent: 'Transparent',
    newcanvas_create: 'Create',
    toast_new_canvas: (w, h) => `Canvas created: ${w} × ${h}`,

    // ── Resize modal ─────────────────────────────────────────────
    resize_title: 'Resize',
    resize_width: 'Width',
    resize_height: 'Height',
    resize_height_hint: 'px (proportional)',
    resize_cancel: 'Cancel',
    resize_apply: 'Apply',

    // ── Extend modal ─────────────────────────────────────────────
    extend_title: 'Extend Canvas',
    extend_direction: 'Direction',
    extend_cancel: 'Cancel',
    extend_confirm: 'Confirm',

    // ── Save format modal ────────────────────────────────────────
    save_title: 'Save Format',
    save_png_desc: 'Lossless, supports transparency',
    save_jpg_desc: 'Lossy, smaller file size',
    save_webp_desc: 'Modern format, supports transparency',
    save_cancel: 'Cancel',
    save_confirm: 'Save',

    // ── OCR download modal ───────────────────────────────────────
    ocr_dl_title: 'OCR Language Pack',
    ocr_dl_body: 'First-time OCR requires downloading language data:\nTraditional Chinese (~18 MB) + English (~4 MB)\nWorks offline once downloaded.',
    ocr_dl_cancel: 'Cancel',
    ocr_dl_confirm: 'Download & Recognize',

    // ── OCR panel ────────────────────────────────────────────────
    ocr_result_title: 'OCR Result',
    ocr_preparing: 'Preparing...',
    ocr_recognizing: (pct) => `Recognizing... ${pct}%`,
    ocr_downloading: (pct) => `Downloading language pack ${pct}%`,
    ocr_initialized: 'Initialized',
    ocr_placeholder: 'Results will appear here...',
    ocr_copy: 'Copy',
    ocr_copy_close: 'Copy & Close',
    ocr_recognizing_label: 'Recognizing...',

    // ── Color picker ─────────────────────────────────────────────
    cpp_standard: 'Standard Colors',
    cpp_recent: 'Recent',
    cpp_brand: 'Brand Colors',
    cpp_brand_add_title: 'Add current color to brand library',
    cpp_brand_empty: 'No brand colors saved',
    cpp_brand_remove: 'Remove brand color',
    cpp_eyedropper: 'Eyedropper (pick from screen)',
    cpp_hex: 'Hex color code',

    // ── Template panel ───────────────────────────────────────────
    tpl_title: 'Template',
    tpl_background: 'Background',
    tpl_adjust: 'Adjust',
    tpl_padding: 'Padding',
    tpl_radius: 'Radius',
    tpl_shadow: 'Shadow',
    tpl_social: 'Social Sizes (optional)',
    tpl_apple_red: 'Apple Red',
    tpl_apple_orange: 'Apple Orange',
    tpl_apple_yellow: 'Apple Yellow',
    tpl_apple_green: 'Apple Green',
    tpl_apple_blue: 'Apple Blue',
    tpl_apple_purple: 'Apple Purple',

    // ── Drop overlay ─────────────────────────────────────────────
    drop_overlay_label: 'Drop to import image',

    // ── Context menu ─────────────────────────────────────────────
    ctx_to_top: 'Bring to Front',
    ctx_move_up: 'Move Up',
    ctx_move_down: 'Move Down',
    ctx_to_bottom: 'Send to Back',

    // ── Float drag export ────────────────────────────────────────
    float_drag_export_title: 'Drag to export to Line / Slack / Finder etc.',
    float_drag_move_title: 'Drag to reposition this button',
    float_drag_label: '⬆ Drag Export',

    // ── Toast messages (editor) ──────────────────────────────────
    toast_extended: (w, h) => `Extended: ${w} × ${h} px`,
    toast_overlay_exists: 'Delete the existing overlay (Delete key) before inserting a new one',
    toast_overlay_inserted: 'Overlay inserted — drag to move, drag corner to scale',
    toast_num_reset: 'Counter reset to 1',
    toast_num_limit: (style, limit) => `"${style}" limit (${limit}) reached, counter reset to 1`,
    toast_saved: (name) => `Saved: ${name}`,
    toast_save_fail: 'Save failed',
    toast_save_fail_detail: (msg) => `Save failed: ${msg}`,
    toast_crop_first: 'Drag to select a crop area first',
    toast_crop_oob: 'Crop area exceeds image bounds',
    toast_cropped: (w, h) => `Cropped: ${w} × ${h} px`,
    toast_box_copied: (w, h) => `Copied ${w} × ${h} px — Cmd+V to paste as layer`,
    toast_ocr_no_text: 'No text detected — try a clearer area',
    toast_ocr_fail: 'OCR failed',
    toast_text_copied: 'Text copied to clipboard',
    toast_template_applied: 'Template applied',
    toast_load_image_first: 'Please load an image first',
    toast_resized: (w, h) => `Resized: ${w} × ${h} px`,
    toast_no_image: 'No image loaded',
    toast_img_copied: 'Image copied to clipboard',
    toast_drop_images: 'Drop image files here (PNG / JPG / WebP / GIF)',
    toast_imported: (name) => `Imported: ${name}`,
    qr_toast_msg: (url) => `QR Code detected: ${url}`,
    qr_toast_open: 'Open',
    qr_toast_copied: 'QR Code content copied to clipboard',
    action_toast_dismiss: 'Dismiss',

    // ── Align toolbar ────────────────────────────────────────
    align_group_label:   'Align',
    align_btn_left:      '←L',
    align_btn_hcenter:   '↔C',
    align_btn_right:     'R→',
    align_btn_top:       '↑T',
    align_btn_vcenter:   '↕C',
    align_btn_bottom:    '↓B',
    align_btn_dist_h:    'H=',
    align_btn_dist_v:    'V=',
    align_to_canvas:     'Center',
    align_left_title:    'Align Left',
    align_hcenter_title: 'Center Horizontal',
    align_right_title:   'Align Right',
    align_top_title:     'Align Top',
    align_vcenter_title: 'Center Vertical',
    align_bottom_title:  'Align Bottom',
    align_dist_h_title:  'Distribute Horizontal',
    align_dist_v_title:  'Distribute Vertical',

    // ── Shape / fill tool tooltips ───────────────────────────
    shape_rect_title:    'Rectangle',
    shape_ellipse_title: 'Ellipse',
    fill_rect_title:     'Fill Rect',
    fill_ellipse_title:  'Fill Ellipse',

    // ── Gradient direction ───────────────────────────────────
    grad_dir_h:  'L→R',
    grad_dir_v:  'T→B',
    grad_dir_dr: '↘',
    grad_dir_ur: '↗',

    // ── Text formatting (title tooltips) ────────────────────
    opt_bold_title:          'Bold',
    opt_italic_title:        'Italic',
    opt_underline_title:     'Underline',
    opt_strikethrough_title: 'Strikethrough',

    // ── Color picker tooltips ────────────────────────────────
    click_to_pick:             'Click to pick color',
    click_to_pick_transparent: 'Click to pick (transparent = no outline)',
    stroke_color_title:        'Stroke color',
    symbol_reopen_title:       'Click to reopen panel',
    btn_close_title:           'Close',

    // ── Aria labels ──────────────────────────────────────────
    aria_color_picker:   'Color Picker',
    aria_symbol_picker:  'Symbol Picker',
    aria_template_panel: 'Template',
    aria_remove_file:    (name) => `Remove ${name}`,

    // ── Font names ───────────────────────────────────────────
    font_pingfang: 'PingFang TC',
    font_heiti:    'Heiti TC',
    font_songti:   'Songti TC',
    font_kaiti:    'Kaiti TC',

    // ── Number style tooltips ────────────────────────────────
    ns_title_dot:         'Filled dot (unlimited)',
    ns_title_circle:      'Circle ①②③ (max 50)',
    ns_title_circle_fill: 'Filled circle ➊➋➌ (max 10)',
    ns_title_roman:       'Roman Ⅰ Ⅱ Ⅲ (max 12)',
    ns_title_cjk_paren:   'CJK paren ㈠㈡㈢ (max 10)',
    ns_title_cjk_circle:  'CJK circle ㊀㊁㊂ (max 10)',

    // ── OCR detail ───────────────────────────────────────────
    ocr_fail_detail: (msg) => `Recognition failed: ${msg}`,
  }
}

function t(key, ...args) {
  const val = STRINGS[lang][key] ?? STRINGS.zh[key]
  if (typeof val === 'function') return val(...args)
  return val ?? key
}

function applyI18n() {
  document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'en'
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n)
  })
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle)
  })
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder)
  })
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria))
  })
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { t, applyI18n, lang }
} else {
  window.t = t
  window.applyI18n = applyI18n
  window.lang = lang
}
