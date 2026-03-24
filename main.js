const {
  app, BrowserWindow, globalShortcut,
  screen, ipcMain, desktopCapturer, dialog,
  clipboard, nativeImage, shell
} = require('electron')
const { exec } = require('child_process')
const { promisify } = require('util')
const path = require('path')
const fs   = require('fs')
const os   = require('os')
const sharp = require('sharp')

const execAsync = promisify(exec)

// ─── Window dimensions ────────────────────────────────────────────────────────

const TOOLBAR_W  = 514   // 6 buttons × 72 + 5 gaps × 2 + divider + help + padding
const TOOLBAR_H  = 68
const PICKER_W   = 760
const PICKER_H   = 540
const HELP_W     = 560
const HELP_H     = 480
const BATCH_W    = 560
const BATCH_H    = 620

// ─── State ────────────────────────────────────────────────────────────────────

let mainWindow         = null
let overlayWindows     = []   // rect-selection overlays, one per display
let screenSelectWindows = []  // screen-selection overlays, one per display
let editorWindows      = []   // open editor windows
let posFilePath        = null // set after app.getPath('userData') available

// ─── Position persistence ─────────────────────────────────────────────────────

function loadPos() {
  try { return JSON.parse(fs.readFileSync(posFilePath, 'utf8')) } catch { return null }
}

function savePos(x, y) {
  try { fs.writeFileSync(posFilePath, JSON.stringify({ x, y })) } catch {}
}

// ─── Main window (compact floating toolbar) ───────────────────────────────────

function createWindow() {
  const saved = loadPos()
  mainWindow = new BrowserWindow({
    width:  TOOLBAR_W,
    height: TOOLBAR_H,
    x: saved?.x,
    y: saved?.y,
    frame:       false,
    transparent: true,
    alwaysOnTop: true,
    resizable:   false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  mainWindow.loadFile('src/index.html')

  mainWindow.on('moved', () => {
    const [x, y] = mainWindow.getPosition()
    savePos(x, y)
  })
}

// ─── Editor window ───────────────────────────────────────────────────────────

function openEditorWindow(imagePath) {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  editorWindows.push(win)

  // When editor closes (after save or manually), show toolbar if no editors remain
  win.on('closed', () => {
    editorWindows = editorWindows.filter(w => !w.isDestroyed())
    if (editorWindows.length === 0) {
      mainWindow.show()
    }
  })

  win.loadFile('src/editor.html')
  win.webContents.once('did-finish-load', () => {
    win.webContents.send('load-image', imagePath)
  })
}

// ─── IPC: modal resize ────────────────────────────────────────────────────────

let savedToolbarBounds = null   // snapshot before modal expansion

ipcMain.handle('resize-for-modal', (_, { width, height }) => {
  const [x, y] = mainWindow.getPosition()
  savedToolbarBounds = { x, y }   // remember original toolbar position

  const display = screen.getDisplayNearestPoint({ x, y })
  const db = display.bounds

  // Horizontal: if not enough room to the right, shift left
  let newX = x
  if (newX + width > db.x + db.width) {
    newX = db.x + db.width - width
    if (newX < db.x) newX = db.x
  }

  // Vertical: if not enough room below, grow upward (anchor toolbar bottom edge)
  let newY = y
  if (y + height > db.y + db.height) {
    newY = y + TOOLBAR_H - height
    if (newY < db.y) newY = db.y
  }

  mainWindow.setBounds({ x: newX, y: newY, width, height })
})

ipcMain.handle('resize-to-toolbar', () => {
  if (savedToolbarBounds) {
    mainWindow.setBounds({
      x: savedToolbarBounds.x,
      y: savedToolbarBounds.y,
      width:  TOOLBAR_W,
      height: TOOLBAR_H
    })
    savedToolbarBounds = null
  } else {
    mainWindow.setSize(TOOLBAR_W, TOOLBAR_H)
  }
})

// ─── Save final image (called from editor renderer after burn-in) ─────────────

function isoFilename(ext) {
  const n = new Date()
  const p = v => String(v).padStart(2, '0')
  return `${n.getFullYear()}-${p(n.getMonth()+1)}-${p(n.getDate())}-${p(n.getHours())}-${p(n.getMinutes())}-${p(n.getSeconds())}.${ext}`
}

ipcMain.handle('save-image-as', async (event, { dataURL, format }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const ext = { png: 'png', jpg: 'jpg', webp: 'webp', gif: 'gif' }[format] ?? 'png'
  const result = await dialog.showSaveDialog(win, {
    defaultPath: isoFilename(ext),
    filters: [{ name: 'Image', extensions: [ext] }]
  })
  if (result.canceled) return { canceled: true }

  const base64 = dataURL.replace(/^data:image\/[^;]+;base64,/, '')
  const buffer = Buffer.from(base64, 'base64')
  let s = sharp(buffer).withMetadata()
  if      (format === 'jpg')  s = s.jpeg({ quality: 90 })
  else if (format === 'webp') s = s.webp({ quality: 90 })
  else if (format === 'gif')  s = s.gif()
  else                        s = s.png()
  await s.toFile(result.filePath)
  return { success: true, path: result.filePath }
})

// ─── Open image file (from toolbar "開啟圖片" button) ─────────────────────────

ipcMain.handle('open-image-file', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const result = await dialog.showOpenDialog(win, {
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] }],
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return
  mainWindow.hide()
  openEditorWindow(result.filePaths[0])
})

// ─── Batch conversion ─────────────────────────────────────────────────────────

ipcMain.handle('select-batch-files', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const result = await dialog.showOpenDialog(win, {
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] }],
    properties: ['openFile', 'multiSelections']
  })
  if (result.canceled) return []
  return result.filePaths
})

ipcMain.handle('select-output-dir', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory']
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle('batch-convert', async (event, {
  files, format, quality, svgWidth, resize, outputMode, outputDir, deleteOriginals
}) => {
  const results = []

  for (const filePath of files) {
    const ext  = path.extname(filePath).toLowerCase().slice(1)
    const base = path.basename(filePath, path.extname(filePath))
    const outExt  = format === 'jpg' ? 'jpg' : format
    const destDir = outputMode === 'same' ? path.dirname(filePath) : outputDir
    const outPath = path.join(destDir, `${base}.${outExt}`)

    try {
      // Build sharp pipeline
      let s
      if (ext === 'svg') {
        // Render SVG at target width; density=150 avoids blurry output
        s = sharp(filePath, { density: 150 }).resize({ width: svgWidth }).withMetadata()
      } else {
        const buf = await fs.promises.readFile(filePath)
        s = sharp(buf).withMetadata()
      }

      // Optional resize (after SVG rasterisation)
      if (resize) {
        if (resize.axis === 'width') {
          s = s.resize({ width: resize.value, height: null, fit: 'inside' })
        } else {
          s = s.resize({ width: null, height: resize.value, fit: 'inside' })
        }
      }

      // Format
      if      (format === 'jpg')  s = s.jpeg({ quality })
      else if (format === 'webp') s = s.webp({ quality })
      else if (format === 'gif')  s = s.gif()
      else                        s = s.png()

      await s.toFile(outPath)

      if (deleteOriginals && filePath !== outPath) {
        await fs.promises.unlink(filePath)
      }

      results.push({ path: filePath, outPath, success: true })
      event.sender.send('batch-progress', {
        path: filePath, outPath, success: true,
        done: results.length, total: files.length
      })
    } catch (err) {
      results.push({ path: filePath, success: false, error: err.message })
      event.sender.send('batch-progress', {
        path: filePath, success: false, error: err.message,
        done: results.length, total: files.length
      })
    }
  }

  return results
})

// ─── Capture helpers ──────────────────────────────────────────────────────────

function mainWindowDisplay() {
  const b = mainWindow.getBounds()
  return screen.getDisplayNearestPoint({
    x: Math.round(b.x + b.width  / 2),
    y: Math.round(b.y + b.height / 2)
  })
}

async function captureGlobalRect(x, y, w, h) {
  const tmpPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.png`)
  await execAsync(`/usr/sbin/screencapture -R ${x},${y},${w},${h} -x "${tmpPath}"`)
  const image = nativeImage.createFromPath(tmpPath)
  if (!image || image.isEmpty()) {
    fs.unlink(tmpPath, () => {})
    throw new Error('PERMISSION')
  }
  return { image, tmpPath }
}

// ─── IPC: full-screen capture ─────────────────────────────────────────────────

ipcMain.handle('capture-fullscreen', async () => {
  const displays = screen.getAllDisplays().sort((a, b) => a.bounds.x - b.bounds.x)

  if (displays.length === 1) {
    mainWindow.hide()
    await wait(200)
    try {
      const { bounds } = displays[0]
      const { image, tmpPath } = await captureGlobalRect(
        bounds.x, bounds.y, bounds.width, bounds.height
      )
      clipboard.writeImage(image)
      const { width, height } = image.getSize()
      openEditorWindow(tmpPath)
      return { success: true, path: tmpPath, width, height }
    } catch (err) {
      mainWindow.show()
      if (err.message === 'PERMISSION') return { success: false, needsPermission: true }
      return { success: false, error: err.message }
    }
  }

  // Multiple displays — show screen-selection overlay; user picks or presses Enter
  openScreenSelectOverlays(displays)
  return { awaitingSelection: true }
})

// ─── Screen-select overlay helpers ───────────────────────────────────────────

function openScreenSelectOverlays(displays) {
  screenSelectWindows = displays.map((display, index) => {
    const { bounds } = display
    const win = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width:  bounds.width,
      height: bounds.height,
      frame:       false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable:   false,
      movable:     false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    })
    win.setAlwaysOnTop(true, 'screen-saver')
    win.setVisibleOnAllWorkspaces(true)
    win.loadFile('src/screen-select.html')
    win.webContents.once('did-finish-load', () => {
      win.webContents.send('screen-select-init', {
        index,
        total: displays.length
      })
    })
    return { win, display }
  })
}

function closeAllScreenSelectWindows() {
  screenSelectWindows.forEach(e => { try { e.win.close() } catch {} })
  screenSelectWindows = []
}

// ─── IPC: capture a single selected screen ───────────────────────────────────

ipcMain.handle('capture-selected-screen', async (event) => {
  const senderId   = event.sender.id
  const activeEntry = screenSelectWindows.find(
    e => !e.win.isDestroyed() && e.win.webContents.id === senderId
  )

  closeAllScreenSelectWindows()

  if (!activeEntry) return

  mainWindow.hide()
  await wait(200)

  try {
    const { bounds } = activeEntry.display
    const { image, tmpPath } = await captureGlobalRect(
      bounds.x, bounds.y, bounds.width, bounds.height
    )
    clipboard.writeImage(image)
    const { width, height } = image.getSize()
    openEditorWindow(tmpPath)
    mainWindow.webContents.send('capture-result', { success: true, path: tmpPath, width, height })
  } catch (err) {
    mainWindow.show()
    const needsPermission = err.message === 'PERMISSION'
    mainWindow.webContents.send('capture-result', {
      success: false,
      needsPermission,
      error: needsPermission ? undefined : err.message
    })
  }
})

// ─── IPC: capture all screens merged (Enter key from screen-select overlay) ──

ipcMain.handle('capture-all-screens-merged', async () => {
  closeAllScreenSelectWindows()

  const displays = screen.getAllDisplays().sort((a, b) => a.bounds.x - b.bounds.x)

  mainWindow.hide()
  await wait(200)

  try {
    const captures = []
    for (const d of displays) {
      const { bounds } = d
      const { image, tmpPath } = await captureGlobalRect(
        bounds.x, bounds.y, bounds.width, bounds.height
      )
      captures.push({ tmpPath, size: image.getSize() })
    }

    const minHeight = Math.min(...captures.map(c => c.size.height))

    const resized = await Promise.all(captures.map(async c => {
      const { width, height } = c.size
      if (height === minHeight) return { input: c.tmpPath, width }
      const newWidth = Math.round(width * minHeight / height)
      const buf = await sharp(c.tmpPath).resize(newWidth, minHeight).toBuffer()
      return { input: buf, width: newWidth }
    }))

    const totalWidth = resized.reduce((sum, r) => sum + r.width, 0)
    const compositeInputs = []
    let offsetX = 0
    for (const r of resized) {
      compositeInputs.push({ input: r.input, left: offsetX, top: 0 })
      offsetX += r.width
    }

    const stitchedPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.png`)
    await sharp({
      create: { width: totalWidth, height: minHeight, channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 255 } }
    })
      .composite(compositeInputs)
      .png()
      .toFile(stitchedPath)

    captures.forEach(c => fs.unlink(c.tmpPath, () => {}))

    const finalImage = nativeImage.createFromPath(stitchedPath)
    clipboard.writeImage(finalImage)
    const { width, height } = finalImage.getSize()

    openEditorWindow(stitchedPath)
    mainWindow.webContents.send('capture-result', { success: true, path: stitchedPath, width, height })
  } catch (err) {
    mainWindow.show()
    const needsPermission = err.message === 'PERMISSION'
    mainWindow.webContents.send('capture-result', {
      success: false,
      needsPermission,
      error: needsPermission ? undefined : err.message
    })
  }
})

// ─── IPC: cancel screen-select overlay ───────────────────────────────────────

ipcMain.handle('cancel-screen-select', () => closeAllScreenSelectWindows())

// ─── IPC: open rectangle-selection overlay ────────────────────────────────────

ipcMain.handle('open-overlay', async () => {
  mainWindow.hide()
  await wait(150)

  overlayWindows = screen.getAllDisplays().map(display => {
    const { bounds } = display
    const win = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width:  bounds.width,
      height: bounds.height,
      frame:       false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable:   false,
      movable:     false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    })
    win.setAlwaysOnTop(true, 'screen-saver')
    win.setVisibleOnAllWorkspaces(true)
    win.loadFile('src/overlay.html')
    return win
  })
})

// ─── IPC: capture cropped rect ────────────────────────────────────────────────

ipcMain.handle('capture-rect', async (event, rect) => {
  const senderId = event.sender.id
  const active   = overlayWindows.find(w => !w.isDestroyed() && w.webContents.id === senderId)
  const windowBounds = active ? active.getBounds() : { x: 0, y: 0 }

  closeAllOverlays()
  await wait(100)

  try {
    const gx = Math.round(windowBounds.x + rect.x)
    const gy = Math.round(windowBounds.y + rect.y)
    const gw = Math.round(rect.width)
    const gh = Math.round(rect.height)

    const { image, tmpPath } = await captureGlobalRect(gx, gy, gw, gh)
    clipboard.writeImage(image)
    const { width, height } = image.getSize()

    openEditorWindow(tmpPath)
    mainWindow.webContents.send('capture-result', { success: true, path: tmpPath, width, height })
  } catch (err) {
    mainWindow.show()
    const needsPermission = err.message === 'PERMISSION'
    mainWindow.webContents.send('capture-result', {
      success: false,
      needsPermission,
      error: needsPermission ? undefined : err.message
    })
  }
})

// ─── IPC: window picker ───────────────────────────────────────────────────────

ipcMain.handle('get-window-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 320, height: 200 }
  })
  return sources
    .filter(s => {
      const name = s.name.trim()
      if (!name) return false
      if (/\.[A-Z]\w*(Service|Helper|Agent|Daemon)[\d.]*$/.test(name)) return false
      if (s.thumbnail.isEmpty()) return false
      return true
    })
    .map(s => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() }))
})

ipcMain.handle('capture-window', async (_, sourceId) => {
  const match = sourceId.match(/^window:(\d+)/)
  if (!match) return { success: false, error: '無效的視窗 ID' }
  const windowId = match[1]

  mainWindow.hide()   // 與全螢幕 / 矩形截圖一致，截圖完才由 editor 關閉後恢復
  await wait(150)

  const tmpPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.png`)
  try {
    await execAsync(`/usr/sbin/screencapture -l ${windowId} -o -x "${tmpPath}"`)
    const image = nativeImage.createFromPath(tmpPath)
    if (!image || image.isEmpty()) {
      fs.unlink(tmpPath, () => {})
      throw new Error('PERMISSION')
    }
    clipboard.writeImage(image)
    const { width, height } = image.getSize()
    openEditorWindow(tmpPath)
    return { success: true, path: tmpPath, width, height }
  } catch (err) {
    mainWindow.show()   // 失敗時恢復工具列
    if (err.message === 'PERMISSION') return { success: false, needsPermission: true }
    return { success: false, error: err.message }
  }
})

// ─── IPC: cancel overlay ─────────────────────────────────────────────────────

ipcMain.handle('cancel-overlay', () => {
  closeAllOverlays()
  mainWindow.show()
})

// ─── IPC: open screen-recording permission pane ───────────────────────────────

ipcMain.handle('open-permission-settings', () => {
  shell.openExternal(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
  )
})

// ─── OCR (Tesseract.js) ───────────────────────────────────────────────────────

let ocrCachePath = null

function initOcrCache() {
  ocrCachePath = path.join(app.getPath('userData'), 'tessdata')
  try { fs.mkdirSync(ocrCachePath, { recursive: true }) } catch {}
}

const OCR_LANGS = ['chi_tra', 'eng']

// chi_tra ~10MB, eng ~4MB — 小於 1MB 視為下載損毀，強制重新下載
const MIN_TESSDATA_BYTES = 1 * 1024 * 1024

ipcMain.handle('ocr-check-tessdata', () => {
  if (!ocrCachePath) return false
  return OCR_LANGS.every(lang => {
    const p = path.join(ocrCachePath, `${lang}.traineddata`)
    try {
      return fs.existsSync(p) && fs.statSync(p).size >= MIN_TESSDATA_BYTES
    } catch { return false }
  })
})

// 刪除損毀的 tessdata 讓使用者重新下載
ipcMain.handle('ocr-delete-tessdata', () => {
  if (!ocrCachePath) return
  OCR_LANGS.forEach(lang => {
    const p = path.join(ocrCachePath, `${lang}.traineddata`)
    try { if (fs.existsSync(p)) fs.unlinkSync(p) } catch {}
  })
})

// OCR recognition via worker_threads（在 main process 內跑，避免 Electron fork 雙層問題）
ipcMain.handle('ocr-recognize', (event, { dataURL }) => {
  return new Promise((resolve) => {
    const { Worker } = require('worker_threads')
    let worker
    try {
      worker = new Worker(path.join(__dirname, 'src/ocr-worker.js'), {
        workerData: { dataURL, cachePath: ocrCachePath }
      })
    } catch (err) {
      resolve({ success: false, error: 'OCR worker 無法啟動：' + err.message })
      return
    }

    let settled = false
    const done = (result) => {
      if (settled) return
      settled = true
      try { worker.terminate() } catch {}
      resolve(result)
    }

    worker.on('message', msg => {
      if (msg.type === 'progress') {
        try {
          if (!event.sender.isDestroyed()) {
            event.sender.send('ocr-progress', { status: msg.status, progress: msg.progress })
          }
        } catch {}
      } else if (msg.type === 'result') {
        done({ success: msg.success, text: msg.text, error: msg.error })
      }
    })

    worker.on('error', (err) => {
      done({ success: false, error: 'OCR 錯誤：' + err.message })
    })

    worker.on('exit', (code) => {
      if (code !== 0) {
        done({ success: false, error: `OCR worker 意外結束（code ${code}）` })
      }
    })
  })
})

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  posFilePath = path.join(app.getPath('userData'), 'toolbar-pos.json')
  initOcrCache()
  createWindow()

  globalShortcut.register('CommandOrControl+Ctrl+1', () => {
    mainWindow.webContents.send('shortcut-fullscreen')
  })
  globalShortcut.register('CommandOrControl+Ctrl+2', () => {
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('shortcut-window')
  })
  globalShortcut.register('CommandOrControl+Ctrl+X', () => {
    mainWindow.webContents.send('shortcut-rect')
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// ─── Overlay helpers ──────────────────────────────────────────────────────────

function closeAllOverlays() {
  overlayWindows.forEach(w => { try { w.close() } catch {} })
  overlayWindows = []
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function wait(ms) {
  return new Promise(r => setTimeout(r, ms))
}
