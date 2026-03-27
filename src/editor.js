// electronAPI and t/applyI18n are injected by preload-editor.js and i18n.js (loaded via <script>)
const { invoke: ipcInvoke, send: ipcSend, on: ipcOn } = window.electronAPI

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
let imgDPR     = 1    // pixel density of the source image (1 = normal, 2 = Retina 2×)
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
// Each entry: { annots: Annotation[], imgSnap: null | { src: string, w: number, h: number } }
// imgSnap is non-null for crop steps; restoring such an entry also restores the image.
let annotations = []
let history     = [{ annots: [], imgSnap: null }]
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
let fontSize  = 24
let numCount  = 1
let numSize   = 24    // radius, image pixels
let numberStyle   = 'dot'   // dot | circle | circle-fill | roman | cjk-paren | cjk-circle
let numThickness  = 0       // 描邊粗細，獨立於全域 thickness
let numStrokeColor = '#ffffff'  // 描邊顏色
const STYLE_LIMITS = { dot: Infinity, circle: 50, 'circle-fill': 10, roman: 12, 'cjk-paren': 10, 'cjk-circle': 10 }
const STYLE_LABELS = {
  dot: () => t('style_dot'),
  circle: () => t('style_circle'),
  'circle-fill': () => t('style_circle_fill'),
  roman: () => t('style_roman'),
  'cjk-paren': () => t('style_cjk_paren'),
  'cjk-circle': () => t('style_cjk_circle'),
}
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
let selectedIds  = new Set()  // multi-select id set
let rubberBand   = null       // { x0, y0, x1, y1 } in image coords during rubber-band drag
let isDragging   = false
let hasDragged   = false
let lastMousePos = null

// Smart snap
const SNAP_PX       = 8        // snap threshold in screen pixels
let snapGuides      = []       // [{ axis: 'x'|'y', value: number }] active guide lines
let dragStartPos    = null     // { x, y } mouse position when drag began (image coords)
let dragStartStates = {}       // { [id]: { x, y, x2?, y2? } } annotation positions at drag start

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

// Privacy mask
let isPrivacySelecting = false
let privacySelRect     = null   // { x, y, w, h } in image coordinates
let privacySelStart    = null
let privacyBlockSize   = 16
let privacyBlurRadius  = 8

// Box select
let isBoxSelecting  = false  // currently drawing selection rect
let boxSelRect      = null   // { x, y, w, h } in image coordinates (normalised after mouseup)
let boxSelStart     = null   // drag start pos
let pixelClipboard  = null   // { dataURL, w, h } — last copied region

// Mosaic tool
let mosaicMode      = 'mosaic'  // 'mosaic' | 'blur'
let mosaicBlockSize = 16
let mosaicBlurRadius = 8
let isMosaicDrawing = false
let mosaicDrawStart = null
let mosaicPreviewRect = null

// Symbol tool
let symbolChar = '★'
let symbolSize = 64  // image pixels (font-size equivalent)

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

applyI18n()

// Translate line-style select options (appear in multiple selects)
document.querySelectorAll('.line-style-select option').forEach(opt => {
  const key = 'dash_' + opt.value
  const str = t(key)
  if (str !== key) opt.textContent = str
})

const baseCanvas    = document.getElementById('baseCanvas')
const annotCanvas   = document.getElementById('annotCanvas')
const baseCtx       = baseCanvas.getContext('2d')
const annotCtx      = annotCanvas.getContext('2d')
const canvasArea    = document.getElementById('canvasArea')
const canvasWrapper = document.getElementById('canvasWrapper')
const DPR           = window.devicePixelRatio || 1   // Retina support
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
   'grpShadow','grpZoom','grpCrop','grpOcr','grpBoxSelect',
   'grpMosaic','grpSymbol','grpPrivacyMask','grpAlign','grpFlip'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.classList.add('hidden')
  })
  document.getElementById('numValueEdit').classList.add('hidden')
  document.getElementById('btnLineOrtho')?.classList.remove('hidden')  // reset to visible by default
  hideSymbolPanel()
}

function showAlignOptions() {
  hideAllOptions()
  document.getElementById('grpAlign').classList.remove('hidden')
  document.getElementById('grpFlip').classList.remove('hidden')
  const n = selectedIds.size
  document.getElementById('btnDistributeH').disabled = n < 3
  document.getElementById('btnDistributeV').disabled = n < 3
  _syncAlignLRVisibility()
}

function _syncAlignLRVisibility() {
  const toCanvas = document.getElementById('chkAlignToCanvas').checked
  document.getElementById('btnGrpAlignLeft') .classList.toggle('hidden', toCanvas)
  document.getElementById('btnGrpAlignRight').classList.toggle('hidden', toCanvas)
}

document.getElementById('chkAlignToCanvas')?.addEventListener('change', _syncAlignLRVisibility)

// ─── Smart snap ───────────────────────────────────────────────────────────────

function _computeSnap(draggedAnnots) {
  const threshold = SNAP_PX / viewScale

  // Group bounding box of dragged objects at current position
  const bbs = draggedAnnots.map(a => bounds(a)).filter(Boolean)
  if (!bbs.length) return { dx: 0, dy: 0, guides: [] }

  const gx0 = Math.min(...bbs.map(b => b.x))
  const gy0 = Math.min(...bbs.map(b => b.y))
  const gx1 = Math.max(...bbs.map(b => b.x + b.w))
  const gy1 = Math.max(...bbs.map(b => b.y + b.h))
  const gw  = gx1 - gx0
  const gh  = gy1 - gy0

  // Snap candidate points on the dragged group
  const dragXs = [gx0, (gx0 + gx1) / 2, gx1]
  const dragYs = [gy0, (gy0 + gy1) / 2, gy1]

  // Reference snap points: canvas edges/center + all non-dragged annotations
  const refXs = [0, imgWidth / 2, imgWidth]
  const refYs = [0, imgHeight / 2, imgHeight]
  const draggedIds = new Set(draggedAnnots.map(a => a.id))
  const others = []
  annotations.forEach(a => {
    if (draggedIds.has(a.id)) return
    const b = bounds(a)
    if (!b) return
    others.push(b)
    refXs.push(b.x, b.x + b.w / 2, b.x + b.w)
    refYs.push(b.y, b.y + b.h / 2, b.y + b.h)
  })

  // Find closest edge/center snap on X
  let bestDx = null, snapX = null, snapXType = 'edge'
  for (const dv of dragXs) {
    for (const rv of refXs) {
      const delta = rv - dv
      if (Math.abs(delta) < threshold && (bestDx === null || Math.abs(delta) < Math.abs(bestDx))) {
        bestDx = delta; snapX = rv
      }
    }
  }

  // Find closest edge/center snap on Y
  let bestDy = null, snapY = null, snapYType = 'edge'
  for (const dv of dragYs) {
    for (const rv of refYs) {
      const delta = rv - dv
      if (Math.abs(delta) < threshold && (bestDy === null || Math.abs(delta) < Math.abs(bestDy))) {
        bestDy = delta; snapY = rv
      }
    }
  }

  // Distribute snap: horizontal — 3 cases per pair (A left of B):
  //   1. dragged between A and B (equal gaps on both sides)
  //   2. dragged to the right of B (gap B→dragged = gap A→B)
  //   3. dragged to the left of A (gap dragged→A = gap A→B)
  let distributeXLines = null
  for (let i = 0; i < others.length; i++) {
    for (let j = 0; j < others.length; j++) {
      if (i === j) continue
      const A = others[i], B = others[j]
      if (A.x + A.w >= B.x) continue          // enforce A fully left of B
      const gap_AB = B.x - (A.x + A.w)

      const trySnapX = (snap_gx0, lines) => {
        const delta = snap_gx0 - gx0
        if (Math.abs(delta) < threshold && (bestDx === null || Math.abs(delta) < Math.abs(bestDx))) {
          bestDx = delta; snapXType = 'distribute'; distributeXLines = lines
        }
      }

      // Case 1: dragged fits between A and B
      if (gap_AB > gw) {
        const eq = (gap_AB - gw) / 2
        const s  = (A.x + A.w) + eq
        trySnapX(s, [A.x + A.w, s, s + gw, B.x])
      }
      // Case 2: dragged extends right of B — gap(B→dragged) = gap_AB
      trySnapX((B.x + B.w) + gap_AB, [A.x + A.w, B.x, B.x + B.w, (B.x + B.w) + gap_AB])
      // Case 3: dragged extends left of A — gap(dragged→A) = gap_AB
      const s3 = A.x - gap_AB - gw
      trySnapX(s3, [s3 + gw, A.x, A.x + A.w, B.x])
    }
  }

  // Distribute snap: vertical — same 3 cases for Y
  let distributeYLines = null
  for (let i = 0; i < others.length; i++) {
    for (let j = 0; j < others.length; j++) {
      if (i === j) continue
      const A = others[i], B = others[j]
      if (A.y + A.h >= B.y) continue
      const gap_AB = B.y - (A.y + A.h)

      const trySnapY = (snap_gy0, lines) => {
        const delta = snap_gy0 - gy0
        if (Math.abs(delta) < threshold && (bestDy === null || Math.abs(delta) < Math.abs(bestDy))) {
          bestDy = delta; snapYType = 'distribute'; distributeYLines = lines
        }
      }

      // Case 1: dragged fits between A and B
      if (gap_AB > gh) {
        const eq = (gap_AB - gh) / 2
        const s  = (A.y + A.h) + eq
        trySnapY(s, [A.y + A.h, s, s + gh, B.y])
      }
      // Case 2: dragged extends below B — gap(B→dragged) = gap_AB
      trySnapY((B.y + B.h) + gap_AB, [A.y + A.h, B.y, B.y + B.h, (B.y + B.h) + gap_AB])
      // Case 3: dragged extends above A — gap(dragged→A) = gap_AB
      const s3 = A.y - gap_AB - gh
      trySnapY(s3, [s3 + gh, A.y, A.y + A.h, B.y])
    }
  }

  const guides = []
  if (snapXType === 'distribute' && distributeXLines) {
    guides.push({ axis: 'x', type: 'distribute', lines: distributeXLines })
  } else if (snapX !== null) {
    guides.push({ axis: 'x', value: snapX, type: snapXType })
  }
  if (snapYType === 'distribute' && distributeYLines) {
    guides.push({ axis: 'y', type: 'distribute', lines: distributeYLines })
  } else if (snapY !== null) {
    guides.push({ axis: 'y', value: snapY, type: snapYType })
  }

  return { dx: bestDx ?? 0, dy: bestDy ?? 0, guides }
}

function _startDrag(pos) {
  isDragging = true; hasDragged = false; lastMousePos = pos
  dragStartPos = { x: pos.x, y: pos.y }
  dragStartStates = {}
  snapGuides = []
  const ids = selectedIds.size > 0 ? [...selectedIds] : (selectedId ? [selectedId] : [])
  ids.forEach(id => {
    const a = annotations.find(x => x.id === id)
    if (!a) return
    if (a.type === 'line') {
      dragStartStates[id] = { x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, cx: a.cx, cy: a.cy }
    } else {
      dragStartStates[id] = { x: a.x, y: a.y, x2: a.x2, y2: a.y2 }
    }
  })
}

// ─── Alignment helpers ────────────────────────────────────────────────────────

function _alignSelectedAnnots(mode) {
  const annots = annotations.filter(a => selectedIds.has(a.id))
  if (annots.length < 2) return
  const toCanvas = document.getElementById('chkAlignToCanvas').checked

  // Snapshot all bounds BEFORE any moveAnnot calls
  const bbs = annots.map(a => bounds(a))
  if (bbs.some(b => !b)) return

  const gx0 = Math.min(...bbs.map(b => b.x))
  const gy0 = Math.min(...bbs.map(b => b.y))
  const gx1 = Math.max(...bbs.map(b => b.x + b.w))
  const gy1 = Math.max(...bbs.map(b => b.y + b.h))
  const gCx = (gx0 + gx1) / 2
  const gCy = (gy0 + gy1) / 2

  pushHistory()

  switch (mode) {
    case 'left': {
      const dx = toCanvas ? -gx0 : 0
      annots.forEach((a, i) => moveAnnot(a, toCanvas ? dx : gx0 - bbs[i].x, 0))
      break
    }
    case 'hcenter': {
      const dx = toCanvas ? imgWidth / 2 - gCx : 0
      annots.forEach((a, i) => moveAnnot(a, toCanvas ? dx : gCx - (bbs[i].x + bbs[i].w / 2), 0))
      break
    }
    case 'right': {
      const dx = toCanvas ? imgWidth - gx1 : 0
      annots.forEach((a, i) => moveAnnot(a, toCanvas ? dx : gx1 - (bbs[i].x + bbs[i].w), 0))
      break
    }
    case 'top': {
      const dy = toCanvas ? -gy0 : 0
      annots.forEach((a, i) => moveAnnot(a, 0, toCanvas ? dy : gy0 - bbs[i].y))
      break
    }
    case 'vcenter': {
      const dy = toCanvas ? imgHeight / 2 - gCy : 0
      annots.forEach((a, i) => moveAnnot(a, 0, toCanvas ? dy : gCy - (bbs[i].y + bbs[i].h / 2)))
      break
    }
    case 'bottom': {
      const dy = toCanvas ? imgHeight - gy1 : 0
      annots.forEach((a, i) => moveAnnot(a, 0, toCanvas ? dy : gy1 - (bbs[i].y + bbs[i].h)))
      break
    }
    case 'distributeH': {
      if (annots.length < 3) return
      const order = annots.map((a, i) => ({ a, b: bbs[i] })).sort((p, q) => p.b.x - q.b.x)
      const span = order[order.length - 1].b.x + order[order.length - 1].b.w - order[0].b.x
      const sumW = order.reduce((s, p) => s + p.b.w, 0)
      const gap  = (span - sumW) / (order.length - 1)
      let curX = order[0].b.x + order[0].b.w
      for (let i = 1; i < order.length - 1; i++) {
        moveAnnot(order[i].a, curX + gap - order[i].b.x, 0)
        curX += gap + order[i].b.w
      }
      break
    }
    case 'distributeV': {
      if (annots.length < 3) return
      const order = annots.map((a, i) => ({ a, b: bbs[i] })).sort((p, q) => p.b.y - q.b.y)
      const span = order[order.length - 1].b.y + order[order.length - 1].b.h - order[0].b.y
      const sumH = order.reduce((s, p) => s + p.b.h, 0)
      const gap  = (span - sumH) / (order.length - 1)
      let curY = order[0].b.y + order[0].b.h
      for (let i = 1; i < order.length - 1; i++) {
        moveAnnot(order[i].a, 0, curY + gap - order[i].b.y)
        curY += gap + order[i].b.h
      }
      break
    }
  }
  renderAnnotations()
}

// ─── Alignment button listeners ───────────────────────────────────────────────

document.getElementById('btnGrpAlignLeft')?.addEventListener('click',  () => _alignSelectedAnnots('left'))
document.getElementById('btnAlignHCenter')?.addEventListener('click',  () => _alignSelectedAnnots('vcenter'))
document.getElementById('btnGrpAlignRight')?.addEventListener('click', () => _alignSelectedAnnots('right'))
document.getElementById('btnAlignTop')?.addEventListener('click',     () => _alignSelectedAnnots('top'))
document.getElementById('btnAlignVCenter')?.addEventListener('click', () => _alignSelectedAnnots('hcenter'))
document.getElementById('btnAlignBottom')?.addEventListener('click',  () => _alignSelectedAnnots('bottom'))
document.getElementById('btnDistributeH')?.addEventListener('click',  () => _alignSelectedAnnots('distributeH'))
document.getElementById('btnDistributeV')?.addEventListener('click',  () => _alignSelectedAnnots('distributeV'))

// ── Flip buttons ──────────────────────────────────────────────────────────────
function _applyFlip(axis) {
  const targets = selectedIds.size > 0
    ? [...selectedIds].map(id => annotations.find(a => a.id === id)).filter(Boolean)
    : selectedId ? [annotations.find(a => a.id === selectedId)].filter(Boolean) : []
  if (targets.length === 0) return
  targets.forEach(a => {
    if (axis === 'h') a.flipX = !a.flipX
    else              a.flipY = !a.flipY
  })
  pushHistory()
  renderAnnotations()
}
document.getElementById('btnFlipH')?.addEventListener('click', () => _applyFlip('h'))
document.getElementById('btnFlipV')?.addEventListener('click', () => _applyFlip('v'))

function showOptionsForTool(tool) {
  hideAllOptions()
  if (tool === 'zoom-in' || tool === 'zoom-out') {
    document.getElementById('grpZoom').classList.remove('hidden')
    return
  }
  if (tool === 'crop') {
    document.getElementById('grpCrop').classList.remove('hidden')
    return
  }
  if (tool === 'ocr') {
    document.getElementById('grpOcr').classList.remove('hidden')
    document.getElementById('ocrStatusLabel').textContent = t('ocr_drag')
    return
  }
  if (tool === 'boxselect') {
    document.getElementById('grpBoxSelect').classList.remove('hidden')
    syncBoxSelUI()
    return
  }
  if (tool === 'mosaic') {
    document.getElementById('grpMosaic').classList.remove('hidden')
    syncMosaicUI()
    return
  }
  if (tool === 'privacymask') {
    document.getElementById('grpPrivacyMask').classList.remove('hidden')
    syncPrivacyUI()
    return
  }
  if (tool === 'symbol') {
    document.getElementById('grpColor').classList.remove('hidden')
    document.getElementById('grpSymbol').classList.remove('hidden')
    document.getElementById('grpShadow').classList.remove('hidden')
    syncSymbolUI()
    syncShadowCheck(false)
    return
  }
  const sh  = id => document.getElementById(id).classList.remove('hidden')
  if (tool === 'pen') {
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
  if (!['rect','ellipse','fillrect','fillellipse','line','text','number'].includes(tool)) return
  // (polyline 由 line tool 雙擊切換，此處不需獨立 tool id)
  const isFill = tool === 'fillrect' || tool === 'fillellipse'
  if (!isFill) sh('grpColor')
  if (isFill) {
    sh('grpFillColor')
    syncFillMode(fillMode); syncFillColorA(fillColorA); syncFillColorB(fillColorB)
    syncFillGradientDir(fillGradientDir); syncFillOpacity(fillOpacity); syncFillBorderColor(fillBorderColor)
  }
  if (['rect','ellipse','fillrect','fillellipse','line','number'].includes(tool)) sh('grpThickness')
  syncNumStrokeUI(tool === 'number')
  if (tool === 'line') {
    sh('grpLineStyle'); sh('grpDashStyle'); sh('grpCaps'); sh('grpStrokeOpacity'); sh('grpShadow')
    syncLineOrtho(lineOrtho); syncLineBorderColor(lineBorderColor)
    syncLineBorderThickness(lineBorderThickness); syncLineBorderDash(lineBorderDashStyle)
    syncDashStyle(lineStyle); syncCaps(startCap, endCap)
    syncStrokeOpacity(lineOpacity); syncShadowCheck(lineShadow)
  }
  if (tool === 'rect') {
    sh('grpRectShape'); sh('grpStrokeBorder'); sh('grpDashStyle')
    sh('grpRadius'); sh('grpStrokeOpacity'); sh('grpShadow')
    syncRectShape(tool)
    syncStrokeBorderColor(rectBorderColor); syncStrokeBorderThickness(rectBorderThickness); syncStrokeBorderDash(rectBorderDashStyle)
    syncStrokeBorderOffset(rectBorderOffsetX, rectBorderOffsetY)
    syncDashStyle(rectLineStyle); syncCornerRadius(cornerRadius)
    syncStrokeOpacity(rectOpacity); syncShadowCheck(rectShadow)
  }
  if (tool === 'ellipse') {
    sh('grpRectShape'); sh('grpStrokeBorder'); sh('grpDashStyle')
    sh('grpStrokeOpacity'); sh('grpShadow')
    syncRectShape(tool)
    syncStrokeBorderColor(ellipseBorderColor); syncStrokeBorderThickness(ellipseBorderThickness); syncStrokeBorderDash(ellipseBorderDashStyle)
    syncStrokeBorderOffset(ellipseBorderOffsetX, ellipseBorderOffsetY)
    syncDashStyle(ellipseLineStyle)
    syncStrokeOpacity(ellipseOpacity); syncShadowCheck(ellipseShadow)
  }
  if (tool === 'fillrect') {
    sh('grpFillShape'); sh('grpDashStyle'); sh('grpRadius'); sh('grpShadow')
    syncFillShape(tool); syncDashStyle(fillrectLineStyle); syncCornerRadius(cornerRadius); syncShadowCheck(fillrectShadow)
  }
  if (tool === 'fillellipse') {
    sh('grpFillShape'); sh('grpDashStyle'); sh('grpShadow')
    syncFillShape(tool); syncDashStyle(fillellipseLineStyle); syncShadowCheck(fillellipseShadow)
  }
  if (tool === 'text') {
    sh('grpFont')
    syncTextShadowCheck(textShadow)
    syncTextBold(textBold); syncTextItalic(textItalic); syncTextUnderline(textUnderline); syncTextStrikethrough(textStrikethrough)
    syncTextAlign(textAlign)
    syncTextStrokeColor(textStrokeColor); syncTextStrokeWidth(textStrokeWidth)
    syncTextBgOpacity(textBgOpacity); syncTextBgPreview()
    syncFontFamily(fontFamily)
  }
  if (tool === 'number') { sh('grpNumber'); sh('grpShadow'); syncShadowCheck(numShadow); syncNumStyle(numberStyle) }
}

function syncMosaicUI() {
  document.getElementById('btnMosaicModeMosaic').classList.toggle('active', mosaicMode === 'mosaic')
  document.getElementById('btnMosaicModeBlur').classList.toggle('active', mosaicMode === 'blur')
  document.getElementById('grpMosaicBlock').classList.toggle('hidden', mosaicMode === 'blur')
  document.getElementById('grpMosaicBlur').classList.toggle('hidden', mosaicMode === 'mosaic')
  document.getElementById('mosaicIntLabel').textContent = mosaicMode === 'mosaic' ? t('mosaic_block') : t('mosaic_intensity')
  document.querySelectorAll('#grpMosaicBlock [data-block]').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.block) === mosaicBlockSize)
  })
  document.querySelectorAll('#grpMosaicBlur [data-blur]').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.blur) === mosaicBlurRadius)
  })
}

function syncSymbolUI() {
  document.getElementById('symbolPreviewSwatch').textContent = symbolChar
  const inp = document.getElementById('symbolSizeInput')
  if (inp) inp.value = symbolSize
  // 更新群組按鈕 active 狀態
  document.querySelectorAll('#grpSymbol [data-sym-group]').forEach(b =>
    b.classList.toggle('active', b.dataset.symGroup === activeSymGroup)
  )
}

function syncBoxSelUI() {
  const hasRect = boxSelRect && boxSelRect.w > 1 && boxSelRect.h > 1
  if (hasRect) {
    const w = Math.round(Math.abs(boxSelRect.w))
    const h = Math.round(Math.abs(boxSelRect.h))
    document.getElementById('boxSelSizeLabel').textContent = t('box_copy', w, h)
  } else {
    document.getElementById('boxSelSizeLabel').textContent = t('box_drag')
  }
}

function showOptionsForAnnot(a) {
  hideAllOptions()
  if (a.type === 'img') return   // overlay image has no editable colour/thickness options
  const t = a.type
  const sh = id => { const el = document.getElementById(id); if (el) el.classList.remove('hidden') }
  const isFill = t === 'fillrect' || t === 'fillellipse'
  if (!isFill && t !== 'mosaic') sh('grpColor')
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
    numSize        = a.size ?? 30;             syncNumSize(numSize)
    numShadow      = a.shadow ?? false;        syncShadowCheck(numShadow)
    numberStyle    = a.numberStyle ?? 'dot';   syncNumStyle(numberStyle)
    numThickness   = a.thickness ?? 0;         syncThickness(numThickness)
    numStrokeColor = a.numStrokeColor ?? '#ffffff'; syncNumStrokeColor(numStrokeColor)
    document.getElementById('numValueEdit').classList.remove('hidden')
    document.getElementById('numValueInput').value = a.value
    sh('grpNumber'); sh('grpShadow')
  }
  if (t === 'mosaic') {
    mosaicMode      = a.mode      ?? 'mosaic'
    mosaicBlockSize = a.blockSize ?? 16
    mosaicBlurRadius= a.blurRadius ?? 8
    sh('grpMosaic')
    syncMosaicUI()
    sh('grpFlip')
    return
  }
  if (t === 'symbol') {
    symbolChar = a.char  ?? '★'
    symbolSize = a.size  ?? 64
    color      = a.color ?? '#ff3b30'; syncColor(color)
    sh('grpColor'); sh('grpSymbol'); sh('grpShadow')
    syncSymbolUI()
    syncShadowCheck(a.shadow ?? false)
    sh('grpFlip')
    return
  }
  sh('grpFlip')
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
// Initialise inputs to match JS defaults (in case HTML attribute drifts)
syncFontSize(fontSize)

function syncNumSize(ns) {
  document.querySelectorAll('.ns-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.ns) === ns))
}
function syncNumStrokeColor(hex) {
  const p = document.getElementById('numStrokeColorPreview')
  if (p) p.style.background = hex
}
function syncNumStrokeUI(isNumber) {
  document.getElementById('thicknessLabel').textContent = isNumber ? t('thickness_stroke') : t('thickness_line')
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
  if (el) el.textContent = t('opt_limit', limit === Infinity ? '∞' : limit)
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
  pushRecentColor(hex)
}
function applyFillColorA(hex) {
  if (hex !== 'transparent') fillPrevColorA = hex
  fillColorA = hex; syncFillColorA(hex)
  if (selectedId) updateSelectedAnnot({ fillColorA: hex })
  pushRecentColor(hex)
}
function applyFillColorB(hex) {
  if (hex !== 'transparent') fillPrevColorB = hex
  fillColorB = hex; syncFillColorB(hex)
  if (selectedId) updateSelectedAnnot({ fillColorB: hex })
  pushRecentColor(hex)
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
  pushRecentColor(hex)
}
function applyTextStrokeColor(hex) {
  textStrokeColor = hex; syncTextStrokeColor(hex)
  if (selectedId) updateSelectedAnnot({ textStrokeColor: hex })
  if (textActive) renderAnnotations()
  pushRecentColor(hex)
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
  pushRecentColor(hex)
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
    tl: { showW: true,  showH: true,  showS: false, get lblW() { return t('extend_left') }, get lblH() { return t('extend_up') }, oxLeft: true,  oyTop: true  },
    t:  { showW: false, showH: true,  showS: false,                                          get lblH() { return t('extend_up') }, oxLeft: false, oyTop: true  },
    tr: { showW: true,  showH: true,  showS: false, get lblW() { return t('extend_right') }, get lblH() { return t('extend_up') }, oxLeft: false, oyTop: true  },
    l:  { showW: true,  showH: false, showS: false, get lblW() { return t('extend_left') },                                        oxLeft: true,  oyTop: false },
    c:  { showW: false, showH: false, showS: true                                                                    },
    r:  { showW: true,  showH: false, showS: false, get lblW() { return t('extend_right') },                                          oxLeft: false, oyTop: false },
    bl: { showW: true,  showH: true,  showS: false, get lblW() { return t('extend_left') },  get lblH() { return t('extend_down') }, oxLeft: true,  oyTop: false },
    b:  { showW: false, showH: true,  showS: false,                                           get lblH() { return t('extend_down') }, oxLeft: false, oyTop: false },
    br: { showW: true,  showH: true,  showS: false, get lblW() { return t('extend_right') }, get lblH() { return t('extend_down') }, oxLeft: false, oyTop: false },
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
      showToast(t('toast_extended', newW, newH))
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
        showToast(t('toast_overlay_inserted'))
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

// Close color panel when clicking outside of it or its anchor button
document.addEventListener('click', (e) => {
  const panel = document.getElementById('colorPickerPanel')
  if (panel.classList.contains('hidden')) return
  if (panel.contains(e.target)) return
  if (_cppAnchorEl && _cppAnchorEl.contains(e.target)) return
  hideColorPanel()
}, true)

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
      btn.title = t('opt_transparent')
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

  // Brand colors
  let brandColors = []
  const brandEl = document.getElementById('cppBrand')

  function rebuildBrandRow() {
    brandEl.innerHTML = ''
    if (brandColors.length === 0) {
      const empty = document.createElement('span')
      empty.className = 'cpp-brand-empty'
      empty.textContent = t('cpp_brand_empty')
      brandEl.appendChild(empty)
      return
    }
    brandColors.forEach((hex, idx) => {
      const btn = document.createElement('button')
      btn.className   = 'cpp-swatch'
      btn.dataset.hex = hex
      btn.style.background = hex
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
      if (r + g + b > 500) btn.style.boxShadow = 'inset 0 0 0 1px rgba(0,0,0,0.15)'
      btn.title = hex
      btn.addEventListener('click', () => { if (_cppApplyFn) { _cppApplyFn(hex); cppSyncDisplay(hex) } })
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        brandColors.splice(idx, 1)
        ipcInvoke('save-brand-colors', brandColors)
        rebuildBrandRow()
      })
      brandEl.appendChild(btn)
    })
  }

  // Load brand colors from disk
  ipcInvoke('get-brand-colors').then(colors => {
    brandColors = Array.isArray(colors) ? colors : []
    rebuildBrandRow()
  })

  // "+" button: add current color to brand library
  document.getElementById('cppBrandAdd').addEventListener('click', () => {
    const hex = _cppGetCurrent ? _cppGetCurrent() : null
    if (!hex || hex === 'transparent' || brandColors.includes(hex)) return
    brandColors.push(hex)
    ipcInvoke('save-brand-colors', brandColors)
    rebuildBrandRow()
  })

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
  }, () => numStrokeColor)
})

// Line border colour
document.getElementById('lineBorderColorPreview').addEventListener('click', function() {
  openColorPanel(this, hex => {
    lineBorderColor = hex
    syncLineBorderColor(hex)
    if (selectedId) updateSelectedAnnot({ lineBorderColor: hex })
  }, () => lineBorderColor)
})

// Pen border colour
document.getElementById('penBorderColorPreview').addEventListener('click', function() {
  openColorPanel(this, hex => {
    penBorderColor = hex
    syncPenBorderColor(hex)
    if (selectedId) updateSelectedAnnot({ penBorderColor: hex })
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
  fontSize = Math.max(8, Math.min(400, parseInt(e.target.value) || 24))
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
  showToast(t('toast_num_reset'))
})

// Tool buttons — zoom-in/out also fire an immediate zoom step
document.querySelectorAll('.tool-btn[data-tool]').forEach(btn =>
  btn.addEventListener('click', () => {
    const t = btn.dataset.tool
    setTool(t)
    if (t === 'zoom-in')  zoomIn()
    if (t === 'zoom-out') zoomOut()
    if (t === 'privacymask') activatePrivacyMask()
  })
)
document.getElementById('btnFitZoom').addEventListener('click', fitToWindow)
document.getElementById('btnUndo').addEventListener('click', undo)
document.getElementById('btnRedo').addEventListener('click', redo)

// ─── Tool activation ─────────────────────────────────────────────────────────

function setTool(newTool) {
  commitText(false)
  hideColorPanel()
  if (newTool !== 'crop')        { cropRect = null; isCropping = false; cropMoving = false; cropResizeH = null; cropMoveStart = null }
  if (newTool !== 'ocr')          { ocrRect = null; isOcrSelecting = false; ocrStart = null }
  if (newTool !== 'boxselect')    { boxSelRect = null; isBoxSelecting = false; boxSelStart = null }
  if (newTool !== 'mosaic')       { isMosaicDrawing = false; mosaicDrawStart = null; mosaicPreviewRect = null }
  if (newTool !== 'privacymask')  { privacySelRect = null; isPrivacySelecting = false; privacySelStart = null }
  if (newTool !== 'pen')          { isPenDrawing = false; penPoints = [] }
  _cancelPolyline()   // 切換工具時取消任何進行中的折線
  tool       = newTool
  selectedId = null
  isDrawing  = false
  isPanning  = false

  document.querySelectorAll('.tool-btn[data-tool]').forEach(b => {
    // ellipse 屬於 rect 群組；fillellipse 屬於 fillrect 群組
    let match = b.dataset.tool === newTool
      || (newTool === 'ellipse'     && b.dataset.tool === 'rect')
      || (newTool === 'fillellipse' && b.dataset.tool === 'fillrect')
    b.classList.toggle('active', match)
  })

  if      (newTool === 'zoom-in')  annotCanvas.style.cursor = 'zoom-in'
  else if (newTool === 'zoom-out') annotCanvas.style.cursor = 'zoom-out'
  else if (newTool === 'select')   annotCanvas.style.cursor = 'default'
  else                             annotCanvas.style.cursor = 'crosshair'

  if (newTool === 'select') hideAllOptions()
  else                      showOptionsForTool(newTool)

  renderAnnotations()
}

// ─── Image loading ────────────────────────────────────────────────────────────

ipcOn('load-image', (payload) => {
  // payload may be a plain string (legacy) or { path, imgDPR }
  const filePath = typeof payload === 'string' ? payload : payload.path
  imgDPR = (typeof payload === 'object' && payload.imgDPR) ? payload.imgDPR : 1
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
  img.src = `file://${filePath}`
})

function fitCanvas() {
  const aw = canvasArea.clientWidth  - 64
  const ah = canvasArea.clientHeight - 64
  // Cap at 1/imgDPR so Retina screenshots (144 DPI, imgDPR=2) display at
  // their logical CSS size rather than appearing 2× zoomed.
  fitScale = Math.min(aw / imgWidth, ah / imgHeight, 1 / imgDPR)
  if (!userZoomed) {
    viewScale = fitScale
    _applyCanvasSize()
  }
}

function _applyCanvasSize() {
  const dw = Math.round(imgWidth  * viewScale)
  const dh = Math.round(imgHeight * viewScale)
  // Physical canvas = CSS size × DPR (crisp on Retina/HiDPI)
  baseCanvas.width  = annotCanvas.width  = Math.round(dw * DPR)
  baseCanvas.height = annotCanvas.height = Math.round(dh * DPR)
  baseCanvas.style.width  = annotCanvas.style.width  = dw + 'px'
  baseCanvas.style.height = annotCanvas.style.height = dh + 'px'
  canvasWrapper.style.width  = dw + 'px'
  canvasWrapper.style.height = dh + 'px'
  // Re-apply scale after resize (resizing resets the transform)
  baseCtx.setTransform(DPR, 0, 0, DPR, 0, 0)
  baseCtx.imageSmoothingEnabled = true
  baseCtx.imageSmoothingQuality = 'high'   // Lanczos — reduces upscale blur on Retina screenshots
  annotCtx.setTransform(DPR, 0, 0, DPR, 0, 0)
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
  const dw = Math.round(imgWidth  * viewScale)
  const dh = Math.round(imgHeight * viewScale)
  baseCtx.clearRect(0, 0, dw, dh)
  baseCtx.drawImage(imgElement, 0, 0, dw, dh)
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
  const dw = Math.round(imgWidth  * viewScale)
  const dh = Math.round(imgHeight * viewScale)
  annotCtx.clearRect(0, 0, dw, dh)
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
  if (selectedIds.size > 1) {
    // Multi-select: dashed box around each, no resize handles
    selectedIds.forEach(id => {
      const a = annotations.find(x => x.id === id)
      if (!a) return
      const b = bounds(a)
      if (!b) return
      annotCtx.save()
      annotCtx.strokeStyle = '#4a9eff'
      annotCtx.lineWidth   = 1.5
      annotCtx.setLineDash([5, 3])
      annotCtx.strokeRect(c(b.x) - 5, c(b.y) - 5, c(b.w) + 10, c(b.h) + 10)
      annotCtx.restore()
    })
  } else if (selectedId) {
    const a = annotations.find(x => x.id === selectedId)
    if (a) drawSelection(annotCtx, a)
  }

  // Snap guide lines (visible during drag when snapping)
  if (snapGuides.length) {
    annotCtx.save()
    annotCtx.lineWidth = 1
    snapGuides.forEach(g => {
      if (g.type === 'distribute') {
        // Four lines bracketing the two equal gaps
        annotCtx.strokeStyle = 'rgba(255, 45, 85, 0.45)'
        annotCtx.setLineDash([3, 4])
        g.lines.forEach(v => {
          annotCtx.beginPath()
          if (g.axis === 'x') {
            annotCtx.moveTo(c(v), 0)
            annotCtx.lineTo(c(v), annotCanvas.height)
          } else {
            annotCtx.moveTo(0, c(v))
            annotCtx.lineTo(annotCanvas.width, c(v))
          }
          annotCtx.stroke()
        })
      } else {
        // Single edge/center guide line
        annotCtx.strokeStyle = 'rgba(255, 45, 85, 0.65)'
        annotCtx.setLineDash([6, 4])
        annotCtx.beginPath()
        if (g.axis === 'x') {
          annotCtx.moveTo(c(g.value), 0)
          annotCtx.lineTo(c(g.value), annotCanvas.height)
        } else {
          annotCtx.moveTo(0, c(g.value))
          annotCtx.lineTo(annotCanvas.width, c(g.value))
        }
        annotCtx.stroke()
      }
    })
    annotCtx.restore()
  }

  // Rubber band selection (select tool drag on empty space)
  if (rubberBand) {
    const x0 = Math.min(rubberBand.x0, rubberBand.x1)
    const y0 = Math.min(rubberBand.y0, rubberBand.y1)
    const w  = Math.abs(rubberBand.x1 - rubberBand.x0)
    const h  = Math.abs(rubberBand.y1 - rubberBand.y0)
    annotCtx.save()
    annotCtx.strokeStyle = '#007AFF'
    annotCtx.lineWidth   = 1
    annotCtx.setLineDash([])
    annotCtx.strokeRect(c(x0), c(y0), c(w), c(h))
    annotCtx.fillStyle = 'rgba(0,122,255,0.12)'
    annotCtx.fillRect(c(x0), c(y0), c(w), c(h))
    annotCtx.restore()
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

  // Privacy mask region select: orange dashed rect
  if (tool === 'privacymask' && privacySelRect && privacySelRect.w > 1 && privacySelRect.h > 1) {
    const r = privacySelRect
    annotCtx.save()
    annotCtx.strokeStyle = '#f97316'
    annotCtx.lineWidth   = 1.5
    annotCtx.setLineDash([5, 3])
    annotCtx.strokeRect(c(r.x), c(r.y), c(r.w), c(r.h))
    annotCtx.fillStyle = 'rgba(249,115,22,0.08)'
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

  // Mosaic tool live preview
  if (tool === 'mosaic' && mosaicPreviewRect && mosaicPreviewRect.w > 2 && mosaicPreviewRect.h > 2) {
    drawMosaic(annotCtx, {
      x: mosaicPreviewRect.x, y: mosaicPreviewRect.y,
      w: mosaicPreviewRect.w, h: mosaicPreviewRect.h,
      mode: mosaicMode, blockSize: mosaicBlockSize, blurRadius: mosaicBlurRadius,
    })
    annotCtx.save()
    annotCtx.strokeStyle = '#a78bfa'
    annotCtx.lineWidth   = 1.5
    annotCtx.setLineDash([5, 3])
    annotCtx.strokeRect(c(mosaicPreviewRect.x), c(mosaicPreviewRect.y),
                        c(mosaicPreviewRect.w), c(mosaicPreviewRect.h))
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

// ─── Mosaic / Blur ────────────────────────────────────────────────────────────

function drawMosaic(ctx, a) {
  const vx = Math.round(a.x * viewScale)
  const vy = Math.round(a.y * viewScale)
  const vw = Math.max(1, Math.round(a.w * viewScale))
  const vh = Math.max(1, Math.round(a.h * viewScale))

  const off  = document.createElement('canvas')
  off.width  = vw
  off.height = vh
  const octx = off.getContext('2d')

  if (a.mode === 'blur') {
    const r   = Math.max(1, (a.blurRadius ?? 8) * viewScale)
    const pad = Math.ceil(r * 2.5)
    // Source coords in physical canvas pixels (baseCanvas is DPR-scaled)
    octx.filter = `blur(${r}px)`
    octx.drawImage(baseCanvas,
      (vx - pad) * DPR, (vy - pad) * DPR, (vw + pad * 2) * DPR, (vh + pad * 2) * DPR,
      -pad, -pad, vw + pad * 2, vh + pad * 2)
  } else {
    // Source coords in physical canvas pixels
    octx.drawImage(baseCanvas, vx * DPR, vy * DPR, vw * DPR, vh * DPR, 0, 0, vw, vh)
    const bs       = Math.max(2, Math.round((a.blockSize ?? 16) * viewScale))
    const imgData  = octx.getImageData(0, 0, vw, vh)
    const data     = imgData.data
    for (let py = 0; py < vh; py += bs) {
      const pyEnd = Math.min(py + bs, vh)
      for (let px = 0; px < vw; px += bs) {
        const pxEnd = Math.min(px + bs, vw)
        let r = 0, g = 0, b = 0, al = 0, n = 0
        for (let qy = py; qy < pyEnd; qy++) {
          for (let qx = px; qx < pxEnd; qx++) {
            const i = (qy * vw + qx) * 4
            r += data[i]; g += data[i+1]; b += data[i+2]; al += data[i+3]; n++
          }
        }
        r = Math.round(r/n); g = Math.round(g/n); b = Math.round(b/n); al = Math.round(al/n)
        for (let qy = py; qy < pyEnd; qy++) {
          for (let qx = px; qx < pxEnd; qx++) {
            const i = (qy * vw + qx) * 4
            data[i] = r; data[i+1] = g; data[i+2] = b; data[i+3] = al
          }
        }
      }
    }
    octx.putImageData(imgData, 0, 0)
  }

  ctx.save()
  ctx.beginPath()
  ctx.rect(vx, vy, vw, vh)
  ctx.clip()
  ctx.drawImage(off, vx, vy)
  ctx.restore()
}

// ─── Symbol Stamp ──────────────────────────────────────────────────────────────

const _symMeasureCache = new Map()
/**
 * Measure the actual rendered bounds of a symbol glyph.
 * Returns { hw, ascent, descent } all in annotation (image) coordinate units
 * where the draw anchor is at (a.x, a.y) with textAlign=center / textBaseline=middle.
 */
function measureSymbol(char, size) {
  const key = `${char}|${size}`
  if (_symMeasureCache.has(key)) return _symMeasureCache.get(key)
  const off = document.createElement('canvas')
  off.width = off.height = Math.ceil(size * 3)
  const mctx = off.getContext('2d')
  mctx.font = `${size}px 'Apple Color Emoji', 'Noto Sans Symbols 2', 'Segoe UI Symbol', sans-serif`
  mctx.textBaseline = 'middle'
  mctx.textAlign = 'center'
  const m = mctx.measureText(char)
  const result = {
    hw:      Math.max(m.width / 2,                size * 0.1),
    ascent:  Math.max(m.actualBoundingBoxAscent,  size * 0.1),
    descent: Math.max(m.actualBoundingBoxDescent, size * 0.1),
  }
  _symMeasureCache.set(key, result)
  return result
}

function drawSymbol(ctx, a) {
  const sz = Math.max(8, (a.size ?? 64) * viewScale)
  ctx.save()
  ctx.font          = `${sz}px 'Apple Color Emoji', 'Noto Sans Symbols 2', 'Segoe UI Symbol', sans-serif`
  ctx.fillStyle     = a.color ?? '#ff3b30'
  ctx.textAlign     = 'center'
  ctx.textBaseline  = 'middle'
  if (a.shadow) {
    ctx.shadowColor   = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur    = 4 * viewScale
    ctx.shadowOffsetX = 2 * viewScale
    ctx.shadowOffsetY = 2 * viewScale
  }
  ctx.fillText(a.char ?? '★', a.x * viewScale, a.y * viewScale)
  ctx.restore()
}

// Apply flipX/flipY transform around annotation bounding-box centre
function _applyFlipTransform(ctx, a) {
  if (!a.flipX && !a.flipY) return
  const b = bounds(a)
  const fcx = c(b.x + b.w / 2)
  const fcy = c(b.y + b.h / 2)
  ctx.translate(fcx, fcy)
  ctx.scale(a.flipX ? -1 : 1, a.flipY ? -1 : 1)
  ctx.translate(-fcx, -fcy)
}

function drawOne(ctx, a) {
  if (a.type === 'img') {
    const img = getImg(a)
    if (img.complete && img.naturalWidth > 0) {
      ctx.save()
      _applyFlipTransform(ctx, a)
      ctx.drawImage(img, c(a.x), c(a.y), c(a.w), c(a.h))
      ctx.restore()
    }
    return
  }

  // For stroke tools with opacity < 100, use offscreen compositing so
  // caps and border don't X-ray through the main stroke
  const strokeOpacity = a.type === 'pen' ? (a.penOpacity ?? 100) : (a.opacity ?? 100)
  if (strokeOpacity < 100 && ['line','polyline','pen'].includes(a.type)) {
    const dw = Math.round(imgWidth  * viewScale)
    const dh = Math.round(imgHeight * viewScale)
    const off  = _getOffCanvas(Math.round(dw * DPR), Math.round(dh * DPR))  // physical dims
    const octx = off.getContext('2d')
    octx.setTransform(DPR, 0, 0, DPR, 0, 0)   // DPR scale — draw with CSS coords
    octx.clearRect(0, 0, dw, dh)
    octx.strokeStyle = a.color
    octx.fillStyle   = a.color
    octx.lineWidth   = a.thickness * viewScale
    _applyFlipTransform(octx, a)
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
    ctx.drawImage(off, 0, 0, dw, dh)   // explicit CSS destination size
    ctx.restore()
    return
  }

  ctx.save()
  ctx.strokeStyle = a.color
  ctx.fillStyle   = a.color
  ctx.lineWidth   = a.thickness * viewScale
  _applyFlipTransform(ctx, a)
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
    case 'mosaic':   drawMosaic(ctx, a);   break
    case 'symbol':   drawSymbol(ctx, a);   break
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
  const isCurved = (a.cx !== undefined && a.cy !== undefined)
  const qcx = isCurved ? c(a.cx) : null
  const qcy = isCurved ? c(a.cy) : null
  const sz  = (a.thickness * 4 + 8) * viewScale
  const hasBorder = !!(a.lineBorderColor && a.lineBorderColor !== 'transparent')
  const capBorderW = hasBorder ? ((a.borderThickness ?? a.thickness + 4) - a.thickness) * viewScale * 2 : 0
  const capBorderCol = hasBorder ? a.lineBorderColor : null

  if (a.shadow) setShadow(ctx)
  ctx.globalAlpha = (a.opacity ?? 100) / 100
  ctx.lineCap = capToLineCap(a.startCap, a.endCap)

  const ang      = Math.atan2(y2 - y1, x2 - x1)
  const arrInset = sz * 0.8
  let sx1 = x1, sy1 = y1, sx2 = x2, sy2 = y2
  if (!isCurved) {
    // Trim straight line body so it stops at arrow base (not tip)
    if (a.startCap === 'arrow') { sx1 += Math.cos(ang) * arrInset; sy1 += Math.sin(ang) * arrInset }
    if (a.endCap   === 'arrow') { sx2 -= Math.cos(ang) * arrInset; sy2 -= Math.sin(ang) * arrInset }
  }

  // Border stroke body
  if (hasBorder) {
    ctx.save()
    ctx.strokeStyle = a.lineBorderColor
    ctx.lineWidth   = (a.borderThickness ?? a.thickness + 4) * viewScale
    ctx.setLineDash(getLineDash(a.borderDashStyle ?? a.lineStyle, sz))
    ctx.beginPath(); ctx.moveTo(sx1, sy1)
    if (isCurved) ctx.quadraticCurveTo(qcx, qcy, x2, y2)
    else          ctx.lineTo(sx2, sy2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0
  }

  // Main stroke body
  ctx.beginPath()
  ctx.setLineDash(getLineDash(a.lineStyle, sz))
  ctx.moveTo(sx1, sy1)
  if (isCurved) ctx.quadraticCurveTo(qcx, qcy, x2, y2)
  else          ctx.lineTo(sx2, sy2)
  ctx.stroke()
  ctx.setLineDash([])

  // Caps: curved lines use control point as tangent reference
  if (isCurved) {
    drawCap(ctx, a.startCap, qcx, qcy, x1, y1, a.color, sz, capBorderCol, capBorderW)
    drawCap(ctx, a.endCap,   qcx, qcy, x2, y2, a.color, sz, capBorderCol, capBorderW)
  } else {
    drawCap(ctx, a.startCap, x2, y2, x1, y1, a.color, sz, capBorderCol, capBorderW)
    drawCap(ctx, a.endCap,   x1, y1, x2, y2, a.color, sz, capBorderCol, capBorderW)
  }
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

  // Find a point at least `threshold` image-px from tip for a stable direction.
  // Threshold is capped at ~2× thickness so we read the LOCAL direction near the
  // tip rather than looking so far back that a curved stroke gives a wrong angle.
  function stableFrom(tipIdx, step) {
    const threshold = Math.max(a.thickness * 2 + 4, Math.min(insetImgPx, a.thickness * 2.5 + 10))
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
    const fs  = (a.size ?? 48) * 2 * viewScale * imgDPR
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
    const r  = (a.size ?? 48) * viewScale * imgDPR
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
    ctx.fillStyle   = getTextColor(a.color)
    ctx.font        = `bold ${Math.round(r * 0.9)}px -apple-system`
    ctx.textAlign   = 'center'
    ctx.textBaseline = 'alphabetic'
    const str = String(a.value)
    const m   = ctx.measureText(str)
    // Use actual ink bounds to visually centre the digit (textBaseline 'middle'
    // aligns to em-box centre which is above the visual glyph centre for digits)
    const yOff = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2
    ctx.fillText(str, cx, cy + yOff)
  }
}

// ─── Resize handles ───────────────────────────────────────────────────────────

function getHandles(a) {
  if (a.type === 'rect' || a.type === 'ellipse' || a.type === 'fillrect' || a.type === 'fillellipse' || a.type === 'img' || a.type === 'mosaic') {
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
    const cx = a.cx ?? (a.x1 + a.x2) / 2
    const cy = a.cy ?? (a.y1 + a.y2) / 2
    return [
      { id: 'p1',    x: a.x1, y: a.y1, cursor: 'crosshair' },
      { id: 'p2',    x: a.x2, y: a.y2, cursor: 'crosshair' },
      { id: 'curve', x: cx,   y: cy,   cursor: 'crosshair', curveMoved: a.cx !== undefined },
    ]
  }
  if (a.type === 'number') {
    const r = a.size ?? 14
    return [{ id: 'se', x: a.x + r, y: a.y + r, cursor: 'nwse-resize' }]
  }
  if (a.type === 'symbol') {
    const { hw, descent } = measureSymbol(a.char ?? '★', a.size ?? 64)
    return [{ id: 'se', x: a.x + hw, y: a.y + descent, cursor: 'nwse-resize' }]
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
  if (a.type === 'symbol') {
    info.cx = a.x; info.cy = a.y
  }
  if (a.type === 'rect' || a.type === 'ellipse' || a.type === 'fillrect' || a.type === 'fillellipse' || a.type === 'img' || a.type === 'mosaic') {
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

  if (['rect','ellipse','fillrect','fillellipse','mosaic'].includes(a.type)) {
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
    if (h.id === 'p1')    { a.x1 = pos.x; a.y1 = pos.y }
    if (h.id === 'p2')    { a.x2 = pos.x; a.y2 = pos.y }
    if (h.id === 'curve') { a.cx = pos.x; a.cy = pos.y }
  }
  if (a.type === 'number') {
    const d = Math.max(Math.abs(pos.x - h.cx), Math.abs(pos.y - h.cy))
    a.size = Math.max(d, 6)
  }
  if (a.type === 'symbol') {
    const d = Math.max(Math.abs(pos.x - h.cx), Math.abs(pos.y - h.cy))
    a.size = Math.max(d * 2, 16)
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
    ctx.fillStyle   = (h.id === 'curve' && h.curveMoved) ? '#00cc44' : '#ffffff'
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
  history.push({ annots: JSON.parse(JSON.stringify(annotations)), imgSnap: null })
  historyIdx = history.length - 1
}

function _applyHistoryEntry(entry) {
  annotations = JSON.parse(JSON.stringify(entry.annots))
  selectedId  = null
  if (entry.imgSnap) {
    const img = new Image()
    img.onload = () => {
      imgElement = img
      imgWidth   = entry.imgSnap.w
      imgHeight  = entry.imgSnap.h
      document.getElementById('imgInfo').textContent = `${imgWidth} × ${imgHeight} px`
      userZoomed = false
      fitCanvas()
      drawBase()
      recalcNumCount()
      renderAnnotations()
    }
    img.src = entry.imgSnap.src
  } else {
    recalcNumCount()
    renderAnnotations()
  }
}

function undo() {
  if (historyIdx > 0) {
    historyIdx--
    _applyHistoryEntry(history[historyIdx])
  }
}

function redo() {
  if (historyIdx < history.length - 1) {
    historyIdx++
    _applyHistoryEntry(history[historyIdx])
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
    case 'mosaic':
    case 'img':    return { x: a.x, y: a.y, w: a.w, h: a.h }
    case 'symbol': { const { hw, ascent, descent } = measureSymbol(a.char ?? '★', a.size ?? 64); return { x: a.x - hw, y: a.y - ascent, w: hw * 2, h: ascent + descent } }
    case 'line': {
      const xs = [a.x1, a.x2]; if (a.cx !== undefined) xs.push(a.cx)
      const ys = [a.y1, a.y2]; if (a.cy !== undefined) ys.push(a.cy)
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)
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
    case 'number': { const r = (a.size ?? 14) * imgDPR; return { x:a.x-r, y:a.y-r, w:r*2, h:r*2 } }
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
    document.getElementById('cropSizeLabel').textContent = t('crop_drag')
    return
  }

  if (tool === 'ocr') {
    isOcrSelecting = true
    ocrStart = pos
    ocrRect  = { x: pos.x, y: pos.y, w: 0, h: 0 }
    document.getElementById('ocrStatusLabel').textContent = t('ocr_drag')
    return
  }

  if (tool === 'privacymask') {
    isPrivacySelecting = true
    privacySelStart    = pos
    privacySelRect     = { x: pos.x, y: pos.y, w: 0, h: 0 }
    return
  }

  if (tool === 'boxselect') {
    isBoxSelecting = true
    boxSelStart    = pos
    boxSelRect     = { x: pos.x, y: pos.y, w: 0, h: 0 }
    syncBoxSelUI()
    return
  }

  if (tool === 'mosaic') {
    isMosaicDrawing = true
    mosaicDrawStart = pos
    mosaicPreviewRect = { x: pos.x, y: pos.y, w: 0, h: 0 }
    return
  }

  if (tool === 'symbol') {
    selectedId = null   // 清除可能殘留的舊選取，避免 picker 誤改舊印章
    const ann = { id: newId(), type: 'symbol', x: pos.x, y: pos.y, char: symbolChar, color, size: symbolSize, shadow: false }
    pushHistory()
    annotations.push(ann)
    renderAnnotations()
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
    // 1. Shift+click: toggle annotation in/out of multi-select
    if (e.shiftKey) {
      const hit = findAt(pos)
      if (hit) {
        if (selectedIds.has(hit.id)) {
          selectedIds.delete(hit.id)
        } else {
          selectedIds.add(hit.id)
        }
        // Sync selectedId: use last added when single, null when multi
        if (selectedIds.size === 1) {
          selectedId = [...selectedIds][0]
          const ann = annotations.find(x => x.id === selectedId)
          if (ann) showOptionsForAnnot(ann)
        } else if (selectedIds.size > 1) {
          selectedId = null
          showAlignOptions()
        } else {
          selectedId = null
          hideAllOptions()
        }
        renderAnnotations()
        return
      }
    }
    // 2. Check resize handles (single-select only, no handles in multi)
    if (selectedId && selectedIds.size <= 1) {
      const a = annotations.find(x => x.id === selectedId)
      if (a) {
        const h = findHandle(pos, a)
        if (h) { startResize(h.id, a); return }
        if (hits(pos, a)) {
          _startDrag(pos)
          renderAnnotations(); return
        }
      }
    }
    // 3. Click on a selected annotation in multi-select → start group drag
    if (selectedIds.size > 1) {
      const hit = findAt(pos)
      if (hit && selectedIds.has(hit.id)) {
        _startDrag(pos)
        renderAnnotations(); return
      }
    }
    // 4. Click on any annotation → single-select + drag
    const hit = findAt(pos)
    if (hit) {
      selectedId = hit.id
      selectedIds = new Set([hit.id])
      _startDrag(pos)
      showOptionsForAnnot(hit)
    } else {
      // 5. Click on empty space → clear selection, start rubber band
      selectedId = null
      selectedIds = new Set()
      rubberBand = { x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y }
      hideAllOptions()
    }
    renderAnnotations()
    return
  }

  if (tool === 'number') {
    const _limit = getStyleLimit(numberStyle)
    if (numCount > _limit) {
      showToast(t('toast_num_limit', STYLE_LABELS[numberStyle](), _limit))
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

  if (isPrivacySelecting && privacySelStart) {
    privacySelRect = {
      x: Math.min(privacySelStart.x, pos.x),
      y: Math.min(privacySelStart.y, pos.y),
      w: Math.abs(pos.x - privacySelStart.x),
      h: Math.abs(pos.y - privacySelStart.y)
    }
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

  // Rubber-band selection drag (select tool, empty-space drag)
  if (rubberBand) {
    rubberBand.x1 = pos.x
    rubberBand.y1 = pos.y
    renderAnnotations()
    return
  }

  if (isMosaicDrawing && mosaicDrawStart) {
    mosaicPreviewRect = {
      x: Math.min(mosaicDrawStart.x, pos.x),
      y: Math.min(mosaicDrawStart.y, pos.y),
      w: Math.abs(pos.x - mosaicDrawStart.x),
      h: Math.abs(pos.y - mosaicDrawStart.y),
    }
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

  if (isDragging && dragStartPos) {
    const totalDx = pos.x - dragStartPos.x
    const totalDy = pos.y - dragStartPos.y
    const draggedAnnots = selectedIds.size > 1
      ? annotations.filter(a => selectedIds.has(a.id))
      : annotations.filter(a => a.id === selectedId)

    // Reset to start position + total delta (avoids snap drift)
    draggedAnnots.forEach(a => {
      const s = dragStartStates[a.id]
      if (!s) return
      if (a.type === 'line') {
        a.x1 = s.x1 + totalDx; a.y1 = s.y1 + totalDy
        a.x2 = s.x2 + totalDx; a.y2 = s.y2 + totalDy
        if (s.cx !== undefined) { a.cx = s.cx + totalDx; a.cy = s.cy + totalDy }
      } else {
        a.x = s.x + totalDx
        a.y = s.y + totalDy
        if (s.x2 !== undefined) a.x2 = s.x2 + totalDx
        if (s.y2 !== undefined) a.y2 = s.y2 + totalDy
      }
    })

    // Apply snap (skip if Alt held)
    if (!e.altKey) {
      const snap = _computeSnap(draggedAnnots)
      if (snap.dx !== 0 || snap.dy !== 0) draggedAnnots.forEach(a => moveAnnot(a, snap.dx, snap.dy))
      snapGuides = snap.guides
    } else {
      snapGuides = []
    }

    hasDragged = true
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
    if (selectedIds.size > 1) {
      const hit = findAt(pos)
      if (hit && selectedIds.has(hit.id)) cur = 'move'
      else if (hit) cur = 'move'
    } else if (selectedId) {
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
      document.getElementById('ocrStatusLabel').textContent = t('ocr_drag')
      renderAnnotations()
      return
    }
    renderAnnotations()
    triggerOcr()
    return
  }

  if (isPrivacySelecting) {
    isPrivacySelecting = false
    const r = privacySelRect
    privacySelRect = null
    if (r && r.w >= 4 && r.h >= 4) {
      runPrivacyScan(r)
    }
    renderAnnotations()
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

  if (isMosaicDrawing) {
    isMosaicDrawing = false
    const r = mosaicPreviewRect
    if (r && r.w >= 4 && r.h >= 4) {
      const ann = {
        id: newId(), type: 'mosaic',
        x: r.x, y: r.y, w: r.w, h: r.h,
        mode: mosaicMode, blockSize: mosaicBlockSize, blurRadius: mosaicBlurRadius,
      }
      pushHistory()
      annotations.push(ann)
      mosaicPreviewRect = null
      setTool('select')
      selectedId = ann.id
      showOptionsForAnnot(ann)
    } else {
      mosaicPreviewRect = null
    }
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
    // Sync size input if a symbol annotation was just resized
    if (selectedId) {
      const _a = annotations.find(x => x.id === selectedId)
      if (_a && _a.type === 'symbol') {
        document.getElementById('symbolSizeInput').value = Math.round(_a.size)
      }
    }
    return
  }
  // Rubber-band: finalise selection
  if (rubberBand) {
    const x0 = Math.min(rubberBand.x0, rubberBand.x1)
    const y0 = Math.min(rubberBand.y0, rubberBand.y1)
    const x1 = Math.max(rubberBand.x0, rubberBand.x1)
    const y1 = Math.max(rubberBand.y0, rubberBand.y1)
    rubberBand = null
    if (x1 - x0 > 2 && y1 - y0 > 2) {
      const caught = new Set()
      annotations.forEach(a => {
        const b = bounds(a)
        if (b && b.x >= x0 && b.y >= y0 && b.x + b.w <= x1 && b.y + b.h <= y1) {
          caught.add(a.id)
        }
      })
      if (caught.size > 0) {
        selectedIds = caught
        selectedId  = caught.size === 1 ? [...caught][0] : null
        if (selectedId) {
          const ann = annotations.find(x => x.id === selectedId)
          if (ann) showOptionsForAnnot(ann)
        } else {
          showAlignOptions()
        }
      }
    }
    renderAnnotations()
    return
  }

  if (isDragging) {
    isDragging = false
    snapGuides = []
    dragStartPos = null
    dragStartStates = {}
    if (hasDragged) pushHistory()
    renderAnnotations()
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
    case 'mosaic':
    case 'img':
    case 'text':
    case 'number':
    case 'symbol': a.x += dx; a.y += dy; break
    case 'line':
      a.x1 += dx; a.y1 += dy; a.x2 += dx; a.y2 += dy
      if (a.cx !== undefined) { a.cx += dx; a.cy += dy }
      break
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
    case 'k': case 'K': runPrivacyScan(null); break  // null = full-image global scan
    case 'x': case 'X': setTool('mosaic'); break
    case 'u': case 'U': {
      setTool('symbol')
      const _gb = document.querySelector(`#grpSymbol [data-sym-group="${activeSymGroup}"]`)
      if (_gb) openSymbolGroup(activeSymGroup, _gb)
      break
    }
    case 's': case 'S': openResizeModal(); break
    case 'Escape':
      hideCtxMenu()
      if (polylineActive) { _cancelPolyline(); renderAnnotations(); break }
      if (tool === 'crop') { cancelCrop(); break }
      if (tool === 'ocr')  { ocrRect = null; isOcrSelecting = false; document.getElementById('ocrStatusLabel').textContent = t('ocr_drag'); renderAnnotations(); break }
      if (tool === 'privacymask') { privacySelRect = null; isPrivacySelecting = false; renderAnnotations(); break }
      if (tool === 'boxselect') { boxSelRect = null; isBoxSelecting = false; syncBoxSelUI(); renderAnnotations(); break }
      if (tool === 'mosaic')    { mosaicPreviewRect = null; isMosaicDrawing = false; renderAnnotations(); break }
      selectedId = null
      selectedIds = new Set()
      rubberBand = null
      isDrawing  = false
      if (tool === 'select') hideAllOptions()
      renderAnnotations()
      break
    case 'Delete': case 'Backspace':
      if (selectedIds.size > 1) {
        pushHistory()
        annotations = annotations.filter(a => !selectedIds.has(a.id))
        selectedIds = new Set()
        selectedId  = null
        hideAllOptions()
        renderAnnotations()
      } else if (selectedId) {
        pushHistory()
        annotations = annotations.filter(a => a.id !== selectedId)
        selectedId  = null
        selectedIds = new Set()
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
  const result  = await ipcInvoke('save-image-as', { dataURL, format })
  if (result?.success) {
    const fileName = String(result.path).split(/[/\\]/).pop()
    showToast(t('toast_saved', fileName))
    setTimeout(() => ipcSend('close-editor-window'), 1200)
    return
  }
  if (!result?.canceled) {
    const msg = result?.error || t('toast_save_fail')
    showToast(t('toast_save_fail_detail', msg))
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
    pw > 0 && ph > 0 ? `${pw} × ${ph} px` : t('crop_drag')
}

// ─── Crop ─────────────────────────────────────────────────────────────────────

function confirmCrop() {
  if (!cropRect || cropRect.w < 1 || cropRect.h < 1) {
    showToast(t('toast_crop_first'), true); return
  }
  const cx = Math.max(0, Math.round(cropRect.x))
  const cy = Math.max(0, Math.round(cropRect.y))
  const cw = Math.min(Math.round(cropRect.w), imgWidth  - cx)
  const ch = Math.min(Math.round(cropRect.h), imgHeight - cy)
  if (cw < 1 || ch < 1) { showToast(t('toast_crop_oob'), true); return }

  // Snapshot pre-crop image so Ctrl+Z can restore it
  const preSnap = document.createElement('canvas')
  preSnap.width = imgWidth; preSnap.height = imgHeight
  preSnap.getContext('2d').drawImage(imgElement, 0, 0)
  const preSrc = preSnap.toDataURL()

  // Update current history slot to carry the pre-crop image snapshot
  history = history.slice(0, historyIdx + 1)
  history[historyIdx] = { annots: JSON.parse(JSON.stringify(annotations)), imgSnap: { src: preSrc, w: imgWidth, h: imgHeight } }

  const off = document.createElement('canvas')
  off.width = cw; off.height = ch
  off.getContext('2d').drawImage(imgElement, cx, cy, cw, ch, 0, 0, cw, ch)
  const postSrc = off.toDataURL()

  const newImg = new Image()
  newImg.onload = () => {
    imgElement = newImg
    imgWidth   = cw
    imgHeight  = ch
    // Translate annotation coordinates
    annotations = annotations.map(a => {
      a = JSON.parse(JSON.stringify(a))
      switch (a.type) {
        case 'rect': case 'fillrect': case 'mosaic': case 'text': case 'number': case 'symbol': a.x -= cx; a.y -= cy; break
        case 'line': a.x1 -= cx; a.y1 -= cy; a.x2 -= cx; a.y2 -= cy; break
      }
      return a
    })
    // Push post-crop state (imgSnap stored so redo can restore cropped image)
    history.push({ annots: JSON.parse(JSON.stringify(annotations)), imgSnap: { src: postSrc, w: cw, h: ch } })
    historyIdx = history.length - 1
    cropRect   = null
    userZoomed = false
    document.getElementById('imgInfo').textContent = `${imgWidth} × ${imgHeight} px`
    fitCanvas()
    drawBase()
    setTool('rect')
    showToast(t('toast_cropped', cw, ch))
  }
  newImg.src = postSrc
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

  window.electronAPI.clipboard.writeImage(dataURL)

  showToast(t('toast_box_copied', sw, sh))
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
  if      (status.includes('loading language')) label.textContent = t('ocr_downloading', pct)
  else if (status.includes('recognizing'))      label.textContent = t('ocr_recognizing', pct)
  else if (status.includes('initialized'))      label.textContent = t('ocr_initialized')
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
  document.getElementById('ocrProgressLabel').textContent = t('ocr_recognizing_label')
  document.getElementById('ocrResultText').value = ''
  document.getElementById('btnOcrCopy').disabled = true
  document.getElementById('btnOcrCopyClose').disabled = true

  // Extract region at original image resolution
  const r = ocrRect
  const off = document.createElement('canvas')
  off.width  = Math.max(1, Math.round(r.w))
  off.height = Math.max(1, Math.round(r.h))
  const offCtx = off.getContext('2d')
  // Source coords must be in physical pixels (baseCanvas is DPR-scaled)
  offCtx.drawImage(baseCanvas, c(r.x) * DPR, c(r.y) * DPR, c(r.w) * DPR, c(r.h) * DPR, 0, 0, off.width, off.height)
  const dataURL = off.toDataURL('image/png')

  ipcInvoke('ocr-recognize', { dataURL }).then(result => {
    const wrap = document.getElementById('ocrProgressWrap')
    wrap.classList.add('hidden')
    wrap.style.display = 'none'
    if (result.success) {
      document.getElementById('ocrResultText').value = result.text
      document.getElementById('btnOcrCopy').disabled      = false
      document.getElementById('btnOcrCopyClose').disabled = false
      if (!result.text) showToast(t('toast_ocr_no_text'))
    } else {
      document.getElementById('ocrResultText').value = `辨識失敗：${result.error}`
      showToast(t('toast_ocr_fail'))
    }
  })
}

ipcOn('ocr-progress', ({ status, progress }) => {
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
  window.electronAPI.clipboard.writeText(text)
  showToast(t('toast_text_copied'))
})

document.getElementById('btnOcrCopyClose').addEventListener('click', () => {
  const text = document.getElementById('ocrResultText').value
  window.electronAPI.clipboard.writeText(text)
  showToast(t('toast_text_copied'))
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
  document.getElementById('ocrStatusLabel').textContent = t('ocr_drag')
  renderAnnotations()
})


// ─── Mosaic tool controls ─────────────────────────────────────────────────────

// Privacy mask mode toggle + precision rows
function syncPrivacyUI() {
  const mode = _privacyMosaicMode()
  document.getElementById('grpPrivacyBlock').classList.toggle('hidden', mode === 'blur')
  document.getElementById('grpPrivacyBlur').classList.toggle('hidden', mode === 'mosaic')
  document.querySelectorAll('#grpPrivacyBlock [data-pmblock]').forEach(b =>
    b.classList.toggle('active', parseInt(b.dataset.pmblock) === privacyBlockSize))
  document.querySelectorAll('#grpPrivacyBlur [data-pmblur]').forEach(b =>
    b.classList.toggle('active', parseInt(b.dataset.pmblur) === privacyBlurRadius))
}

document.querySelectorAll('#grpPrivacyMode .pmmode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#grpPrivacyMode .pmmode-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    syncPrivacyUI()
  })
})
document.querySelectorAll('#grpPrivacyBlock [data-pmblock]').forEach(btn => {
  btn.addEventListener('click', () => { privacyBlockSize = parseInt(btn.dataset.pmblock); syncPrivacyUI() })
})
document.querySelectorAll('#grpPrivacyBlur [data-pmblur]').forEach(btn => {
  btn.addEventListener('click', () => { privacyBlurRadius = parseInt(btn.dataset.pmblur); syncPrivacyUI() })
})

document.getElementById('btnMosaicModeMosaic').addEventListener('click', () => {
  mosaicMode = 'mosaic'; syncMosaicUI()
  if (selectedId) { const a = annotations.find(x => x.id === selectedId); if (a && a.type === 'mosaic') { updateSelectedAnnot({ mode: 'mosaic' }) } }
})
document.getElementById('btnMosaicModeBlur').addEventListener('click', () => {
  mosaicMode = 'blur'; syncMosaicUI()
  if (selectedId) { const a = annotations.find(x => x.id === selectedId); if (a && a.type === 'mosaic') { updateSelectedAnnot({ mode: 'blur' }) } }
})
document.querySelectorAll('#grpMosaicBlock [data-block]').forEach(btn => {
  btn.addEventListener('click', () => {
    mosaicBlockSize = parseInt(btn.dataset.block); syncMosaicUI()
    if (selectedId) { const a = annotations.find(x => x.id === selectedId); if (a && a.type === 'mosaic') { updateSelectedAnnot({ blockSize: mosaicBlockSize }) } }
  })
})
document.querySelectorAll('#grpMosaicBlur [data-blur]').forEach(btn => {
  btn.addEventListener('click', () => {
    mosaicBlurRadius = parseInt(btn.dataset.blur); syncMosaicUI()
    if (selectedId) { const a = annotations.find(x => x.id === selectedId); if (a && a.type === 'mosaic') { updateSelectedAnnot({ blurRadius: mosaicBlurRadius }) } }
  })
})

// ─── Symbol tool controls ─────────────────────────────────────────────────────

// Helper: generate array of Unicode chars from code point range
const _uchars = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => String.fromCodePoint(start + i))

const SYMBOL_SETS = {
  shape: {
    '幾何': ['★','☆','●','○','■','□','▲','△','▼','▽','◆','◇','♥','♡','♦','♠','♣','♤','❤','❥','✦','✧','✩','✪','⬟','⬡','⬢','⬣','⭕','✴','✳','❋'],
    '裝飾': ['⭐','💫','✨','🌟','🔥','💥','⚡','💧','🌊','☁','🌈','❄','🌸','🌺','🍀','🎯','🎨','🏆','👑','💎','🔮','🎭','⚽','🎪'],
  },
  letter: {
    '圓框': [..._uchars(0x24B6, 0x24CF), ..._uchars(0x24D0, 0x24E9)],  // Ⓐ-Ⓩ ⓐ-ⓩ
    '全形': [..._uchars(0xFF21, 0xFF3A), ..._uchars(0xFF41, 0xFF5A)],   // Ａ-Ｚ ａ-ｚ
    '粗體': [..._uchars(0x1D400, 0x1D419), ..._uchars(0x1D41A, 0x1D433)], // 𝐀-𝐙 𝐚-𝐳
    '粗斜': [..._uchars(0x1D468, 0x1D481), ..._uchars(0x1D482, 0x1D49B)], // 𝑨-𝒁 𝒂-𝒛
    '草書': [..._uchars(0x1D4D0, 0x1D4E9), ..._uchars(0x1D4EA, 0x1D503)], // 𝓐-𝓩 𝓪-𝔃
  },
  arrow: {
    '一般': ['←','→','↑','↓','↔','↕','↗','↘','↙','↖','↩','↪','↵','↷','↶','↰','↱','↴','↳','↲'],
    '雙線': ['⇐','⇒','⇑','⇓','⇔','⇕','⇖','⇗','⇘','⇙','⇦','⇧','⇨','⇩','⇄','⇅','⇆','⇇','⇈','⇉'],
    '三角': ['▶','◀','▲','▼','▷','◁','△','▽','►','◄','▻','◅','➤','➡','⬆','⬇','⬅','➥','➦','⤴'],
  },
  misc: {
    '標記': ['✓','✔','✗','✘','✕','✖','⚠','⚑','ℹ','！','？','＊','⊕','⊗','⊙','⊘','☑','☐'],
    '貨幣': ['$','€','£','¥','₩','₪','₫','₭','₮','₱','₲','₴','₵','₸','₹','₺','₽','₿','¢','¤','₠','₣','₤','₥'],
    '數學': ['÷','×','±','∞','√','∑','∏','∫','∂','∇','∈','∉','⊂','⊃','∩','∪','∧','∨','¬','≠','≈','≤','≥','∝'],
    '技術': ['⌘','⌥','⇧','⌃','⏎','⌫','⌦','⇥','⇤','⎋','©','®','™','§','¶','†','‡','※','°','′','″'],
  },
}

let activeSymGroup  = 'shape'
let symCurrentCat   = Object.keys(SYMBOL_SETS.shape)[0]

function buildSymGrid(group, cat) {
  const grid = document.getElementById('symGrid')
  grid.innerHTML = ''
  const chars = (SYMBOL_SETS[group] ?? {})[cat] ?? []
  chars.forEach(ch => {
    const btn = document.createElement('button')
    btn.className   = 'sym-btn' + (ch === symbolChar ? ' active' : '')
    btn.textContent = ch
    btn.title       = ch
    btn.addEventListener('click', () => {
      symbolChar = ch
      document.getElementById('symbolPreviewSwatch').textContent = ch
      document.querySelectorAll('.sym-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      // 只有在選取模式下才更新既有的符號 annotation（印章模式不覆蓋已蓋下的印章）
      if (tool === 'select' && selectedId) {
        const a = annotations.find(x => x.id === selectedId)
        if (a && a.type === 'symbol') { updateSelectedAnnot({ char: ch }) }
      }
      hideSymbolPanel()
    })
    grid.appendChild(btn)
  })
}

function buildSymTabs(group) {
  const row = document.getElementById('symTabsRow')
  row.innerHTML = ''
  const cats = Object.keys(SYMBOL_SETS[group] ?? {})
  cats.forEach((cat, i) => {
    const btn = document.createElement('button')
    btn.className       = 'sym-tab' + (i === 0 ? ' active' : '')
    btn.dataset.cat     = cat
    btn.textContent     = cat
    btn.addEventListener('click', () => {
      symCurrentCat = cat
      row.querySelectorAll('.sym-tab').forEach(t => t.classList.remove('active'))
      btn.classList.add('active')
      buildSymGrid(group, cat)
    })
    row.appendChild(btn)
  })
}

function openSymbolGroup(group, triggerBtn) {
  activeSymGroup = group
  const panel = document.getElementById('symbolPickerPanel')
  const ar = triggerBtn.getBoundingClientRect()
  panel.style.left = Math.min(ar.left, window.innerWidth - 272) + 'px'
  panel.style.top  = (ar.bottom + 4) + 'px'
  buildSymTabs(group)
  symCurrentCat = Object.keys(SYMBOL_SETS[group])[0]
  buildSymGrid(group, symCurrentCat)
  panel.classList.remove('hidden')
  // 更新子屬性列群組按鈕 active 狀態
  document.querySelectorAll('#grpSymbol [data-sym-group]').forEach(b =>
    b.classList.toggle('active', b.dataset.symGroup === group)
  )
}

function hideSymbolPanel() {
  document.getElementById('symbolPickerPanel').classList.add('hidden')
}

// Swatch click — re-opens the current group's panel
document.getElementById('symbolPreviewSwatch').addEventListener('click', e => {
  e.stopPropagation()
  const panel = document.getElementById('symbolPickerPanel')
  if (panel.classList.contains('hidden')) {
    const gb = document.querySelector(`#grpSymbol [data-sym-group="${activeSymGroup}"]`)
    if (gb) openSymbolGroup(activeSymGroup, gb)
  } else {
    hideSymbolPanel()
  }
})

// Sym-group buttons in options bar — open corresponding panel
document.querySelectorAll('#grpSymbol [data-sym-group]').forEach(btn => {
  btn.addEventListener('click', () => {
    openSymbolGroup(btn.dataset.symGroup, btn)
  })
})

document.getElementById('symbolSizeInput').addEventListener('change', e => {
  symbolSize = Math.max(16, Math.min(512, parseInt(e.target.value) || 64))
  e.target.value = symbolSize
  if (selectedId) {
    const a = annotations.find(x => x.id === selectedId)
    if (a && a.type === 'symbol') { updateSelectedAnnot({ size: symbolSize }); pushHistory() }
  }
})

// Close symbol panel on outside click
document.addEventListener('mousedown', e => {
  const panel = document.getElementById('symbolPickerPanel')
  if (!panel.classList.contains('hidden') &&
      !panel.contains(e.target) &&
      !e.target.closest('#grpSymbol') &&
      e.target.id !== 'symbolPreviewSwatch') {
    hideSymbolPanel()
  }
})

// ─── Template (一鍵套版) ──────────────────────────────────────────────────────

function _tplRoundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// Shared: draw image with optional rounded corners + drop shadow
function _tplDrawImgRounded(ctx, img, x, y, w, h, radius, shadowColor, shadowBlur, shadowOffY) {
  const r = Math.round(Math.min(w, h) * radius)
  const blur = Math.round(Math.min(w, h) * shadowBlur)
  const sOffY = Math.round(Math.min(w, h) * shadowOffY)
  if (blur > 0) {
    ctx.save()
    ctx.shadowColor = shadowColor
    ctx.shadowBlur = blur
    ctx.shadowOffsetY = sOffY
    ctx.fillStyle = 'rgba(0,0,0,0.001)'
    _tplRoundRectPath(ctx, x, y, w, h, r)
    ctx.fill()
    ctx.restore()
  }
  ctx.save()
  if (r > 0) { _tplRoundRectPath(ctx, x, y, w, h, r); ctx.clip() }
  ctx.drawImage(img, x, y, w, h)
  ctx.restore()
}

// ── 套版可調參數 ──────────────────────────────────────────────
let _tplTargetRatio   = null  // null = auto (uniform padding)
let _tplPadding       = 9     // 2–30  (% of min dimension)
let _tplRadius        = 5     // 0–10  → radius factor = value × 0.005
let _tplShadow        = 5     // 0–10  → blur   factor = value × 0.008
let _lastAppliedTplId = null  // for slider live-preview re-apply

// Shared layout helper — respects _tplTargetRatio and _tplPadding
function _tplGradLayout(w, h) {
  const pad = Math.round(Math.min(w, h) * (_tplPadding / 100))
  if (!_tplTargetRatio) {
    return { newW: w + pad * 2, newH: h + pad * 2, imgX: pad, imgY: pad }
  }
  const imgRatio = w / h
  let newW, newH
  if (imgRatio >= _tplTargetRatio) {
    newW = w + pad * 2
    newH = Math.max(h + pad * 2, Math.round(newW / _tplTargetRatio))
  } else {
    newH = h + pad * 2
    newW = Math.max(w + pad * 2, Math.round(newH * _tplTargetRatio))
  }
  return { newW, newH, imgX: Math.round((newW - w) / 2), imgY: Math.round((newH - h) / 2) }
}

// Shared drawImg — rounded corners + white border using _tplRadius / _tplShadow
function _tplGradDrawImg(ctx, img, x, y, w, h) {
  const r = _tplRadius * 0.005                               // 0–5% of min(w,h)
  if (_tplShadow > 0) {
    const bw  = Math.round(Math.min(w, h) * _tplShadow * 0.003)  // 0–3% border width
    const rPx = Math.round(Math.min(w, h) * r)
    _tplRoundRectPath(ctx, x - bw, y - bw, w + bw * 2, h + bw * 2, rPx + bw)
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.fill()
  }
  _tplDrawImgRounded(ctx, img, x, y, w, h, r, 'rgba(0,0,0,0)', 0, 0)
}

// Mesh gradient: place multiple soft radial colour blobs over a base fill
// blobs: [ [cx, cy, r, [R,G,B], alpha], ... ]  — cx/cy/r in 0..1 relative to W
function _tplMesh(ctx, W, H, base, blobs) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H)
  for (const [cx, cy, r, [rr, gg, bb], a] of blobs) {
    const rg = ctx.createRadialGradient(W * cx, H * cy, 0, W * cx, H * cy, W * r)
    rg.addColorStop(0, `rgba(${rr},${gg},${bb},${a})`)
    rg.addColorStop(1, `rgba(${rr},${gg},${bb},0)`)
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H)
  }
}

const TEMPLATES = [
  // ── Apple 紅 — 珊瑚玫瑰（Coral / Rose / Peach）────────────────
  {
    id: 'apple-red',
    layout: _tplGradLayout,
    drawBg(ctx, W, H) {
      _tplMesh(ctx, W, H, '#fff0f0', [
        [0.10, 0.88, 0.90, [225, 55, 85],  0.78],  // 深玫瑰 左下
        [0.92, 0.12, 0.85, [255, 125, 85], 0.68],  // 暖珊瑚 右上
        [0.50, 0.50, 0.70, [240, 75, 115], 0.42],  // 玫瑰 中央
      ])
    },
    drawImg: _tplGradDrawImg,
  },
  // ── Apple 橙 — 琥珀暖陽（Terracotta / Amber / Gold）──────────
  {
    id: 'apple-orange',
    layout: _tplGradLayout,
    drawBg(ctx, W, H) {
      _tplMesh(ctx, W, H, '#fff8f0', [
        [0.05, 0.92, 0.88, [205, 72, 22],  0.78],  // 深陶土 左下
        [0.90, 0.08, 0.85, [255, 200, 50], 0.70],  // 黃金 右上
        [0.50, 0.52, 0.68, [255, 135, 42], 0.42],  // 橙 中央
      ])
    },
    drawImg: _tplGradDrawImg,
  },
  // ── Apple 黃 — 晴光黃金（Amber / Sunshine / Lemon）───────────
  {
    id: 'apple-yellow',
    layout: _tplGradLayout,
    drawBg(ctx, W, H) {
      _tplMesh(ctx, W, H, '#fffde8', [
        [0.08, 0.90, 0.82, [230, 148, 28], 0.72],  // 琥珀 左下
        [0.88, 0.10, 0.82, [255, 242, 95], 0.68],  // 亮檸檬 右上
        [0.48, 0.45, 0.62, [255, 198, 50], 0.35],  // 陽光黃 中
        [0.88, 0.88, 0.68, [120, 215, 90], 0.35],  // 嫩草綠 右下（跨色）
      ])
    },
    drawImg: _tplGradDrawImg,
  },
  // ── Apple 綠 — 翠玉薄荷（Emerald / Aquamarine / Mint）────────
  {
    id: 'apple-green',
    layout: _tplGradLayout,
    drawBg(ctx, W, H) {
      _tplMesh(ctx, W, H, '#edfff6', [
        [0.05, 0.92, 0.92, [4,  112, 80],  0.82],  // 深翠綠 左下
        [0.90, 0.06, 0.88, [50, 228, 170], 0.72],  // 薄荷青 右上
        [0.85, 0.82, 0.65, [18, 172, 122], 0.38],  // 中翠 右下
        [0.12, 0.12, 0.68, [210, 230, 40], 0.42],  // 檸檬黃 左上（跨色）
      ])
    },
    drawImg: _tplGradDrawImg,
  },
  // ── Apple 藍 — 晴空碧海（Sky / Aqua / Violet hint）───────────
  {
    id: 'apple-blue',
    layout: _tplGradLayout,
    drawBg(ctx, W, H) {
      _tplMesh(ctx, W, H, '#eef7ff', [
        [0.05, 0.92, 0.92, [18, 98, 198],  0.82],  // 深靛藍 左下
        [0.90, 0.05, 0.88, [95, 220, 255], 0.72],  // 天水藍 右上
        [0.88, 0.86, 0.70, [55, 138, 232], 0.45],  // 中藍 右下
        [0.13, 0.12, 0.66, [115, 85, 255], 0.32],  // 紫藍 左上（跨色）
      ])
    },
    drawImg: _tplGradDrawImg,
  },
  // ── Apple 紫 — 極光（Violet / Magenta / Lavender）────────────
  {
    id: 'apple-purple',
    layout: _tplGradLayout,
    drawBg(ctx, W, H) {
      _tplMesh(ctx, W, H, '#f8f0ff', [
        [0.05, 0.90, 0.90, [98,  32, 218], 0.75],  // 深紫羅蘭 左下
        [0.92, 0.08, 0.88, [222, 90, 205], 0.68],  // 品紅 右上
        [0.10, 0.10, 0.72, [142, 112, 245], 0.48], // 薰衣草 左上
        [0.78, 0.82, 0.62, [198, 95,  232], 0.32], // 紫 右下
      ])
    },
    drawImg: _tplGradDrawImg,
  },
]

let _tplBaseSnapshot = null
let _snapImgLoaded   = null   // cached decoded snapshot — avoids repeated async Image load

function applyTemplate(tplId) {
  if (!imgElement) return
  const tpl = TEMPLATES.find(t => t.id === tplId)
  if (!tpl) return
  if (!_tplBaseSnapshot) return

  _lastAppliedTplId = tplId
  const snap = _tplBaseSnapshot

  const doApply = (snapImg) => {
    const layout = tpl.layout(snap.width, snap.height)
    const { newW, newH, imgX, imgY } = layout
    const off = document.createElement('canvas')
    off.width = newW; off.height = newH
    const ctx = off.getContext('2d')
    tpl.drawBg(ctx, newW, newH, layout)
    tpl.drawImg(ctx, snapImg, imgX, imgY, snap.width, snap.height, layout)
    pushHistory()
    const newImg = new Image()
    newImg.onload = () => {
      imgElement = newImg; imgWidth = newW; imgHeight = newH
      document.getElementById('imgInfo').textContent = `${newW} × ${newH} px`
      annotations = JSON.parse(JSON.stringify(snap.annotations))
      annotations.forEach(a => moveAnnot(a, imgX, imgY))
      userZoomed = false
      fitCanvas(); drawBase(); renderAnnotations()
      showToast(t('toast_template_applied'))
    }
    newImg.src = off.toDataURL()
  }

  if (_snapImgLoaded) {
    doApply(_snapImgLoaded)
  } else {
    const img = new Image()
    img.onload = () => { _snapImgLoaded = img; doApply(img) }
    img.src = snap.dataURL
  }
}

function openTemplatePanel() {
  if (!imgElement) { showToast(t('toast_load_image_first')); return }
  const panel = document.getElementById('templatePanel')
  if (!panel.classList.contains('hidden')) { hideTemplatePanel(); return }

  // Take snapshot of current image
  const sc = document.createElement('canvas')
  sc.width = imgWidth; sc.height = imgHeight
  sc.getContext('2d').drawImage(imgElement, 0, 0)
  _tplBaseSnapshot = { dataURL: sc.toDataURL(), width: imgWidth, height: imgHeight,
                       annotations: JSON.parse(JSON.stringify(annotations)) }
  _snapImgLoaded = null

  // Initial position near button
  const btn = document.getElementById('btnTemplate')
  const ar  = btn.getBoundingClientRect()
  panel.style.left = Math.min(ar.left - 8, window.innerWidth - 300) + 'px'
  panel.style.top  = (ar.bottom + 6) + 'px'
  panel.classList.remove('hidden')

  // Clamp to viewport after layout paint
  requestAnimationFrame(() => {
    const pr = panel.getBoundingClientRect()
    if (pr.bottom > window.innerHeight - 10)
      panel.style.top  = Math.max(10, ar.top - pr.height - 6) + 'px'
    if (pr.right  > window.innerWidth  - 10)
      panel.style.left = Math.max(10, window.innerWidth - pr.width - 10) + 'px'
  })
}

function hideTemplatePanel() {
  document.getElementById('templatePanel').classList.add('hidden')
  _tplBaseSnapshot  = null
  _snapImgLoaded    = null
  _tplTargetRatio   = null
  _lastAppliedTplId = null
  document.querySelectorAll('.tpl-size-btn').forEach(b => b.classList.remove('active'))
}

document.getElementById('btnTemplate').addEventListener('click', e => {
  e.stopPropagation()
  openTemplatePanel()
})

// ✕ close button — stop propagation so it doesn't trigger panel drag
;['mousedown', 'click'].forEach(ev => {
  document.getElementById('tplCloseBtn').addEventListener(ev, e => {
    e.stopPropagation()
    if (ev === 'click') hideTemplatePanel()
  })
})

document.querySelectorAll('.tpl-card').forEach(card => {
  card.addEventListener('click', () => applyTemplate(card.dataset.tpl))
})

// Social size buttons — set target ratio + immediately re-apply if template active
document.querySelectorAll('.tpl-size-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tpl-size-btn').forEach(b => b.classList.remove('active'))
    const ratio = parseFloat(btn.dataset.ratio)
    _tplTargetRatio = ratio > 0 ? ratio : null
    btn.classList.add('active')
    if (_lastAppliedTplId && _tplBaseSnapshot) applyTemplate(_lastAppliedTplId)
  })
})

// Sliders — labels update on drag (input), apply only on release (change)
function _syncSliderLabels() {
  const pEl = document.getElementById('tplPadding')
  const rEl = document.getElementById('tplRadius')
  const sEl = document.getElementById('tplShadow')
  if (pEl) document.getElementById('tplPaddingVal').textContent = pEl.value + '%'
  if (rEl) document.getElementById('tplRadiusVal').textContent  = rEl.value
  if (sEl) document.getElementById('tplShadowVal').textContent  = sEl.value
}

function _applySliderChange() {
  const pEl = document.getElementById('tplPadding')
  const rEl = document.getElementById('tplRadius')
  const sEl = document.getElementById('tplShadow')
  if (pEl) _tplPadding = parseInt(pEl.value, 10)
  if (rEl) _tplRadius  = parseInt(rEl.value, 10)
  if (sEl) _tplShadow  = parseInt(sEl.value, 10)
  if (_lastAppliedTplId && _tplBaseSnapshot) applyTemplate(_lastAppliedTplId)
}

;['tplPadding', 'tplRadius', 'tplShadow'].forEach(id => {
  const el = document.getElementById(id)
  if (!el) return
  el.addEventListener('input',  _syncSliderLabels)
  el.addEventListener('change', _applySliderChange)
})

// Draggable template panel
;(function () {
  const panel  = document.getElementById('templatePanel')
  const handle = document.getElementById('tplDragHandle')
  let drag = null

  handle.addEventListener('mousedown', e => {
    const r = panel.getBoundingClientRect()
    drag = { ox: e.clientX - r.left, oy: e.clientY - r.top }
    e.preventDefault()
  })
  document.addEventListener('mousemove', e => {
    if (!drag) return
    const x = Math.max(0, Math.min(window.innerWidth  - panel.offsetWidth,  e.clientX - drag.ox))
    const y = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, e.clientY - drag.oy))
    panel.style.left = x + 'px'
    panel.style.top  = y + 'px'
  })
  document.addEventListener('mouseup', () => { drag = null })
})()

document.addEventListener('mousedown', e => {
  const panel = document.getElementById('templatePanel')
  if (!panel.classList.contains('hidden') &&
      !panel.contains(e.target) &&
      e.target.id !== 'btnTemplate') {
    hideTemplatePanel()
  }
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
        case 'mosaic':
          a.x *= sx; a.y *= sy; a.w *= sx; a.h *= sy
          break
        case 'rect':
        case 'fillrect':
          a.x *= sx; a.y *= sy; a.w *= sx; a.h *= sy
          a.thickness = Math.max(1, Math.round(a.thickness * sx))
          break
        case 'symbol':
          a.x *= sx; a.y *= sy
          a.size = Math.max(8, Math.round(a.size * Math.min(sx, sy)))
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
    showToast(t('toast_resized', targetW, targetH))
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

// Add subtle VAS attribution badge to a canvas context (bottom-right corner)
// Auto-detects background brightness to choose black or white text.
function addVasBadge(ctx, w, h) {
  const scale    = imgDPR || 1
  const fontSize = Math.round(10 * scale)
  const margin   = Math.round(8  * scale)

  ctx.save()
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`
  const textW = Math.ceil(ctx.measureText('VAS').width)
  const textH = fontSize

  // Sample the pixels behind the badge area to decide ink colour
  const sx = Math.max(0, w - margin - textW - 4)
  const sy = Math.max(0, h - margin - textH - 4)
  const sw = Math.min(textW + 8, w - sx)
  const sh = Math.min(textH + 8, h - sy)
  let brightness = 0.5
  if (sw > 0 && sh > 0) {
    const px = ctx.getImageData(sx, sy, sw, sh).data
    let sum = 0
    for (let i = 0; i < px.length; i += 4) {
      sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
    }
    brightness = sum / (px.length / 4) / 255
  }

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign    = 'right'
  ctx.fillStyle    = brightness > 0.5
    ? 'rgba(0,0,0,0.45)'         // dark text on light background
    : 'rgba(255,255,255,0.60)'   // light text on dark background
  ctx.fillText('VAS', w - margin, h - margin)
  ctx.restore()
}

// Burn annotations + VAS badge (used only for drag export)
function burnInTagged() {
  const off = document.createElement('canvas')
  off.width = imgWidth; off.height = imgHeight
  const ctx = off.getContext('2d')
  ctx.drawImage(imgElement, 0, 0, imgWidth, imgHeight)

  const savedScale = viewScale
  viewScale = 1
  annotations.forEach(a => drawOne(ctx, a))
  viewScale = savedScale

  addVasBadge(ctx, imgWidth, imgHeight)
  return off.toDataURL('image/png')
}

// ─── Copy final image to clipboard ───────────────────────────────────────────

function copyFinalImage() {
  if (!imgElement) { showToast(t('toast_no_image'), true); return }
  const dataURL = burnIn('png')
  window.electronAPI.clipboard.writeImage(dataURL)
  showToast(t('toast_img_copied'))
}

document.getElementById('btnCopyImage').addEventListener('click', copyFinalImage)

// ─── Drag OUT export (floating button) ────────────────────────────────────────

;(function () {
  const btn    = document.getElementById('floatDragExport')
  const handle = document.getElementById('floatDragMove')
  let drag = null

  // ⠿ handle — reposition the button anywhere on screen
  handle.addEventListener('mousedown', e => {
    const r = btn.getBoundingClientRect()
    drag = { ox: e.clientX - r.left, oy: e.clientY - r.top }
    e.preventDefault()
    e.stopPropagation()
  })
  document.addEventListener('mousemove', e => {
    if (!drag) return
    const x = Math.max(0, Math.min(window.innerWidth  - btn.offsetWidth,  e.clientX - drag.ox))
    const y = Math.max(0, Math.min(window.innerHeight - btn.offsetHeight, e.clientY - drag.oy))
    btn.style.left   = x + 'px'
    btn.style.top    = y + 'px'
    btn.style.right  = 'auto'
    btn.style.bottom = 'auto'
  })
  document.addEventListener('mouseup', () => { drag = null })

  // Main area — start OS-level drag export (includes VAS badge)
  btn.addEventListener('mousedown', e => {
    if (e.target === handle || handle.contains(e.target)) return
    if (!imgElement) { showToast(t('toast_no_image'), true); return }
    ipcSend('start-drag-export', { dataURL: burnInTagged() })
  })
})()

// ─── Drag & Drop import ───────────────────────────────────────────────────────

const _dropOverlay = document.getElementById('dropOverlay')
let   _dropDepth   = 0  // track nested dragenter/dragleave

function _loadFileIntoEditor(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast(t('toast_drop_images'), true)
    return
  }
  const reader = new FileReader()
  reader.onload = ev => {
    const newImg = new Image()
    newImg.onload = () => {
      imgElement  = newImg
      imgWidth    = newImg.naturalWidth
      imgHeight   = newImg.naturalHeight
      annotations = []
      history     = [[]]; historyIdx = 0
      selectedId  = null; userZoomed = false
      document.getElementById('imgInfo').textContent = `${imgWidth} × ${imgHeight} px`
      fitCanvas()
      drawBase()
      renderAnnotations()
      showToast(t('toast_imported', file.name))
    }
    newImg.src = ev.target.result
  }
  reader.readAsDataURL(file)
}

document.addEventListener('dragenter', e => {
  const hasFile = e.dataTransfer?.types?.includes('Files')
  if (!hasFile) return
  _dropDepth++
  if (_dropDepth === 1) _dropOverlay.classList.add('active')
})

document.addEventListener('dragleave', () => {
  _dropDepth = Math.max(0, _dropDepth - 1)
  if (_dropDepth === 0) _dropOverlay.classList.remove('active')
})

document.addEventListener('dragover', e => {
  if (e.dataTransfer?.types?.includes('Files')) e.preventDefault()
})

document.addEventListener('drop', e => {
  _dropDepth = 0
  _dropOverlay.classList.remove('active')
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) _loadFileIntoEditor(file)
})

// ─── Keyboard shortcut: ⌘⇧C copies final image ──────────────────────────────

// (Handled in the existing keydown listener — injected here so it stays near the impl)
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
    e.preventDefault(); copyFinalImage()
  }
}, true)  // capture phase so it fires before other listeners

// ─── Privacy Mask ─────────────────────────────────────────────────────────────
// 兩種入口：
//   K 鍵              → runPrivacyScan(null)   全圖掃描
//   工具按鈕 + 拖框   → activatePrivacyMask()  拖框後呼叫 runPrivacyScan(region)

let privacyRegion    = null  // { x, y, w, h } in image coords, set by drag
let isPrivacyDrawing = false

function activatePrivacyMask() {
  // 進入拖框等待模式（互動邏輯由 mousedown/up handler 偵測 tool === 'privacymask' 觸發）
  setTool('privacymask')
}

function _privacyMosaicMode() {
  // 從選項列讀取使用者選擇的馬賽克或模糊模式
  const btn = document.querySelector('#grpPrivacyMode .pmmode-btn.active')
  return btn ? btn.dataset.mode : 'mosaic'
}

async function runPrivacyScan(region) {
  // region: null = full image; { x, y, w, h } in image coords = restricted area
  if (!imgElement) { showToast(t('toast_no_image'), true); return }

  showToast(t('toast_privacy_scanning'))

  // 送原始解析度底圖（不含標注）給 Swift
  const off = document.createElement('canvas')
  off.width = imgWidth; off.height = imgHeight
  off.getContext('2d').drawImage(imgElement, 0, 0, imgWidth, imgHeight)
  const dataURL = off.toDataURL('image/png')

  const result = await ipcInvoke('privacy-scan', { dataURL })

  if (!result.success) {
    showToast(t('toast_privacy_fail') + '：' + result.error, true)
    return
  }

  let boxes = result.boxes || []

  // 區域掃描：過濾出在框選範圍內的偵測結果
  if (region) {
    boxes = boxes.filter(b =>
      b.x >= region.x && b.y >= region.y &&
      b.x + b.w <= region.x + region.w &&
      b.y + b.h <= region.y + region.h
    )
  }

  if (boxes.length === 0) {
    showToast(t('toast_privacy_none'))
    return
  }

  const mode = _privacyMosaicMode()
  pushHistory()
  boxes.forEach(b => {
    annotations.push({
      id:         newId(),
      type:       'mosaic',
      x:          Math.round(b.x),
      y:          Math.round(b.y),
      w:          Math.max(4, Math.round(b.w)),
      h:          Math.max(4, Math.round(b.h)),
      mode,
      blockSize:  privacyBlockSize,
      blurRadius: privacyBlurRadius,
    })
  })
  renderAnnotations()
  showToast(t('toast_privacy_done', boxes.length))
  setTool('select')  // auto-switch so user can immediately drag resize handles on any generated mosaic
}

// ─── Action Toast (QR code prompt) ───────────────────────────────────────────

const _actionToast       = document.getElementById('actionToast')
const _actionToastMsg    = document.getElementById('actionToastMsg')
const _actionToastConfirm  = document.getElementById('actionToastConfirm')
const _actionToastDismiss  = document.getElementById('actionToastDismiss')
let   _actionToastOnConfirm = null

function showActionToast(msg, confirmLabel, onConfirm) {
  _actionToastMsg.textContent = msg
  _actionToastConfirm.textContent = confirmLabel
  _actionToastOnConfirm = onConfirm
  _actionToast.classList.remove('hidden')
}

function hideActionToast() {
  _actionToast.classList.add('hidden')
  _actionToastOnConfirm = null
}

_actionToastConfirm.addEventListener('click', () => {
  if (_actionToastOnConfirm) _actionToastOnConfirm()
  hideActionToast()
})
_actionToastDismiss.addEventListener('click', hideActionToast)

// Listen for QR code detection from main process (21–69% ratio)
if (window.electronAPI) {
  window.electronAPI.on('qr-detected', ({ data, ratio, isUrl }) => {
    if (isUrl) {
      showActionToast(
        t('qr_toast_msg', data),
        t('qr_toast_open'),
        () => window.electronAPI.invoke('open-url', data)
      )
    } else {
      // Non-URL QR (text, vCard, etc.) — copy to clipboard + regular toast
      window.electronAPI.clipboard.writeText(data)
      showToast(t('qr_toast_copied'))
    }
  })
}

// ─── Open Menu (新開畫布 / 開啟檔案) ────────────────────────────────────────

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast')
  toast.textContent = msg
  toast.classList.toggle('toast-error', isError)
  toast.classList.add('visible')
  setTimeout(() => toast.classList.remove('visible'), 2800)
}
