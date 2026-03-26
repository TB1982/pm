// electronAPI injected by preload-toolbar.js; t/applyI18n come from i18n.js loaded via <script>
const { invoke: ipcInvoke, on: ipcOn, removeListener: ipcRemoveListener } = window.electronAPI

applyI18n()

// ─── Modal resize helpers ──────────────────────────────────────────────────────

async function expandForModal(width, height) {
  await ipcInvoke('resize-for-modal', { width, height })
}

function collapseToToolbar() {
  ipcInvoke('resize-to-toolbar')
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
    cancelCountdown()
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
  msg.textContent = t('toast_permission')

  const btn = document.createElement('button')
  btn.textContent = t('toast_open_settings')
  btn.className = 'toast-btn'
  btn.addEventListener('click', () => {
    ipcInvoke('open-permission-settings')
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
    showToast(t('toast_copied', result.width, result.height))
  } else if (result.needsPermission) {
    showPermissionToast()
  } else {
    showToast(result.error ?? t('toast_capture_fail'), true)
  }
}

// ─── Capture: full screen ─────────────────────────────────────────────────────

async function doFullscreen() {
  const result = await ipcInvoke('capture-fullscreen')
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
  const sources = await ipcInvoke('get-window-sources')
  if (!sources || sources.length === 0) {
    showToast(t('toast_no_windows'), true)
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
      const result = await ipcInvoke('capture-window', source.id)
      handleCaptureResult(result)
    })
    windowPickerGrid.appendChild(card)
  })

  await expandForModal(760, 540)
  windowPickerModal.classList.remove('hidden')
}

// ─── Capture: rectangle ───────────────────────────────────────────────────────

async function doRect() {
  const result = await ipcInvoke('open-overlay')
  if (result?.needsPermission) showPermissionToast()
}

// ─── Shortcut events from main process ───────────────────────────────────────

ipcOn('shortcut-fullscreen', () => delayedAction(doFullscreen))
ipcOn('shortcut-window',     doWindow)
ipcOn('shortcut-rect',       () => delayedAction(doRect))

// ─── Capture result callbacks ─────────────────────────────────────────────────

ipcOn('capture-result', (result) => handleCaptureResult(result))

// ─── Button wiring ────────────────────────────────────────────────────────────

// 工具列高亮（一次只有一個按鈕呈現 active 狀態）
function setToolbarActive(btn) {
  document.querySelectorAll('.tb-btn').forEach(b => b.classList.remove('tb-btn-highlight'))
  btn.classList.add('tb-btn-highlight')
}

document.getElementById('btnFullscreen').addEventListener('click', e => { setToolbarActive(e.currentTarget); delayedAction(doFullscreen) })
document.getElementById('btnRect').addEventListener('click',       e => { setToolbarActive(e.currentTarget); delayedAction(doRect) })
document.getElementById('btnWindow').addEventListener('click',     e => { setToolbarActive(e.currentTarget); doWindow() })

// ─── Delay setting ────────────────────────────────────────────────────────────

const DELAY_KEY      = 'delayCaptureSecs'
const delaySelect    = document.getElementById('delaySelect')
const countdownOverlay = document.getElementById('countdownOverlay')
const countdownNum   = document.getElementById('countdownNum')

delaySelect.value = localStorage.getItem(DELAY_KEY) || '0'
delaySelect.addEventListener('change', () => localStorage.setItem(DELAY_KEY, delaySelect.value))

let countdownTimer = null

function cancelCountdown() {
  if (countdownTimer === null) return
  clearTimeout(countdownTimer)
  countdownTimer = null
  countdownOverlay.classList.add('hidden')
}

// Run fn() after the configured delay (0 = immediate)
function delayedAction(fn) {
  if (countdownTimer !== null) return   // already counting
  const secs = parseInt(delaySelect.value, 10)
  if (secs === 0) { fn(); return }

  let remaining = secs
  countdownOverlay.classList.remove('hidden')

  function tick() {
    if (remaining <= 0) {
      countdownTimer = null
      countdownOverlay.classList.add('hidden')
      fn()
      return
    }
    countdownNum.textContent = String(remaining)
    remaining--
    countdownTimer = setTimeout(tick, 1000)
  }
  tick()
}

document.getElementById('btnOpenImage').addEventListener('click', e => {
  setToolbarActive(e.currentTarget)
  ipcInvoke('open-image-file')
})

// ─── Batch conversion ─────────────────────────────────────────────────────────

let batchFiles       = []
let selectedOutputDir = null
let batchRunning     = false
let warnPreemptive   = false   // true = warning shown before "開始轉換" was clicked
let wmImgFilePath    = null
let wmPosition       = 'southeast'

const batchModal = document.getElementById('batchModal')

document.getElementById('btnBatch').addEventListener('click', async e => {
  setToolbarActive(e.currentTarget)
  await expandForModal(560, 620)
  batchModal.classList.remove('hidden')
})

function closeBatch() {
  if (batchRunning) return   // don't close during conversion
  batchModal.classList.add('hidden')
  collapseToToolbar()
  // 關閉批次轉後，將 active 歸位到矩形截圖（預設模式）
  setToolbarActive(document.getElementById('btnRect'))
}

document.getElementById('batchModalClose').addEventListener('click', closeBatch)
batchModal.addEventListener('click', (e) => {
  if (e.target === batchModal) closeBatch()
})

// ── File selection ──────────────────────────────────────────────────────────

async function pickBatchFiles() {
  const files = await ipcInvoke('select-batch-files')
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
  updateConditionalRows()   // 內部會呼叫 updateSameFormatWarning
}

function renderFileList() {
  const scroll     = document.getElementById('filelistScroll')
  const countEl    = document.getElementById('filelistCount')
  const fileListEl = document.getElementById('batchFileList')
  const dropzoneEl = document.getElementById('batchDropzone')

  if (batchFiles.length === 0) {
    scroll.innerHTML = ''   // 清除殘留 DOM，否則舊項目仍顯示，造成 guard 誤擋
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
    // 不在這裡綁 listener——由下方事件委派統一處理，避免 re-render 後 listener 失效
    item.innerHTML = `<span class="file-name" title="${p}">${name}</span><button class="file-remove" data-idx="${i}" aria-label="移除 ${name}">✕</button>`
    scroll.appendChild(item)
  })

  countEl.textContent = t('batch_n_files', batchFiles.length)
}

// ✕ 事件委派（一次性綁在容器上，re-render 後仍有效）
document.getElementById('filelistScroll').addEventListener('click', (e) => {
  const btn = e.target.closest('.file-remove')
  if (!btn) return
  const idx = parseInt(btn.dataset.idx, 10)
  if (isNaN(idx) || idx < 0 || idx >= batchFiles.length) return
  batchFiles.splice(idx, 1)
  renderFileList()
  updateConditionalRows()
})

// ── Conditional row visibility ─────────────────────────────────────────────

function updateConditionalRows() {
  const fmt    = document.getElementById('batchFormat').value
  const hasSvg = batchFiles.some(p => /\.svg$/i.test(p))

  document.getElementById('qualityRow').classList.toggle('hidden', fmt !== 'jpg' && fmt !== 'webp')
  document.getElementById('svgWidthRow').classList.toggle('hidden', !hasSvg)
  updateSameFormatWarning()
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
  const dir = await ipcInvoke('select-output-dir')
  if (dir) {
    selectedOutputDir = dir
    const pathEl = document.getElementById('batchDirPath')
    pathEl.textContent = dir.split('/').pop() || dir
    pathEl.title = dir
  }
})

// ── Watermark ────────────────────────────────────────────────────────────────

document.getElementById('batchWatermarkCheck').addEventListener('change', (e) => {
  document.getElementById('watermarkOptions').classList.toggle('hidden', !e.target.checked)
})

document.getElementById('wmTextCheck').addEventListener('change', (e) => {
  document.getElementById('wmTextOpts').classList.toggle('hidden', !e.target.checked)
})

document.getElementById('wmImgCheck').addEventListener('change', (e) => {
  document.getElementById('wmImgOpts').classList.toggle('hidden', !e.target.checked)
})

document.getElementById('wmImgSelectBtn').addEventListener('click', async () => {
  const filePath = await ipcInvoke('select-watermark-image')
  if (filePath) {
    wmImgFilePath = filePath
    const el = document.getElementById('wmImgPath')
    el.textContent = filePath.split(/[\\/]/).pop()
    el.title = filePath
  }
})

document.getElementById('wmGrid').addEventListener('click', (e) => {
  const cell = e.target.closest('.wm-cell')
  if (!cell) return
  document.querySelectorAll('.wm-cell').forEach(c => c.classList.remove('active'))
  cell.classList.add('active')
  wmPosition = cell.dataset.pos
})

// ── Same-format warning ─────────────────────────────────────────────────────

function normExt(p) {
  const e = p.split('.').pop().toLowerCase()
  return e === 'jpeg' ? 'jpg' : e
}

function showWarning(sameFiles, preemptive = false) {
  document.getElementById('warningFiles').textContent =
    sameFiles.map(p => p.split('/').pop()).join('、')
  // 按鈕文字依場景切換
  document.getElementById('warnSkipBtn').textContent =
    preemptive ? t('batch_remove') : t('batch_skip')
  document.getElementById('warnCancelBtn').textContent =
    preemptive ? t('batch_dismiss') : t('batch_cancel_all')
  document.getElementById('batchWarning').classList.remove('hidden')
}

function hideWarning() {
  document.getElementById('batchWarning').classList.add('hidden')
}

// 依目前 batchFiles 與選取格式，主動顯示 / 隱藏預警（pre-emptive 模式）
function updateSameFormatWarning() {
  if (batchFiles.length === 0) {
    if (warnPreemptive) { hideWarning(); warnPreemptive = false }
    return
  }
  const fmt       = document.getElementById('batchFormat').value
  const sameFiles = batchFiles.filter(p => normExt(p) === fmt)
  if (sameFiles.length > 0) {
    warnPreemptive = true
    showWarning(sameFiles, true)
  } else if (warnPreemptive) {
    hideWarning()
    warnPreemptive = false
  }
}

// 「從清單移除 / 略過這些，繼續轉換」
document.getElementById('warnSkipBtn').addEventListener('click', () => {
  const fmt = document.getElementById('batchFormat').value
  if (warnPreemptive) {
    // pre-emptive 模式：把同格式檔從佇列移除
    batchFiles = batchFiles.filter(p => normExt(p) !== fmt)
    hideWarning()
    warnPreemptive = false
    renderFileList()
    updateConditionalRows()
  } else {
    // 轉換意圖模式：略過並開始轉換
    hideWarning()
    const toConvert = batchFiles.filter(p => normExt(p) !== fmt)
    runConversion(toConvert)
  }
})

// 「忽略提示 / 取消全部」
document.getElementById('warnCancelBtn').addEventListener('click', () => {
  hideWarning()
  warnPreemptive = false
})

// ── Start button ────────────────────────────────────────────────────────────

document.getElementById('batchStartBtn').addEventListener('click', () => {
  if (batchRunning) return

  if (batchFiles.length === 0) {
    showToast(t('toast_select_files'), true)
    return
  }

  const fmt        = document.getElementById('batchFormat').value
  const outputMode = document.querySelector('input[name="outputMode"]:checked').value

  if (outputMode === 'custom' && !selectedOutputDir) {
    showToast(t('toast_select_dir'), true)
    return
  }

  hideWarning()

  // Detect same-format files (transition from pre-emptive to conversion-intent mode)
  const sameFiles = batchFiles.filter(p => normExt(p) === fmt)
  if (sameFiles.length > 0) {
    warnPreemptive = false
    showWarning(sameFiles)   // 顯示轉換意圖版本（「略過這些，繼續轉換 / 取消全部」）
    return
  }

  runConversion(batchFiles)
})

// ── Conversion runner ───────────────────────────────────────────────────────

async function runConversion(files) {
  if (files.length === 0) {
    showToast(t('toast_no_files'), true)
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

  ipcOn('batch-progress', onProgress)

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

  const wmEnabled = document.getElementById('batchWatermarkCheck').checked
  const watermark = wmEnabled ? {
    text: {
      enabled:  document.getElementById('wmTextCheck').checked,
      content:  document.getElementById('wmText').value.trim(),
      size:     parseInt(document.getElementById('wmTextSize').value, 10) || 32,
      color:    document.getElementById('wmTextColor').value,
      opacity:  parseInt(document.getElementById('wmTextOpacity').value, 10) || 80
    },
    img: {
      enabled:     document.getElementById('wmImgCheck').checked,
      path:        wmImgFilePath,
      sizePercent: parseInt(document.getElementById('wmImgSize').value, 10) || 20,
      opacity:     parseInt(document.getElementById('wmImgOpacity').value, 10) || 80
    },
    position: wmPosition,
    margin:   parseInt(document.getElementById('wmMargin').value, 10) || 20
  } : null

  const results = await ipcInvoke('batch-convert', {
    files, format: fmt, quality, svgWidth, resize,
    outputMode, outputDir: selectedOutputDir, deleteOriginals,
    watermark
  })

  ipcRemoveListener('batch-progress', onProgress)

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
    showToast(t('toast_done', ok, err), true)
  } else {
    // 全部成功 → 清空佇列
    batchFiles = []
    renderFileList()
    updateConditionalRows()
    showToast(t('toast_converted', ok))
  }
}
