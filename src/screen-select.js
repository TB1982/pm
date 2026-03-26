const { invoke: ipcInvoke, on: ipcOn } = window.electronAPI

const canvas = document.getElementById('canvas')
const ctx    = canvas.getContext('2d')

canvas.width  = window.innerWidth
canvas.height = window.innerHeight

let hovered      = false
let displayIndex = 0
let totalDisplays = 1

// ─── Init data from main process ─────────────────────────────────────────────

ipcOn('screen-select-init', (data) => {
  displayIndex  = data.index
  totalDisplays = data.total
  draw()
})

// ─── Drawing ──────────────────────────────────────────────────────────────────

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Dark overlay
  ctx.fillStyle = hovered ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.55)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Border — bright when hovered, dim otherwise
  const borderW = hovered ? 4 : 2
  ctx.strokeStyle = hovered ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.35)'
  ctx.lineWidth = borderW
  ctx.strokeRect(borderW / 2, borderW / 2, canvas.width - borderW, canvas.height - borderW)

  // Labels
  const cx = canvas.width  / 2
  const cy = canvas.height / 2

  if (hovered) {
    // Primary action
    ctx.font      = 'bold 28px -apple-system, "Helvetica Neue", sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.textAlign = 'center'
    ctx.fillText('點擊截取此螢幕', cx, cy - 24)

    // Secondary hints
    ctx.font      = '16px -apple-system, "Helvetica Neue", sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.70)'
    if (totalDisplays > 1) {
      ctx.fillText('Enter — 截取全部螢幕並合併　　Esc — 取消', cx, cy + 20)
    } else {
      ctx.fillText('Esc — 取消', cx, cy + 20)
    }
  } else {
    // Dim label when not hovered
    ctx.font      = '18px -apple-system, "Helvetica Neue", sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.textAlign = 'center'
    ctx.fillText(`螢幕 ${displayIndex + 1}`, cx, cy)
  }
}

// ─── Mouse events ─────────────────────────────────────────────────────────────

canvas.addEventListener('mouseenter', () => { hovered = true;  draw() })
canvas.addEventListener('mouseleave', () => { hovered = false; draw() })

canvas.addEventListener('click', () => {
  ipcInvoke('capture-selected-screen')
})

// ─── Keyboard events ──────────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter')  ipcInvoke('capture-all-screens-merged')
  if (e.key === 'Escape') ipcInvoke('cancel-screen-select')
})

// Initial draw
draw()
