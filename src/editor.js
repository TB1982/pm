const { ipcRenderer } = require('electron')

// ─── Colour palette ──────────────────────────────────────────────────────────

const COLORS = [
  { hex: '#ff3b30', name: '紅' },
  { hex: '#ff9500', name: '橙' },
  { hex: '#ffcc00', name: '黃' },
  { hex: '#34c759', name: '綠' },
  { hex: '#007aff', name: '藍' },
  { hex: '#af52de', name: '紫' },
  { hex: '#1c1c1e', name: '黑' },
  { hex: '#ffffff', name: '白' },
]

// ─── State ───────────────────────────────────────────────────────────────────

// Image
let imgElement = null
let imgWidth   = 0
let imgHeight  = 0
let viewScale  = 1    // display pixels per image pixel

// Annotation history
let annotations = []
let history     = [[]]
let historyIdx  = 0

// Tool settings (persist across selections)
let tool      = 'rect'
let color     = '#ff3b30'
let thickness = 2
let lineStyle = 'solid'
let startCap  = 'none'
let endCap    = 'arrow'
let fontSize  = 24
let numCount  = 1
let numSize   = 14    // radius, image pixels

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

// ─── DOM ─────────────────────────────────────────────────────────────────────

const baseCanvas    = document.getElementById('baseCanvas')
const annotCanvas   = document.getElementById('annotCanvas')
const baseCtx       = baseCanvas.getContext('2d')
const annotCtx      = annotCanvas.getContext('2d')
const canvasArea    = document.getElementById('canvasArea')
const canvasWrapper = document.getElementById('canvasWrapper')
const textInputWrap = document.getElementById('textInputWrap')
const textInputEl   = document.getElementById('textInput')

// ─── Utility ─────────────────────────────────────────────────────────────────

// WCAG perceived luminance → AA-compliant text colour
function getTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return (0.299 * r + 0.587 * g + 0.114 * b) > 0.5 ? '#1c1c1e' : '#ffffff'
}

// ─── Options bar helpers ──────────────────────────────────────────────────────

function hideAllOptions() {
  ['grpColor','grpThickness','grpLineStyle','grpCaps','grpFont','grpNumber'].forEach(id =>
    document.getElementById(id).classList.add('hidden')
  )
}

function showOptionsForTool(t) {
  hideAllOptions()
  if (!['rect','line','text','number'].includes(t)) return
  document.getElementById('grpColor').classList.remove('hidden')
  if (['rect','line'].includes(t)) document.getElementById('grpThickness').classList.remove('hidden')
  if (t === 'line')   { document.getElementById('grpLineStyle').classList.remove('hidden'); document.getElementById('grpCaps').classList.remove('hidden') }
  if (t === 'text')   document.getElementById('grpFont').classList.remove('hidden')
  if (t === 'number') document.getElementById('grpNumber').classList.remove('hidden')
}

function showOptionsForAnnot(a) {
  hideAllOptions()
  const t = a.type
  document.getElementById('grpColor').classList.remove('hidden')
  if (['rect','line'].includes(t)) document.getElementById('grpThickness').classList.remove('hidden')
  if (t === 'line')   { document.getElementById('grpLineStyle').classList.remove('hidden'); document.getElementById('grpCaps').classList.remove('hidden') }
  if (t === 'text')   document.getElementById('grpFont').classList.remove('hidden')
  if (t === 'number') document.getElementById('grpNumber').classList.remove('hidden')
  // Sync UI state to annotation values
  color = a.color; syncColor(color)
  if ('thickness' in a) { thickness = a.thickness; syncThickness(thickness) }
  if (t === 'line')   { lineStyle = a.lineStyle; startCap = a.startCap; endCap = a.endCap; syncLineStyle(lineStyle); syncCaps(startCap, endCap) }
  if (t === 'text')   { fontSize = a.fontSize;   syncFontSize(fontSize) }
  if (t === 'number') { numSize  = a.size ?? 14; syncNumSize(numSize) }
}

// Sync UI controls
function syncColor(col) {
  document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.hex === col))
}
function syncThickness(t) {
  document.querySelectorAll('.sz-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.sz) === t))
}
function syncLineStyle(ls) {
  document.querySelectorAll('.style-btn').forEach(b => b.classList.toggle('active', b.dataset.ls === ls))
}
function syncCaps(sc, ec) {
  document.querySelectorAll('.cap-btn[data-end="start"]').forEach(b => b.classList.toggle('active', b.dataset.cap === sc))
  document.querySelectorAll('.cap-btn[data-end="end"]').forEach(b => b.classList.toggle('active', b.dataset.cap === ec))
}
function syncFontSize(fs) { document.getElementById('fontSizeInput').value = fs }
function syncNumSize(ns) {
  document.querySelectorAll('.ns-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.ns) === ns))
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

// Colour swatches
const swatchesEl = document.getElementById('colorSwatches')
COLORS.forEach(c => {
  const btn = document.createElement('button')
  btn.className     = 'swatch' + (c.hex === color ? ' active' : '')
  btn.style.background = c.hex
  btn.dataset.hex   = c.hex
  btn.title         = c.name
  if (c.hex === '#ffffff') btn.style.boxShadow = 'inset 0 0 0 1px #555'
  btn.addEventListener('click', () => {
    color = c.hex
    syncColor(color)
    if (selectedId) updateSelectedAnnot({ color })
  })
  swatchesEl.appendChild(btn)
})

// Thickness
document.querySelectorAll('.sz-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    thickness = parseInt(btn.dataset.sz)
    syncThickness(thickness)
    if (selectedId) updateSelectedAnnot({ thickness })
  })
)

// Line style
document.querySelectorAll('.style-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    lineStyle = btn.dataset.ls
    syncLineStyle(lineStyle)
    if (selectedId) updateSelectedAnnot({ lineStyle })
  })
)

// Caps
document.querySelectorAll('.cap-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    const end = btn.dataset.end, cap = btn.dataset.cap
    if (end === 'start') startCap = cap
    else                 endCap   = cap
    syncCaps(startCap, endCap)
    if (selectedId) updateSelectedAnnot(end === 'start' ? { startCap: cap } : { endCap: cap })
  })
)

// Font size
document.getElementById('fontSizeInput').addEventListener('input', e => {
  fontSize = Math.max(8, Math.min(400, parseInt(e.target.value) || 24))
  if (selectedId) updateSelectedAnnot({ fontSize })
})

// Number size
document.querySelectorAll('.ns-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    numSize = parseInt(btn.dataset.ns)
    syncNumSize(numSize)
    if (selectedId) updateSelectedAnnot({ size: numSize })
  })
)

// Number reset
document.getElementById('btnNumReset').addEventListener('click', () => {
  numCount = 1
  showToast('編號已重置，下一個從 1 開始')
})

// Tool buttons
document.querySelectorAll('.tool-btn[data-tool]').forEach(btn =>
  btn.addEventListener('click', () => setTool(btn.dataset.tool))
)
document.getElementById('btnUndo').addEventListener('click', undo)
document.getElementById('btnRedo').addEventListener('click', redo)

// ─── Tool activation ─────────────────────────────────────────────────────────

function setTool(t) {
  commitText()
  tool       = t
  selectedId = null
  isDrawing  = false

  document.querySelectorAll('.tool-btn[data-tool]').forEach(b =>
    b.classList.toggle('active', b.dataset.tool === t)
  )
  annotCanvas.style.cursor = t === 'select' ? 'default' : 'crosshair'

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
  viewScale = Math.min(aw / imgWidth, ah / imgHeight, 1)
  const dw = Math.round(imgWidth  * viewScale)
  const dh = Math.round(imgHeight * viewScale)
  baseCanvas.width  = annotCanvas.width  = dw
  baseCanvas.height = annotCanvas.height = dh
  canvasWrapper.style.width  = dw + 'px'
  canvasWrapper.style.height = dh + 'px'
  document.getElementById('zoomLabel').textContent = Math.round(viewScale * 100) + '%'
}

function drawBase() {
  if (!imgElement) return
  baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height)
  baseCtx.drawImage(imgElement, 0, 0, imgWidth * viewScale, imgHeight * viewScale)
}

new ResizeObserver(() => {
  if (!imgElement) return
  fitCanvas(); drawBase(); renderAnnotations()
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
  if (selectedId) {
    const a = annotations.find(x => x.id === selectedId)
    if (a) drawSelection(annotCtx, a)
  }
}

function drawOne(ctx, a) {
  ctx.save()
  ctx.strokeStyle = a.color
  ctx.fillStyle   = a.color
  ctx.lineWidth   = a.thickness * viewScale
  switch (a.type) {
    case 'rect':   drawRect(ctx, a);   break
    case 'line':   drawLine(ctx, a);   break
    case 'text':   drawText(ctx, a);   break
    case 'number': drawNumber(ctx, a); break
  }
  ctx.restore()
}

function drawRect(ctx, a) {
  ctx.strokeRect(c(a.x), c(a.y), c(a.w), c(a.h))
}

function drawLine(ctx, a) {
  const x1 = c(a.x1), y1 = c(a.y1), x2 = c(a.x2), y2 = c(a.y2)
  const sz  = (a.thickness * 4 + 8) * viewScale
  ctx.beginPath()
  if (a.lineStyle === 'dashed') ctx.setLineDash([sz * 1.2, sz * 0.7])
  ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  ctx.setLineDash([])
  drawCap(ctx, a.startCap, x2, y2, x1, y1, a.color, sz)
  drawCap(ctx, a.endCap,   x1, y1, x2, y2, a.color, sz)
}

function drawCap(ctx, type, fx, fy, tx, ty, col, sz) {
  if (type === 'none') return
  const ang = Math.atan2(ty - fy, tx - fx)
  ctx.fillStyle = col
  if (type === 'arrow') {
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(tx + Math.cos(ang + 2.5) * sz, ty + Math.sin(ang + 2.5) * sz)
    ctx.lineTo(tx + Math.cos(ang - 2.5) * sz, ty + Math.sin(ang - 2.5) * sz)
    ctx.closePath(); ctx.fill()
  } else if (type === 'dot') {
    ctx.beginPath(); ctx.arc(tx, ty, sz * 0.42, 0, Math.PI * 2); ctx.fill()
  }
}

function drawText(ctx, a) {
  const fs = a.fontSize * viewScale
  ctx.font         = `${fs}px -apple-system, "Helvetica Neue", sans-serif`
  ctx.fillStyle    = a.color
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'top'
  a.content.split('\n').forEach((line, i) => ctx.fillText(line, c(a.x), c(a.y) + i * fs * 1.25))
}

function drawNumber(ctx, a) {
  const r  = (a.size ?? 14) * viewScale
  const cx = c(a.x), cy = c(a.y)
  ctx.fillStyle = a.color
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle    = getTextColor(a.color)
  ctx.font         = `bold ${Math.round(r * 0.9)}px -apple-system`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(a.value), cx, cy)
}

// ─── Resize handles ───────────────────────────────────────────────────────────

function getHandles(a) {
  if (a.type === 'rect') {
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
  return []
}

function findHandle(pos, a) {
  const hitR = (HANDLE_R + 4) / viewScale
  return getHandles(a).find(h => Math.hypot(h.x - pos.x, h.y - pos.y) <= hitR) ?? null
}

function startResize(hId, a) {
  const info = { id: hId }
  if (a.type === 'rect') {
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
  resizeHandle = info
  isResizing   = true
}

function applyResize(a, pos) {
  const h = resizeHandle
  if (a.type === 'rect') {
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
    ctx.arc(c(h.x), c(h.y), HANDLE_R, 0, Math.PI * 2)
    ctx.fill(); ctx.stroke()
    ctx.restore()
  })
}

// ─── Annotation factories ─────────────────────────────────────────────────────

function buildPreview() {
  const base = { id: '_p', color, thickness }
  const s = drawStart, e = drawCurrent
  if (tool === 'rect')
    return { ...base, type:'rect', x:Math.min(s.x,e.x), y:Math.min(s.y,e.y), w:Math.abs(e.x-s.x), h:Math.abs(e.y-s.y) }
  if (tool === 'line')
    return { ...base, type:'line', x1:s.x, y1:s.y, x2:e.x, y2:e.y, lineStyle, startCap, endCap }
  return null
}

function commitShape(start, end) {
  const base = { id: newId(), color, thickness }
  if (tool === 'rect') {
    const w = Math.abs(end.x - start.x), h = Math.abs(end.y - start.y)
    if (w < 2 || h < 2) return null
    return { ...base, type:'rect', x:Math.min(start.x,end.x), y:Math.min(start.y,end.y), w, h }
  }
  if (tool === 'line') {
    if (Math.hypot(end.x-start.x, end.y-start.y) < 2) return null
    return { ...base, type:'line', x1:start.x, y1:start.y, x2:end.x, y2:end.y, lineStyle, startCap, endCap }
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
}

// ─── Hit testing ─────────────────────────────────────────────────────────────

function bounds(a) {
  switch (a.type) {
    case 'rect':   return { x: a.x, y: a.y, w: a.w, h: a.h }
    case 'line': {
      const minX = Math.min(a.x1,a.x2), maxX = Math.max(a.x1,a.x2)
      const minY = Math.min(a.y1,a.y2), maxY = Math.max(a.y1,a.y2)
      return { x:minX, y:minY, w:Math.max(maxX-minX,1), h:Math.max(maxY-minY,1) }
    }
    case 'text': {
      const lines = a.content.split('\n')
      return { x:a.x, y:a.y, w:lines.reduce((m,l)=>Math.max(m,l.length),0)*a.fontSize*0.58, h:lines.length*a.fontSize*1.25 }
    }
    case 'number': return { x:a.x-16, y:a.y-16, w:32, h:32 }
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
    pushHistory()
    annotations.push({ id:newId(), type:'number', color, thickness, x:pos.x, y:pos.y, value:numCount++, size:numSize })
    renderAnnotations()
    return
  }

  if (tool === 'text') {
    commitText()
    showTextInput(pos)
    return
  }

  isDrawing = true; drawStart = pos; drawCurrent = pos
})

annotCanvas.addEventListener('mousemove', e => {
  const pos = evToImg(e)

  if (isResizing && selectedId) {
    const a = annotations.find(x => x.id === selectedId)
    if (a) applyResize(a, pos)
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

  if (isDrawing) { drawCurrent = pos; renderAnnotations(); return }

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
})

document.addEventListener('mouseup', e => {
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

  const end = evToImg(e)
  const ann = commitShape(drawStart, end)
  if (ann) { pushHistory(); annotations.push(ann) }
  renderAnnotations()
})

function moveAnnot(a, dx, dy) {
  switch (a.type) {
    case 'rect':
    case 'text':
    case 'number': a.x += dx; a.y += dy; break
    case 'line':   a.x1 += dx; a.y1 += dy; a.x2 += dx; a.y2 += dy; break
  }
}

// ─── Double-click: re-edit text ───────────────────────────────────────────────

annotCanvas.addEventListener('dblclick', e => {
  if (tool !== 'select') return
  const pos = evToImg(e)
  const a = findAt(pos)
  if (!a || a.type !== 'text') return

  textEditOrig = JSON.parse(JSON.stringify(a))
  annotations  = annotations.filter(x => x.id !== a.id)
  selectedId   = null
  hideAllOptions()

  // Sync settings to the annotation being edited
  color    = a.color;    syncColor(color)
  fontSize = a.fontSize; syncFontSize(fontSize)
  showOptionsForTool('text')

  showTextInput({ x: a.x, y: a.y })
  textInputEl.value = a.content
  textInputEl.style.height = 'auto'
  textInputEl.style.height = textInputEl.scrollHeight + 'px'
  textInputEl.select()
})

// ─── Text input ───────────────────────────────────────────────────────────────

function showTextInput(pos) {
  textActive = true
  textPos    = pos
  const fs   = fontSize * viewScale

  textInputEl.style.left       = c(pos.x) + 'px'
  textInputEl.style.top        = c(pos.y) + 'px'
  textInputEl.style.fontSize   = fs + 'px'
  textInputEl.style.color      = color
  textInputEl.style.lineHeight = '1.25'
  textInputEl.value            = ''

  textInputWrap.classList.remove('hidden')
  setTimeout(() => textInputEl.focus(), 10)
}

function commitText() {
  if (!textActive) return
  const content = textInputEl.value
  textEditOrig  = null   // discard original; new content replaces it
  if (content.trim()) {
    pushHistory()
    annotations.push({ id:newId(), type:'text', color, fontSize, x:textPos.x, y:textPos.y, content })
    renderAnnotations()
  }
  _closeTextInput()
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
  if (e.key === 'Enter' && !e.shiftKey && !isComposing) { e.preventDefault(); commitText() }
})

textInputEl.addEventListener('input', () => {
  textInputEl.style.height = 'auto'
  textInputEl.style.height = textInputEl.scrollHeight + 'px'
})

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (textActive) return
  const meta = e.metaKey || e.ctrlKey
  if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
  if (meta && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return }
  if (meta && e.key === 's') { e.preventDefault(); openSaveModal(); return }

  switch (e.key) {
    case 'v': case 'V': setTool('select'); break
    case 'r': case 'R': setTool('rect');   break
    case 'l': case 'L': setTool('line');   break
    case 't': case 'T': setTool('text');   break
    case 'n': case 'N': setTool('number'); break
    case 'Escape':
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
  commitText()
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
  if (result?.success) showToast(`已儲存：${result.path.split('/').pop()}`)
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
