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

let imgElement = null
let imgWidth   = 0
let imgHeight  = 0
let imgPath    = null
let viewScale  = 1   // display pixels per image pixel

let annotations = []
let history     = [[]]  // array of annotation snapshots
let historyIdx  = 0

let tool      = 'rect'
let color     = '#ff3b30'
let thickness = 2       // stored in image-pixel units
let lineStyle = 'solid'
let startCap  = 'none'
let endCap    = 'arrow'
let fontSize  = 24      // stored in image-pixel units
let numCount  = 1

// Drawing in progress
let isDrawing   = false
let drawStart   = null    // { x, y } image coords
let drawCurrent = null    // { x, y } image coords

// Select / drag
let selectedId   = null
let isDragging   = false
let hasDragged   = false
let lastMousePos = null   // image coords

// Text editing
let textActive = false
let textPos    = null   // { x, y } image coords

// ─── DOM ─────────────────────────────────────────────────────────────────────

const baseCanvas  = document.getElementById('baseCanvas')
const annotCanvas = document.getElementById('annotCanvas')
const baseCtx     = baseCanvas.getContext('2d')
const annotCtx    = annotCanvas.getContext('2d')
const canvasArea  = document.getElementById('canvasArea')
const canvasWrapper = document.getElementById('canvasWrapper')
const textInputWrap = document.getElementById('textInputWrap')
const textInputEl   = document.getElementById('textInput')

// ─── Build UI ────────────────────────────────────────────────────────────────

// Colour swatches
const swatchesEl = document.getElementById('colorSwatches')
COLORS.forEach(c => {
  const btn = document.createElement('button')
  btn.className = 'swatch' + (c.hex === color ? ' active' : '')
  btn.style.background = c.hex
  btn.title = c.name
  if (c.hex === '#ffffff') btn.style.boxShadow = 'inset 0 0 0 1px #555'
  btn.addEventListener('click', () => {
    color = c.hex
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'))
    btn.classList.add('active')
  })
  swatchesEl.appendChild(btn)
})

// Thickness
document.querySelectorAll('.sz-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    thickness = parseInt(btn.dataset.sz)
    document.querySelectorAll('.sz-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
  })
)

// Line style
document.querySelectorAll('.style-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    lineStyle = btn.dataset.ls
    document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
  })
)

// Endpoint caps (start / end independently)
document.querySelectorAll('.cap-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    const end = btn.dataset.end
    const cap = btn.dataset.cap
    if (end === 'start') startCap = cap
    else                 endCap   = cap
    document.querySelectorAll(`.cap-btn[data-end="${end}"]`).forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
  })
)

// Font size
document.getElementById('fontSizeInput').addEventListener('input', e => {
  fontSize = Math.max(8, Math.min(400, parseInt(e.target.value) || 24))
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
  tool = t
  selectedId = null

  document.querySelectorAll('.tool-btn[data-tool]').forEach(b =>
    b.classList.toggle('active', b.dataset.tool === t)
  )
  annotCanvas.style.cursor = t === 'select' ? 'default' : 'crosshair'

  const isAnnot = ['rect', 'line', 'text', 'number'].includes(t)
  document.getElementById('grpColor').classList.toggle('hidden', !isAnnot)
  document.getElementById('grpThickness').classList.toggle('hidden', !['rect', 'line'].includes(t))
  document.getElementById('grpLineStyle').classList.toggle('hidden', t !== 'line')
  document.getElementById('grpCaps').classList.toggle('hidden', t !== 'line')
  document.getElementById('grpFont').classList.toggle('hidden', t !== 'text')

  renderAnnotations()
}

// ─── Image loading ────────────────────────────────────────────────────────────

ipcRenderer.on('load-image', (_, path) => {
  imgPath = path
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

// ─── Canvas sizing ────────────────────────────────────────────────────────────

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

// Re-fit when window is resized
const ro = new ResizeObserver(() => {
  if (!imgElement) return
  fitCanvas()
  drawBase()
  renderAnnotations()
})
ro.observe(canvasArea)

// ─── Coordinate helpers ───────────────────────────────────────────────────────

// Mouse event → image-space coordinates
function evToImg(e) {
  const r = annotCanvas.getBoundingClientRect()
  return {
    x: (e.clientX - r.left) / viewScale,
    y: (e.clientY - r.top)  / viewScale,
  }
}

// image-space value → canvas display pixels
function c(v) { return v * viewScale }

// ─── Annotation IDs ───────────────────────────────────────────────────────────

let _annId = 0
function newId() { return `a${++_annId}` }

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderAnnotations() {
  const ctx = annotCtx
  ctx.clearRect(0, 0, annotCanvas.width, annotCanvas.height)

  annotations.forEach(a => drawOne(ctx, a))

  // Live preview while dragging out a shape
  if (isDrawing && drawStart && drawCurrent) {
    const preview = buildPreview()
    if (preview) {
      ctx.save(); ctx.globalAlpha = 0.65
      drawOne(ctx, preview)
      ctx.restore()
    }
  }

  // Selection indicator
  if (selectedId) {
    const a = annotations.find(x => x.id === selectedId)
    if (a) drawSelection(ctx, a)
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

// --- rect ---
function drawRect(ctx, a) {
  ctx.strokeRect(c(a.x), c(a.y), c(a.w), c(a.h))
}

// --- line ---
function drawLine(ctx, a) {
  const x1 = c(a.x1), y1 = c(a.y1), x2 = c(a.x2), y2 = c(a.y2)
  const capSz = (a.thickness * 4 + 8) * viewScale

  ctx.beginPath()
  if (a.lineStyle === 'dashed') ctx.setLineDash([capSz * 1.2, capSz * 0.7])
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.setLineDash([])

  drawCap(ctx, a.startCap, x2, y2, x1, y1, a.color, capSz)
  drawCap(ctx, a.endCap,   x1, y1, x2, y2, a.color, capSz)
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
    ctx.closePath()
    ctx.fill()
  } else if (type === 'dot') {
    ctx.beginPath()
    ctx.arc(tx, ty, sz * 0.42, 0, Math.PI * 2)
    ctx.fill()
  }
}

// --- text ---
function drawText(ctx, a) {
  const fs = a.fontSize * viewScale
  ctx.font = `${fs}px -apple-system, "Helvetica Neue", sans-serif`
  ctx.fillStyle   = a.color
  ctx.textAlign   = 'left'
  ctx.textBaseline = 'top'
  a.content.split('\n').forEach((line, i) => {
    ctx.fillText(line, c(a.x), c(a.y) + i * fs * 1.25)
  })
}

// --- number marker ---
function drawNumber(ctx, a) {
  const cx = c(a.x), cy = c(a.y)
  const r  = 14 * viewScale
  ctx.fillStyle = a.color
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = (a.color === '#ffffff' || a.color === '#ffcc00') ? '#1c1c1e' : '#fff'
  ctx.font = `bold ${Math.round(13 * viewScale)}px -apple-system`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(a.value), cx, cy)
}

// --- selection outline ---
function drawSelection(ctx, a) {
  const b = bounds(a)
  if (!b) return
  ctx.save()
  ctx.strokeStyle = '#4a9eff'
  ctx.lineWidth   = 1.5
  ctx.setLineDash([5, 3])
  ctx.strokeRect(c(b.x) - 5, c(b.y) - 5, c(b.w) + 10, c(b.h) + 10)
  ctx.restore()
}

// ─── Annotation factories ─────────────────────────────────────────────────────

function buildPreview() {
  const base = { id: '_preview', color, thickness }
  const s = drawStart, e = drawCurrent
  if (tool === 'rect') {
    return { ...base, type: 'rect',
      x: Math.min(s.x, e.x), y: Math.min(s.y, e.y),
      w: Math.abs(e.x - s.x), h: Math.abs(e.y - s.y) }
  }
  if (tool === 'line') {
    return { ...base, type: 'line',
      x1: s.x, y1: s.y, x2: e.x, y2: e.y, lineStyle, startCap, endCap }
  }
  return null
}

function commitShape(start, end) {
  const base = { id: newId(), color, thickness }
  if (tool === 'rect') {
    const w = Math.abs(end.x - start.x), h = Math.abs(end.y - start.y)
    if (w < 2 || h < 2) return null
    return { ...base, type: 'rect',
      x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), w, h }
  }
  if (tool === 'line') {
    const dx = end.x - start.x, dy = end.y - start.y
    if (Math.hypot(dx, dy) < 2) return null
    return { ...base, type: 'line',
      x1: start.x, y1: start.y, x2: end.x, y2: end.y, lineStyle, startCap, endCap }
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
    selectedId = null
    // Recalculate numCount to max existing value + 1
    recalcNumCount()
    renderAnnotations()
  }
}

function redo() {
  if (historyIdx < history.length - 1) {
    historyIdx++
    annotations = JSON.parse(JSON.stringify(history[historyIdx]))
    selectedId = null
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
      const minX = Math.min(a.x1, a.x2), maxX = Math.max(a.x1, a.x2)
      const minY = Math.min(a.y1, a.y2), maxY = Math.max(a.y1, a.y2)
      return { x: minX, y: minY, w: Math.max(maxX - minX, 1), h: Math.max(maxY - minY, 1) }
    }
    case 'text': {
      const lines = a.content.split('\n')
      const maxLen = lines.reduce((m, l) => Math.max(m, l.length), 0)
      return { x: a.x, y: a.y, w: maxLen * a.fontSize * 0.58, h: lines.length * a.fontSize * 1.25 }
    }
    case 'number': return { x: a.x - 15, y: a.y - 15, w: 30, h: 30 }
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
  for (let i = annotations.length - 1; i >= 0; i--) {
    if (hits(pos, annotations[i])) return annotations[i]
  }
  return null
}

// ─── Mouse events ─────────────────────────────────────────────────────────────

annotCanvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return
  const pos = evToImg(e)

  if (tool === 'select') {
    const hit = findAt(pos)
    if (hit) {
      selectedId   = hit.id
      isDragging   = true
      hasDragged   = false
      lastMousePos = pos
    } else {
      selectedId = null
    }
    renderAnnotations()
    return
  }

  if (tool === 'number') {
    pushHistory()
    annotations.push({ id: newId(), type: 'number', color, thickness,
                       x: pos.x, y: pos.y, value: numCount++ })
    renderAnnotations()
    return
  }

  if (tool === 'text') {
    commitText()
    showTextInput(pos)
    return
  }

  // rect / line
  isDrawing   = true
  drawStart   = pos
  drawCurrent = pos
})

annotCanvas.addEventListener('mousemove', e => {
  const pos = evToImg(e)

  if (isDragging && selectedId) {
    if (lastMousePos) {
      const dx = pos.x - lastMousePos.x
      const dy = pos.y - lastMousePos.y
      const a = annotations.find(x => x.id === selectedId)
      if (a) { moveAnnot(a, dx, dy); hasDragged = true }
    }
    lastMousePos = pos
    renderAnnotations()
    return
  }

  if (isDrawing) {
    drawCurrent = pos
    renderAnnotations()
  }
})

// Global mouseup so drag works even outside canvas
document.addEventListener('mouseup', e => {
  if (isDragging) {
    isDragging = false
    if (hasDragged) pushHistory()
    return
  }

  if (!isDrawing) return
  isDrawing = false

  const end = evToImg(e)
  const ann = commitShape(drawStart, end)
  if (ann) {
    pushHistory()
    annotations.push(ann)
  }
  renderAnnotations()
})

function moveAnnot(a, dx, dy) {
  switch (a.type) {
    case 'rect':
    case 'text':
    case 'number': a.x += dx; a.y += dy; break
    case 'line': a.x1 += dx; a.y1 += dy; a.x2 += dx; a.y2 += dy; break
  }
}

// ─── Text input ───────────────────────────────────────────────────────────────

function showTextInput(pos) {
  textActive = true
  textPos    = pos

  const cx = c(pos.x), cy = c(pos.y)
  const fs = fontSize * viewScale

  textInputEl.style.left      = cx + 'px'
  textInputEl.style.top       = cy + 'px'
  textInputEl.style.fontSize  = fs + 'px'
  textInputEl.style.color     = color
  textInputEl.style.lineHeight = '1.25'
  textInputEl.value           = ''

  textInputWrap.classList.remove('hidden')
  setTimeout(() => textInputEl.focus(), 10)
}

function commitText() {
  if (!textActive) return
  const content = textInputEl.value
  if (content.trim()) {
    pushHistory()
    annotations.push({ id: newId(), type: 'text', color, fontSize,
                       x: textPos.x, y: textPos.y, content })
    renderAnnotations()
  }
  textActive = false
  textPos    = null
  textInputWrap.classList.add('hidden')
  textInputEl.value = ''
}

textInputEl.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    textActive = false
    textInputWrap.classList.add('hidden')
    e.stopPropagation()
    return
  }
  // Shift+Enter → new line; bare Enter → commit
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    commitText()
  }
})

// Auto-expand textarea height as user types
textInputEl.addEventListener('input', () => {
  textInputEl.style.height = 'auto'
  textInputEl.style.height = textInputEl.scrollHeight + 'px'
})

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (textActive) return   // let textarea handle keys

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
      commitText()
      renderAnnotations()
      break
    case 'Delete':
    case 'Backspace':
      if (selectedId) {
        pushHistory()
        annotations = annotations.filter(a => a.id !== selectedId)
        selectedId  = null
        renderAnnotations()
      }
      break
  }
})

// ─── Save ─────────────────────────────────────────────────────────────────────

const saveModal      = document.getElementById('saveModal')
const saveModalClose = document.getElementById('saveModalClose')
const btnSave        = document.getElementById('btnSave')
const btnSaveCancel  = document.getElementById('btnSaveCancel')
const btnSaveConfirm = document.getElementById('btnSaveConfirm')

function openSaveModal() {
  commitText()
  saveModal.classList.remove('hidden')
}

btnSave.addEventListener('click', openSaveModal)
saveModalClose.addEventListener('click', () => saveModal.classList.add('hidden'))
btnSaveCancel.addEventListener('click',  () => saveModal.classList.add('hidden'))
saveModal.addEventListener('click', e => { if (e.target === saveModal) saveModal.classList.add('hidden') })

btnSaveConfirm.addEventListener('click', async () => {
  saveModal.classList.add('hidden')
  const format  = document.querySelector('input[name="fmt"]:checked').value
  const dataURL = burnIn(format)
  const result  = await ipcRenderer.invoke('save-image-as', { dataURL, format })
  if (result?.success) showToast(`已儲存：${result.path.split('/').pop()}`)
})

// Burn all annotations onto the image at full original resolution
function burnIn(format) {
  const off = document.createElement('canvas')
  off.width  = imgWidth
  off.height = imgHeight
  const ctx  = off.getContext('2d')

  // Draw original image
  ctx.drawImage(imgElement, 0, 0, imgWidth, imgHeight)

  // Draw annotations at scale = 1 (image pixel space)
  const saved = viewScale
  viewScale   = 1
  annotations.forEach(a => drawOne(ctx, a))
  viewScale = saved

  const mime = format === 'jpg' ? 'image/jpeg'
             : format === 'webp' ? 'image/webp'
             : 'image/png'
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
