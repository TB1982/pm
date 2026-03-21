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
  if (e.key === 'Escape') {
    helpModal.classList.add('hidden')
    hideWindowPicker()
  }
})

// ─── Toast notification ───────────────────────────────────────────────────────

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast')
  toast.innerHTML = ''
  const span = document.createElement('span')
  span.textContent = msg
  toast.appendChild(span)
  toast.classList.toggle('toast-error', isError)
  toast.classList.remove('toast-permission')
  toast.classList.add('visible')
  setTimeout(() => toast.classList.remove('visible'), 2400)
}

function showPermissionToast() {
  const toast = document.getElementById('toast')
  toast.innerHTML = ''

  const msg = document.createElement('span')
  msg.textContent = '需要「螢幕錄製」權限  '

  const btn = document.createElement('button')
  btn.textContent = '開啟系統設定'
  btn.className = 'toast-btn'
  btn.addEventListener('click', () => {
    ipcRenderer.invoke('open-permission-settings')
    toast.classList.remove('visible')
  })

  toast.appendChild(msg)
  toast.appendChild(btn)
  toast.classList.add('toast-permission', 'visible')
  toast.classList.remove('toast-error')
  setTimeout(() => toast.classList.remove('visible'), 8000)
}

function handleCaptureResult(result) {
  if (result.success) {
    showToast(`已複製到剪貼簿  ${result.width} × ${result.height} px`)
  } else if (result.needsPermission) {
    showPermissionToast()
  } else {
    showToast(result.error ?? '截圖失敗', true)
  }
}

// ─── Capture: full screen ─────────────────────────────────────────────────────

async function doFullscreen() {
  const result = await ipcRenderer.invoke('capture-fullscreen')
  handleCaptureResult(result)
}

// ─── Capture: window picker ───────────────────────────────────────────────────

const windowPickerModal = document.getElementById('windowPickerModal')
const windowPickerClose = document.getElementById('windowPickerClose')
const windowPickerGrid  = document.getElementById('windowPickerGrid')

windowPickerClose.addEventListener('click', hideWindowPicker)
windowPickerModal.addEventListener('click', (e) => {
  if (e.target === windowPickerModal) hideWindowPicker()
})

function hideWindowPicker() {
  windowPickerModal.classList.add('hidden')
}

async function doWindow() {
  const sources = await ipcRenderer.invoke('get-window-sources')
  if (!sources || sources.length === 0) {
    showToast('未找到可截圖的視窗', true)
    return
  }

  windowPickerGrid.innerHTML = ''
  sources.forEach(source => {
    const card = document.createElement('button')
    card.className = 'win-card'
    card.innerHTML = `
      <img class="win-thumb" src="${source.thumbnail}" alt="">
      <span class="win-name">${source.name}</span>
    `
    card.addEventListener('click', async () => {
      hideWindowPicker()
      const result = await ipcRenderer.invoke('capture-window', source.id)
      handleCaptureResult(result)
    })
    windowPickerGrid.appendChild(card)
  })
  windowPickerModal.classList.remove('hidden')
}

// ─── Capture: rectangle ───────────────────────────────────────────────────────

async function doRect() {
  const result = await ipcRenderer.invoke('open-overlay')
  if (result?.needsPermission) showPermissionToast()
}

// ─── Shortcut events from main process ───────────────────────────────────────

ipcRenderer.on('shortcut-fullscreen', doFullscreen)
ipcRenderer.on('shortcut-window',     doWindow)
ipcRenderer.on('shortcut-rect',       doRect)

// ─── Capture result callbacks ─────────────────────────────────────────────────
// (overlay calls capture-rect IPC directly; main process sends result back
//  by showing the window — we listen for a focus event to confirm success)
// For now, capture-rect resolves in main.js; renderer shows toast via
// a dedicated channel when the window regains focus after capture.

ipcRenderer.on('capture-result', (_, result) => handleCaptureResult(result))

// ─── Button wiring ────────────────────────────────────────────────────────────

document.getElementById('btnFullscreen').addEventListener('click', doFullscreen)

document.getElementById('btnRect').addEventListener('click', doRect)

document.getElementById('btnWindow').addEventListener('click', doWindow)

document.getElementById('btnWebCapture').addEventListener('click', () => {
  showToast('網頁截圖即將推出')
})

document.getElementById('btnOpenImage').addEventListener('click', () => {
  showToast('開啟圖片即將推出')
})
