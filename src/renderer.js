const { ipcRenderer } = require('electron')

// ─── Modal resize helpers ──────────────────────────────────────────────────────

async function expandForModal(width, height) {
  await ipcRenderer.invoke('resize-for-modal', { width, height })
}

function collapseToToolbar() {
  ipcRenderer.invoke('resize-to-toolbar')
}

// ─── Help modal ───────────────────────────────────────────────────────────────

const helpBtn    = document.getElementById('helpBtn')
const helpModal  = document.getElementById('helpModal')
const modalClose = document.getElementById('modalClose')

helpBtn.addEventListener('click', async () => {
  await expandForModal(560, 480)
  helpModal.classList.remove('hidden')
})

function closeHelp() {
  helpModal.classList.add('hidden')
  collapseToToolbar()
}

modalClose.addEventListener('click', closeHelp)
helpModal.addEventListener('click', (e) => {
  if (e.target === helpModal) closeHelp()
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeHelp()
    hideWindowPicker()
    closeBatch()
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
  if (!result.awaitingSelection) handleCaptureResult(result)
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
  collapseToToolbar()
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

  await expandForModal(760, 540)
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

ipcRenderer.on('capture-result', (_, result) => handleCaptureResult(result))

// ─── Button wiring ────────────────────────────────────────────────────────────

document.getElementById('btnFullscreen').addEventListener('click', doFullscreen)
document.getElementById('btnRect').addEventListener('click', doRect)
document.getElementById('btnWindow').addEventListener('click', doWindow)

document.getElementById('btnWebCapture').addEventListener('click', () => {
  showToast('網頁截圖即將推出')
})

document.getElementById('btnOpenImage').addEventListener('click', () => {
  ipcRenderer.invoke('open-image-file')
})

// ─── Batch conversion ─────────────────────────────────────────────────────────

let batchFiles       = []
let selectedOutputDir = null
let batchRunning     = false

const batchModal = document.getElementById('batchModal')

document.getElementById('btnBatch').addEventListener('click', async () => {
  await expandForModal(560, 620)
  batchModal.classList.remove('hidden')
})

function closeBatch() {
  if (batchRunning) return   // don't close during conversion
  batchModal.classList.add('hidden')
  collapseToToolbar()
}

document.getElementById('batchModalClose').addEventListener('click', closeBatch)
batchModal.addEventListener('click', (e) => {
  if (e.target === batchModal) closeBatch()
})

// ── File selection ──────────────────────────────────────────────────────────

async function pickBatchFiles() {
  const files = await ipcRenderer.invoke('select-batch-files')
  addBatchFiles(files)
}

document.getElementById('batchSelectBtn').addEventListener('click', pickBatchFiles)
document.getElementById('batchAddMoreBtn').addEventListener('click', pickBatchFiles)

// Drag and drop
const dropzone = document.getElementById('batchDropzone')
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault()
  dropzone.classList.add('drag-over')
})
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'))
dropzone.addEventListener('drop', (e) => {
  e.preventDefault()
  dropzone.classList.remove('drag-over')
  const paths = Array.from(e.dataTransfer.files)
    .filter(f => /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name))
    .map(f => f.path)
  addBatchFiles(paths)
})

function addBatchFiles(newPaths) {
  const existing = new Set(batchFiles)
  for (const p of newPaths) {
    if (!existing.has(p)) batchFiles.push(p)
  }
  renderFileList()
  updateConditionalRows()
}

function renderFileList() {
  const scroll     = document.getElementById('filelistScroll')
  const countEl    = document.getElementById('filelistCount')
  const fileListEl = document.getElementById('batchFileList')
  const dropzoneEl = document.getElementById('batchDropzone')

  if (batchFiles.length === 0) {
    fileListEl.classList.add('hidden')
    dropzoneEl.classList.remove('hidden')
    return
  }

  fileListEl.classList.remove('hidden')
  dropzoneEl.classList.add('hidden')

  scroll.innerHTML = ''
  batchFiles.forEach((p, i) => {
    const name = p.split('/').pop()
    const item = document.createElement('div')
    item.className = 'file-item'
    item.innerHTML = `<span class="file-name" title="${p}">${name}</span><button class="file-remove" data-idx="${i}">✕</button>`
    item.querySelector('.file-remove').addEventListener('click', () => {
      batchFiles.splice(i, 1)
      renderFileList()
      updateConditionalRows()
    })
    scroll.appendChild(item)
  })

  countEl.textContent = `共 ${batchFiles.length} 個檔案`
}

// ── Conditional row visibility ─────────────────────────────────────────────

function updateConditionalRows() {
  const fmt    = document.getElementById('batchFormat').value
  const hasSvg = batchFiles.some(p => /\.svg$/i.test(p))

  document.getElementById('qualityRow').classList.toggle('hidden', fmt !== 'jpg' && fmt !== 'webp')
  document.getElementById('svgWidthRow').classList.toggle('hidden', !hasSvg)
}

document.getElementById('batchFormat').addEventListener('change', updateConditionalRows)

// ── Resize toggle ───────────────────────────────────────────────────────────

document.getElementById('batchResizeCheck').addEventListener('change', (e) => {
  document.getElementById('resizeOptions').classList.toggle('hidden', !e.target.checked)
})

// ── Output mode ─────────────────────────────────────────────────────────────

document.querySelectorAll('input[name="outputMode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const isCustom = radio.value === 'custom' && radio.checked
    document.getElementById('batchDirBtn').classList.toggle('hidden', !isCustom)
    document.getElementById('batchDirPath').classList.toggle('hidden', !isCustom)
  })
})

document.getElementById('batchDirBtn').addEventListener('click', async () => {
  const dir = await ipcRenderer.invoke('select-output-dir')
  if (dir) {
    selectedOutputDir = dir
    const pathEl = document.getElementById('batchDirPath')
    pathEl.textContent = dir.split('/').pop() || dir
    pathEl.title = dir
  }
})

// ── Same-format warning ─────────────────────────────────────────────────────

function normExt(p) {
  const e = p.split('.').pop().toLowerCase()
  return e === 'jpeg' ? 'jpg' : e
}

function showWarning(sameFiles) {
  const warning = document.getElementById('batchWarning')
  document.getElementById('warningFiles').textContent =
    sameFiles.map(p => p.split('/').pop()).join('、')
  warning.classList.remove('hidden')
}

function hideWarning() {
  document.getElementById('batchWarning').classList.add('hidden')
}

document.getElementById('warnCancelBtn').addEventListener('click', hideWarning)

document.getElementById('warnSkipBtn').addEventListener('click', () => {
  hideWarning()
  const fmt = document.getElementById('batchFormat').value
  const toConvert = batchFiles.filter(p => normExt(p) !== fmt)
  runConversion(toConvert)
})

// ── Start button ────────────────────────────────────────────────────────────

document.getElementById('batchStartBtn').addEventListener('click', () => {
  if (batchRunning) return

  if (batchFiles.length === 0) {
    showToast('請先選取要轉換的檔案', true)
    return
  }

  const fmt        = document.getElementById('batchFormat').value
  const outputMode = document.querySelector('input[name="outputMode"]:checked').value

  if (outputMode === 'custom' && !selectedOutputDir) {
    showToast('請先選擇輸出目錄', true)
    return
  }

  hideWarning()

  // Detect same-format files
  const sameFiles = batchFiles.filter(p => normExt(p) === fmt)
  if (sameFiles.length > 0) {
    showWarning(sameFiles)
    return
  }

  runConversion(batchFiles)
})

// ── Conversion runner ───────────────────────────────────────────────────────

async function runConversion(files) {
  if (files.length === 0) {
    showToast('沒有可轉換的檔案', true)
    return
  }

  batchRunning = true
  const startBtn = document.getElementById('batchStartBtn')
  startBtn.disabled = true

  const progressSection = document.getElementById('batchProgressSection')
  const progressFill    = document.getElementById('progressFill')
  const progressMeta    = document.getElementById('progressMeta')
  const progressLog     = document.getElementById('progressLog')

  progressSection.classList.remove('hidden')
  progressFill.style.width = '0%'
  progressMeta.textContent = `0 / ${files.length}`
  progressLog.innerHTML = ''

  const onProgress = (_, data) => {
    const pct = Math.round((data.done / data.total) * 100)
    progressFill.style.width = `${pct}%`
    progressMeta.textContent = `${data.done} / ${data.total}`

    const item = document.createElement('div')
    const srcName = data.path.split('/').pop()
    if (data.success) {
      const outName = data.outPath.split('/').pop()
      item.className = 'log-item log-ok'
      item.textContent = `✓ ${srcName} → ${outName}`
    } else {
      item.className = 'log-item log-err'
      item.textContent = `✗ ${srcName}：${data.error}`
    }
    progressLog.appendChild(item)
    progressLog.scrollTop = progressLog.scrollHeight
  }

  ipcRenderer.on('batch-progress', onProgress)

  const fmt        = document.getElementById('batchFormat').value
  const quality    = parseInt(document.getElementById('batchQuality').value, 10) || 90
  const svgWidth   = parseInt(document.getElementById('batchSvgWidth').value, 10) || 1920
  const resizeOn   = document.getElementById('batchResizeCheck').checked
  const resize     = resizeOn ? {
    axis:  document.getElementById('batchResizeAxis').value,
    value: parseInt(document.getElementById('batchResizeValue').value, 10) || 600
  } : null
  const outputMode      = document.querySelector('input[name="outputMode"]:checked').value
  const deleteOriginals = document.getElementById('batchDeleteCheck').checked

  const results = await ipcRenderer.invoke('batch-convert', {
    files, format: fmt, quality, svgWidth, resize,
    outputMode, outputDir: selectedOutputDir, deleteOriginals
  })

  ipcRenderer.removeListener('batch-progress', onProgress)

  batchRunning = false
  startBtn.disabled = false

  const ok  = results.filter(r => r.success).length
  const err = results.length - ok
  if (err > 0) {
    // 只保留失敗的檔案，方便重試
    const failedPaths = results.filter(r => !r.success).map(r => r.path)
    batchFiles = batchFiles.filter(p => failedPaths.includes(p))
    renderFileList()
    updateConditionalRows()
    showToast(`完成：${ok} 個成功，${err} 個失敗`, true)
  } else {
    // 全部成功 → 清空佇列
    batchFiles = []
    renderFileList()
    updateConditionalRows()
    showToast(`已轉換 ${ok} 個檔案`)
  }
}
