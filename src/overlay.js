const { ipcRenderer } = require('electron')

const canvas = document.getElementById('canvas')
const ctx    = canvas.getContext('2d')

canvas.width  = window.screen.width
canvas.height = window.screen.height

let isDrawing = false
let startX = 0, startY = 0, endX = 0, endY = 0

// ─── Drawing ──────────────────────────────────────────────────────────────────

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (!isDrawing) {
    // Before first drag: solid dark overlay + crosshair hint
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    return
  }

  const x = Math.min(startX, endX)
  const y = Math.min(startY, endY)
  const w = Math.abs(endX - startX)
  const h = Math.abs(endY - startY)

  // Four dark panels around the selection
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.fillRect(0, 0, canvas.width, y)
  ctx.fillRect(0, y + h, canvas.width, canvas.height - y - h)
  ctx.fillRect(0, y, x, h)
  ctx.fillRect(x + w, y, canvas.width - x - w, h)

  // Selection border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)

  // Corner handles
  drawHandles(x, y, w, h)

  // Dimension label (bottom-right of selection)
  if (w > 30 && h > 30) drawLabel(x, y, w, h)
}

function drawHandles(x, y, w, h) {
  const len = 8
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  const corners = [
    [x, y,         1,  1],
    [x + w, y,    -1,  1],
    [x, y + h,     1, -1],
    [x + w, y + h,-1, -1]
  ]
  corners.forEach(([cx, cy, dx, dy]) => {
    ctx.beginPath()
    ctx.moveTo(cx + dx * len, cy)
    ctx.lineTo(cx, cy)
    ctx.lineTo(cx, cy + dy * len)
    ctx.stroke()
  })
}

function drawLabel(x, y, w, h) {
  const label = `${w} × ${h} px`
  ctx.font = '12px -apple-system, "Helvetica Neue", sans-serif'
  const tw = ctx.measureText(label).width
  const pad = 8
  const bw = tw + pad * 2
  const bh = 22

  // Prefer bottom-right corner of selection; nudge inward if off-screen
  let lx = x + w - bw - 4
  let ly = y + h + 6
  if (lx < 2) lx = 2
  if (lx + bw > canvas.width - 2)  lx = canvas.width  - bw - 2
  if (ly + bh > canvas.height - 2) ly = y + h - bh - 6 // flip above if no room

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)'
  roundRect(ctx, lx, ly, bw, bh, 5)
  ctx.fill()

  // Text
  ctx.fillStyle = '#ffffff'
  ctx.fillText(label, lx + pad, ly + 15)
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

// ─── Mouse events ─────────────────────────────────────────────────────────────

canvas.addEventListener('mousedown', (e) => {
  isDrawing = true
  startX = endX = e.clientX
  startY = endY = e.clientY
  draw()
})

canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return
  endX = e.clientX
  endY = e.clientY
  draw()
})

canvas.addEventListener('mouseup', (e) => {
  if (!isDrawing) return
  isDrawing = false
  endX = e.clientX
  endY = e.clientY

  const x = Math.min(startX, endX)
  const y = Math.min(startY, endY)
  const w = Math.abs(endX - startX)
  const h = Math.abs(endY - startY)

  if (w < 5 || h < 5) {
    ipcRenderer.invoke('cancel-overlay')
    return
  }

  ipcRenderer.invoke('capture-rect', { x, y, width: w, height: h })
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') ipcRenderer.invoke('cancel-overlay')
})

// Initial draw
draw()
