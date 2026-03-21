const { ipcRenderer } = require('electron')

// ─── Help modal ───────────────────────────────────────────────────────────────

const helpBtn   = document.getElementById('helpBtn')
const helpModal = document.getElementById('helpModal')
const modalClose = document.getElementById('modalClose')

helpBtn.addEventListener('click', () => helpModal.classList.remove('hidden'))
modalClose.addEventListener('click', () => helpModal.classList.add('hidden'))
helpModal.addEventListener('click', (e) => {
  if (e.target === helpModal) helpModal.classList.add('hidden')
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') helpModal.classList.add('hidden')
})

// ─── Toast notification ───────────────────────────────────────────────────────

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast')
  toast.textContent = msg
  toast.classList.toggle('toast-error', isError)
  toast.classList.add('visible')
  setTimeout(() => toast.classList.remove('visible'), 2400)
}

// ─── Capture: full screen ─────────────────────────────────────────────────────

async function doFullscreen() {
  const result = await ipcRenderer.invoke('capture-fullscreen')
  if (result.success) {
    showToast(`已複製到剪貼簿  ${result.width} × ${result.height} px`)
  } else {
    showToast(result.error ?? '截圖失敗', true)
  }
}

// ─── Capture: rectangle ───────────────────────────────────────────────────────

async function doRect() {
  await ipcRenderer.invoke('open-overlay')
  // Result arrives via 'capture-done' or 'capture-cancelled'
}

// ─── Shortcut events from main process ───────────────────────────────────────

ipcRenderer.on('shortcut-fullscreen', doFullscreen)
ipcRenderer.on('shortcut-rect',       doRect)

// ─── Capture result callbacks ─────────────────────────────────────────────────
// (overlay calls capture-rect IPC directly; main process sends result back
//  by showing the window — we listen for a focus event to confirm success)
// For now, capture-rect resolves in main.js; renderer shows toast via
// a dedicated channel when the window regains focus after capture.

ipcRenderer.on('capture-result', (_, result) => {
  if (result.success) {
    showToast(`已複製到剪貼簿  ${result.width} × ${result.height} px`)
  } else {
    showToast(result.error ?? '截圖失敗', true)
  }
})

// ─── Button wiring ────────────────────────────────────────────────────────────

document.getElementById('btnFullscreen').addEventListener('click', doFullscreen)

document.getElementById('btnRect').addEventListener('click', doRect)

document.getElementById('btnWindow').addEventListener('click', () => {
  showToast('視窗截圖即將推出')
})

document.getElementById('btnWebCapture').addEventListener('click', () => {
  showToast('網頁截圖即將推出')
})

document.getElementById('btnOpenImage').addEventListener('click', () => {
  showToast('開啟圖片即將推出')
})
