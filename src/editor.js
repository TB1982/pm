const { ipcRenderer } = require('electron')

// ─── Colour palette ──────────────────────────────────────────────────────────

// Theme palette: 10 columns (hues) × 6 rows (light → dark)
const PALETTE_THEME = [
  ['#e5e5e5','#c4c4c4','#9a9a9a','#6b6b6b','#3d3d3d','#141414'],  // Gray
  ['#fecaca','#fca5a5','#f87171','#ef4444','#b91c1c','#7f1d1d'],  // Red
  ['#fed7aa','#fdba74','#fb923c','#f97316','#c2410c','#7c2d12'],  // Orange
  ['#fef08a','#fde047','#facc15','#eab308','#a16207','#713f12'],  // Yellow
  ['#bbf7d0','#86efac','#4ade80','#22c55e','#15803d','#14532d'],  // Green
  ['#99f6e4','#5eead4','#2dd4bf','#14b8a6','#0f766e','#042f2e'],  // Teal
  ['#bae6fd','#7dd3fc','#38bdf8','#0ea5e9','#0369a1','#0c4a6e'],  // Sky
  ['#bfdbfe','#93c5fd','#60a5fa','#3b82f6','#1d4ed8','#1e3a8a'],  // Blue
  ['#e9d5ff','#d8b4fe','#c084fc','#a855f7','#7e22ce','#3b0764'],  // Purple
  ['#fecdd3','#fda4af','#fb7185','#f43f5e','#be123c','#881337'],  // Rose
]

// Standard colours row (10 accent / neutral colours + transparent)
const PALETTE_STANDARD = [
  '#000000','#1c1c1e','#ff3b30','#ff9500','#ffcc00',
  '#34c759','#00c7be','#007aff','#5856d6','#af52de',
  'transparent',
]

// Font families available in the text tool
const FONT_FAMILIES = [
  { id: 'system',    label: '系統預設',       css: '-apple-system, "Helvetica Neue", sans-serif' },
  { id: 'pingfang',  label: '蘋方-繁',        css: '"PingFang TC", "Heiti TC", sans-serif' },
  { id: 'heiti',     label: '黑體-繁',        css: '"Heiti TC", "STHeiti", sans-serif' },
  { id: 'songti',    label: '宋體-繁',        css: '"Songti TC", "STSong", serif' },
  { id: 'kaiti',     label: '楷體-繁',        css: '"Kaiti TC", "STKaiti", cursive' },
  { id: 'helvetica', label: 'Helvetica Neue', css: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { id: 'georgia',   label: 'Georgia',        css: 'Georgia, "Times New Roman", serif' },
  { id: 'verdana',   label: 'Verdana',        css: 'Verdana, Geneva, sans-serif' },
  { id: 'impact',    label: 'Impact',         css: 'Impact, "Arial Black", sans-serif' },
  { id: 'mono',      label: '等寬 Menlo',     css: 'Menlo, "Courier New", monospace' },
]
function getFontCss(id) {
  return (FONT_FAMILIES.find(f => f.id === id) ?? FONT_FAMILIES[0]).css
}

// ─── State ───────────────────────────────────────────────────────────────────

// Image
let imgElement = null
let imgWidth   = 0
let imgHeight  = 0
let viewScale  = 1    // display pixels per image pixel
let fitScale   = 1    // scale at which image fits the window
let userZoomed = false

// Zoom / pan
let isPanning = false
let panStart  = null  // { x, y, sl, st, moved }

const MIN_SCALE = 0.1
const MAX_SCALE = 4.0
const ZOOM_STEP = 1.25

// Annotation history
let annotations = []
let history     = [[]]
let historyIdx  = 0

// Tool settings (persist across selections)
let tool      = 'rect'
let color     = '#ff3b30'
let thickness = 2
let lineStyle   = 'solid'
let lineOrtho   = false   // 正交折線：true = 水平/垂直吸附
let startCap    = 'none'
let endCap      = 'arrow'
let cornerRadius = 0      // 0–100%，套用於 rect / fillrect 的圓角半徑
let fontSize  = 48
let numCount  = 1
let numSize   = 48    // radius, image pixels
let numberStyle   = 'dot'   // dot | circle | circle-fill | roman | cjk-paren | cjk-circle
let numThickness  = 0       // 描邊粗細，獨立於全域 thickness
let numStrokeColor = '#ffffff'  // 描邊顏色
const STYLE_LIMITS = { dot: Infinity, circle: 50, 'circle-fill': 10, roman: 12, 'cjk-paren': 10, 'cjk-circle': 10 }
const STYLE_LABELS = { dot: '實心圓點', circle: '空心圓圈①', 'circle-fill': '實心圓圈➊', roman: '羅馬數字Ⅰ', 'cjk-paren': '中文括號㈠', 'cjk-circle': '中文圓圈㊀' }
function getStyleLimit(style) { return STYLE_LIMITS[style] ?? Infinity }

// Fill ellipse shadow state
let fillellipseShadow = false

// Fill rect (色塊工具) state
let fillMode         = 'solid'       // 'solid' | 'gradient'
let fillColor        = '#ffcc00'     // solid mode fill colour
let fillColorA       = '#ffcc00'     // gradient start colour
let fillColorB       = 'transparent' // gradient end colour ('transparent' or hex)
let fillGradientDir  = 'h'           // 'h' | 'v' | 'dr' | 'ur'
let fillOpacity      = 100
let fillBorderColor   = '#ffffff'    // border stroke colour
let fillPrevColorA    = '#ffcc00'    // last non-transparent colorA (for 透 toggle)
let fillPrevColorB    = '#333333'    // last non-transparent colorB (for 透 toggle)

// Annotation clipboard (for Cmd+C / Cmd+V on number annotations)
let annotClipboard = null

// Text style (描邊 + 背景色塊 + B/I/U)
let textStrokeColor = '#000000'
let textStrokeWidth = 0        // 0=none 1=細 2=中 3=粗
let textBgColor     = '#000000'
let textBgOpacity   = 0        // 0–100 %（預設透明；使用者選色後自動升至 50）
let textBold        = false
let textItalic      = false
let textUnderline     = false
let textStrikethrough = false
let textAlign         = 'left'     // 'left' | 'center' | 'right'
let fontFamily        = 'system'   // FONT_FAMILIES id

// Shadow (per-tool default; each annotation also stores its own value)
let rectShadow      = false
let ellipseShadow   = false
let fillrectShadow  = false
let lineShadow      = false
let textShadow      = false

// Line/polyline border
let lineBorderColor = 'transparent'
let numShadow       = false

// Per-tool opacity
let rectOpacity     = 100
let ellipseOpacity  = 100
let lineOpacity     = 100   // shared for line + polyline

// Rect outer border (框線工具外框 + 位移)
let rectBorderColor    = 'transparent'
let rectBorderOffsetX  = 0
let rectBorderOffsetY  = 0
// Ellipse outer border
let ellipseBorderColor    = 'transparent'
let ellipseBorderOffsetX  = 0
let ellipseBorderOffsetY  = 0

// Per-shape dash style
let rectLineStyle        = 'solid'
let ellipseLineStyle     = 'solid'
let fillrectLineStyle    = 'solid'
let fillellipseLineStyle = 'solid'

// Border thickness + dash (per tool)
let lineBorderThickness    = 6
let lineBorderDashStyle    = 'solid'
let penBorderThickness     = 6
let penBorderDashStyle     = 'solid'
let rectBorderThickness    = 2
let rectBorderDashStyle    = 'solid'
let ellipseBorderThickness = 2
let ellipseBorderDashStyle = 'solid'

// Recent colours (shared across all colour pickers, max 10, session-only)
let recentColors     = []
let _rebuildRecentRow = null   // set by initColorPanel

function pushRecentColor(hex) {
  if (!hex || hex === 'transparent') return
  const norm = hex.toLowerCase()
  if (recentColors.includes(norm)) return   // already present — keep its position
  recentColors.unshift(norm)
  if (recentColors.length > 10) recentColors.length = 10
  if (_rebuildRecentRow) _rebuildRecentRow()
}

// Drawing
let isDrawing   = false
let drawStart   = null
let drawCurrent = null

// Select / drag
let selectedId   = null
let isDragging   = false
let hasDragged   = false
let lastMousePos = null

// Resize
let isResizing   = false
let resizeHandle = null   // { id, fixX?, fixY?, fixW?, fixH? }
const HANDLE_R   = 5      // display pixels

// Text
let textActive   = false
let textPos      = null
let textEditOrig = null   // restored on Escape during re-edit
let isComposing  = false

// Crop
let cropRect      = null   // { x, y, w, h } in image coordinates
let isCropping    = false  // currently drawing initial rect
let cropMoving    = false  // dragging rect to reposition
let cropResizeH   = null   // handle id being dragged ('nw','n','ne','e','se','s','sw','w')
let cropMoveStart = null   // { pos, origRect } snapshot at drag start

// OCR
let isOcrSelecting = false  // currently drawing OCR selection rect
let ocrRect        = null   // { x, y, w, h } in image coordinates
let ocrStart       = null   // drag start pos

// Box select
let isBoxSelecting  = false  // currently drawing selection rect
let boxSelRect      = null   // { x, y, w, h } in image coordinates (normalised after mouseup)
let boxSelStart     = null   // drag start pos
let pixelClipboard  = null   // { dataURL, w, h } — last copied region

// Pen tool
let isPenDrawing   = false
let penPoints      = []       // {x,y}[] collected during current stroke
let penOpacity     = 100      // 0–100，100=fully opaque
let penBorderColor = 'transparent'
let penShadow      = false

// Polyline drawing (line tool + lineOrtho = true)
// 互動：點擊加點 → 雙擊完成；各段自動折直角（H→V 或 V→H）
let polylineActive = false
let polylinePoints = []      // {x,y}[] 已確認的頂點
let polylineMouse  = null    // 游標即時位置，供 live 預覽用
let polylineLastMs = 0       // 上次 mousedown 時間戳，用於雙擊判斷

// ─── DOM ─────────────────────────────────────────────────────────────────────

const baseCanvas    = document.getElementById('baseCanvas')
const annotCanvas   = document.getElementById('annotCanvas')
const baseCtx       = baseCanvas.getContext('2d')
const annotCtx      = annotCanvas.getContext('2d')
const canvasArea    = document.getElementById('canvasArea')
const canvasWrapper = document.getElementById('canvasWrapper')
const textInputWrap = document.getElementById('textInputWrap')
const textInputEl   = document.getElementById('textInput')
const textMirrorEl  = document.getElementById('textMirror')

// ─── Utility ─────────────────────────────────────────────────────────────────

// hex + alpha → rgba string
function hexToRgba(hex, alpha) {
  if (!hex || hex === 'transparent') return `rgba(0,0,0,0)`
  const r = parseInt(hex.slice(1,3), 16)
  const g = parseInt(hex.slice(3,5), 16)
  const b = parseInt(hex.slice(5,7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// Resolve dash pattern from lineStyle string + base size
function getLineDash(style, sz) {
  switch (style) {
    case 'dash':         return [sz * 1.2,  sz * 0.7]
    case 'dash-lg':      return [sz * 2.5,  sz * 0.8]
    case 'dot':          return [sz * 0.15, sz * 0.9]
    case 'dot-dash':     return [sz * 0.15, sz * 0.7, sz * 1.5,  sz * 0.7]
    case 'dash-dot-dot': return [sz * 1.8,  sz * 0.5, sz * 0.15, sz * 0.5, sz * 0.15, sz * 0.5]
    default:             return []  // solid
  }
}

// Pick canvas lineCap based on start+end cap values
function capToLineCap(sc, ec) {
  if (sc === 'round' || ec === 'round') return 'round'
  if (sc === 'square' || ec === 'square') return 'square'
  return 'butt'
}

// Apply drop-shadow to canvas context (cleared by ctx.restore())
function setShadow(ctx) {
  ctx.shadowColor   = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur    = 8  * viewScale
  ctx.shadowOffsetX = 3  * viewScale
  ctx.shadowOffsetY = 3  * viewScale
}

// WCAG perceived luminance → AA-compliant text colour
function getTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return (0.299 * r + 0.587 * g + 0.114 * b) > 0.5 ? '#1c1c1e' : '#ffffff'
}

// ─── Options bar helpers ──────────────────────────────────────────────────────

function hideAllOptions() {
  ['grpRectShape','grpFillShape','grpColor','grpFillColor','grpThickness',
   'grpLineStyle','grpPenBorder','grpStrokeBorder','grpDashStyle',
   'grpCaps','grpRadius','grpFont','grpNumber','grpStrokeOpacity',
   'grpShadow','grpZoom','grpCrop','grpOcr','grpBoxSelect'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.classList.add('hidden')
  })
  document.getElementById('numValueEdit').classList.add('hidden')
  document.getElementById('btnLineOrtho')?.classList.remove('hidden')  // reset to visible by default
}

function showOptionsForTool(t) {
  hideAllOptions()
  if (t === 'zoom-in' || t === 'zoom-out') {
    document.getElementById('grpZoom').classList.remove('hidden')
    return
  }
  if (t === 'crop') {
    document.getElementById('grpCrop').classList.remove('hidden')
    return
  }
  if (t === 'ocr') {
    document.getElementById('grpOcr').classList.remove('hidden')
    document.getElementById('ocrStatusLabel').textContent = '請拖曳選取辨識區域'
    return
  }
  if (t === 'boxselect') {
    document.getElementById('grpBoxSelect').classList.remove('hidden')
    syncBoxSelUI()
    return
  }
  const sh  = id => document.getElementById(id).classList.remove('hidden')
  if (t === 'pen') {
    sh('grpColor'); sh('grpThickness'); sh('grpPenBorder'); sh('grpDashStyle')
    sh('grpCaps'); sh('grpStrokeOpacity'); sh('grpShadow')
    syncNumStrokeUI(false)
    syncDashStyle(lineStyle)
    syncCaps(startCap, endCap)
    syncPenBorderColor(penBorderColor)
    syncPenBorderThickness(penBorderThickness)
    syncPenBorderDash(penBorderDashStyle)
    syncStrokeOpacity(penOpacity)
    syncShadowCheck(penShadow)
    return
  }
  if (!['rect','ellipse','fillrect','fillellipse','line','text','number'].includes(t)) return
  // (polyline 由 line tool 雙擊切換，此處不需獨立 tool id)
  const isFill = t === 'fillrect' || t === 'fillellipse'
  if (!isFill) sh('grpColor')
  if (isFill) {
    sh('grpFillColor')
    syncFillMode(fillMode); syncFillColorA(fillColorA); syncFillColorB(fillColorB)
    syncFillGradientDir(fillGradientDir); syncFillOpacity(fillOpacity); syncFillBorderColor(fillBorderColor)
  }
  if (['rect','ellipse','fillrect','fillellipse','line','number'].includes(t)) sh('grpThickness')
  syncNumStrokeUI(t === 'number')
  if (t === 'line') {
    sh('grpLineStyle'); sh('grpDashStyle'); sh('grpCaps'); sh('grpStrokeOpacity'); sh('grpShadow')
    syncLineOrtho(lineOrtho); syncLineBorderColor(lineBorderColor)
    syncLineBorderThickness(lineBorderThickness); syncLineBorderDash(lineBorderDashStyle)
    syncDashStyle(lineStyle); syncCaps(startCap, endCap)
    syncStrokeOpacity(lineOpacity); syncShadowCheck(lineShadow)
  }
  if (t === 'rect') {
    sh('grpRectShape'); sh('grpStrokeBorder'); sh('grpDashStyle')
    sh('grpRadius'); sh('grpStrokeOpacity'); sh('grpShadow')
    syncRectShape(t)
    syncStrokeBorderColor(rectBorderColor); syncStrokeBorderThickness(rectBorderThickness); syncStrokeBorderDash(rectBorderDashStyle)
    syncStrokeBorderOffset(rectBorderOffsetX, rectBorderOffsetY)
    syncDashStyle(rectLineStyle); syncCornerRadius(cornerRadius)
    syncStrokeOpacity(rectOpacity); syncShadowCheck(rectShadow)
  }
  if (t === 'ellipse') {
    sh('grpRectShape'); sh('grpStrokeBorder'); sh('grpDashStyle')
    sh('grpStrokeOpacity'); sh('grpShadow')
    syncRectShape(t)
    syncStrokeBorderColor(ellipseBorderColor); syncStrokeBorderThickness(ellipseBorderThickness); syncStrokeBorderDash(ellipseBorderDashStyle)
    syncStrokeBorderOffset(ellipseBorderOffsetX, ellipseBorderOffsetY)
    syncDashStyle(ellipseLineStyle)
    syncStrokeOpacity(ellipseOpacity); syncShadowCheck(ellipseShadow)
  }
  if (t === 'fillrect') {
    sh('grpFillShape'); sh('grpDashStyle'); sh('grpRadius'); sh('grpShadow')
    syncFillShape(t); syncDashStyle(fillrectLineStyle); syncCornerRadius(cornerRadius); syncShadowCheck(fillrectShadow)
  }
  if (t === 'fillellipse') {
    sh('grpFillShape'); sh('grpDashStyle'); sh('grpShadow')
    syncFillShape(t); syncDashStyle(fillellipseLineStyle); syncShadowCheck(fillellipseShadow)
  }
  if (t === 'text') {
    sh('grpFont')
    syncTextShadowCheck(textShadow)
    syncTextBold(textBold); syncTextItalic(textItalic); syncTextUnderline(textUnderline); syncTextStrikethrough(textStrikethrough)
    syncTextAlign(textAlign)
    syncTextStrokeColor(textStrokeColor); syncTextStrokeWidth(textStrokeWidth)
    syncTextBgOpacity(textBgOpacity); syncTextBgPreview()
    syncFontFamily(fontFamily)
  }
  if (t === 'number') { sh('grpNumber'); sh('grpShadow'); syncShadowCheck(numShadow); syncNumStyle(numberStyle) }
}

function syncBoxSelUI() {
  const hasRect = boxSelRect && boxSelRect.w > 1 && boxSelRect.h > 1
  if (hasRect) {
    const w = Math.round(Math.abs(boxSelRect.w))
    const h = Math.round(Math.abs(boxSelRect.h))
    document.getElementById('boxSelSizeLabel').textContent = `${w} × ${h} px　Cmd+C 複製`
  } else {
    document.getElementById('boxSelSizeLabel').textContent = '請拖曳選取區域'
  }
}

function showOptionsForAnnot(a) {
  hideAllOptions()
  if (a.type === 'img') return   // overlay image has no editable colour/thickness options
  const t = a.type
  const sh = id => { const el = document.getElementById(id); if (el) el.classList.remove('hidden') }
  const isFill = t === 'fillrect' || t === 'fillellipse'
  if (!isFill) sh('grpColor')
  if (isFill)  sh('grpFillColor')
  if (['rect','ellipse','fillrect','fillellipse','line','polyline','number','pen'].includes(t)) sh('grpThickness')
  syncNumStrokeUI(t === 'number')

  if (['line','polyline'].includes(t)) {
    sh('grpLineStyle'); sh('grpDashStyle'); sh('grpCaps'); sh('grpStrokeOpacity'); sh('grpShadow')
    lineBorderColor = a.lineBorderColor ?? 'transparent'; syncLineBorderColor(lineBorderColor)
    lineBorderThickness = a.borderThickness ?? lineBorderThickness; syncLineBorderThickness(lineBorderThickness)
    lineBorderDashStyle = a.borderDashStyle ?? 'solid'; syncLineBorderDash(lineBorderDashStyle)
    lineStyle = a.lineStyle ?? 'solid'; syncDashStyle(lineStyle)
    startCap = a.startCap; endCap = a.endCap; syncCaps(startCap, endCap)
    lineOpacity = a.opacity ?? 100; syncStrokeOpacity(lineOpacity)
    syncShadowCheck(a.shadow ?? false)
    if (t === 'line') { lineOrtho = a.lineOrtho ?? false; syncLineOrtho(lineOrtho) }
    if (t === 'polyline') document.getElementById('btnLineOrtho')?.classList.add('hidden')
  }
  if (t === 'pen') {
    sh('grpPenBorder'); sh('grpDashStyle'); sh('grpCaps'); sh('grpStrokeOpacity'); sh('grpShadow')
    penBorderColor = a.penBorderColor ?? 'transparent'; syncPenBorderColor(penBorderColor)
    penBorderThickness = a.borderThickness ?? penBorderThickness; syncPenBorderThickness(penBorderThickness)
    penBorderDashStyle = a.borderDashStyle ?? 'solid'; syncPenBorderDash(penBorderDashStyle)
    lineStyle = a.lineStyle ?? 'solid'; syncDashStyle(lineStyle)
    startCap = a.startCap ?? 'round'; endCap = a.endCap ?? 'round'; syncCaps(startCap, endCap)
    penOpacity = a.penOpacity ?? 100; syncStrokeOpacity(penOpacity)
    syncShadowCheck(a.shadow ?? false)
  }
  if (t === 'rect') {
    sh('grpRectShape'); sh('grpStrokeBorder'); sh('grpDashStyle'); sh('grpRadius'); sh('grpStrokeOpacity'); sh('grpShadow')
    syncRectShape(t)
    rectBorderColor = a.borderColor ?? 'transparent'; syncStrokeBorderColor(rectBorderColor)
    rectBorderThickness = a.borderThickness ?? a.thickness ?? 2; syncStrokeBorderThickness(rectBorderThickness)
    rectBorderDashStyle = a.borderDashStyle ?? 'solid'; syncStrokeBorderDash(rectBorderDashStyle)
    rectBorderOffsetX = a.borderOffsetX ?? 0; rectBorderOffsetY = a.borderOffsetY ?? 0
    syncStrokeBorderOffset(rectBorderOffsetX, rectBorderOffsetY)
    rectLineStyle = a.lineStyle ?? 'solid'; syncDashStyle(rectLineStyle)
    cornerRadius = a.cornerRadius ?? 0; syncCornerRadius(cornerRadius)
    rectOpacity = a.opacity ?? 100; syncStrokeOpacity(rectOpacity)
    rectShadow = a.shadow ?? false; syncShadowCheck(rectShadow)
  }
  if (t === 'ellipse') {
    sh('grpRectShape'); sh('grpStrokeBorder'); sh('grpDashStyle'); sh('grpStrokeOpacity'); sh('grpShadow')
    syncRectShape(t)
    ellipseBorderColor = a.borderColor ?? 'transparent'; syncStrokeBorderColor(ellipseBorderColor)
    ellipseBorderThickness = a.borderThickness ?? a.thickness ?? 2; syncStrokeBorderThickness(ellipseBorderThickness)
    ellipseBorderDashStyle = a.borderDashStyle ?? 'solid'; syncStrokeBorderDash(ellipseBorderDashStyle)
    ellipseBorderOffsetX = a.borderOffsetX ?? 0; ellipseBorderOffsetY = a.borderOffsetY ?? 0
    syncStrokeBorderOffset(ellipseBorderOffsetX, ellipseBorderOffsetY)
    ellipseLineStyle = a.lineStyle ?? 'solid'; syncDashStyle(ellipseLineStyle)
    ellipseOpacity = a.opacity ?? 100; syncStrokeOpacity(ellipseOpacity)
    ellipseShadow = a.shadow ?? false; syncShadowCheck(ellipseShadow)
  }
  if (['rect','fillrect'].includes(t)) { cornerRadius = a.cornerRadius ?? 0; syncCornerRadius(cornerRadius) }

  // Sync UI state to annotation values
  color = a.color; syncColor(color)
  if ('thickness' in a) { thickness = a.thickness; syncThickness(thickness) }
  if (isFill) {
    fillMode = a.fillMode ?? 'solid'; syncFillMode(fillMode)
    fillColor = a.fillColor ?? '#ffcc00'; syncFillColor(fillColor)
    fillColorA = a.fillColorA ?? '#ffcc00'; syncFillColorA(fillColorA)
    if (fillColorA !== 'transparent') fillPrevColorA = fillColorA
    fillColorB = a.fillColorB ?? 'transparent'; syncFillColorB(fillColorB)
    if (fillColorB !== 'transparent') fillPrevColorB = fillColorB
    fillGradientDir = a.fillGradientDir ?? 'h'; syncFillGradientDir(fillGradientDir)
    fillOpacity = a.fillOpacity ?? 100; syncFillOpacity(fillOpacity)
    fillBorderColor = a.fillBorderColor ?? '#ffffff'; syncFillBorderColor(fillBorderColor)
    const fls = a.lineStyle ?? 'solid'
    if (t === 'fillrect') fillrectLineStyle = fls
    else fillellipseLineStyle = fls
    syncDashStyle(fls)
    sh('grpDashStyle'); sh('grpShadow')
    if (t === 'fillrect')    { fillrectShadow    = a.shadow ?? false; syncShadowCheck(fillrectShadow) }
    if (t === 'fillellipse') { fillellipseShadow = a.shadow ?? false; syncShadowCheck(fillellipseShadow) }
    if (['fillrect'].includes(t)) sh('grpRadius')
    if (t === 'fillrect' || t === 'fillellipse') { const fsh = document.getElementById('grpFillShape'); if (fsh) fsh.classList.remove('hidden'); syncFillShape(t) }
  }
  if (t === 'text') {
    fontSize        = a.fontSize;                     syncFontSize(fontSize)
    textStrokeColor = a.textStrokeColor ?? '#000000'; syncTextStrokeColor(textStrokeColor)
    const _tsw = a.textStrokeWidth ?? 0
    textStrokeWidth = _tsw <= 3 ? [0, 3, 6, 10][_tsw] : _tsw
    syncTextStrokeWidth(textStrokeWidth)
    textBgColor     = a.textBgColor   ?? '#000000'
    textBgOpacity   = a.textBgOpacity ?? 0;  syncTextBgOpacity(textBgOpacity); syncTextBgPreview()
    textShadow      = a.shadow ?? false;              syncTextShadowCheck(textShadow)
    textBold        = a.bold      ?? false;           syncTextBold(textBold)
    textItalic      = a.italic    ?? false;           syncTextItalic(textItalic)
    textUnderline     = a.underline     ?? false; syncTextUnderline(textUnderline)
    textStrikethrough = a.strikethrough ?? false; syncTextStrikethrough(textStrikethrough)
    textAlign         = a.textAlign     ?? 'left';    syncTextAlign(textAlign)
    fontFamily        = a.fontFamily    ?? 'system';  syncFontFamily(fontFamily)
    sh('grpFont')
  }
  if (t === 'number') {
    numSize        = a.size ?? 48;             syncNumSize(numSize)
    numShadow      = a.shadow ?? false;        syncShadowCheck(numShadow)
    numberStyle    = a.numberStyle ?? 'dot';   syncNumStyle(numberStyle)
    numThickness   = a.thickness ?? 0;         syncThickness(numThickness)
    numStrokeColor = a.numStrokeColor ?? '#ffffff'; syncNumStrokeColor(numStrokeColor)
    document.getElementById('numValueEdit').classList.remove('hidden')
    document.getElementById('numValueInput').value = a.value
    sh('grpNumber'); sh('grpShadow')
  }
}

// Sync UI controls
function syncColor(col) {
  const preview = document.getElementById('colorPreview')
  if (preview) preview.style.background = col
}

// Central colour-apply helper — use this instead of setting `color` directly
function applyColor(hex) {
  color = hex
  syncColor(hex)
  if (selectedId) updateSelectedAnnot({ color: hex })
  if (textActive) { textInputEl.style.color = hex; renderAnnotations() }
  pushRecentColor(hex)
  hideColorPanel()
}
function syncThickness(t) {
  document.getElementById('strokeWidthInput').value = t
}
function syncCornerRadius(v) { document.getElementById('cornerRadiusInput').value = v }
function syncLineOrtho(v) { document.getElementById('btnLineOrtho')?.classList.toggle('active', v) }
function syncDashStyle(ls) {
  const sel = document.getElementById('dashStyleSelect')
  if (sel) sel.value = ls
}
const syncLineStyle = syncDashStyle  // backward-compat alias
function syncLineBorderColor(hex) {
  const p = document.getElementById('lineBorderColorPreview')
  if (p) p.style.background = (hex === 'transparent' || !hex) ? 'repeating-linear-gradient(45deg,#888 0,#888 3px,#fff 3px,#fff 6px)' : hex
}
function syncPenBorderColor(hex) {
  const p = document.getElementById('penBorderColorPreview')
  if (p) p.style.background = (hex === 'transparent' || !hex) ? 'repeating-linear-gradient(45deg,#888 0,#888 3px,#fff 3px,#fff 6px)' : hex
}
function syncStrokeOpacity(v) {
  const inp = document.getElementById('strokeOpacityInput')
  if (inp) inp.value = v
}
function syncStrokeBorderColor(hex) {
  const p = document.getElementById('strokeBorderColorPreview')
  if (!p) return
  p.style.background = (hex === 'transparent' || !hex)
    ? 'repeating-linear-gradient(45deg,#888 0,#888 3px,#fff 3px,#fff 6px)'
    : hex
}
function syncStrokeBorderOffset(x, y) {
  const xi = document.getElementById('strokeBorderOffsetX')
  const yi = document.getElementById('strokeBorderOffsetY')
  if (xi) xi.value = x ?? 0
  if (yi) yi.value = y ?? 0
}
function syncCaps(sc, ec) {
  const ss = document.getElementById('startCapSelect')
  const es = document.getElementById('endCapSelect')
  if (ss) ss.value = sc ?? 'none'
  if (es) es.value = ec ?? 'arrow'
}
function syncLineBorderThickness(v) { const el = document.getElementById('lineBorderThicknessInput'); if (el) el.value = v }
function syncLineBorderDash(v)      { const el = document.getElementById('lineBorderDashSelect');    if (el) el.value = v }
function syncPenBorderThickness(v)  { const el = document.getElementById('penBorderThicknessInput'); if (el) el.value = v }
function syncPenBorderDash(v)       { const el = document.getElementById('penBorderDashSelect');     if (el) el.value = v }
function syncStrokeBorderThickness(v) { const el = document.getElementById('strokeBorderThicknessInput'); if (el) el.value = v }
function syncStrokeBorderDash(v)      { const el = document.getElementById('strokeBorderDashSelect');     if (el) el.value = v }
function syncFontSize(fs) { document.getElementById('fontSizeInput').value = fs }
function syncNumSize(ns) {
  document.querySelectorAll('.ns-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.ns) === ns))
}
function syncNumStrokeColor(hex) {
  const p = document.getElementById('numStrokeColorPreview')
  if (p) p.style.background = hex
}
function syncNumStrokeUI(isNumber) {
  document.getElementById('thicknessLabel').textContent = isNumber ? '描邊' : '粗細'
  document.getElementById('numStrokeColorPreview').style.display = isNumber ? '' : 'none'
  if (isNumber) {
    syncThickness(numThickness)
    syncNumStrokeColor(numStrokeColor)
  }
}
function syncNumCount() {
  const el = document.getElementById('numCountDisplay')
  if (el) el.textContent = numCount
}
function syncNumStyle(s) {
  document.querySelectorAll('.ns-style-btn').forEach(b => b.classList.toggle('active', b.dataset.nstyle === s))
  const limit = getStyleLimit(s)
  const el = document.getElementById('numStyleLimit')
  if (el) el.textContent = `上限：${limit === Infinity ? '∞' : limit}`
}
// ── Fill colour helpers ────────────────────────────────────────────────────────
function fillPreviewBg(hex) {
  return hex === 'transparent'
    ? 'repeating-conic-gradient(#aaa 0% 25%, #eee 0% 50%) 0 0 / 8px 8px'
    : hex
}

function syncFillMode(mode) {
  const solid = document.getElementById('btnFillSolid')
  const grad  = document.getElementById('btnFillGradient')
  if (mode === 'solid') { solid.classList.add('active'); grad.classList.remove('active') }
  else                  { grad.classList.add('active');  solid.classList.remove('active') }
  document.getElementById('fillSolidCtrl').classList.toggle('hidden', mode !== 'solid')
  document.getElementById('fillGradientCtrl').classList.toggle('hidden', mode !== 'gradient')
}
function syncFillColor(hex) {
  const p = document.getElementById('fillColorPreview')
  if (p) p.style.background = fillPreviewBg(hex)
}
function syncFillColorA(hex) {
  const p = document.getElementById('fillColorAPreview')
  if (p) p.style.background = fillPreviewBg(hex)
}
function syncFillColorB(hex) {
  const p = document.getElementById('fillColorBPreview')
  if (p) p.style.background = fillPreviewBg(hex)
}
function syncFillGradientDir(dir) {
  document.querySelectorAll('[data-fdir]').forEach(b => {
    if (b.dataset.fdir === dir) b.classList.add('active'); else b.classList.remove('active')
  })
}
function syncFillOpacity(val) {
  const inp = document.getElementById('fillOpacityInput')
  if (inp) inp.value = val
}
function syncFillBorderColor(hex) {
  const p = document.getElementById('fillBorderColorPreview')
  if (p) p.style.background = fillPreviewBg(hex)
}

// ── Text style sync ───────────────────────────────────────────────────────────
function syncTextStrokeColor(hex) {
  const p = document.getElementById('textStrokeColorPreview')
  if (p) p.style.background = hex
}
function syncTextStrokeWidth(w) {
  document.getElementById('textStrokeWidthInput').value = w
}
function syncTextBgColor(hex) {
  const p = document.getElementById('textBgColorPreview')
  if (!p) return
  if (hex === 'transparent') {
    p.style.background = ''
    p.classList.add('cpp-swatch-transparent')
  } else {
    p.style.background = hex
    p.classList.remove('cpp-swatch-transparent')
  }
}
// 根據當前 textBgOpacity 決定預覽色塊顯示透明或實色
function syncTextBgPreview() {
  syncTextBgColor(textBgOpacity === 0 ? 'transparent' : textBgColor)
}
function syncTextBgOpacity(v) {
  const el = document.getElementById('textBgOpacityInput')
  if (el) el.value = v
}
function syncFontFamily(id) {
  const sel = document.getElementById('fontFamilySelect')
  if (sel) sel.value = id
}
function syncTextBold(v)      { document.getElementById('btnTextBold')     ?.classList.toggle('active', v) }
function syncTextItalic(v)    { document.getElementById('btnTextItalic')   ?.classList.toggle('active', v) }
function syncTextUnderline(v)     { document.getElementById('btnTextUnderline')    ?.classList.toggle('active', v) }
function syncTextStrikethrough(v) { document.getElementById('btnTextStrikethrough')?.classList.toggle('active', v) }
function syncTextAlign(v) {
  textAlign = v
  document.getElementById('btnAlignLeft')  ?.classList.toggle('active', v === 'left')
  document.getElementById('btnAlignCenter')?.classList.toggle('active', v === 'center')
  document.getElementById('btnAlignRight') ?.classList.toggle('active', v === 'right')
}

function syncRectShape(shape) {
  document.getElementById('btnShapeRect')   ?.classList.toggle('active', shape === 'rect')
  document.getElementById('btnShapeEllipse')?.classList.toggle('active', shape === 'ellipse')
}
function syncFillShape(shape) {
  document.getElementById('btnFillShapeRect')   ?.classList.toggle('active', shape === 'fillrect')
  document.getElementById('btnFillShapeEllipse')?.classList.toggle('active', shape === 'fillellipse')
}
function syncShadowCheck(val) {
  const el = document.getElementById('shadowCheck')
  if (el) el.checked = val
}
function syncTextShadowCheck(val) {
  const el = document.getElementById('textShadowCheck')
  if (el) el.checked = val
}

function applyFillMode(mode) {
  fillMode = mode; syncFillMode(mode)
  if (selectedId) updateSelectedAnnot({ fillMode: mode })
}
function applyFillColor(hex) {
  fillColor = hex; syncFillColor(hex)
  if (selectedId) updateSelectedAnnot({ fillColor: hex })
  pushRecentColor(hex); hideColorPanel()
}
function applyFillColorA(hex) {
  if (hex !== 'transparent') fillPrevColorA = hex
  fillColorA = hex; syncFillColorA(hex)
  if (selectedId) updateSelectedAnnot({ fillColorA: hex })
  pushRecentColor(hex); hideColorPanel()
}
function applyFillColorB(hex) {
  if (hex !== 'transparent') fillPrevColorB = hex
  fillColorB = hex; syncFillColorB(hex)
  if (selectedId) updateSelectedAnnot({ fillColorB: hex })
  pushRecentColor(hex); hideColorPanel()
}
function applyFillGradientDir(dir) {
  fillGradientDir = dir; syncFillGradientDir(dir)
  if (selectedId) updateSelectedAnnot({ fillGradientDir: dir })
}
function applyFillOpacity(val) {
  fillOpacity = val; syncFillOpacity(val)
  if (selectedId) updateSelectedAnnot({ fillOpacity: val })
}
function applyFillBorderColor(hex) {
  fillBorderColor = hex; syncFillBorderColor(hex)
  if (selectedId) updateSelectedAnnot({ fillBorderColor: hex })
  pushRecentColor(hex); hideColorPanel()
}
function applyTextStrokeColor(hex) {
  textStrokeColor = hex; syncTextStrokeColor(hex)
  if (selectedId) updateSelectedAnnot({ textStrokeColor: hex })
  if (textActive) renderAnnotations()
  pushRecentColor(hex); hideColorPanel()
}
function applyTextBgColor(hex) {
  if (hex === 'transparent') {
    // 選「透明」= 關閉背景（將 opacity 歸零）
    textBgOpacity = 0; syncTextBgOpacity(0); syncTextBgPreview()
    if (selectedId) updateSelectedAnnot({ textBgOpacity: 0 })
    if (textActive) renderAnnotations()
    return
  }
  textBgColor = hex
  // 若之前因選透明而歸零，選新色時自動恢復預設 50%
  if (textBgOpacity === 0) { textBgOpacity = 50; syncTextBgOpacity(50) }
  syncTextBgPreview()   // opacity 已確定後再更新色塊
  if (selectedId) updateSelectedAnnot({ textBgColor: hex, textBgOpacity: textBgOpacity })
  if (textActive) renderAnnotations()
  pushRecentColor(hex); hideColorPanel()
}

// Update selected annotation's properties + push history
function updateSelectedAnnot(props) {
  const a = annotations.find(x => x.id === selectedId)
  if (!a) return
  Object.assign(a, props)
  pushHistory()
  renderAnnotations()
}

// ─── UI init ─────────────────────────────────────────────────────────────────

// Initialise colour preview to match the default colour
syncColor(color)

// Mode toggle
document.getElementById('btnFillSolid').addEventListener('click',    () => applyFillMode('solid'))
document.getElementById('btnFillGradient').addEventListener('click', () => applyFillMode('gradient'))

// Gradient direction buttons
document.querySelectorAll('[data-fdir]').forEach(btn =>
  btn.addEventListener('click', () => applyFillGradientDir(btn.dataset.fdir))
)

// Opacity input
document.getElementById('fillOpacityInput').addEventListener('change', e =>
  applyFillOpacity(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))
)
document.getElementById('fillOpacityInput').addEventListener('keydown', e => e.stopPropagation())


// Sync initial state
syncFillMode(fillMode)
syncFillColor(fillColor)
syncFillColorA(fillColorA)
syncFillColorB(fillColorB)
syncFillGradientDir(fillGradientDir)
syncFillOpacity(fillOpacity)
syncFillBorderColor(fillBorderColor)

// ─── Extend canvas ────────────────────────────────────────────────────────────

;(function initExtendCanvas() {
  // Direction config:
  //   showW / showH / showS  — which input rows to display
  //   lblW  / lblH           — human-readable label for the input
  //   oxLeft                 — true if extension is to the LEFT (original shifts right by addW)
  //   oyTop                  — true if extension is to the TOP  (original shifts down  by addH)
  const DIRS = {
    tl: { showW: true,  showH: true,  showS: false, lblW: '向左延伸', lblH: '向上延伸', oxLeft: true,  oyTop: true  },
    t:  { showW: false, showH: true,  showS: false,                    lblH: '向上延伸', oxLeft: false, oyTop: true  },
    tr: { showW: true,  showH: true,  showS: false, lblW: '向右延伸', lblH: '向上延伸', oxLeft: false, oyTop: true  },
    l:  { showW: true,  showH: false, showS: false, lblW: '向左延伸',                   oxLeft: true,  oyTop: false },
    c:  { showW: false, showH: false, showS: true                                                                    },
    r:  { showW: true,  showH: false, showS: false, lblW: '向右延伸',                   oxLeft: false, oyTop: false },
    bl: { showW: true,  showH: true,  showS: false, lblW: '向左延伸', lblH: '向下延伸', oxLeft: true,  oyTop: false },
    b:  { showW: false, showH: true,  showS: false,                    lblH: '向下延伸', oxLeft: false, oyTop: false },
    br: { showW: true,  showH: true,  showS: false, lblW: '向右延伸', lblH: '向下延伸', oxLeft: false, oyTop: false },
  }

  let selectedDir = 'r'

  const modal   = document.getElementById('extendModal')
  const rowW    = document.getElementById('extRowW')
  const rowH    = document.getElementById('extRowH')
  const rowS    = document.getElementById('extRowS')
  const inputW  = document.getElementById('extendW')
  const inputH  = document.getElementById('extendH')
  const inputS  = document.getElementById('extendS')
  const lblW    = document.getElementById('extLblW')
  const lblH    = document.getElementById('extLblH')
  const preFrom = document.getElementById('extendPreviewFrom')
  const preTo   = document.getElementById('extendPreviewTo')

  function getAmounts() {
    const d = DIRS[selectedDir]
    let addW = 0, addH = 0, offX = 0, offY = 0
    if (d.showS) {
      const s = Math.max(0, parseInt(inputS.value) || 0)
      addW = s * 2; addH = s * 2; offX = s; offY = s
    } else {
      if (d.showW) addW = Math.max(0, parseInt(inputW.value) || 0)
      if (d.showH) addH = Math.max(0, parseInt(inputH.value) || 0)
      if (d.oxLeft) offX = addW
      if (d.oyTop)  offY = addH
    }
    return { addW, addH, offX, offY }
  }

  function updatePreview() {
    const { addW, addH } = getAmounts()
    preFrom.textContent = `${imgWidth} × ${imgHeight}`
    preTo.textContent   = `${imgWidth + addW} × ${imgHeight + addH}`
  }

  function updateDirUI() {
    const d = DIRS[selectedDir]
    document.querySelectorAll('.dir-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.dir === selectedDir)
    )
    rowW.classList.toggle('hidden', !d.showW)
    rowH.classList.toggle('hidden', !d.showH)
    rowS.classList.toggle('hidden', !d.showS)
    if (d.lblW) lblW.textContent = d.lblW
    if (d.lblH) lblH.textContent = d.lblH
    updatePreview()
  }

  function openExtendModal() {
    updateDirUI()   // also calls updatePreview with current imgWidth/imgHeight
    modal.classList.remove('hidden')
  }

  function closeExtendModal() { modal.classList.add('hidden') }

  // Direction pad clicks
  document.querySelectorAll('.dir-btn').forEach(b => {
    b.addEventListener('click', () => { selectedDir = b.dataset.dir; updateDirUI() })
  })

  // Input changes → live preview
  ;[inputW, inputH, inputS].forEach(inp => {
    inp.addEventListener('input', updatePreview)
    inp.addEventListener('keydown', e => e.stopPropagation())  // don't fire editor shortcuts
  })

  // Confirm
  document.getElementById('btnExtendConfirm').addEventListener('click', () => {
    const { addW, addH, offX, offY } = getAmounts()
    if (addW === 0 && addH === 0) { closeExtendModal(); return }

    const newW = imgWidth  + addW
    const newH = imgHeight + addH

    // Draw original onto a white canvas at the computed offset
    const off = document.createElement('canvas')
    off.width = newW; off.height = newH
    const ctx = off.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, newW, newH)
    ctx.drawImage(imgElement, offX, offY)

    // Shift annotations if the original image moved (left / top extension)
    if (offX > 0 || offY > 0) {
      annotations.forEach(a => moveAnnot(a, offX, offY))
    }

    const newImg = new Image()
    newImg.onload = () => {
      imgElement = newImg
      imgWidth   = newW
      imgHeight  = newH
      document.getElementById('imgInfo').textContent = `${imgWidth} × ${imgHeight} px`
      userZoomed = false
      fitCanvas()
      drawBase()
      renderAnnotations()
      showToast(`已延伸：${newW} × ${newH} px`)
    }
    newImg.src = off.toDataURL()
    closeExtendModal()
  })

  // Cancel / close
  document.getElementById('btnExtendCancel').addEventListener('click', closeExtendModal)
  document.getElementById('extendModalClose').addEventListener('click', closeExtendModal)
  modal.addEventListener('click', e => { if (e.target === modal) closeExtendModal() })

  // Toolbar button + expose for keydown
  document.getElementById('btnExtend').addEventListener('click', openExtendModal)
})()

// ─── Overlay image (E3) ───────────────────────────────────────────────────────

;(function initOverlayImg() {
  // Use a hidden <input type="file"> — no IPC needed in this renderer context
  const fileInput = document.createElement('input')
  fileInput.type    = 'file'
  fileInput.accept  = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml'
  fileInput.style.display = 'none'
  document.body.appendChild(fileInput)

  document.getElementById('btnOverlayImg').addEventListener('click', () => {
    if (annotations.some(a => a.type === 'img')) {
      showToast('請先刪除現有疊入圖（Delete 鍵），再插入新圖', true)
      return
    }
    fileInput.click()
  })

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]
    if (!file) return
    fileInput.value = ''   // allow re-selecting the same file next time

    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target.result
      const tempImg = new Image()
      tempImg.onload = () => {
        const nw = tempImg.naturalWidth
        const nh = tempImg.naturalHeight
        // Default size: fit within 50% of base image; never exceed natural size
        const scale = Math.min(1, (imgWidth * 0.5) / nw, (imgHeight * 0.5) / nh)
        const w = Math.max(10, Math.round(nw * scale))
        const h = Math.max(10, Math.round(nh * scale))
        // Centre on base image
        const x = Math.round((imgWidth  - w) / 2)
        const y = Math.round((imgHeight - h) / 2)

        const id = newId()
        _imgCache.set(id, tempImg)   // pre-populate cache so first render is instant
        pushHistory()
        annotations.push({ id, type: 'img', x, y, w, h, src, aspectRatio: nw / nh })
        setTool('select')
        selectedId = id              // set AFTER setTool (setTool clears selectedId)
        renderAnnotations()
        showToast('疊入圖片已插入，拖動可移動，拖角落可等比縮放')
      }
      tempImg.src = src
    }
    reader.readAsDataURL(file)
  })
})()

// ─── Floating colour-picker panel ────────────────────────────────────────────

let _cppApplyFn    = null
let _cppGetCurrent = null
let _cppAnchorEl   = null

function showColorPanel(anchorEl, applyFn, getCurrentFn) {
  _cppApplyFn    = applyFn
  _cppGetCurrent = getCurrentFn
  _cppAnchorEl   = anchorEl
  const cur = (getCurrentFn() || '').toLowerCase()
  // Sync active swatch
  document.querySelectorAll('.cpp-swatch').forEach(s =>
    s.classList.toggle('active', s.dataset.hex === cur)
  )
  // Sync hex input
  document.getElementById('cppHexInput').value =
    cur.startsWith('#') ? cur.slice(1).toUpperCase() : ''
  // Position BEFORE showing to avoid flash at wrong location
  const panel = document.getElementById('colorPickerPanel')
  const ar = anchorEl.getBoundingClientRect()
  panel.style.left = ar.left + 'px'
  panel.style.top  = (ar.bottom + 6) + 'px'
  panel.classList.remove('hidden')
  // Clamp to viewport after first paint
  requestAnimationFrame(() => {
    const pr = panel.getBoundingClientRect()
    if (pr.right  > window.innerWidth  - 8) panel.style.left = Math.max(8, window.innerWidth  - pr.width  - 8) + 'px'
    if (pr.bottom > window.innerHeight - 8) panel.style.top  = Math.max(8, ar.top - pr.height - 6) + 'px'
  })
}

function hideColorPanel() {
  document.getElementById('colorPickerPanel').classList.add('hidden')
  _cppApplyFn = _cppGetCurrent = _cppAnchorEl = null
}

;(function initColorPanel() {
  // Update the panel's active-swatch highlight + hex field after a colour is applied
  function cppSyncDisplay(hex) {
    document.querySelectorAll('.cpp-swatch').forEach(s =>
      s.classList.toggle('active', s.dataset.hex === hex)
    )
    const hexIn = document.getElementById('cppHexInput')
    if (hexIn && hex && hex.startsWith('#')) hexIn.value = hex.slice(1).toUpperCase()
  }

  // Build theme grid (column-by-column → each hue is one column, rows = shades)
  const themeEl = document.getElementById('cppTheme')
  PALETTE_THEME.forEach(col => {
    const colEl = document.createElement('div')
    colEl.className = 'cpp-col'
    col.forEach(hex => {
      const btn = document.createElement('button')
      btn.className    = 'cpp-swatch'
      btn.dataset.hex  = hex
      btn.style.background = hex
      // faint border for light swatches so they're visible on dark panel
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
      if (r + g + b > 500) btn.style.boxShadow = 'inset 0 0 0 1px rgba(0,0,0,0.15)'
      // Panel stays open — user can freely browse colours
      btn.addEventListener('click', () => { if (_cppApplyFn) { _cppApplyFn(hex); cppSyncDisplay(hex) } })
      colEl.appendChild(btn)
    })
    themeEl.appendChild(colEl)
  })

  // Build standard colours row (including transparent swatch at end)
  const stdEl = document.getElementById('cppStandard')
  PALETTE_STANDARD.forEach(hex => {
    const btn = document.createElement('button')
    btn.className   = 'cpp-swatch'
    btn.dataset.hex = hex
    if (hex === 'transparent') {
      btn.classList.add('cpp-swatch-transparent')
      btn.title = '透明'
    } else {
      btn.style.background = hex
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
      if (r + g + b > 500) btn.style.boxShadow = 'inset 0 0 0 1px rgba(0,0,0,0.15)'
    }
    btn.addEventListener('click', () => { if (_cppApplyFn) { _cppApplyFn(hex); cppSyncDisplay(hex) } })
    stdEl.appendChild(btn)
  })

  // Eyedropper in panel
  const eyeBtn = document.getElementById('cppEyedropper')
  const native = document.getElementById('cppNativePicker')
  eyeBtn.addEventListener('click', async () => {
    if (window.EyeDropper) {
      eyeBtn.classList.add('active')
      try {
        const { sRGBHex } = await new EyeDropper().open()
        if (_cppApplyFn) { _cppApplyFn(sRGBHex); cppSyncDisplay(sRGBHex) }
      } catch { /* user cancelled */ } finally { eyeBtn.classList.remove('active') }
    } else {
      const cur = _cppGetCurrent ? _cppGetCurrent() : '#000000'
      native.value = (cur === 'transparent' || !cur.startsWith('#')) ? '#ffcc00' : cur
      native.click()
    }
  })
  native.addEventListener('input', () => {
    if (_cppApplyFn) { _cppApplyFn(native.value); cppSyncDisplay(native.value) }
  })

  // Hex input in panel
  const hexIn = document.getElementById('cppHexInput')
  hexIn.addEventListener('keydown', e => e.stopPropagation())
  hexIn.addEventListener('input', () => {
    const clean = hexIn.value.replace(/[^0-9a-fA-F]/g, '')
    hexIn.value = clean.toUpperCase()
    if (clean.length === 6 && _cppApplyFn) {
      const hex = '#' + clean.toLowerCase()
      _cppApplyFn('#' + clean)
      document.querySelectorAll('.cpp-swatch').forEach(s =>
        s.classList.toggle('active', s.dataset.hex === hex)
      )
    }
  })
  hexIn.addEventListener('paste', e => {
    e.preventDefault()
    const text  = (e.clipboardData || window.clipboardData).getData('text')
    const clean = text.replace(/^#/, '').replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
    hexIn.value = clean.toUpperCase()
    if (clean.length === 6 && _cppApplyFn) {
      _cppApplyFn('#' + clean)
      cppSyncDisplay('#' + clean.toLowerCase())
    }
  })

  // Build / rebuild recent colours row
  const recentEl      = document.getElementById('cppRecent')
  const recentSection = document.getElementById('cppRecentSection')
  _rebuildRecentRow = function() {
    recentEl.innerHTML = ''
    recentSection.style.display = recentColors.length > 0 ? '' : 'none'
    recentColors.forEach(hex => {
      const btn = document.createElement('button')
      btn.className   = 'cpp-swatch'
      btn.dataset.hex = hex
      btn.style.background = hex
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
      if (r + g + b > 500) btn.style.boxShadow = 'inset 0 0 0 1px rgba(0,0,0,0.15)'
      btn.addEventListener('click', () => { if (_cppApplyFn) { _cppApplyFn(hex); cppSyncDisplay(hex) } })
      recentEl.appendChild(btn)
    })
  }

  // Panel closes ONLY when user clicks the colour preview again (toggle in openColorPanel).
  // No auto-close on outside click — avoids conflicts with canvas editing actions.
})()

// openColorPanel: toggle (click same anchor again = close) or open for new anchor
function openColorPanel(anchorEl, applyFn, getCurrentFn) {
  const panel = document.getElementById('colorPickerPanel')
  if (_cppAnchorEl === anchorEl && !panel.classList.contains('hidden')) {
    hideColorPanel()
  } else {
    showColorPanel(anchorEl, applyFn, getCurrentFn)
  }
}

// Wire ALL colour preview squares → floating panel (with toggle)
document.getElementById('colorPreview').addEventListener('click', function() {
  openColorPanel(this, applyColor, () => color)
})
document.getElementById('fillColorPreview').addEventListener('click', function() {
  openColorPanel(this, applyFillColor, () => fillColor)
})
document.getElementById('fillColorAPreview').addEventListener('click', function() {
  openColorPanel(this, applyFillColorA, () => fillColorA)
})
document.getElementById('fillColorBPreview').addEventListener('click', function() {
  openColorPanel(this, applyFillColorB, () => fillColorB)
})
document.getElementById('fillBorderColorPreview').addEventListener('click', function() {
  openColorPanel(this, applyFillBorderColor, () => fillBorderColor)
})

// Number stroke colour
document.getElementById('numStrokeColorPreview').addEventListener('click', function() {
  openColorPanel(this, hex => {
    numStrokeColor = hex
    syncNumStrokeColor(hex)
    if (selectedId) { updateSelectedAnnot({ numStrokeColor: hex }); renderAnnotations() }
    hideColorPanel()   // 選色後自動關閉
  }, () => numStrokeColor)
})

// Line border colour
document.getElementById('lineBorderColorPreview').addEventListener('click', function() {
  openColorPanel(this, hex => {
    lineBorderColor = hex
    syncLineBorderColor(hex)
    if (selectedId) updateSelectedAnnot({ lineBorderColor: hex })
    hideColorPanel()
  }, () => lineBorderColor)
})

// Pen border colour
document.getElementById('penBorderColorPreview').addEventListener('click', function() {
  openColorPanel(this, hex => {
    penBorderColor = hex
    syncPenBorderColor(hex)
    if (selectedId) updateSelectedAnnot({ penBorderColor: hex })
    hideColorPanel()
  }, () => penBorderColor)
})

// Thickness — manual input
document.getElementById('strokeWidthInput').addEventListener('input', e => {
  const v = Math.max(0, Math.min(999, parseInt(e.target.value) || 0))
  if (tool === 'number') {
    numThickness = v
    if (selectedId) updateSelectedAnnot({ thickness: v })
  } else {
    thickness = v
    if (selectedId) updateSelectedAnnot({ thickness })
  }
})

// Thickness — quick preset
document.getElementById('strokeWidthPreset').addEventListener('change', e => {
  if (e.target.value === '') return
  const v = parseInt(e.target.value)
  if (tool === 'number') {
    numThickness = v
    syncThickness(v)
    if (selectedId) updateSelectedAnnot({ thickness: v })
  } else {
    thickness = v
    syncThickness(thickness)
    if (selectedId) updateSelectedAnnot({ thickness })
  }
  e.target.value = ''
})

// Corner radius (rect / fillrect)
document.getElementById('cornerRadiusInput').addEventListener('input', e => {
  cornerRadius = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
  syncCornerRadius(cornerRadius)
  if (selectedId) updateSelectedAnnot({ cornerRadius })
  else redraw()
})

// Line ortho toggle
// OFF → ON（tool=line，無選取）：切換成折線繪製模式（click-click-雙擊）
// OFF → ON（有選取 line）：吸附已選線段至水平/垂直
// ON  → OFF：取消進行中折線（如有）
document.getElementById('btnLineOrtho').addEventListener('click', () => {
  lineOrtho = !lineOrtho
  syncLineOrtho(lineOrtho)
  if (!lineOrtho) { _cancelPolyline(); renderAnnotations() }
  if (selectedId) {
    const ann = annotations.find(x => x.id === selectedId)
    if (ann && ann.type === 'line' && lineOrtho) {
      const dx = Math.abs(ann.x2 - ann.x1), dy = Math.abs(ann.y2 - ann.y1)
      const snapped = dx >= dy ? { y2: ann.y1 } : { x2: ann.x1 }
      updateSelectedAnnot({ lineOrtho, ...snapped })
    } else if (ann && ann.type === 'line') {
      updateSelectedAnnot({ lineOrtho })
    }
  }
})

// Dash style (shared: pen / line / polyline / rect / ellipse / fillrect / fillellipse)
document.getElementById('dashStyleSelect').addEventListener('change', e => {
  const val = e.target.value
  const t = selectedId ? (annotations.find(a => a.id === selectedId)?.type ?? tool) : tool
  if (['pen','line','polyline'].includes(t)) {
    lineStyle = val
  } else if (t === 'rect') {
    rectLineStyle = val
  } else if (t === 'ellipse') {
    ellipseLineStyle = val
  } else if (t === 'fillrect') {
    fillrectLineStyle = val
  } else if (t === 'fillellipse') {
    fillellipseLineStyle = val
  }
  if (selectedId) updateSelectedAnnot({ lineStyle: val })
  else renderAnnotations()
})

// Stroke opacity (shared: pen / line / polyline / rect / ellipse)
document.getElementById('strokeOpacityInput').addEventListener('input', e => {
  const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
  e.target.value = val
  const t = selectedId ? (annotations.find(a => a.id === selectedId)?.type ?? tool) : tool
  if (t === 'pen') {
    penOpacity = val
    if (selectedId) updateSelectedAnnot({ penOpacity: val })
  } else if (t === 'rect') {
    rectOpacity = val
    if (selectedId) updateSelectedAnnot({ opacity: val })
  } else if (t === 'ellipse') {
    ellipseOpacity = val
    if (selectedId) updateSelectedAnnot({ opacity: val })
  } else if (['line','polyline'].includes(t)) {
    lineOpacity = val
    if (selectedId) updateSelectedAnnot({ opacity: val })
  }
})

// Stroke border colour (rect / ellipse)
document.getElementById('strokeBorderColorPreview').addEventListener('click', function() {
  const t = selectedId ? (annotations.find(a => a.id === selectedId)?.type ?? tool) : tool
  openColorPanel(this, hex => {
    if (t === 'rect')    { rectBorderColor    = hex; syncStrokeBorderColor(hex) }
    if (t === 'ellipse') { ellipseBorderColor = hex; syncStrokeBorderColor(hex) }
    if (selectedId) updateSelectedAnnot({ borderColor: hex })
    hideColorPanel()
  }, () => t === 'ellipse' ? ellipseBorderColor : rectBorderColor)
})

// Stroke border offset X / Y (rect / ellipse)
document.getElementById('strokeBorderOffsetX').addEventListener('input', e => {
  const val = parseInt(e.target.value) || 0
  const t = selectedId ? (annotations.find(a => a.id === selectedId)?.type ?? tool) : tool
  if (t === 'rect')    rectBorderOffsetX    = val
  if (t === 'ellipse') ellipseBorderOffsetX = val
  if (selectedId) updateSelectedAnnot({ borderOffsetX: val })
  else renderAnnotations()
})
document.getElementById('strokeBorderOffsetY').addEventListener('input', e => {
  const val = parseInt(e.target.value) || 0
  const t = selectedId ? (annotations.find(a => a.id === selectedId)?.type ?? tool) : tool
  if (t === 'rect')    rectBorderOffsetY    = val
  if (t === 'ellipse') ellipseBorderOffsetY = val
  if (selectedId) updateSelectedAnnot({ borderOffsetY: val })
  else renderAnnotations()
})

// Caps (起點 / 終點 下拉)
document.getElementById('startCapSelect').addEventListener('change', e => {
  startCap = e.target.value
  if (selectedId) updateSelectedAnnot({ startCap })
})
document.getElementById('endCapSelect').addEventListener('change', e => {
  endCap = e.target.value
  if (selectedId) updateSelectedAnnot({ endCap })
})

// Line border thickness / dash
document.getElementById('lineBorderThicknessInput').addEventListener('input', e => {
  lineBorderThickness = Math.max(1, parseInt(e.target.value) || 1)
  if (selectedId) updateSelectedAnnot({ borderThickness: lineBorderThickness })
  else renderAnnotations()
})
document.getElementById('lineBorderDashSelect').addEventListener('change', e => {
  lineBorderDashStyle = e.target.value
  if (selectedId) updateSelectedAnnot({ borderDashStyle: lineBorderDashStyle })
  else renderAnnotations()
})

// Pen border thickness / dash
document.getElementById('penBorderThicknessInput').addEventListener('input', e => {
  penBorderThickness = Math.max(1, parseInt(e.target.value) || 1)
  if (selectedId) updateSelectedAnnot({ borderThickness: penBorderThickness })
  else renderAnnotations()
})
document.getElementById('penBorderDashSelect').addEventListener('change', e => {
  penBorderDashStyle = e.target.value
  if (selectedId) updateSelectedAnnot({ borderDashStyle: penBorderDashStyle })
  else renderAnnotations()
})

// Stroke border thickness / dash (rect / ellipse)
document.getElementById('strokeBorderThicknessInput').addEventListener('input', e => {
  const val = Math.max(1, parseInt(e.target.value) || 1)
  const t = selectedId ? (annotations.find(a => a.id === selectedId)?.type ?? tool) : tool
  if (t === 'rect')    rectBorderThickness    = val
  if (t === 'ellipse') ellipseBorderThickness = val
  if (selectedId) updateSelectedAnnot({ borderThickness: val })
  else renderAnnotations()
})
document.getElementById('strokeBorderDashSelect').addEventListener('change', e => {
  const val = e.target.value
  const t = selectedId ? (annotations.find(a => a.id === selectedId)?.type ?? tool) : tool
  if (t === 'rect')    rectBorderDashStyle    = val
  if (t === 'ellipse') ellipseBorderDashStyle = val
  if (selectedId) updateSelectedAnnot({ borderDashStyle: val })
  else renderAnnotations()
})

// Font size — manual input
document.getElementById('fontSizeInput').addEventListener('input', e => {
  fontSize = Math.max(8, Math.min(400, parseInt(e.target.value) || 48))
  if (selectedId) updateSelectedAnnot({ fontSize })
  if (textActive) {
    textInputEl.style.fontSize = Math.max(fontSize * viewScale, 14) + 'px'
    resizeTextInput()
  }
})

// Font size — quick preset select
document.getElementById('fontSizePreset').addEventListener('change', e => {
  if (!e.target.value) return
  fontSize = parseInt(e.target.value)
  syncFontSize(fontSize)
  e.target.value = ''   // reset to "—" placeholder
  if (selectedId) updateSelectedAnnot({ fontSize })
  if (textActive) {
    textInputEl.style.fontSize = Math.max(fontSize * viewScale, 14) + 'px'
    resizeTextInput()
  }
})

// Text stroke — manual input
document.getElementById('textStrokeWidthInput').addEventListener('input', e => {
  textStrokeWidth = Math.max(0, Math.min(99, parseInt(e.target.value) || 0))
  if (selectedId) updateSelectedAnnot({ textStrokeWidth })
  if (textActive) renderAnnotations()
})

// Text stroke — quick preset
document.getElementById('textStrokeWidthPreset').addEventListener('change', e => {
  if (e.target.value === '') return
  textStrokeWidth = parseInt(e.target.value)
  syncTextStrokeWidth(textStrokeWidth)
  e.target.value = ''
  if (selectedId) updateSelectedAnnot({ textStrokeWidth })
  if (textActive) renderAnnotations()
})

// Text stroke colour preview
document.getElementById('textStrokeColorPreview').addEventListener('click', function() {
  openColorPanel(this, applyTextStrokeColor, () => textStrokeColor)
})

// Text background colour preview
document.getElementById('textBgColorPreview').addEventListener('click', function() {
  openColorPanel(this, applyTextBgColor, () => textBgColor)
})

// Text background opacity
document.getElementById('textBgOpacityInput').addEventListener('input', e => {
  textBgOpacity = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
  syncTextBgPreview()
  if (selectedId) updateSelectedAnnot({ textBgOpacity })
  if (textActive) renderAnnotations()
})

// Text shadow checkbox
document.getElementById('textShadowCheck').addEventListener('change', e => {
  textShadow = e.target.checked
  if (selectedId) updateSelectedAnnot({ shadow: textShadow })
  if (textActive) renderAnnotations()
})

// Font family select
document.getElementById('fontFamilySelect').addEventListener('change', e => {
  fontFamily = e.target.value
  if (selectedId) updateSelectedAnnot({ fontFamily })
  applyTextStyleToInput()
  if (textActive) renderAnnotations()
})

// B / I / U toggles
;[
  ['btnTextBold',      () => { textBold      = !textBold;      syncTextBold(textBold);           if (selectedId) updateSelectedAnnot({ bold:      textBold      }); applyTextStyleToInput() }],
  ['btnTextItalic',    () => { textItalic    = !textItalic;    syncTextItalic(textItalic);       if (selectedId) updateSelectedAnnot({ italic:    textItalic    }); applyTextStyleToInput() }],
  ['btnTextUnderline',     () => { textUnderline     = !textUnderline;     syncTextUnderline(textUnderline);         if (selectedId) updateSelectedAnnot({ underline:     textUnderline     }); applyTextStyleToInput() }],
  ['btnTextStrikethrough', () => { textStrikethrough = !textStrikethrough; syncTextStrikethrough(textStrikethrough); if (selectedId) updateSelectedAnnot({ strikethrough: textStrikethrough }); applyTextStyleToInput() }],
].forEach(([id, fn]) => document.getElementById(id).addEventListener('click', fn))

// 對齊按鈕
;['left','center','right'].forEach(v => {
  document.getElementById(`btnAlign${v.charAt(0).toUpperCase()}${v.slice(1)}`)
    .addEventListener('click', () => {
      syncTextAlign(v)
      if (selectedId) updateSelectedAnnot({ textAlign: v })
      applyTextStyleToInput()
      _repositionTextInput()          // 輸入中時同步移動 textarea 錨點
      if (textActive) renderAnnotations()
    })
})

// Shared shadow checkbox (rect / ellipse / fillrect / fillellipse / number / line / polyline / pen)
document.getElementById('shadowCheck').addEventListener('change', e => {
  const val = e.target.checked
  if      (tool === 'rect')        rectShadow        = val
  else if (tool === 'ellipse')     ellipseShadow     = val
  else if (tool === 'fillrect')    fillrectShadow    = val
  else if (tool === 'fillellipse') fillellipseShadow = val
  else if (tool === 'number')      numShadow         = val
  else if (tool === 'line' || tool === 'polyline') lineShadow = val
  else if (tool === 'pen')         penShadow         = val
  if (selectedId) {
    const a = annotations.find(x => x.id === selectedId)
    if (a) {
      if (a.type === 'rect')        rectShadow        = val
      if (a.type === 'ellipse')     ellipseShadow     = val
      if (a.type === 'fillrect')    fillrectShadow    = val
      if (a.type === 'fillellipse') fillellipseShadow = val
      if (a.type === 'number')      numShadow         = val
      if (a.type === 'line' || a.type === 'polyline') lineShadow = val
      if (a.type === 'pen')         penShadow         = val
      updateSelectedAnnot({ shadow: val })
    }
  }
})

// 矩形框 ↔ 橢圓框 切換（grpRectShape 按鈕）
;['rect','ellipse'].forEach(shape => {
  document.getElementById(shape === 'rect' ? 'btnShapeRect' : 'btnShapeEllipse').addEventListener('click', () => {
    const a = selectedId ? annotations.find(x => x.id === selectedId) : null
    if (a && (a.type === 'rect' || a.type === 'ellipse')) {
      // 已選取 rect/ellipse 標注：直接轉換形狀，留在 select 模式
      if (a.type !== shape) { a.type = shape; pushHistory() }
      syncRectShape(shape)
      showOptionsForAnnot(a)
      renderAnnotations()
    } else {
      // 無選取標注：切換繪圖工具
      setTool(shape)
    }
  })
})

// 色塊 ↔ 橢圓色塊 切換（grpFillShape 按鈕）
;['fillrect','fillellipse'].forEach(shape => {
  document.getElementById(shape === 'fillrect' ? 'btnFillShapeRect' : 'btnFillShapeEllipse').addEventListener('click', () => {
    const a = selectedId ? annotations.find(x => x.id === selectedId) : null
    if (a && (a.type === 'fillrect' || a.type === 'fillellipse')) {
      if (a.type !== shape) { a.type = shape; pushHistory() }
      syncFillShape(shape)
      showOptionsForAnnot(a)
      renderAnnotations()
    } else {
      setTool(shape)
    }
  })
})

// Number style
document.querySelectorAll('.ns-style-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    numberStyle = btn.dataset.nstyle
    numCount = 1   // 切換風格一律從 1 開始
    syncNumStyle(numberStyle)
    syncNumCount()
    if (selectedId) { updateSelectedAnnot({ numberStyle }); renderAnnotations() }
  })
)

// Number size
document.querySelectorAll('.ns-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    numSize = parseInt(btn.dataset.ns)
    syncNumSize(numSize)
    if (selectedId) updateSelectedAnnot({ size: numSize })
  })
)

// Number value edit (shown when a number annotation is selected)
document.getElementById('numValueInput').addEventListener('input', e => {
  const v = parseInt(e.target.value)
  if (!isNaN(v) && v >= 0 && selectedId) updateSelectedAnnot({ value: v })
})

// Number reset
document.getElementById('btnNumReset').addEventListener('click', () => {
  numCount = 1
  syncNumCount()
  showToast('編號已重置，下一個從 1 開始')
})

// Tool buttons — zoom-in/out also fire an immediate zoom step
document.querySelectorAll('.tool-btn[data-tool]').forEach(btn =>
  btn.addEventListener('click', () => {
    const t = btn.dataset.tool
    setTool(t)
    if (t === 'zoom-in')  zoomIn()
    if (t === 'zoom-out') zoomOut()
  })
)
document.getElementById('btnFitZoom').addEventListener('click', fitToWindow)
document.getElementById('btnUndo').addEventListener('click', undo)
document.getElementById('btnRedo').addEventListener('click', redo)

// ─── Tool activation ─────────────────────────────────────────────────────────

function setTool(t) {
  commitText(false)
  hideColorPanel()
  if (t !== 'crop')      { cropRect = null; isCropping = false; cropMoving = false; cropResizeH = null; cropMoveStart = null }
  if (t !== 'ocr')       { ocrRect = null; isOcrSelecting = false; ocrStart = null }
  if (t !== 'boxselect') { boxSelRect = null; isBoxSelecting = false; boxSelStart = null }
  if (t !== 'pen')       { isPenDrawing = false; penPoints = [] }
  _cancelPolyline()   // 切換工具時取消任何進行中的折線
  tool       = t
  selectedId = null
  isDrawing  = false
  isPanning  = false

  document.querySelectorAll('.tool-btn[data-tool]').forEach(b => {
    // ellipse 屬於 rect 群組；fillellipse 屬於 fillrect 群組
    const match = b.dataset.tool === t
      || (t === 'ellipse'     && b.dataset.tool === 'rect')
      || (t === 'fillellipse' && b.dataset.tool === 'fillrect')
    b.classList.toggle('active', match)
  })

  if      (t === 'zoom-in')  annotCanvas.style.cursor = 'zoom-in'
  else if (t === 'zoom-out') annotCanvas.style.cursor = 'zoom-out'
  else if (t === 'select')   annotCanvas.style.cursor = 'default'
  else                       annotCanvas.style.cursor = 'crosshair'

  if (t === 'select') hideAllOptions()
  else                showOptionsForTool(t)

  renderAnnotations()
}

// ─── Image loading ────────────────────────────────────────────────────────────

ipcRenderer.on('load-image', (_, path) => {
  const img = new Image()
  img.onload = () => {
    imgElement = img
    imgWidth   = img.naturalWidth
    imgHeight  = img.naturalHeight
    userZoomed = false   // always fit new image to window
    document.getElementById('imgInfo').textContent = `${imgWidth} × ${imgHeight} px`
    fitCanvas()
    drawBase()
    setTool('rect')
  }
  img.src = `file://${path}`
})

function fitCanvas() {
  const aw = canvasArea.clientWidth  - 64
  const ah = canvasArea.clientHeight - 64
  fitScale = Math.min(aw / imgWidth, ah / imgHeight, 1)
  if (!userZoomed) {
    viewScale = fitScale
    _applyCanvasSize()
  }
}

function _applyCanvasSize() {
  const dw = Math.round(imgWidth  * viewScale)
  const dh = Math.round(imgHeight * viewScale)
  baseCanvas.width  = annotCanvas.width  = dw
  baseCanvas.height = annotCanvas.height = dh
  canvasWrapper.style.width  = dw + 'px'
  canvasWrapper.style.height = dh + 'px'
  document.getElementById('zoomLabel').textContent = Math.round(viewScale * 100) + '%'
  syncZoomSelect()
}

// ─── Zoom helpers ─────────────────────────────────────────────────────────────

function applyZoom(newScale, pivotClientX, pivotClientY) {
  const clamped = Math.max(fitScale, Math.min(MAX_SCALE, newScale))
  if (Math.abs(clamped - viewScale) < 0.0001) return

  // Capture image coordinate at pivot before scale change
  let imgX, imgY
  const cR = annotCanvas.getBoundingClientRect()
  if (pivotClientX !== undefined) {
    imgX = (pivotClientX - cR.left) / viewScale
    imgY = (pivotClientY - cR.top)  / viewScale
  } else {
    // Pivot at centre of the visible canvas-area
    const aR = canvasArea.getBoundingClientRect()
    pivotClientX = aR.left + aR.width  / 2
    pivotClientY = aR.top  + aR.height / 2
    imgX = (pivotClientX - cR.left) / viewScale
    imgY = (pivotClientY - cR.top)  / viewScale
  }

  viewScale  = clamped
  userZoomed = true
  _applyCanvasSize()
  drawBase()
  renderAnnotations()

  // getBoundingClientRect forces a synchronous layout pass — values are fresh
  const r2 = annotCanvas.getBoundingClientRect()
  canvasArea.scrollLeft += r2.left + imgX * viewScale - pivotClientX
  canvasArea.scrollTop  += r2.top  + imgY * viewScale - pivotClientY
}

function zoomIn(cx, cy)  { applyZoom(viewScale * ZOOM_STEP, cx, cy) }
function zoomOut(cx, cy) { applyZoom(viewScale / ZOOM_STEP, cx, cy) }

function fitToWindow() {
  userZoomed = false
  viewScale  = fitScale
  _applyCanvasSize()
  drawBase()
  renderAnnotations()
  canvasArea.scrollLeft = 0
  canvasArea.scrollTop  = 0
}

function syncZoomSelect() {
  const sel    = document.getElementById('zoomSelect')
  const custom = document.getElementById('zoomCustom')
  if (!sel) return
  const pct = Math.round(viewScale * 100)
  for (const opt of sel.options) {
    if (opt.id === 'zoomCustom') continue
    if (Math.round(parseFloat(opt.value) * 100) === pct) { sel.value = opt.value; return }
  }
  // No preset match — show current percentage in the dynamic option
  if (custom) {
    custom.textContent = pct + '%'
    custom.disabled = false
    sel.value = 'custom'
  }
}

// Zoom dropdown — ignore the dynamic 'custom' placeholder
document.getElementById('zoomSelect').addEventListener('change', e => {
  if (e.target.value === 'custom') return
  applyZoom(parseFloat(e.target.value))
})

// Wheel / trackpad pinch — ctrlKey is set by macOS for pinch gestures
canvasArea.addEventListener('wheel', e => {
  if (!e.ctrlKey) return
  e.preventDefault()
  const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
  applyZoom(viewScale * factor, e.clientX, e.clientY)
}, { passive: false })

function drawBase() {
  if (!imgElement) return
  baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height)
  baseCtx.drawImage(imgElement, 0, 0, imgWidth * viewScale, imgHeight * viewScale)
}

new ResizeObserver(() => {
  if (!imgElement) return
  fitCanvas()   // recalcs fitScale; resizes canvas only when !userZoomed
  drawBase()
  renderAnnotations()
}).observe(canvasArea)

// ─── Coordinate helpers ───────────────────────────────────────────────────────

function evToImg(e) {
  const r = annotCanvas.getBoundingClientRect()
  return { x: (e.clientX - r.left) / viewScale, y: (e.clientY - r.top) / viewScale }
}
function c(v) { return v * viewScale }

// ─── Annotation IDs ───────────────────────────────────────────────────────────

let _annId = 0
function newId() { return `a${++_annId}` }

// ─── Overlay-image cache ───────────────────────────────────────────────────────
// Annotations are plain JSON objects; HTMLImageElement is kept separately.

const _imgCache = new Map()

function getImg(a) {
  if (!_imgCache.has(a.id)) {
    const img = new Image()
    _imgCache.set(a.id, img)
    img.onload = () => renderAnnotations()
    img.src = a.src
  }
  return _imgCache.get(a.id)
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderAnnotations() {
  annotCtx.clearRect(0, 0, annotCanvas.width, annotCanvas.height)
  annotations.forEach(a => drawOne(annotCtx, a))
  if (isDrawing && drawStart && drawCurrent) {
    const preview = buildPreview()
    if (preview) {
      annotCtx.save(); annotCtx.globalAlpha = 0.65
      drawOne(annotCtx, preview)
      annotCtx.restore()
    }
  }

  // 折線即時預覽：已確認頂點 + 游標位置
  if (polylineActive && polylinePoints.length >= 1 && polylineMouse) {
    const previewAnn = {
      id: '_pl', type: 'polyline',
      color, thickness, lineStyle, startCap, endCap,
      points: polylinePoints,
    }
    annotCtx.save(); annotCtx.globalAlpha = 0.65
    annotCtx.strokeStyle = color
    annotCtx.fillStyle   = color
    annotCtx.lineWidth   = thickness * viewScale
    drawPolyline(annotCtx, previewAnn, { x: polylineMouse.x, y: polylineMouse.y })
    annotCtx.restore()
    // 已確認頂點標記（小圓點）
    annotCtx.save()
    annotCtx.fillStyle = color
    polylinePoints.forEach(p => {
      annotCtx.beginPath(); annotCtx.arc(c(p.x), c(p.y), 3 * viewScale, 0, Math.PI * 2); annotCtx.fill()
    })
    annotCtx.restore()
  }
  if (selectedId) {
    const a = annotations.find(x => x.id === selectedId)
    if (a) drawSelection(annotCtx, a)
  }

  // Crop overlay: dim outside selection, dashed border + resize handles
  if (tool === 'crop' && cropRect && cropRect.w > 1 && cropRect.h > 1) {
    const cr = cropRect
    annotCtx.save()
    annotCtx.fillStyle = 'rgba(0,0,0,0.50)'
    annotCtx.beginPath()
    annotCtx.rect(0, 0, annotCanvas.width, annotCanvas.height)
    annotCtx.rect(c(cr.x), c(cr.y), c(cr.w), c(cr.h))
    annotCtx.fill('evenodd')
    annotCtx.strokeStyle = '#ffffff'
    annotCtx.lineWidth = 1.5
    annotCtx.setLineDash([5, 3])
    annotCtx.strokeRect(c(cr.x), c(cr.y), c(cr.w), c(cr.h))
    annotCtx.restore()
    // Resize handles
    if (!isCropping) {
      getCropHandles(cr).forEach(h => {
        annotCtx.save()
        annotCtx.fillStyle   = '#ffffff'
        annotCtx.strokeStyle = '#4a9eff'
        annotCtx.lineWidth   = 1.5
        annotCtx.setLineDash([])
        annotCtx.beginPath()
        annotCtx.arc(c(h.x), c(h.y), HANDLE_R, 0, Math.PI * 2)
        annotCtx.fill(); annotCtx.stroke()
        annotCtx.restore()
      })
    }
  }

  // OCR selection overlay: blue dashed rect
  if (tool === 'ocr' && ocrRect && ocrRect.w > 1 && ocrRect.h > 1) {
    const r = ocrRect
    annotCtx.save()
    annotCtx.strokeStyle = '#3b82f6'
    annotCtx.lineWidth   = 1.5
    annotCtx.setLineDash([5, 3])
    annotCtx.strokeRect(c(r.x), c(r.y), c(r.w), c(r.h))
    annotCtx.fillStyle = 'rgba(59,130,246,0.08)'
    annotCtx.fillRect(c(r.x), c(r.y), c(r.w), c(r.h))
    annotCtx.setLineDash([])
    annotCtx.restore()
  }

  // Box-select overlay: green dashed rect + semi-transparent fill
  if (tool === 'boxselect' && boxSelRect && boxSelRect.w > 1 && boxSelRect.h > 1) {
    const r = boxSelRect
    annotCtx.save()
    annotCtx.strokeStyle = '#22c55e'
    annotCtx.lineWidth   = 1.5
    annotCtx.setLineDash([5, 3])
    annotCtx.strokeRect(c(r.x), c(r.y), c(r.w), c(r.h))
    annotCtx.fillStyle = 'rgba(34,197,94,0.10)'
    annotCtx.fillRect(c(r.x), c(r.y), c(r.w), c(r.h))
    annotCtx.setLineDash([])
    annotCtx.restore()
  }

  // Pen tool live preview
  if (isPenDrawing && penPoints.length >= 2) {
    annotCtx.save()
    drawPen(annotCtx, {
      type: 'pen', points: penPoints,
      color, thickness, lineStyle,
      startCap, endCap,
      penOpacity, penBorderColor,
      shadow: penShadow,
    })
    annotCtx.restore()
  }

  // 輸入中的文字即時預覽：在 canvas 畫出背景色塊、描邊、陰影效果，
  // textarea 的文字字元疊在正上方（定位相同），不會跑位
  if (textActive && textPos) {
    const previewContent = textInputEl.value || ' '
    annotCtx.save()
    drawText(annotCtx, {
      type: 'text', color, fontSize,
      x: textPos.x, y: textPos.y, content: previewContent,
      textStrokeColor, textStrokeWidth, textBgColor, textBgOpacity,
      shadow: textShadow,
      bold: textBold, italic: textItalic, underline: textUnderline, strikethrough: textStrikethrough,
      textAlign, fontFamily,
    }, { previewOnly: true })
    annotCtx.restore()
  }
}

// Shared offscreen canvas for opacity compositing (reused, never GC'd)
let _offCanvas = null
function _getOffCanvas(w, h) {
  if (!_offCanvas) _offCanvas = document.createElement('canvas')
  if (_offCanvas.width !== w || _offCanvas.height !== h) { _offCanvas.width = w; _offCanvas.height = h }
  return _offCanvas
}

function drawOne(ctx, a) {
  if (a.type === 'img') {
    const img = getImg(a)
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, c(a.x), c(a.y), c(a.w), c(a.h))
    }
    return
  }

  // For stroke tools with opacity < 100, use offscreen compositing so
  // caps and border don't X-ray through the main stroke
  const strokeOpacity = a.type === 'pen' ? (a.penOpacity ?? 100) : (a.opacity ?? 100)
  if (strokeOpacity < 100 && ['line','polyline','pen'].includes(a.type)) {
    const off  = _getOffCanvas(ctx.canvas.width, ctx.canvas.height)
    const octx = off.getContext('2d')
    octx.clearRect(0, 0, off.width, off.height)
    octx.strokeStyle = a.color
    octx.fillStyle   = a.color
    octx.lineWidth   = a.thickness * viewScale
    const fullA = a.type === 'pen'
      ? { ...a, penOpacity: 100 }
      : { ...a, opacity: 100 }
    switch (a.type) {
      case 'line':     drawLine(octx, fullA);     break
      case 'polyline': drawPolyline(octx, fullA); break
      case 'pen':      drawPen(octx, fullA);      break
    }
    ctx.save()
    ctx.globalAlpha = strokeOpacity / 100
    ctx.drawImage(off, 0, 0)
    ctx.restore()
    return
  }

  ctx.save()
  ctx.strokeStyle = a.color
  ctx.fillStyle   = a.color
  ctx.lineWidth   = a.thickness * viewScale
  switch (a.type) {
    case 'rect':     drawRect(ctx, a);     break
    case 'ellipse':  drawEllipse(ctx, a);  break
    case 'fillrect':    drawFillRect(ctx, a);    break
    case 'fillellipse': drawFillEllipse(ctx, a); break
    case 'line':     drawLine(ctx, a);     break
    case 'text':     drawText(ctx, a);     break
    case 'number':   drawNumber(ctx, a);   break
    case 'polyline': drawPolyline(ctx, a); break
    case 'pen':      drawPen(ctx, a);      break
  }
  ctx.restore()
}

function cornerRadiusPx(a) {
  const cr = a.cornerRadius ?? 0
  return cr === 0 ? 0 : c((cr / 100) * Math.min(a.w, a.h) / 2)
}

function drawRect(ctx, a) {
  const r  = cornerRadiusPx(a)
  const sz = (a.thickness ?? 2) * viewScale
  const lsd = getLineDash(a.lineStyle ?? 'solid', sz)

  // Outer border (offset frame, no shadow)
  if (a.borderColor && a.borderColor !== 'transparent') {
    ctx.save()
    ctx.strokeStyle = a.borderColor
    ctx.lineWidth   = (a.borderThickness ?? a.thickness ?? 2) * viewScale
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0
    ctx.setLineDash(getLineDash(a.borderDashStyle ?? 'solid', ctx.lineWidth))
    const ox = (a.borderOffsetX ?? 0) * viewScale
    const oy = (a.borderOffsetY ?? 0) * viewScale
    if (r > 0) {
      ctx.beginPath(); ctx.roundRect(c(a.x)+ox, c(a.y)+oy, c(a.w), c(a.h), r); ctx.stroke()
    } else {
      ctx.strokeRect(c(a.x)+ox, c(a.y)+oy, c(a.w), c(a.h))
    }
    ctx.setLineDash([])
    ctx.restore()
  }

  // Main stroke
  ctx.save()
  if (a.shadow) setShadow(ctx)
  ctx.globalAlpha = (a.opacity ?? 100) / 100
  ctx.setLineDash(lsd)
  if (r > 0) {
    ctx.beginPath(); ctx.roundRect(c(a.x), c(a.y), c(a.w), c(a.h), r); ctx.stroke()
  } else {
    ctx.strokeRect(c(a.x), c(a.y), c(a.w), c(a.h))
  }
  ctx.setLineDash([])
  ctx.restore()
}

function drawEllipse(ctx, a) {
  const cx  = c(a.x + a.w / 2), cy = c(a.y + a.h / 2)
  const rx  = Math.max(c(a.w / 2), 1), ry = Math.max(c(a.h / 2), 1)
  const sz  = (a.thickness ?? 2) * viewScale
  const lsd = getLineDash(a.lineStyle ?? 'solid', sz)

  // Outer border (offset frame, no shadow)
  if (a.borderColor && a.borderColor !== 'transparent') {
    ctx.save()
    ctx.strokeStyle = a.borderColor
    ctx.lineWidth   = (a.borderThickness ?? a.thickness ?? 2) * viewScale
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0
    ctx.setLineDash(getLineDash(a.borderDashStyle ?? 'solid', ctx.lineWidth))
    const ox = (a.borderOffsetX ?? 0) * viewScale
    const oy = (a.borderOffsetY ?? 0) * viewScale
    ctx.beginPath(); ctx.ellipse(cx+ox, cy+oy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }

  // Main stroke
  ctx.save()
  if (a.shadow) setShadow(ctx)
  ctx.globalAlpha = (a.opacity ?? 100) / 100
  ctx.setLineDash(lsd)
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

function resolveGradientColor(col) {
  return col === 'transparent' ? 'rgba(0,0,0,0)' : (col || 'rgba(0,0,0,0)')
}

function drawFillRect(ctx, a) {
  const rx = c(a.x), ry = c(a.y), rw = c(a.w), rh = c(a.h)
  ctx.save()
  if (a.shadow) setShadow(ctx)
  ctx.globalAlpha = (a.fillOpacity ?? 100) / 100

  if (a.fillMode === 'gradient') {
    const ca = resolveGradientColor(a.fillColorA ?? '#ffcc00')
    const cb = resolveGradientColor(a.fillColorB ?? 'transparent')
    let grad
    switch (a.fillGradientDir ?? 'h') {
      case 'h':  grad = ctx.createLinearGradient(rx,      ry,      rx+rw, ry     ); break
      case 'v':  grad = ctx.createLinearGradient(rx,      ry,      rx,    ry+rh  ); break
      case 'dr': grad = ctx.createLinearGradient(rx,      ry,      rx+rw, ry+rh  ); break
      case 'ur': grad = ctx.createLinearGradient(rx,      ry+rh,   rx+rw, ry     ); break
    }
    grad.addColorStop(0, ca)
    grad.addColorStop(1, cb)
    ctx.fillStyle = grad
  } else {
    ctx.fillStyle = a.fillColor ?? '#ffcc00'
  }

  const r = cornerRadiusPx(a)
  if (r > 0) {
    ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, r); ctx.fill()
  } else {
    ctx.fillRect(rx, ry, rw, rh)
  }
  ctx.restore()
  if (a.fillBorder !== false && a.thickness > 0) {
    const sz = (a.thickness ?? 2) * viewScale
    ctx.strokeStyle = a.fillBorderColor ?? '#ffffff'
    ctx.setLineDash(getLineDash(a.lineStyle ?? 'solid', sz))
    if (r > 0) {
      ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, r); ctx.stroke()
    } else {
      ctx.strokeRect(rx, ry, rw, rh)
    }
    ctx.setLineDash([])
  }
}

function drawFillEllipse(ctx, a) {
  const cx = c(a.x + a.w / 2), cy = c(a.y + a.h / 2)
  const rx = Math.max(c(a.w / 2), 1), ry = Math.max(c(a.h / 2), 1)
  ctx.save()
  if (a.shadow) setShadow(ctx)
  ctx.globalAlpha = (a.fillOpacity ?? 100) / 100
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  if (a.fillMode === 'gradient') {
    const bx = c(a.x), by = c(a.y), bw = c(a.w), bh = c(a.h)
    const ca = resolveGradientColor(a.fillColorA ?? '#ffcc00')
    const cb = resolveGradientColor(a.fillColorB ?? 'transparent')
    let grad
    switch (a.fillGradientDir ?? 'h') {
      case 'h':  grad = ctx.createLinearGradient(bx, by, bx+bw, by   ); break
      case 'v':  grad = ctx.createLinearGradient(bx, by, bx,    by+bh); break
      case 'dr': grad = ctx.createLinearGradient(bx, by, bx+bw, by+bh); break
      case 'ur': grad = ctx.createLinearGradient(bx, by+bh, bx+bw, by); break
    }
    grad.addColorStop(0, ca); grad.addColorStop(1, cb)
    ctx.fillStyle = grad
  } else {
    ctx.fillStyle = a.fillColor ?? '#ffcc00'
  }
  ctx.fill()
  ctx.restore()
  if (a.fillBorder !== false && a.thickness > 0) {
    const sz = (a.thickness ?? 2) * viewScale
    ctx.save()
    ctx.strokeStyle = a.fillBorderColor ?? '#ffffff'
    ctx.setLineDash(getLineDash(a.lineStyle ?? 'solid', sz))
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }
}

function drawLine(ctx, a) {
  const x1 = c(a.x1), y1 = c(a.y1), x2 = c(a.x2), y2 = c(a.y2)
  const sz  = (a.thickness * 4 + 8) * viewScale
  const hasBorder = !!(a.lineBorderColor && a.lineBorderColor !== 'transparent')
  // capBorderW: full stroke width → outer half acts as the visible border ring
  const capBorderW = hasBorder ? ((a.borderThickness ?? a.thickness + 4) - a.thickness) * viewScale * 2 : 0
  const capBorderCol = hasBorder ? a.lineBorderColor : null

  if (a.shadow) setShadow(ctx)
  ctx.globalAlpha = (a.opacity ?? 100) / 100
  ctx.lineCap = capToLineCap(a.startCap, a.endCap)

  // Trim stroke at arrow endpoints so the line body stops at the arrow base (not the tip),
  // eliminating the square butt-cap that would otherwise poke through the triangle tip.
  const ang      = Math.atan2(y2 - y1, x2 - x1)
  const arrInset = sz * 0.8   // ≈ sz × |cos(2.5)|  (distance tip→base of arrow)
  let sx1 = x1, sy1 = y1, sx2 = x2, sy2 = y2
  if (a.startCap === 'arrow') { sx1 += Math.cos(ang) * arrInset; sy1 += Math.sin(ang) * arrInset }
  if (a.endCap   === 'arrow') { sx2 -= Math.cos(ang) * arrInset; sy2 -= Math.sin(ang) * arrInset }

  // Border stroke body
  if (hasBorder) {
    ctx.save()
    ctx.strokeStyle = a.lineBorderColor
    ctx.lineWidth   = (a.borderThickness ?? a.thickness + 4) * viewScale
    ctx.setLineDash(getLineDash(a.borderDashStyle ?? a.lineStyle, sz))
    ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0
  }

  // Main stroke body
  ctx.beginPath()
  ctx.setLineDash(getLineDash(a.lineStyle, sz))
  ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke()
  ctx.setLineDash([])

  // Caps: single call — strokes border outline first, then fills main colour
  drawCap(ctx, a.startCap, x2, y2, x1, y1, a.color, sz, capBorderCol, capBorderW)
  drawCap(ctx, a.endCap,   x1, y1, x2, y2, a.color, sz, capBorderCol, capBorderW)
}

// borderCol / borderW: if set, stroke the cap path in border colour BEFORE filling in col.
// Canvas stroke is centred on the path, so the outer half of the stroke acts as the visible border.
function drawCap(ctx, type, fx, fy, tx, ty, col, sz, borderCol, borderW) {
  if (type === 'none' || type === 'round' || type === 'square') return  // handled by lineCap
  const ang = Math.atan2(ty - fy, tx - fx)
  const hasBorder = borderCol && borderCol !== 'transparent' && borderW > 0
  ctx.save()
  if (type === 'arrow') {
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(tx + Math.cos(ang + 2.5) * sz, ty + Math.sin(ang + 2.5) * sz)
    ctx.lineTo(tx + Math.cos(ang - 2.5) * sz, ty + Math.sin(ang - 2.5) * sz)
    ctx.closePath()
    if (hasBorder) {
      ctx.lineJoin = 'miter'
      ctx.strokeStyle = borderCol
      ctx.lineWidth = borderW
      ctx.stroke()
    }
    ctx.fillStyle = col; ctx.fill()
  } else if (type === 'dot') {
    ctx.beginPath(); ctx.arc(tx, ty, sz * 0.42, 0, Math.PI * 2)
    if (hasBorder) {
      ctx.strokeStyle = borderCol
      ctx.lineWidth = borderW
      ctx.stroke()
    }
    ctx.fillStyle = col; ctx.fill()
  }
  ctx.restore()
}

function drawText(ctx, a, { previewOnly = false } = {}) {
  const fs      = a.fontSize * viewScale
  const lines   = a.content.split('\n')
  const fontMod = [a.italic ? 'italic' : '', a.bold ? 'bold' : ''].filter(Boolean).join(' ')
  const align   = a.textAlign ?? 'left'
  ctx.font         = `${fontMod} ${fs}px ${getFontCss(a.fontFamily ?? 'system')}`.trimStart()
  ctx.textAlign    = align
  ctx.textBaseline = 'top'
  const ax = c(a.x)
  // 各行裝飾線（底線/刪除線）的起始 X，依對齊方式計算
  const lineX = (w) => align === 'center' ? ax - w / 2 : align === 'right' ? ax - w : ax

  // Background colour block (drawn first, shadow applied here if enabled)
  // Height = visual text height (no extra trailing line-gap), so padding is uniform on all sides.
  const bgOpacity = a.textBgOpacity ?? 0
  if (bgOpacity > 0) {
    ctx.save()
    if (a.shadow) setShadow(ctx)
    const maxW   = Math.max(...lines.map(l => ctx.measureText(l).width))
    const pad    = 5
    const totalH = (lines.length - 1) * fs * 1.25 + fs   // last line uses fs not fs*1.25
    const bgX    = lineX(maxW)
    ctx.fillStyle = hexToRgba(a.textBgColor ?? '#000000', bgOpacity / 100)
    ctx.fillRect(bgX - pad, c(a.y) - pad, maxW + pad * 2, totalH + pad * 2)
    ctx.restore()
  }

  // Stroke (outline) — no shadow on stroke layer
  // strokeText draws centred on the text path: half inside (covered by fill), half outside.
  // Multiply by 2 so the visible outside width equals the requested px value.
  const strokeW = a.textStrokeWidth ?? 0
  if (strokeW > 0) {
    ctx.save()
    ctx.strokeStyle = a.textStrokeColor ?? '#000000'
    ctx.lineWidth   = strokeW * 2 * viewScale
    ctx.lineJoin    = 'round'
    lines.forEach((line, i) => ctx.strokeText(line, ax, c(a.y) + i * fs * 1.25))
    ctx.restore()
  }

  // Fill text + decorations — 預覽模式跳過（文字字元由 textarea 負責顯示）
  if (previewOnly) return
  if (a.shadow && bgOpacity === 0) setShadow(ctx)
  ctx.fillStyle = a.color
  lines.forEach((line, i) => ctx.fillText(line, ax, c(a.y) + i * fs * 1.25))

  // Strikethrough — through the middle of the glyphs (~45% from top)
  if (a.strikethrough) {
    ctx.save()
    ctx.strokeStyle = a.color
    ctx.lineWidth   = Math.max(1, fs * 0.055)
    ctx.lineCap     = 'round'
    lines.forEach((line, i) => {
      const lineY = c(a.y) + i * fs * 1.25
      const sy    = lineY + fs * 0.45
      const w     = ctx.measureText(line).width
      const x0    = lineX(w)
      ctx.beginPath(); ctx.moveTo(x0, sy); ctx.lineTo(x0 + w, sy); ctx.stroke()
    })
    ctx.restore()
  }

  // Underline — draw after fill so shadow (if any) doesn't double-render
  // Position: ~85% of em-size from top ≈ just below the alphabetic baseline for CJK & Latin,
  // then add a small gap so it doesn't overlap descenders.
  if (a.underline) {
    ctx.save()
    ctx.strokeStyle = a.color
    ctx.lineWidth   = Math.max(1, fs * 0.055)
    ctx.lineCap     = 'round'
    lines.forEach((line, i) => {
      const lineY = c(a.y) + i * fs * 1.25
      const uy    = lineY + fs * 0.95 + 8 * viewScale
      const w     = ctx.measureText(line).width
      const x0    = lineX(w)
      ctx.beginPath()
      ctx.moveTo(x0, uy)
      ctx.lineTo(x0 + w, uy)
      ctx.stroke()
    })
    ctx.restore()
  }
}

// ─── Polyline drawing ─────────────────────────────────────────────────────────
// 每段 p[i-1]→p[i] 自動折直角：|ΔX|≥|ΔY| → 先水平後垂直，否則先垂直後水平
// liveEnd: 如果傳入，追加為末尾點（繪製中即時預覽用，不畫端點箭頭）

function _polylineRouteThrough(ctx, p0, p1) {
  const dx = Math.abs(p1.x - p0.x), dy = Math.abs(p1.y - p0.y)
  if (dx >= dy) { ctx.lineTo(p1.x, p0.y); ctx.lineTo(p1.x, p1.y) }
  else          { ctx.lineTo(p0.x, p1.y); ctx.lineTo(p1.x, p1.y) }
}

function drawPolyline(ctx, a, liveEnd) {
  const pts = a.points.map(p => ({ x: c(p.x), y: c(p.y) }))
  if (pts.length < 1) return

  const sz = (a.thickness * 4 + 8) * viewScale
  if (a.shadow) setShadow(ctx)
  ctx.globalAlpha = (a.opacity ?? 100) / 100
  ctx.lineCap = capToLineCap(a.startCap, a.endCap)

  function buildPath() {
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    if (liveEnd) _polylineRouteThrough(ctx, pts[pts.length - 1], { x: c(liveEnd.x), y: c(liveEnd.y) })
  }

  // Border stroke
  if (!liveEnd && a.lineBorderColor && a.lineBorderColor !== 'transparent') {
    ctx.save()
    ctx.strokeStyle = a.lineBorderColor
    ctx.lineWidth   = (a.thickness + 4) * viewScale
    ctx.setLineDash(getLineDash(a.lineStyle, sz))
    buildPath(); ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0
  }

  ctx.setLineDash(getLineDash(a.lineStyle, sz))
  buildPath()
  ctx.stroke()
  ctx.setLineDash([])

  if (liveEnd || pts.length < 2) return

  // 箭頭方向：段為純直線，直接用相鄰頂點決定方向
  const p0 = pts[0], p1 = pts[1]
  drawCap(ctx, a.startCap, p1.x, p1.y, p0.x, p0.y, a.color, sz)

  const pN = pts[pts.length - 1], pN1 = pts[pts.length - 2]
  drawCap(ctx, a.endCap, pN1.x, pN1.y, pN.x, pN.y, a.color, sz)
}

function drawPen(ctx, a) {
  const pts = a.points
  if (!pts || pts.length < 2) return

  const sz = (a.thickness * 4 + 8) * viewScale
  const hasBorder  = !!(a.penBorderColor && a.penBorderColor !== 'transparent')
  const capBorderW = hasBorder ? ((a.borderThickness ?? a.thickness + 4) - a.thickness) * viewScale * 2 : 0
  const capBorderCol = hasBorder ? a.penBorderColor : null

  // Trim amount in image-pixels so arrow-capped strokes stop at the arrow base
  const insetImgPx = (a.thickness * 4 + 8) * 0.8

  ctx.save()
  if (a.shadow) setShadow(ctx)
  ctx.globalAlpha = (a.penOpacity ?? 100) / 100
  ctx.lineCap  = capToLineCap(a.startCap ?? 'round', a.endCap ?? 'round')
  ctx.lineJoin = 'round'

  // Find a point at least `threshold` image-px from tip for a stable direction
  function stableFrom(tipIdx, step) {
    const threshold = Math.max(a.thickness * 2 + 4, insetImgPx * 1.2)
    const tip = pts[tipIdx]
    for (let i = tipIdx + step; i >= 0 && i < pts.length; i += step) {
      if (Math.hypot(pts[i].x - tip.x, pts[i].y - tip.y) >= threshold) return pts[i]
    }
    const fb = tipIdx + step
    return pts[Math.max(0, Math.min(pts.length - 1, fb))]
  }

  const p0    = pts[0],              pFrom0 = stableFrom(0, 1)
  const pN    = pts[pts.length - 1], pFromN = stableFrom(pts.length - 1, -1)

  // Compute arrow base: insetImgPx image-px behind tip along the SAME stable direction
  // as the drawCap call uses. Both stroke-end and arrow-base share this exact point.
  function arrowBase(tip, from) {
    const dx = tip.x - from.x, dy = tip.y - from.y
    const dist = Math.hypot(dx, dy)
    if (dist < 0.001) return tip
    return { x: tip.x - (dx / dist) * insetImgPx, y: tip.y - (dy / dist) * insetImgPx }
  }

  // Build smooth bezier path, terminating exactly at the arrow base.
  // A tiny axial step at each arrow endpoint forces the path tangent to align
  // with the arrow axis so the butt cap is perpendicular to it — hidden under
  // the arrow fill and causing no露餡 (stroke-head bleed) or gap.
  function buildPath() {
    ctx.beginPath()

    // ── Start ────────────────────────────────────────────────────────────────
    if (a.startCap === 'arrow') {
      const base = arrowBase(p0, pFrom0)
      const dx = p0.x - pFrom0.x, dy = p0.y - pFrom0.y
      const len = Math.hypot(dx, dy)
      ctx.moveTo(c(base.x), c(base.y))
      // Step 0.5 image-px forward along the arrow axis so the butt cap faces the arrow
      if (len > 0) ctx.lineTo(c(base.x + dx / len * 0.5), c(base.y + dy / len * 0.5))
    } else {
      ctx.moveTo(c(pts[0].x), c(pts[0].y))
    }

    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2
      const my = (pts[i].y + pts[i + 1].y) / 2
      ctx.quadraticCurveTo(c(pts[i].x), c(pts[i].y), c(mx), c(my))
    }

    // ── End ──────────────────────────────────────────────────────────────────
    if (a.endCap === 'arrow') {
      const base = arrowBase(pN, pFromN)
      const dx = pN.x - pFromN.x, dy = pN.y - pFromN.y
      const len = Math.hypot(dx, dy)
      // Step 0.5 image-px back from base so last segment arrives along the axis
      if (len > 0) ctx.lineTo(c(base.x - dx / len * 0.5), c(base.y - dy / len * 0.5))
      ctx.lineTo(c(base.x), c(base.y))
    } else {
      ctx.lineTo(c(pts[pts.length - 1].x), c(pts[pts.length - 1].y))
    }
  }

  // Border stroke body
  if (hasBorder) {
    buildPath()
    ctx.strokeStyle = a.penBorderColor
    ctx.lineWidth   = (a.borderThickness ?? a.thickness + 4) * viewScale
    ctx.setLineDash(getLineDash(a.borderDashStyle ?? 'solid', sz))
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Main stroke body
  ctx.setLineDash(getLineDash(a.lineStyle, sz))
  buildPath()
  ctx.strokeStyle = a.color
  ctx.lineWidth   = a.thickness * viewScale
  ctx.stroke()
  ctx.setLineDash([])

  // Caps: stroke border outline first, then fill main colour (no separate border-triangle)
  drawCap(ctx, a.startCap ?? 'round', c(pFrom0.x), c(pFrom0.y), c(p0.x), c(p0.y), a.color, sz, capBorderCol, capBorderW)
  drawCap(ctx, a.endCap   ?? 'round', c(pFromN.x), c(pFromN.y), c(pN.x), c(pN.y), a.color, sz, capBorderCol, capBorderW)

  ctx.restore()
}

function _cancelPolyline() {
  polylineActive = false; polylinePoints = []; polylineMouse = null
}

function _commitPolyline() {
  if (polylinePoints.length < 2) { _cancelPolyline(); renderAnnotations(); return }
  const ann = {
    id: newId(), type: 'polyline',
    color, thickness, lineStyle, startCap, endCap, lineBorderColor, shadow: lineShadow,
    points: [...polylinePoints],
  }
  _cancelPolyline()
  pushHistory()
  annotations.push(ann)
  setTool('select')
  selectedId = ann.id
  showOptionsForAnnot(ann)
  renderAnnotations()
}

// 將數值轉換為對應風格的 Unicode 字元；超出範圍回傳 null（dot fallback）
function getNumberGlyph(value, style) {
  const v = value
  if (style === 'circle') {
    if (v >= 1  && v <= 20) return String.fromCodePoint(0x2460 + v - 1)
    if (v >= 21 && v <= 35) return String.fromCodePoint(0x3251 + v - 21)
    if (v >= 36 && v <= 50) return String.fromCodePoint(0x32B1 + v - 36)
    return null
  }
  if (style === 'circle-fill') {
    const g = ['➊','➋','➌','➍','➎','➏','➐','➑','➒','➓']
    return v >= 1 && v <= 10 ? g[v - 1] : null
  }
  if (style === 'roman') {
    const r = ['','Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ','Ⅷ','Ⅸ','Ⅹ','Ⅺ','Ⅻ']
    return r[v] ?? null
  }
  if (style === 'cjk-paren') {
    return v >= 1 && v <= 10 ? String.fromCodePoint(0x3220 + v - 1) : null
  }
  if (style === 'cjk-circle') {
    return v >= 1 && v <= 10 ? String.fromCodePoint(0x3280 + v - 1) : null
  }
  return null  // dot or unknown
}

function drawNumber(ctx, a) {
  const cx = c(a.x), cy = c(a.y)
  const style = a.numberStyle ?? 'dot'
  const glyph = getNumberGlyph(a.value, style)

  if (glyph) {
    // Unicode glyph 直接渲染 — Zero Overhead
    const fs  = (a.size ?? 48) * 2 * viewScale
    const sw  = (a.thickness ?? 0) * viewScale
    if (a.shadow) setShadow(ctx)
    ctx.font         = `${Math.round(fs)}px -apple-system, 'Noto Sans TC', sans-serif`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    const strokeCol = a.numStrokeColor ?? getTextColor(a.color)
    // 描邊先畫（外框壓在填色下面的外側）
    if (sw > 0) {
      ctx.strokeStyle = strokeCol
      ctx.lineWidth   = sw * 2   // strokeText 向外向內各半，×2 讓可見外框等於 sw
      ctx.lineJoin    = 'round'
      ctx.strokeText(glyph, cx, cy)
    }
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0
    ctx.fillStyle   = a.color
    ctx.fillText(glyph, cx, cy)
  } else {
    // dot 樣式（預設或超出 Unicode 範圍 fallback）
    const r  = (a.size ?? 48) * viewScale
    const sw = (a.thickness ?? 0) * viewScale
    const strokeCol = a.numStrokeColor ?? getTextColor(a.color)
    if (a.shadow) setShadow(ctx)
    ctx.fillStyle = a.color
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    if (sw > 0) {
      ctx.strokeStyle = strokeCol
      ctx.lineWidth   = sw
      ctx.stroke()
    }
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0
    ctx.fillStyle    = getTextColor(a.color)
    ctx.font         = `bold ${Math.round(r * 0.9)}px -apple-system`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(a.value), cx, cy)
  }
}

// ─── Resize handles ───────────────────────────────────────────────────────────

function getHandles(a) {
  if (a.type === 'rect' || a.type === 'ellipse' || a.type === 'fillrect' || a.type === 'fillellipse' || a.type === 'img') {
    const { x, y, w, h } = a
    const mx = x + w / 2, my = y + h / 2
    return [
      { id: 'nw', x,      y,      cursor: 'nwse-resize' },
      { id: 'n',  x: mx,  y,      cursor: 'ns-resize'   },
      { id: 'ne', x: x+w, y,      cursor: 'nesw-resize' },
      { id: 'e',  x: x+w, y: my,  cursor: 'ew-resize'   },
      { id: 'se', x: x+w, y: y+h, cursor: 'nwse-resize' },
      { id: 's',  x: mx,  y: y+h, cursor: 'ns-resize'   },
      { id: 'sw', x,      y: y+h, cursor: 'nesw-resize' },
      { id: 'w',  x,      y: my,  cursor: 'ew-resize'   },
    ]
  }
  if (a.type === 'line') {
    return [
      { id: 'p1', x: a.x1, y: a.y1, cursor: 'crosshair' },
      { id: 'p2', x: a.x2, y: a.y2, cursor: 'crosshair' },
    ]
  }
  if (a.type === 'number') {
    const r = a.size ?? 14
    return [{ id: 'se', x: a.x + r, y: a.y + r, cursor: 'nwse-resize' }]
  }
  if (a.type === 'pen') {
    const b = bounds(a)
    if (!b) return []
    const { x, y, w, h } = b
    const mx = x + w / 2, my = y + h / 2
    return [
      { id: 'bb_nw', x,      y,      cursor: 'nwse-resize' },
      { id: 'bb_n',  x: mx,  y,      cursor: 'ns-resize'   },
      { id: 'bb_ne', x: x+w, y,      cursor: 'nesw-resize' },
      { id: 'bb_e',  x: x+w, y: my,  cursor: 'ew-resize'   },
      { id: 'bb_se', x: x+w, y: y+h, cursor: 'nwse-resize' },
      { id: 'bb_s',  x: mx,  y: y+h, cursor: 'ns-resize'   },
      { id: 'bb_sw', x,      y: y+h, cursor: 'nesw-resize' },
      { id: 'bb_w',  x,      y: my,  cursor: 'ew-resize'   },
    ]
  }
  if (a.type === 'polyline') {
    const b = bounds(a)
    const { x, y, w, h } = b
    const mx = x + w / 2, my = y + h / 2
    return [
      // 整體縮放手把（外框 8 點，圓形，與矩形框行為一致）
      { id: 'bb_nw', x,      y,      cursor: 'nwse-resize' },
      { id: 'bb_n',  x: mx,  y,      cursor: 'ns-resize'   },
      { id: 'bb_ne', x: x+w, y,      cursor: 'nesw-resize' },
      { id: 'bb_e',  x: x+w, y: my,  cursor: 'ew-resize'   },
      { id: 'bb_se', x: x+w, y: y+h, cursor: 'nwse-resize' },
      { id: 'bb_s',  x: mx,  y: y+h, cursor: 'ns-resize'   },
      { id: 'bb_sw', x,      y: y+h, cursor: 'nesw-resize' },
      { id: 'bb_w',  x,      y: my,  cursor: 'ew-resize'   },
      // 頂點手把（菱形，個別移動）
      ...a.points.map((p, i) => ({ id: `v${i}`, x: p.x, y: p.y, cursor: 'crosshair' })),
    ]
  }
  return []
}

function findHandle(pos, a) {
  const baseHitR = (HANDLE_R + 4) / viewScale
  return getHandles(a).find(h => {
    // 折線頂點手把（菱形）：使用較大點擊範圍
    const hitR = (h.id && h.id[0] === 'v') ? (HANDLE_R + 7) / viewScale : baseHitR
    return Math.hypot(h.x - pos.x, h.y - pos.y) <= hitR
  }) ?? null
}

function startResize(hId, a) {
  const info = { id: hId }
  if (a.type === 'number') {
    info.cx = a.x; info.cy = a.y
  }
  if (a.type === 'rect' || a.type === 'ellipse' || a.type === 'fillrect' || a.type === 'fillellipse' || a.type === 'img') {
    const { x, y, w, h } = a
    switch (hId) {
      case 'nw': info.fixX = x+w; info.fixY = y+h; break
      case 'ne': info.fixX = x;   info.fixY = y+h; break
      case 'se': info.fixX = x;   info.fixY = y;   break
      case 'sw': info.fixX = x+w; info.fixY = y;   break
      case 'n':  info.fixX = x;   info.fixY = y+h; info.fixW = w; break
      case 's':  info.fixX = x;   info.fixY = y;   info.fixW = w; break
      case 'e':  info.fixX = x;   info.fixY = y;   info.fixH = h; break
      case 'w':  info.fixX = x+w; info.fixY = y;   info.fixH = h; break
    }
  }
  // pen / polyline：外框縮放手把（bb_*）
  if (a.type === 'pen' || a.type === 'polyline') {
    if (hId.startsWith('bb_')) {
      const b = bounds(a)
      const { x, y, w, h } = b
      info.isBBoxResize  = true
      info.origPoints    = a.points.map(p => ({ ...p }))
      info.origBounds    = { ...b }
      const sub = hId.slice(3)
      switch (sub) {
        case 'nw': info.fixX = x+w; info.fixY = y+h; break
        case 'ne': info.fixX = x;   info.fixY = y+h; break
        case 'se': info.fixX = x;   info.fixY = y;   break
        case 'sw': info.fixX = x+w; info.fixY = y;   break
        case 'n':  info.fixX = x;   info.fixY = y+h; info.fixW = w; break
        case 's':  info.fixX = x;   info.fixY = y;   info.fixW = w; break
        case 'e':  info.fixX = x;   info.fixY = y;   info.fixH = h; break
        case 'w':  info.fixX = x+w; info.fixY = y;   info.fixH = h; break
      }
    }
    if (a.type === 'polyline' && !hId.startsWith('bb_')) {
      // 頂點移動：id 格式 'vN'，記錄頂點 index + 拖曳起始位置（Shift 吸附用）
      info.ptIdx = parseInt(hId.slice(1))
      info.origX = a.points[info.ptIdx].x
      info.origY = a.points[info.ptIdx].y
    }
  }
  resizeHandle = info
  isResizing   = true
}

function applyResize(a, pos) {
  const h = resizeHandle

  if (a.type === 'img') {
    const ar = a.aspectRatio
    const corners = ['nw', 'ne', 'se', 'sw']
    if (corners.includes(h.id)) {
      // Corner drag: lock aspect ratio — opposite corner stays fixed
      let newW
      switch (h.id) {
        case 'se': newW = Math.max(10, pos.x - h.fixX);   break
        case 'sw': newW = Math.max(10, h.fixX - pos.x);   break
        case 'ne': newW = Math.max(10, pos.x - h.fixX);   break
        case 'nw': newW = Math.max(10, h.fixX - pos.x);   break
      }
      const newH = newW / ar
      switch (h.id) {
        case 'se': a.x = h.fixX;        a.y = h.fixY;        break
        case 'sw': a.x = h.fixX - newW; a.y = h.fixY;        break
        case 'ne': a.x = h.fixX;        a.y = h.fixY - newH; break
        case 'nw': a.x = h.fixX - newW; a.y = h.fixY - newH; break
      }
      a.w = newW; a.h = newH
    } else {
      // Edge drag: free resize (allows stretching)
      let x1, y1, x2, y2
      switch (h.id) {
        case 'n': x1=h.fixX; y1=pos.y;   x2=h.fixX+h.fixW; y2=h.fixY;        break
        case 's': x1=h.fixX; y1=h.fixY;  x2=h.fixX+h.fixW; y2=pos.y;         break
        case 'e': x1=h.fixX; y1=h.fixY;  x2=pos.x;         y2=h.fixY+h.fixH; break
        case 'w': x1=pos.x;  y1=h.fixY;  x2=h.fixX;        y2=h.fixY+h.fixH; break
      }
      a.x = Math.min(x1, x2); a.y = Math.min(y1, y2)
      a.w = Math.max(10, Math.abs(x2 - x1))
      a.h = Math.max(10, Math.abs(y2 - y1))
    }
    return
  }

  if (['rect','ellipse','fillrect','fillellipse'].includes(a.type)) {
    let x1, y1, x2, y2
    switch (h.id) {
      case 'nw': x1=pos.x;    y1=pos.y;    x2=h.fixX;        y2=h.fixY;        break
      case 'ne': x1=h.fixX;   y1=pos.y;    x2=pos.x;         y2=h.fixY;        break
      case 'se': x1=h.fixX;   y1=h.fixY;   x2=pos.x;         y2=pos.y;         break
      case 'sw': x1=pos.x;    y1=h.fixY;   x2=h.fixX;        y2=pos.y;         break
      case 'n':  x1=h.fixX;   y1=pos.y;    x2=h.fixX+h.fixW; y2=h.fixY;        break
      case 's':  x1=h.fixX;   y1=h.fixY;   x2=h.fixX+h.fixW; y2=pos.y;         break
      case 'e':  x1=h.fixX;   y1=h.fixY;   x2=pos.x;         y2=h.fixY+h.fixH; break
      case 'w':  x1=pos.x;    y1=h.fixY;   x2=h.fixX;        y2=h.fixY+h.fixH; break
    }
    a.x = Math.min(x1, x2); a.y = Math.min(y1, y2)
    a.w = Math.max(Math.abs(x2 - x1), 2)
    a.h = Math.max(Math.abs(y2 - y1), 2)
  }
  if (a.type === 'line') {
    if (h.id === 'p1') { a.x1 = pos.x; a.y1 = pos.y }
    if (h.id === 'p2') { a.x2 = pos.x; a.y2 = pos.y }
  }
  if (a.type === 'number') {
    const d = Math.max(Math.abs(pos.x - h.cx), Math.abs(pos.y - h.cy))
    a.size = Math.max(d, 6)
  }
  if (a.type === 'pen' || a.type === 'polyline') {
    if (h.isBBoxResize) {
      // 整體縮放：計算新外框後等比例縮放所有頂點
      const ob = h.origBounds
      let x1, y1, x2, y2
      const sub = h.id.slice(3)
      switch (sub) {
        case 'nw': x1=pos.x;   y1=pos.y;   x2=h.fixX;        y2=h.fixY;        break
        case 'ne': x1=h.fixX;  y1=pos.y;   x2=pos.x;         y2=h.fixY;        break
        case 'se': x1=h.fixX;  y1=h.fixY;  x2=pos.x;         y2=pos.y;         break
        case 'sw': x1=pos.x;   y1=h.fixY;  x2=h.fixX;        y2=pos.y;         break
        case 'n':  x1=h.fixX;  y1=pos.y;   x2=h.fixX+h.fixW; y2=h.fixY;        break
        case 's':  x1=h.fixX;  y1=h.fixY;  x2=h.fixX+h.fixW; y2=pos.y;         break
        case 'e':  x1=h.fixX;  y1=h.fixY;  x2=pos.x;         y2=h.fixY+h.fixH; break
        case 'w':  x1=pos.x;   y1=h.fixY;  x2=h.fixX;        y2=h.fixY+h.fixH; break
      }
      const newX = Math.min(x1, x2), newY = Math.min(y1, y2)
      const newW = Math.max(Math.abs(x2 - x1), 1)
      const newH = Math.max(Math.abs(y2 - y1), 1)
      a.points = h.origPoints.map(p => ({
        x: ob.w > 1 ? newX + (p.x - ob.x) / ob.w * newW : p.x + (newX - ob.x),
        y: ob.h > 1 ? newY + (p.y - ob.y) / ob.h * newH : p.y + (newY - ob.y),
      }))
    } else if (typeof h.ptIdx === 'number') {
      // 頂點移動
      a.points[h.ptIdx] = { x: pos.x, y: pos.y }
    }
  }
}

// Selection with handles
function drawSelection(ctx, a) {
  const b = bounds(a)
  if (b) {
    ctx.save()
    ctx.strokeStyle = '#4a9eff'
    ctx.lineWidth   = 1.5
    ctx.setLineDash([5, 3])
    ctx.strokeRect(c(b.x) - 5, c(b.y) - 5, c(b.w) + 10, c(b.h) + 10)
    ctx.restore()
  }
  // Handles
  getHandles(a).forEach(h => {
    ctx.save()
    ctx.fillStyle   = '#ffffff'
    ctx.strokeStyle = '#4a9eff'
    ctx.lineWidth   = 1.5
    ctx.setLineDash([])
    ctx.beginPath()
    if (h.id && h.id[0] === 'v') {
      // 折線頂點：菱形手把，尺寸較大，更易點擊
      const r = HANDLE_R + 3
      const cx = c(h.x), cy = c(h.y)
      ctx.moveTo(cx,   cy-r)
      ctx.lineTo(cx+r, cy)
      ctx.lineTo(cx,   cy+r)
      ctx.lineTo(cx-r, cy)
      ctx.closePath()
    } else {
      ctx.arc(c(h.x), c(h.y), HANDLE_R, 0, Math.PI * 2)
    }
    ctx.fill(); ctx.stroke()
    ctx.restore()
  })
}

// ─── Annotation factories ─────────────────────────────────────────────────────

function buildPreview() {
  const base = { id: '_p', color, thickness }
  const s = drawStart, e = drawCurrent
  if (tool === 'rect')
    return { ...base, type:'rect', x:Math.min(s.x,e.x), y:Math.min(s.y,e.y), w:Math.abs(e.x-s.x), h:Math.abs(e.y-s.y),
             lineStyle:rectLineStyle, opacity:rectOpacity,
             borderColor:rectBorderColor, borderThickness:rectBorderThickness, borderDashStyle:rectBorderDashStyle,
             borderOffsetX:rectBorderOffsetX, borderOffsetY:rectBorderOffsetY,
             shadow:rectShadow, cornerRadius }
  if (tool === 'ellipse')
    return { ...base, type:'ellipse', x:Math.min(s.x,e.x), y:Math.min(s.y,e.y), w:Math.abs(e.x-s.x), h:Math.abs(e.y-s.y),
             lineStyle:ellipseLineStyle, opacity:ellipseOpacity,
             borderColor:ellipseBorderColor, borderThickness:ellipseBorderThickness, borderDashStyle:ellipseBorderDashStyle,
             borderOffsetX:ellipseBorderOffsetX, borderOffsetY:ellipseBorderOffsetY,
             shadow:ellipseShadow }
  if (tool === 'fillrect')
    return { ...base, type:'fillrect', x:Math.min(s.x,e.x), y:Math.min(s.y,e.y), w:Math.abs(e.x-s.x), h:Math.abs(e.y-s.y),
             fillMode, fillColor, fillColorA, fillColorB, fillGradientDir, fillOpacity, fillBorderColor,
             lineStyle:fillrectLineStyle, shadow:fillrectShadow, cornerRadius }
  if (tool === 'fillellipse')
    return { ...base, type:'fillellipse', x:Math.min(s.x,e.x), y:Math.min(s.y,e.y), w:Math.abs(e.x-s.x), h:Math.abs(e.y-s.y),
             fillMode, fillColor, fillColorA, fillColorB, fillGradientDir, fillOpacity, fillBorderColor,
             lineStyle:fillellipseLineStyle, shadow:fillellipseShadow }
  if (tool === 'line') {
    let x2 = e.x, y2 = e.y
    if (lineOrtho) {
      if (Math.abs(e.x - s.x) >= Math.abs(e.y - s.y)) y2 = s.y
      else x2 = s.x
    }
    return { ...base, type:'line', x1:s.x, y1:s.y, x2, y2, lineStyle, startCap, endCap, lineOrtho,
             lineBorderColor, borderThickness:lineBorderThickness, borderDashStyle:lineBorderDashStyle,
             opacity:lineOpacity, shadow:lineShadow }
  }
  return null
}

function commitShape(start, end) {
  const base = { id: newId(), color, thickness }
  if (tool === 'rect') {
    const w = Math.abs(end.x - start.x), h = Math.abs(end.y - start.y)
    if (w < 2 || h < 2) return null
    return { ...base, type:'rect', x:Math.min(start.x,end.x), y:Math.min(start.y,end.y), w, h,
             lineStyle:rectLineStyle, opacity:rectOpacity,
             borderColor:rectBorderColor, borderThickness:rectBorderThickness, borderDashStyle:rectBorderDashStyle,
             borderOffsetX:rectBorderOffsetX, borderOffsetY:rectBorderOffsetY,
             shadow:rectShadow, cornerRadius }
  }
  if (tool === 'ellipse') {
    const w = Math.abs(end.x - start.x), h = Math.abs(end.y - start.y)
    if (w < 2 || h < 2) return null
    return { ...base, type:'ellipse', x:Math.min(start.x,end.x), y:Math.min(start.y,end.y), w, h,
             lineStyle:ellipseLineStyle, opacity:ellipseOpacity,
             borderColor:ellipseBorderColor, borderThickness:ellipseBorderThickness, borderDashStyle:ellipseBorderDashStyle,
             borderOffsetX:ellipseBorderOffsetX, borderOffsetY:ellipseBorderOffsetY,
             shadow:ellipseShadow }
  }
  if (tool === 'fillrect') {
    const w = Math.abs(end.x - start.x), h = Math.abs(end.y - start.y)
    if (w < 2 || h < 2) return null
    return { ...base, type:'fillrect', x:Math.min(start.x,end.x), y:Math.min(start.y,end.y), w, h,
             fillMode, fillColor, fillColorA, fillColorB, fillGradientDir, fillOpacity, fillBorderColor,
             lineStyle:fillrectLineStyle, shadow:fillrectShadow, cornerRadius }
  }
  if (tool === 'fillellipse') {
    const w = Math.abs(end.x - start.x), h = Math.abs(end.y - start.y)
    if (w < 2 || h < 2) return null
    return { ...base, type:'fillellipse', x:Math.min(start.x,end.x), y:Math.min(start.y,end.y), w, h,
             fillMode, fillColor, fillColorA, fillColorB, fillGradientDir, fillOpacity, fillBorderColor,
             lineStyle:fillellipseLineStyle, shadow:fillellipseShadow }
  }
  if (tool === 'line') {
    let ex = end.x, ey = end.y
    if (lineOrtho) {
      if (Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)) ey = start.y
      else ex = start.x
    }
    if (Math.hypot(ex-start.x, ey-start.y) < 2) return null
    return { ...base, type:'line', x1:start.x, y1:start.y, x2:ex, y2:ey, lineStyle, startCap, endCap, lineOrtho,
             lineBorderColor, borderThickness:lineBorderThickness, borderDashStyle:lineBorderDashStyle,
             opacity:lineOpacity, shadow:lineShadow }
  }
  return null
}

// ─── History ──────────────────────────────────────────────────────────────────

function pushHistory() {
  history = history.slice(0, historyIdx + 1)
  history.push(JSON.parse(JSON.stringify(annotations)))
  historyIdx = history.length - 1
}

function undo() {
  if (historyIdx > 0) {
    historyIdx--
    annotations = JSON.parse(JSON.stringify(history[historyIdx]))
    selectedId  = null
    recalcNumCount()
    renderAnnotations()
  }
}

function redo() {
  if (historyIdx < history.length - 1) {
    historyIdx++
    annotations = JSON.parse(JSON.stringify(history[historyIdx]))
    selectedId  = null
    recalcNumCount()
    renderAnnotations()
  }
}

function recalcNumCount() {
  const nums = annotations.filter(a => a.type === 'number').map(a => a.value)
  numCount = nums.length ? Math.max(...nums) + 1 : 1
  syncNumCount()
}

// ─── Hit testing ─────────────────────────────────────────────────────────────

function bounds(a) {
  switch (a.type) {
    case 'rect':
    case 'ellipse':
    case 'fillrect':
    case 'fillellipse':
    case 'img':    return { x: a.x, y: a.y, w: a.w, h: a.h }
    case 'line': {
      const minX = Math.min(a.x1,a.x2), maxX = Math.max(a.x1,a.x2)
      const minY = Math.min(a.y1,a.y2), maxY = Math.max(a.y1,a.y2)
      return { x:minX, y:minY, w:Math.max(maxX-minX,1), h:Math.max(maxY-minY,1) }
    }
    case 'text': {
      const lines = a.content.split('\n')
      annotCtx.font = `${a.fontSize}px -apple-system, "Helvetica Neue", sans-serif`
      const maxW  = lines.reduce((m, l) => Math.max(m, annotCtx.measureText(l).width), 0)
      const tal   = a.textAlign ?? 'left'
      const bx    = tal === 'center' ? a.x - maxW / 2 : tal === 'right' ? a.x - maxW : a.x
      return { x:bx, y:a.y, w:maxW, h:lines.length*a.fontSize*1.25 }
    }
    case 'number': { const r = a.size ?? 14; return { x:a.x-r, y:a.y-r, w:r*2, h:r*2 } }
    case 'polyline':
    case 'pen': {
      const xs = a.points.map(p => p.x), ys = a.points.map(p => p.y)
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)
      return { x: minX, y: minY, w: Math.max(maxX - minX, 1), h: Math.max(maxY - minY, 1) }
    }
  }
  return null
}

function hits(pos, a) {
  const pad = 8 / viewScale
  const b = bounds(a)
  if (!b) return false
  return pos.x >= b.x - pad && pos.x <= b.x + b.w + pad &&
         pos.y >= b.y - pad && pos.y <= b.y + b.h + pad
}

function findAt(pos) {
  for (let i = annotations.length - 1; i >= 0; i--)
    if (hits(pos, annotations[i])) return annotations[i]
  return null
}

// ─── Mouse events ─────────────────────────────────────────────────────────────

annotCanvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return
  const pos = evToImg(e)

  // Close colour panel on any canvas interaction
  hideColorPanel()

  // If text input is open and user clicks outside the textarea, commit it first
  if (textActive) commitText(false)

  if (tool === 'crop') {
    if (cropRect) {
      const h = findCropHandle(pos)
      if (h) { cropResizeH = h.id; return }
      if (insideCropRect(pos)) {
        cropMoving    = true
        cropMoveStart = { pos, origRect: { ...cropRect } }
        annotCanvas.style.cursor = 'grabbing'
        return
      }
    }
    // Start a new crop rect
    isCropping = true
    cropRect   = { x: pos.x, y: pos.y, w: 0, h: 0 }
    drawStart  = pos
    document.getElementById('cropSizeLabel').textContent = '請拖曳選取範圍'
    return
  }

  if (tool === 'ocr') {
    isOcrSelecting = true
    ocrStart = pos
    ocrRect  = { x: pos.x, y: pos.y, w: 0, h: 0 }
    document.getElementById('ocrStatusLabel').textContent = '請拖曳選取辨識區域'
    return
  }

  if (tool === 'boxselect') {
    isBoxSelecting = true
    boxSelStart    = pos
    boxSelRect     = { x: pos.x, y: pos.y, w: 0, h: 0 }
    syncBoxSelUI()
    return
  }

  if (tool === 'zoom-in' || tool === 'zoom-out') {
    isPanning = true
    panStart  = { x: e.clientX, y: e.clientY,
                  sl: canvasArea.scrollLeft, st: canvasArea.scrollTop,
                  moved: false }
    annotCanvas.style.cursor = 'grabbing'
    return
  }

  if (tool === 'select') {
    // 1. Check resize handles on selected annotation
    if (selectedId) {
      const a = annotations.find(x => x.id === selectedId)
      if (a) {
        const h = findHandle(pos, a)
        if (h) { startResize(h.id, a); return }
        // Body hit → drag
        if (hits(pos, a)) {
          isDragging = true; hasDragged = false; lastMousePos = pos
          renderAnnotations(); return
        }
      }
    }
    // 2. Try to select a different annotation
    const hit = findAt(pos)
    if (hit) {
      selectedId = hit.id
      isDragging = true; hasDragged = false; lastMousePos = pos
      showOptionsForAnnot(hit)
    } else {
      selectedId = null
      hideAllOptions()
    }
    renderAnnotations()
    return
  }

  if (tool === 'number') {
    const _limit = getStyleLimit(numberStyle)
    if (numCount > _limit) {
      showToast(`已達「${STYLE_LABELS[numberStyle]}」上限（${_limit}），編號重置為 1`)
      numCount = 1
    }
    pushHistory()
    annotations.push({ id:newId(), type:'number', color, thickness:numThickness, x:pos.x, y:pos.y, value:numCount++, size:numSize, shadow:numShadow, numberStyle, numStrokeColor })
    syncNumCount()
    renderAnnotations()
    return
  }

  if (tool === 'text') {
    commitText(false)
    showTextInput(pos)
    return
  }

  // 折線模式（line tool + lineOrtho = true）：點擊加點，雙擊完成
  if (tool === 'line' && lineOrtho) {
    const now = Date.now()
    const isDouble = polylineActive && (now - polylineLastMs) < 380
    polylineLastMs = now
    if (isDouble) {
      // 雙擊第二下已被第一次 mousedown 加進去了，移除再 commit
      if (polylinePoints.length > 1) polylinePoints.pop()
      _commitPolyline()
    } else {
      if (!polylineActive) { polylineActive = true; polylinePoints = [] }
      let newPt
      if (polylinePoints.length === 0) {
        newPt = { ...pos }  // 第一點：不 snap
      } else {
        // 第二點起：snap 至前一頂點的水平或垂直，使每段都是純直線
        const prev = polylinePoints[polylinePoints.length - 1]
        const adx = Math.abs(pos.x - prev.x), ady = Math.abs(pos.y - prev.y)
        newPt = adx >= ady ? { x: pos.x, y: prev.y } : { x: prev.x, y: pos.y }
      }
      polylinePoints.push(newPt)
      polylineMouse = pos
      renderAnnotations()
    }
    return
  }

  if (tool === 'pen') {
    isPenDrawing = true
    penPoints    = [{ x: pos.x, y: pos.y }]
    return
  }

  isDrawing = true; drawStart = pos; drawCurrent = pos
})

annotCanvas.addEventListener('mousemove', e => {
  const pos = evToImg(e)

  if (isPanning && panStart) {
    const dx = e.clientX - panStart.x
    const dy = e.clientY - panStart.y
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) panStart.moved = true
    canvasArea.scrollLeft = panStart.sl - dx
    canvasArea.scrollTop  = panStart.st - dy
    return
  }

  if (cropResizeH) {
    applyCropResize(pos)
    renderAnnotations()
    return
  }

  if (cropMoving && cropMoveStart) {
    const dx = pos.x - cropMoveStart.pos.x
    const dy = pos.y - cropMoveStart.pos.y
    cropRect = {
      x: cropMoveStart.origRect.x + dx,
      y: cropMoveStart.origRect.y + dy,
      w: cropMoveStart.origRect.w,
      h: cropMoveStart.origRect.h,
    }
    updateCropSizeLabel()
    renderAnnotations()
    return
  }

  if (isCropping && drawStart) {
    const s = drawStart
    cropRect = {
      x: Math.min(s.x, pos.x),
      y: Math.min(s.y, pos.y),
      w: Math.abs(pos.x - s.x),
      h: Math.abs(pos.y - s.y),
    }
    updateCropSizeLabel()
    renderAnnotations()
    return
  }

  if (isOcrSelecting && ocrStart) {
    ocrRect = {
      x: Math.min(ocrStart.x, pos.x),
      y: Math.min(ocrStart.y, pos.y),
      w: Math.abs(pos.x - ocrStart.x),
      h: Math.abs(pos.y - ocrStart.y)
    }
    const wPx = Math.round(ocrRect.w), hPx = Math.round(ocrRect.h)
    document.getElementById('ocrStatusLabel').textContent = `${wPx} × ${hPx} px`
    renderAnnotations()
    return
  }

  if (isBoxSelecting && boxSelStart) {
    boxSelRect = {
      x: Math.min(boxSelStart.x, pos.x),
      y: Math.min(boxSelStart.y, pos.y),
      w: Math.abs(pos.x - boxSelStart.x),
      h: Math.abs(pos.y - boxSelStart.y)
    }
    syncBoxSelUI()
    renderAnnotations()
    return
  }

  if (isResizing && selectedId) {
    const a = annotations.find(x => x.id === selectedId)
    if (a) {
      let snapPos = pos
      if (e.shiftKey) {
        const h = resizeHandle
        // 矩形系（rect/ellipse/fillrect/fillellipse）角落把手：Shift = 鎖正方形/正圓
        if (['rect','ellipse','fillrect','fillellipse'].includes(a.type) && ['nw','ne','se','sw'].includes(h.id)) {
          const dx = pos.x - h.fixX, dy = pos.y - h.fixY
          const side = Math.min(Math.abs(dx), Math.abs(dy))
          snapPos = { x: h.fixX + Math.sign(dx || 1) * side, y: h.fixY + Math.sign(dy || 1) * side }
        }
        // 線條端點：Shift = 鎖水平/垂直
        if (a.type === 'line') {
          const fixed = h.id === 'p1' ? { x: a.x2, y: a.y2 } : { x: a.x1, y: a.y1 }
          const adx = Math.abs(pos.x - fixed.x), ady = Math.abs(pos.y - fixed.y)
          snapPos = adx >= ady ? { x: pos.x, y: fixed.y } : { x: fixed.x, y: pos.y }
        }
        // 折線頂點：Shift = 鎖水平/垂直（相對拖曳起始位置，避免受相鄰頂點距離影響）
        if (a.type === 'polyline' && typeof h.ptIdx === 'number') {
          const adx = Math.abs(pos.x - h.origX), ady = Math.abs(pos.y - h.origY)
          snapPos = adx >= ady ? { x: pos.x, y: h.origY } : { x: h.origX, y: pos.y }
        }
      }
      applyResize(a, snapPos)
    }
    renderAnnotations()
    return
  }

  if (isDragging && selectedId) {
    if (lastMousePos) {
      const dx = pos.x - lastMousePos.x, dy = pos.y - lastMousePos.y
      const a = annotations.find(x => x.id === selectedId)
      if (a) { moveAnnot(a, dx, dy); hasDragged = true }
    }
    lastMousePos = pos
    renderAnnotations()
    return
  }

  if (isPenDrawing) {
    // Thin out points: only add if moved > 2 image px from last point
    const last = penPoints[penPoints.length - 1]
    if (Math.hypot(pos.x - last.x, pos.y - last.y) > 2 / viewScale) {
      penPoints.push({ x: pos.x, y: pos.y })
      renderAnnotations()
    }
    return
  }
  if (polylineActive) { polylineMouse = pos; renderAnnotations(); return }
  if (isDrawing) {
    // Shift 鍵：線條鎖定水平／垂直（類 PPT 行為）；矩形鎖正方形
    if (e.shiftKey && tool === 'line' && drawStart) {
      const dx = Math.abs(pos.x - drawStart.x), dy = Math.abs(pos.y - drawStart.y)
      drawCurrent = dx >= dy ? { x: pos.x, y: drawStart.y } : { x: drawStart.x, y: pos.y }
    } else if (e.shiftKey && (tool === 'rect' || tool === 'fillrect' || tool === 'ellipse' || tool === 'fillellipse') && drawStart) {
      const side = Math.min(Math.abs(pos.x - drawStart.x), Math.abs(pos.y - drawStart.y))
      drawCurrent = {
        x: drawStart.x + Math.sign(pos.x - drawStart.x) * side,
        y: drawStart.y + Math.sign(pos.y - drawStart.y) * side,
      }
    } else {
      drawCurrent = pos
    }
    renderAnnotations(); return
  }

  // Update cursor for select tool
  if (tool === 'select') {
    let cur = 'default'
    if (selectedId) {
      const a = annotations.find(x => x.id === selectedId)
      if (a) {
        const h = findHandle(pos, a)
        if (h) cur = h.cursor
        else if (hits(pos, a)) cur = 'move'
      }
    } else {
      if (findAt(pos)) cur = 'move'
    }
    annotCanvas.style.cursor = cur
  }

  // Update cursor for crop tool (hover state)
  if (tool === 'crop' && cropRect && !isCropping && !cropMoving && !cropResizeH) {
    const h = findCropHandle(pos)
    if (h) annotCanvas.style.cursor = h.cursor
    else if (insideCropRect(pos)) annotCanvas.style.cursor = 'move'
    else annotCanvas.style.cursor = 'crosshair'
  }
})

document.addEventListener('mouseup', e => {
  if (isPanning) {
    isPanning = false
    annotCanvas.style.cursor = tool === 'zoom-in' ? 'zoom-in' : 'zoom-out'
    if (!panStart.moved) {
      // Short click (no drag) → zoom at cursor position
      if (tool === 'zoom-in')  zoomIn(e.clientX, e.clientY)
      if (tool === 'zoom-out') zoomOut(e.clientX, e.clientY)
    }
    panStart = null
    return
  }

  if (cropResizeH) {
    cropResizeH = null
    renderAnnotations()
    return
  }

  if (cropMoving) {
    cropMoving    = false
    cropMoveStart = null
    annotCanvas.style.cursor = 'move'
    return
  }

  if (isCropping) {
    isCropping = false
    if (!cropRect || cropRect.w < 2 || cropRect.h < 2) cropRect = null
    renderAnnotations()
    return
  }

  if (isOcrSelecting) {
    isOcrSelecting = false
    if (!ocrRect || ocrRect.w < 4 || ocrRect.h < 4) {
      ocrRect = null
      document.getElementById('ocrStatusLabel').textContent = '請拖曳選取辨識區域'
      renderAnnotations()
      return
    }
    renderAnnotations()
    triggerOcr()
    return
  }

  if (isBoxSelecting) {
    isBoxSelecting = false
    if (!boxSelRect || boxSelRect.w < 4 || boxSelRect.h < 4) {
      boxSelRect = null
    }
    syncBoxSelUI()
    renderAnnotations()
    return
  }

  if (isPenDrawing) {
    isPenDrawing = false
    if (penPoints.length >= 2) {
      const ann = {
        id: newId(), type: 'pen',
        color, thickness, lineStyle,
        startCap, endCap,
        penOpacity, penBorderColor,
        borderThickness: penBorderThickness, borderDashStyle: penBorderDashStyle,
        shadow: penShadow,
        points: penPoints.slice(),
      }
      pushHistory()
      annotations.push(ann)
      setTool('select'); selectedId = ann.id
      showOptionsForAnnot(ann)
    }
    penPoints = []
    renderAnnotations()
    return
  }

  if (isResizing) {
    isResizing = false
    pushHistory()
    return
  }
  if (isDragging) {
    isDragging = false
    if (hasDragged) pushHistory()
    return
  }
  if (!isDrawing) return
  isDrawing = false

  // 使用 drawCurrent（mousemove 已套用 Shift 吸附）；fallback 至 evToImg
  const end = drawCurrent ?? evToImg(e)
  const ann = commitShape(drawStart, end)
  if (ann) {
    pushHistory(); annotations.push(ann)
    setTool('select'); selectedId = ann.id; showOptionsForAnnot(ann)
  }
  renderAnnotations()
})

function moveAnnot(a, dx, dy) {
  switch (a.type) {
    case 'rect':
    case 'ellipse':
    case 'fillrect':
    case 'fillellipse':
    case 'img':
    case 'text':
    case 'number': a.x += dx; a.y += dy; break
    case 'line':     a.x1 += dx; a.y1 += dy; a.x2 += dx; a.y2 += dy; break
    case 'polyline':
    case 'pen':      a.points.forEach(p => { p.x += dx; p.y += dy }); break
  }
}

// ─── Double-click: re-edit text ───────────────────────────────────────────────

annotCanvas.addEventListener('dblclick', e => {
  // 折線模式下，雙擊第二下的 mousedown 已被timing偵測處理，dblclick 不再重複 commit
  // （但以防萬一：若 polylineActive 仍為 true，再次 commit）
  if (polylineActive) { _commitPolyline(); return }
  if (tool !== 'select') return
  const pos = evToImg(e)
  const a = findAt(pos)
  if (!a || a.type !== 'text') return

  textEditOrig = JSON.parse(JSON.stringify(a))
  annotations  = annotations.filter(x => x.id !== a.id)
  selectedId   = null
  renderAnnotations()   // clear old text from canvas immediately
  hideAllOptions()

  // Sync settings to the annotation being edited
  color    = a.color;    syncColor(color)
  fontSize = a.fontSize; syncFontSize(fontSize)
  showOptionsForTool('text')

  showTextInput({ x: a.x, y: a.y })
  textInputEl.value = a.content
  resizeTextInput()
  textInputEl.select()
})

// ─── Text input ───────────────────────────────────────────────────────────────

// 把 B/I/U/S 狀態同步到 textarea 的 CSS，讓使用者在輸入時即時看到效果
function applyTextStyleToInput() {
  const decs = []
  if (textUnderline)     decs.push('underline')
  if (textStrikethrough) decs.push('line-through')
  textInputEl.style.fontWeight     = textBold   ? 'bold'   : ''
  textInputEl.style.fontStyle      = textItalic ? 'italic' : ''
  textInputEl.style.textDecoration = decs.join(' ')
  textInputEl.style.fontFamily     = getFontCss(fontFamily)
  textInputEl.style.textAlign      = textAlign
}

// 依目前 textAlign 更新 textarea 的水平錨點（left + transform）。
// 在 showTextInput 以及對齊按鈕切換時都需要呼叫，確保輸入框始終對齊 canvas 錨點。
function _repositionTextInput() {
  if (!textActive || !textPos) return
  if (textAlign === 'center') {
    textInputEl.style.left      = c(textPos.x) + 'px'
    textInputEl.style.transform = 'translateX(-50%)'
  } else if (textAlign === 'right') {
    textInputEl.style.left      = (c(textPos.x) + 5.5) + 'px'
    textInputEl.style.transform = 'translateX(-100%)'
  } else {
    textInputEl.style.left      = (c(textPos.x) - 5.5) + 'px'
    textInputEl.style.transform = ''
  }
}

function showTextInput(pos) {
  textActive = true
  textPos    = pos
  const fs      = Math.max(fontSize * viewScale, 14)
  const lineH   = 1.25
  // half-leading: CSS line-height pushes text down by (lineH-1)*fs/2 within each line box.
  // Subtract it from the top so the visual glyph top aligns with canvas textBaseline='top'.
  const halfLead = Math.round((lineH - 1) * fs / 2)

  _repositionTextInput()
  textInputEl.style.top        = (c(pos.y) - 3.5 - halfLead) + 'px'
  textInputEl.style.fontSize   = fs + 'px'
  textInputEl.style.color      = color
  textInputEl.style.lineHeight = String(lineH)
  textInputEl.value            = ''
  applyTextStyleToInput()

  textInputWrap.classList.remove('hidden')
  setTimeout(() => textInputEl.focus(), 10)
}

// autoSelect: Shift+Enter 觸發時自動切換到選取工具並選中；
//             由 setTool / mousedown 觸發時傳 false，讓呼叫者決定工具狀態。
function commitText(autoSelect = true) {
  if (!textActive) return
  const content = textInputEl.value
  const pos     = textPos          // 在 _closeTextInput() 將 textPos 設為 null 之前先存起來
  textEditOrig  = null
  _closeTextInput()                // textActive=false；不再有循環風險
  if (!content.trim()) return
  pushHistory()
  const txtAnn = { id:newId(), type:'text', color, fontSize, x:pos.x, y:pos.y, content,
                   textStrokeColor, textStrokeWidth, textBgColor, textBgOpacity, shadow: textShadow,
                   bold: textBold, italic: textItalic, underline: textUnderline, strikethrough: textStrikethrough,
                   textAlign, fontFamily }
  annotations.push(txtAnn)
  if (autoSelect) {
    // 直接更新狀態，不呼叫 setTool()，避免 selectedId 被重置
    tool = 'select'
    selectedId = txtAnn.id
    document.querySelectorAll('.tool-btn[data-tool]').forEach(b =>
      b.classList.toggle('active', b.dataset.tool === 'select')
    )
    annotCanvas.style.cursor = 'default'
    showOptionsForAnnot(txtAnn)
  }
  renderAnnotations()
}

function cancelText() {
  if (textEditOrig) {
    annotations.push(textEditOrig)   // restore original text annotation
    selectedId   = textEditOrig.id
    textEditOrig = null
    renderAnnotations()
  }
  _closeTextInput()
}

function _closeTextInput() {
  textActive = false; textPos = null
  textInputWrap.classList.add('hidden')
  textInputEl.value = ''
}

// IME-aware event handlers
textInputEl.addEventListener('compositionstart', () => { isComposing = true })
textInputEl.addEventListener('compositionend',   () => { isComposing = false })

textInputEl.addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.stopPropagation(); cancelText(); return }
  if (e.key === 'Enter' && e.shiftKey && !isComposing) { e.preventDefault(); commitText() }
})

function resizeTextInput() {
  const lines = textInputEl.value.split('\n')
  const widest = lines.reduce((a, b) => a.length > b.length ? a : b, '') || ' '
  textMirrorEl.style.fontSize   = textInputEl.style.fontSize
  textMirrorEl.style.lineHeight = textInputEl.style.lineHeight
  textMirrorEl.textContent = widest
  textInputEl.style.width  = textMirrorEl.offsetWidth + 'px'
  textInputEl.style.height = 'auto'
  textInputEl.style.height = textInputEl.scrollHeight + 'px'
}

textInputEl.addEventListener('input', resizeTextInput)

// ─── Right-click context menu: layer ordering ─────────────────────────────────

const ctxMenu = document.getElementById('ctxMenu')

function hideCtxMenu() { ctxMenu.classList.add('hidden') }

function showCtxMenu(clientX, clientY, targetId) {
  const idx  = annotations.findIndex(a => a.id === targetId)
  const last = annotations.length - 1
  const atTop    = idx === last
  const atBottom = idx === 0
  document.getElementById('ctxToTop').style.display    = atTop    ? 'none' : ''
  document.getElementById('ctxMoveUp').style.display   = atTop    ? 'none' : ''
  document.getElementById('ctxMoveDown').style.display = atBottom ? 'none' : ''
  document.getElementById('ctxToBottom').style.display = atBottom ? 'none' : ''

  // Clamp to viewport
  ctxMenu.classList.remove('hidden')
  const mw = ctxMenu.offsetWidth  || 140
  const mh = ctxMenu.offsetHeight || 120
  const x  = Math.min(clientX, window.innerWidth  - mw - 8)
  const y  = Math.min(clientY, window.innerHeight - mh - 8)
  ctxMenu.style.left = x + 'px'
  ctxMenu.style.top  = y + 'px'
}

function moveLayer(dir) {
  const idx = annotations.findIndex(a => a.id === selectedId)
  if (idx < 0) { hideCtxMenu(); return }
  pushHistory()
  const last = annotations.length - 1
  if (dir === 'top' && idx < last) {
    const [a] = annotations.splice(idx, 1); annotations.push(a)
  } else if (dir === 'up' && idx < last) {
    ;[annotations[idx], annotations[idx + 1]] = [annotations[idx + 1], annotations[idx]]
  } else if (dir === 'down' && idx > 0) {
    ;[annotations[idx], annotations[idx - 1]] = [annotations[idx - 1], annotations[idx]]
  } else if (dir === 'bottom' && idx > 0) {
    const [a] = annotations.splice(idx, 1); annotations.unshift(a)
  }
  renderAnnotations()
  hideCtxMenu()
}

annotCanvas.addEventListener('contextmenu', e => {
  e.preventDefault()
  if (tool !== 'select') return
  const pos = evToImg(e)
  const a   = findAt(pos)
  if (!a) { hideCtxMenu(); return }
  selectedId = a.id
  showOptionsForAnnot(a)
  renderAnnotations()
  showCtxMenu(e.clientX, e.clientY, a.id)
})

document.addEventListener('click', () => hideCtxMenu())
ctxMenu.querySelectorAll('button[data-dir]').forEach(btn =>
  btn.addEventListener('click', e => { e.stopPropagation(); moveLayer(btn.dataset.dir) })
)

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  // Never intercept when an <input> or <textarea> has focus
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (textActive) return
  const meta = e.metaKey || e.ctrlKey
  if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
  if (meta && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return }
  if (meta && e.key === 's') { e.preventDefault(); openSaveModal(); return }

  // Copy / paste for all annotation types (except overlay images)
  if (meta && (e.key === 'c' || e.key === 'C')) {
    // Box-select: Cmd+C copies the selected region as pixel clipboard
    if (tool === 'boxselect' && boxSelRect && boxSelRect.w >= 4 && boxSelRect.h >= 4) {
      e.preventDefault()
      copyBoxSelection()
      return
    }
    const a = annotations.find(x => x.id === selectedId)
    if (a && a.type !== 'img') { annotClipboard = JSON.parse(JSON.stringify(a)); return }
  }
  if (meta && (e.key === 'v' || e.key === 'V')) {
    // Paste pixel clipboard as floating img annotation
    if (pixelClipboard) {
      e.preventDefault()
      const { dataURL, w, h } = pixelClipboard
      // Place at centre of current view
      const cx = Math.round(imgWidth  / 2 - w / 2)
      const cy = Math.round(imgHeight / 2 - h / 2)
      const id = newId()
      const tempImg = new Image()
      _imgCache.set(id, tempImg)
      tempImg.onload = () => renderAnnotations()
      tempImg.src = dataURL
      pushHistory()
      annotations.push({ id, type: 'img', x: cx, y: cy, w, h, src: dataURL, aspectRatio: w / h })
      setTool('select')
      selectedId = id
      renderAnnotations()
      return
    }
    if (annotClipboard) {
      e.preventDefault()
      const newA = JSON.parse(JSON.stringify(annotClipboard))
      newA.id = newId()
      if (newA.type === 'line')     { newA.x1 += 8; newA.y1 += 8; newA.x2 += 8; newA.y2 += 8 }
      else if (newA.type === 'polyline' || newA.type === 'pen') { newA.points.forEach(p => { p.x += 8; p.y += 8 }) }
      else                               { newA.x  += 8; newA.y  += 8 }
      pushHistory()
      annotations.push(newA)
      selectedId = newA.id
      showOptionsForAnnot(newA)
      renderAnnotations()
      return
    }
  }
  if (meta && (e.key === '=' || e.key === '+')) { e.preventDefault(); setTool('zoom-in');  zoomIn();     return }
  if (meta && e.key === '-')                    { e.preventDefault(); setTool('zoom-out'); zoomOut();    return }
  if (meta && e.key === '0')                    { e.preventDefault(); fitToWindow();                     return }

  if (e.key === 'Enter' && tool === 'crop') { e.preventDefault(); confirmCrop(); return }

  switch (e.key) {
    case 'v': case 'V': setTool('select');    break
    case 'm': case 'M': setTool('boxselect'); break
    case 'p': case 'P': setTool('pen');      break
    case 'r': case 'R': setTool('rect');     break
    case 'b': case 'B': setTool('fillrect'); break
    case 'l': case 'L': setTool('line');     break
    case 't': case 'T': setTool('text');   break
    case 'n': case 'N': setTool('number'); break
    case 'o': case 'O': document.getElementById('btnOverlayImg').click(); break
    case 'e': case 'E': document.getElementById('btnExtend').click();     break
    case 'c': case 'C': setTool('crop');   break
    case 'g': case 'G': setTool('ocr');    break
    case 's': case 'S': openResizeModal(); break
    case 'Escape':
      hideCtxMenu()
      if (polylineActive) { _cancelPolyline(); renderAnnotations(); break }
      if (tool === 'crop') { cancelCrop(); break }
      if (tool === 'ocr')  { ocrRect = null; isOcrSelecting = false; document.getElementById('ocrStatusLabel').textContent = '請拖曳選取辨識區域'; renderAnnotations(); break }
      if (tool === 'boxselect') { boxSelRect = null; isBoxSelecting = false; syncBoxSelUI(); renderAnnotations(); break }
      selectedId = null
      isDrawing  = false
      if (tool === 'select') hideAllOptions()
      renderAnnotations()
      break
    case 'Delete': case 'Backspace':
      if (selectedId) {
        pushHistory()
        annotations = annotations.filter(a => a.id !== selectedId)
        selectedId  = null
        hideAllOptions()
        renderAnnotations()
      }
      break
  }
})

// ─── Save ─────────────────────────────────────────────────────────────────────

const saveModal = document.getElementById('saveModal')

function openSaveModal() {
  commitText(false)
  saveModal.classList.remove('hidden')
}

document.getElementById('btnSave').addEventListener('click', openSaveModal)
document.getElementById('saveModalClose').addEventListener('click',  () => saveModal.classList.add('hidden'))
document.getElementById('btnSaveCancel').addEventListener('click',   () => saveModal.classList.add('hidden'))
saveModal.addEventListener('click', e => { if (e.target === saveModal) saveModal.classList.add('hidden') })

document.getElementById('btnSaveConfirm').addEventListener('click', async () => {
  saveModal.classList.add('hidden')
  const format  = document.querySelector('input[name="fmt"]:checked').value
  const dataURL = burnIn(format)
  const result  = await ipcRenderer.invoke('save-image-as', { dataURL, format })
  if (result?.success) {
    showToast(`已儲存：${result.path.split('/').pop()}`)
    setTimeout(() => window.close(), 800)
  }
})

// ─── Crop helpers ─────────────────────────────────────────────────────────────

function getCropHandles(cr) {
  const { x, y, w, h } = cr
  const mx = x + w / 2, my = y + h / 2
  return [
    { id: 'nw', x,     y,     cursor: 'nwse-resize' },
    { id: 'n',  x: mx, y,     cursor: 'ns-resize'   },
    { id: 'ne', x: x+w,y,     cursor: 'nesw-resize' },
    { id: 'e',  x: x+w,y: my, cursor: 'ew-resize'   },
    { id: 'se', x: x+w,y: y+h,cursor: 'nwse-resize' },
    { id: 's',  x: mx, y: y+h,cursor: 'ns-resize'   },
    { id: 'sw', x,     y: y+h,cursor: 'nesw-resize' },
    { id: 'w',  x,     y: my, cursor: 'ew-resize'   },
  ]
}

function findCropHandle(pos) {
  if (!cropRect) return null
  const hitR = (HANDLE_R + 4) / viewScale
  return getCropHandles(cropRect).find(h => Math.hypot(h.x - pos.x, h.y - pos.y) <= hitR) ?? null
}

function insideCropRect(pos) {
  if (!cropRect) return false
  const { x, y, w, h } = cropRect
  return pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h
}

function applyCropResize(pos) {
  const { x, y, w, h } = cropRect
  let x1, y1, x2, y2
  switch (cropResizeH) {
    case 'nw': x1=pos.x; y1=pos.y; x2=x+w;  y2=y+h;  break
    case 'n':  x1=x;     y1=pos.y; x2=x+w;  y2=y+h;  break
    case 'ne': x1=x;     y1=pos.y; x2=pos.x;y2=y+h;  break
    case 'e':  x1=x;     y1=y;     x2=pos.x;y2=y+h;  break
    case 'se': x1=x;     y1=y;     x2=pos.x;y2=pos.y; break
    case 's':  x1=x;     y1=y;     x2=x+w;  y2=pos.y; break
    case 'sw': x1=pos.x; y1=y;     x2=x+w;  y2=pos.y; break
    case 'w':  x1=pos.x; y1=y;     x2=x+w;  y2=y+h;  break
    default: return
  }
  cropRect = {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.max(Math.abs(x2 - x1), 1),
    h: Math.max(Math.abs(y2 - y1), 1),
  }
  updateCropSizeLabel()
}

function updateCropSizeLabel() {
  const pw = Math.round(cropRect?.w ?? 0), ph = Math.round(cropRect?.h ?? 0)
  document.getElementById('cropSizeLabel').textContent =
    pw > 0 && ph > 0 ? `${pw} × ${ph} px` : '請拖曳選取範圍'
}

// ─── Crop ─────────────────────────────────────────────────────────────────────

function confirmCrop() {
  if (!cropRect || cropRect.w < 1 || cropRect.h < 1) {
    showToast('請先拖曳選取裁切範圍', true); return
  }
  const cx = Math.max(0, Math.round(cropRect.x))
  const cy = Math.max(0, Math.round(cropRect.y))
  const cw = Math.min(Math.round(cropRect.w), imgWidth  - cx)
  const ch = Math.min(Math.round(cropRect.h), imgHeight - cy)
  if (cw < 1 || ch < 1) { showToast('裁切範圍超出圖片邊界', true); return }

  const off = document.createElement('canvas')
  off.width = cw; off.height = ch
  off.getContext('2d').drawImage(imgElement, cx, cy, cw, ch, 0, 0, cw, ch)

  const newImg = new Image()
  newImg.onload = () => {
    imgElement = newImg
    imgWidth   = cw
    imgHeight  = ch
    // Translate annotation coordinates
    annotations = annotations.map(a => {
      a = JSON.parse(JSON.stringify(a))
      switch (a.type) {
        case 'rect': case 'fillrect': case 'text': case 'number': a.x -= cx; a.y -= cy; break
        case 'line': a.x1 -= cx; a.y1 -= cy; a.x2 -= cx; a.y2 -= cy; break
      }
      return a
    })
    history    = [JSON.parse(JSON.stringify(annotations))]
    historyIdx = 0
    cropRect   = null
    userZoomed = false
    document.getElementById('imgInfo').textContent = `${imgWidth} × ${imgHeight} px`
    fitCanvas()
    drawBase()
    setTool('rect')
    showToast(`已裁切：${cw} × ${ch} px`)
  }
  newImg.src = off.toDataURL()
}

function cancelCrop() {
  cropRect   = null
  isCropping = false
  setTool('rect')
}

document.getElementById('btnCropConfirm').addEventListener('click', confirmCrop)
document.getElementById('btnCropCancel').addEventListener('click', cancelCrop)

// ─── Box select ───────────────────────────────────────────────────────────────

function copyBoxSelection() {
  if (!boxSelRect || boxSelRect.w < 4 || boxSelRect.h < 4) return

  const r = boxSelRect
  const sw = Math.round(r.w), sh = Math.round(r.h)

  const off = document.createElement('canvas')
  off.width  = imgWidth
  off.height = imgHeight
  const offCtx = off.getContext('2d')
  offCtx.drawImage(imgElement, 0, 0, imgWidth, imgHeight)
  const savedScale = viewScale
  viewScale = 1
  annotations.forEach(a => drawOne(offCtx, a))
  viewScale = savedScale

  const crop = document.createElement('canvas')
  crop.width  = sw
  crop.height = sh
  crop.getContext('2d').drawImage(off, Math.round(r.x), Math.round(r.y), sw, sh, 0, 0, sw, sh)
  const dataURL = crop.toDataURL('image/png')

  pixelClipboard = { dataURL, w: sw, h: sh }

  const { nativeImage, clipboard } = require('electron')
  clipboard.writeImage(nativeImage.createFromDataURL(dataURL))

  showToast(`已複製 ${sw} × ${sh} px，Cmd+V 貼上為浮動圖層`)
}

// ─── OCR ─────────────────────────────────────────────────────────────────────

function triggerOcr() {
  startOcrRecognition()
}

function _updateOcrProgress({ status, progress }) {
  const bar   = document.getElementById('ocrProgressInner')
  const label = document.getElementById('ocrProgressLabel')
  const pct   = Math.round((progress || 0) * 100)
  bar.style.width = `${pct}%`
  if      (status.includes('loading language')) label.textContent = `下載語言包 ${pct}%`
  else if (status.includes('recognizing'))      label.textContent = `辨識中... ${pct}%`
  else if (status.includes('initialized'))      label.textContent = `初始化完成`
  else                                          label.textContent = status
}

function startOcrRecognition() {
  if (!ocrRect) return

  // Show panel with progress bar
  const panel = document.getElementById('ocrPanel')
  panel.classList.remove('hidden')
  const progressWrap = document.getElementById('ocrProgressWrap')
  progressWrap.classList.remove('hidden')
  progressWrap.style.display = ''
  document.getElementById('ocrProgressInner').style.width = '0%'
  document.getElementById('ocrProgressLabel').textContent = '辨識中...'
  document.getElementById('ocrResultText').value = ''
  document.getElementById('btnOcrCopy').disabled = true
  document.getElementById('btnOcrCopyClose').disabled = true

  // Extract region at original image resolution
  const r = ocrRect
  const off = document.createElement('canvas')
  off.width  = Math.max(1, Math.round(r.w))
  off.height = Math.max(1, Math.round(r.h))
  const offCtx = off.getContext('2d')
  offCtx.drawImage(baseCanvas, c(r.x), c(r.y), c(r.w), c(r.h), 0, 0, off.width, off.height)
  const dataURL = off.toDataURL('image/png')

  ipcRenderer.invoke('ocr-recognize', { dataURL }).then(result => {
    const wrap = document.getElementById('ocrProgressWrap')
    wrap.classList.add('hidden')
    wrap.style.display = 'none'
    if (result.success) {
      document.getElementById('ocrResultText').value = result.text
      document.getElementById('btnOcrCopy').disabled      = false
      document.getElementById('btnOcrCopyClose').disabled = false
      if (!result.text) showToast('OCR 未辨識到文字，請嘗試更清晰的區域')
    } else {
      document.getElementById('ocrResultText').value = `辨識失敗：${result.error}`
      showToast('OCR 辨識失敗')
    }
  })
}

ipcRenderer.on('ocr-progress', (_, { status, progress }) => {
  _updateOcrProgress({ status, progress })
})

// OCR panel button handlers
document.getElementById('ocrPanelClose').addEventListener('click', () => {
  document.getElementById('ocrPanel').classList.add('hidden')
  // 關閉時清除 OCR 選取框，取消按鈕也隨之消失
  ocrRect = null
  isOcrSelecting = false
  renderAnnotations()
})

document.getElementById('btnOcrCopy').addEventListener('click', () => {
  const text = document.getElementById('ocrResultText').value
  const { clipboard } = require('electron')
  clipboard.writeText(text)
  showToast('文字已複製到剪貼簿')
})

document.getElementById('btnOcrCopyClose').addEventListener('click', () => {
  const text = document.getElementById('ocrResultText').value
  const { clipboard } = require('electron')
  clipboard.writeText(text)
  showToast('文字已複製到剪貼簿')
  document.getElementById('ocrPanel').classList.add('hidden')
  ocrRect = null
  isOcrSelecting = false
  renderAnnotations()
})

// OCR download confirmation
document.getElementById('btnOcrDownloadConfirm').addEventListener('click', () => {
  document.getElementById('ocrDownloadModal').classList.add('hidden')
  startOcrRecognition()
})

document.getElementById('btnOcrDownloadCancel').addEventListener('click', () => {
  document.getElementById('ocrDownloadModal').classList.add('hidden')
  ocrRect = null
  document.getElementById('ocrStatusLabel').textContent = '請拖曳選取辨識區域'
  renderAnnotations()
})


// ─── Resize ───────────────────────────────────────────────────────────────────

const resizeModal = document.getElementById('resizeModal')

function openResizeModal() {
  if (!imgElement) return
  document.getElementById('resizeW').value = imgWidth
  document.getElementById('resizeH').value = imgHeight
  resizeModal.classList.remove('hidden')
  setTimeout(() => document.getElementById('resizeW').select(), 10)
}

document.getElementById('btnResize').addEventListener('click', openResizeModal)
document.getElementById('resizeModalClose').addEventListener('click', () => resizeModal.classList.add('hidden'))
document.getElementById('btnResizeCancel').addEventListener('click',  () => resizeModal.classList.add('hidden'))
resizeModal.addEventListener('click', e => { if (e.target === resizeModal) resizeModal.classList.add('hidden') })

document.getElementById('resizeW').addEventListener('input', e => {
  const w = parseInt(e.target.value) || 0
  document.getElementById('resizeH').value =
    w > 0 && imgWidth > 0 ? Math.round(w * imgHeight / imgWidth) : ''
})

document.getElementById('btnResizeConfirm').addEventListener('click', () => {
  const targetW = Math.max(1, parseInt(document.getElementById('resizeW').value) || 1)
  const targetH = Math.max(1, parseInt(document.getElementById('resizeH').value) || 1)
  const origW = imgWidth, origH = imgHeight

  const off = document.createElement('canvas')
  off.width = targetW; off.height = targetH
  off.getContext('2d').drawImage(imgElement, 0, 0, targetW, targetH)

  const newImg = new Image()
  newImg.onload = () => {
    imgElement = newImg
    imgWidth   = targetW
    imgHeight  = targetH
    const sx = targetW / origW, sy = targetH / origH
    annotations = annotations.map(a => {
      a = JSON.parse(JSON.stringify(a))
      switch (a.type) {
        case 'rect':
        case 'fillrect':
          a.x *= sx; a.y *= sy; a.w *= sx; a.h *= sy
          a.thickness = Math.max(1, Math.round(a.thickness * sx))
          break
        case 'line':
          a.x1 *= sx; a.y1 *= sy; a.x2 *= sx; a.y2 *= sy
          a.thickness = Math.max(1, Math.round(a.thickness * sx))
          break
        case 'text':
          a.x *= sx; a.y *= sy
          a.fontSize = Math.max(8, Math.round(a.fontSize * sx))
          break
        case 'number':
          a.x *= sx; a.y *= sy
          a.size = Math.max(6, Math.round(a.size * sx))
          break
      }
      return a
    })
    history    = [JSON.parse(JSON.stringify(annotations))]
    historyIdx = 0
    userZoomed = false
    document.getElementById('imgInfo').textContent = `${imgWidth} × ${imgHeight} px`
    fitCanvas()
    drawBase()
    renderAnnotations()
    resizeModal.classList.add('hidden')
    showToast(`已調整尺寸：${targetW} × ${targetH} px`)
  }
  newImg.src = off.toDataURL()
})

// Burn all annotations at full original resolution
function burnIn(format) {
  const off = document.createElement('canvas')
  off.width = imgWidth; off.height = imgHeight
  const ctx = off.getContext('2d')
  ctx.drawImage(imgElement, 0, 0, imgWidth, imgHeight)

  const savedScale = viewScale
  viewScale = 1
  annotations.forEach(a => drawOne(ctx, a))
  viewScale = savedScale

  const mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
  return off.toDataURL(mime, 0.92)
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast')
  toast.textContent = msg
  toast.classList.toggle('toast-error', isError)
  toast.classList.add('visible')
  setTimeout(() => toast.classList.remove('visible'), 2800)
}
