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
let savePrefPath       = null // set after app.getPath('userData') available

function loadSavePref() {
  try { return JSON.parse(fs.readFileSync(savePrefPath, 'utf8')) } catch { return null }
}

function saveSavePref(pref) {
  try { fs.writeFileSync(savePrefPath, JSON.stringify(pref)) } catch {}
}

function resolveDefaultSaveDir() {
  const pref = loadSavePref()
  if (pref?.lastDir && fs.existsSync(pref.lastDir)) return pref.lastDir
  const candidates = ['pictures', 'downloads', 'desktop']
  for (const key of candidates) {
    try {
      const dir = app.getPath(key)
      if (dir && fs.existsSync(dir)) return dir
    } catch {}
  }
  return app.getPath('home')
}

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
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  const validPos = saved &&
    saved.x >= 0 && saved.x + TOOLBAR_W <= sw &&
    saved.y >= 0 && saved.y + TOOLBAR_H <= sh
  const winX = validPos ? saved.x : Math.round((sw - TOOLBAR_W) / 2)
  const winY = validPos ? saved.y : Math.round(sh * 0.1)
  mainWindow = new BrowserWindow({
    width:  TOOLBAR_W,
    height: TOOLBAR_H,
    x: winX,
    y: winY,
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
  const defaultDir = resolveDefaultSaveDir()
  const result = await dialog.showSaveDialog(win, {
    defaultPath: path.join(defaultDir, isoFilename(ext)),
    filters: [{ name: 'Image', extensions: [ext] }]
  })
  if (result.canceled) return { canceled: true }
  try {
    const base64 = dataURL.replace(/^data:image\/[^;]+;base64,/, '')
    const buffer = Buffer.from(base64, 'base64')
    let s = sharp(buffer).withMetadata()
    if      (format === 'jpg')  s = s.jpeg({ quality: 90 })
    else if (format === 'webp') s = s.webp({ quality: 90 })
    else if (format === 'gif')  s = s.gif()
    else                        s = s.png()
    await s.toFile(result.filePath)
    saveSavePref({ lastDir: path.dirname(result.filePath) })
    return { success: true, path: result.filePath }
  } catch (err) {
    return { success: false, error: err?.message || 'Failed to save image' }
  }
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

// ─── Select watermark image ────────────────────────────────────────────────────

ipcMain.handle('select-watermark-image', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const result = await dialog.showOpenDialog(win, {
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
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

// 浮水印位置 → SVG text-anchor 與座標
function wmCalcTextPos(position, imgW, imgH, margin, fontSize) {
  const col = position.includes('west') ? 'left' : position.includes('east') ? 'right' : 'center'
  const row = position.includes('north') ? 'top' : position.includes('south') ? 'bottom' : 'middle'
  let x, anchor
  if      (col === 'left')   { x = margin;           anchor = 'start'  }
  else if (col === 'right')  { x = imgW - margin;    anchor = 'end'    }
  else                       { x = Math.round(imgW / 2); anchor = 'middle' }
  let y
  if      (row === 'top')    y = margin + fontSize
  else if (row === 'bottom') y = imgH - margin
  else                       y = Math.round(imgH / 2 + fontSize * 0.35)
  return { x, y, anchor }
}

// 浮水印位置 → composite top/left offset
function wmCalcImgOffset(position, imgW, imgH, overlayW, overlayH, margin) {
  const col = position.includes('west') ? 'left' : position.includes('east') ? 'right' : 'center'
  const row = position.includes('north') ? 'top' : position.includes('south') ? 'bottom' : 'middle'
  let left
  if      (col === 'left')   left = margin
  else if (col === 'right')  left = imgW - overlayW - margin
  else                       left = Math.round((imgW - overlayW) / 2)
  let top
  if      (row === 'top')    top = margin
  else if (row === 'bottom') top = imgH - overlayH - margin
  else                       top = Math.round((imgH - overlayH) / 2)
  return { top: Math.max(0, top), left: Math.max(0, left) }
}

function escapeXml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

ipcMain.handle('batch-convert', async (event, {
  files, format, quality, svgWidth, resize, outputMode, outputDir, deleteOriginals, watermark
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

      // 浮水印合成
      if (watermark) {
        const meta = await s.clone().metadata()
        const { width: imgW, height: imgH } = meta
        const overlays = []

        // 文字浮水印
        if (watermark.text?.enabled && watermark.text.content) {
          const { x, y, anchor } = wmCalcTextPos(watermark.position, imgW, imgH, watermark.margin, watermark.text.size)
          const opacity = (watermark.text.opacity / 100).toFixed(2)
          const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}"><text x="${x}" y="${y}" font-size="${watermark.text.size}" fill="${escapeXml(watermark.text.color)}" opacity="${opacity}" text-anchor="${anchor}" font-family="Arial,sans-serif" font-weight="bold">${escapeXml(watermark.text.content)}</text></svg>`
          overlays.push({ input: Buffer.from(svgText), top: 0, left: 0 })
        }

        // 圖片浮水印
        if (watermark.img?.enabled && watermark.img.path && fs.existsSync(watermark.img.path)) {
          const targetW = Math.max(1, Math.round(imgW * watermark.img.sizePercent / 100))
          const { data: rawData, info: rawInfo } = await sharp(watermark.img.path)
            .resize({ width: targetW })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true })
          // 套用不透明度
          const opacity = watermark.img.opacity / 100
          for (let i = 3; i < rawData.length; i += 4) {
            rawData[i] = Math.round(rawData[i] * opacity)
          }
          const logoBuf = await sharp(rawData, {
            raw: { width: rawInfo.width, height: rawInfo.height, channels: 4 }
          }).png().toBuffer()
          const logoMeta = await sharp(logoBuf).metadata()
          const { top, left } = wmCalcImgOffset(watermark.position, imgW, imgH, logoMeta.width, logoMeta.height, watermark.margin)
          overlays.push({ input: logoBuf, top, left, blend: 'over' })
        }

        if (overlays.length > 0) s = s.composite(overlays)
      }

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

function formatExecError(err, command) {
  const parts = []
  if (err?.message) parts.push(err.message)
  if (err?.stderr) {
    const stderr = String(err.stderr).trim()
    if (stderr) parts.push(stderr)
  }
  if (typeof err?.code !== 'undefined') parts.push(`exit=${err.code}`)
  if (command) parts.push(`cmd=${command}`)
  return parts.join(' | ')
}

async function getScreenImageForDisplay(display) {
  const width = Math.max(1, Math.round(display.bounds.width * (display.scaleFactor || 1)))
  const height = Math.max(1, Math.round(display.bounds.height * (display.scaleFactor || 1)))
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height }
  })
  const source = sources.find(s => String(s.display_id) === String(display.id)) || sources[0]
  if (!source || source.thumbnail.isEmpty()) throw new Error('Capture source unavailable')
  return source.thumbnail
}

async function captureGlobalRect(x, y, w, h) {
  const tmpPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.png`)
  if (process.platform === 'darwin') {
    const cmd = `/usr/sbin/screencapture -R ${x},${y},${w},${h} -x "${tmpPath}"`
    try {
      await execAsync(cmd)
    } catch (err) {
      throw new Error(formatExecError(err, cmd))
    }
    const image = nativeImage.createFromPath(tmpPath)
    if (!image || image.isEmpty()) {
      fs.unlink(tmpPath, () => {})
      throw new Error('PERMISSION')
    }
    return { image, tmpPath }
  }
  // Windows/Linux fallback: capture display via desktopCapturer and crop in-memory.
  const display = screen.getDisplayNearestPoint({
    x: Math.round(x + w / 2),
    y: Math.round(y + h / 2)
  })
  const displayImage = await getScreenImageForDisplay(display)
  const dx = Math.max(0, Math.round(x - display.bounds.x))
  const dy = Math.max(0, Math.round(y - display.bounds.y))
  const dw = Math.min(Math.round(w), Math.max(0, displayImage.getSize().width - dx))
  const dh = Math.min(Math.round(h), Math.max(0, displayImage.getSize().height - dy))
  if (dw <= 0 || dh <= 0) {
    throw new Error('Invalid capture area')
  }
  const cropped = displayImage.crop({ x: dx, y: dy, width: dw, height: dh })
  fs.writeFileSync(tmpPath, cropped.toPNG())
  return { image: cropped, tmpPath }
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
    // 載入後 focus，讓 macOS 立即套用 CSS cursor: crosshair
    win.webContents.once('did-finish-load', () => win.focus())
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
    let image
    if (process.platform === 'darwin') {
      const cmd = `/usr/sbin/screencapture -l ${windowId} -o -x "${tmpPath}"`
      try {
        await execAsync(cmd)
      } catch (err) {
        throw new Error(formatExecError(err, cmd))
      }
      image = nativeImage.createFromPath(tmpPath)
      if (!image || image.isEmpty()) {
        fs.unlink(tmpPath, () => {})
        throw new Error('PERMISSION')
      }
    } else {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 4096, height: 4096 }
      })
      const src = sources.find(s => s.id === sourceId)
      if (!src || src.thumbnail.isEmpty()) {
        throw new Error('無法取得視窗影像，請重試')
      }
      image = src.thumbnail
      fs.writeFileSync(tmpPath, image.toPNG())
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

// ─── OCR (macOS Vision framework via Swift) ───────────────────────────────────
// 使用 macOS 內建 Vision 框架，不需要下載語言包，支援繁中 + 英文

const SWIFT_OCR = `
import Vision
import AppKit

let imgPath = CommandLine.arguments[1]
guard let img = NSImage(contentsOfFile: imgPath),
      let tiff = img.tiffRepresentation,
      let rep  = NSBitmapImageRep(data: tiff),
      let cg   = rep.cgImage else {
  fputs("ERROR: Cannot load image\\n", stderr); exit(1)
}
let sem = DispatchSemaphore(value: 0)
var lines: [String] = []
let req = VNRecognizeTextRequest { req, _ in
  lines = (req.results as? [VNRecognizedTextObservation] ?? [])
    .compactMap { $0.topCandidates(1).first?.string }
  sem.signal()
}
req.recognitionLevel = .accurate
req.recognitionLanguages = ["zh-Hant", "en-US"]
req.usesLanguageCorrection = true
try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
sem.wait()
print(lines.joined(separator: "\\n"))
`

ipcMain.handle('ocr-recognize', (event, { dataURL }) => {
  // 非 macOS：使用 Tesseract.js fallback
  if (process.platform !== 'darwin') {
    return new Promise((resolve) => {
      const { Worker } = require('worker_threads')
      const cachePath = path.join(app.getPath('userData'), 'tesseract-cache')
      const w = new Worker(path.join(__dirname, 'src', 'ocr-worker.js'), {
        workerData: { dataURL, cachePath }
      })
      w.on('message', msg => { if (msg.type === 'result') resolve(msg) })
      w.on('error', err => resolve({ success: false, error: err.message }))
    })
  }

  // macOS：使用 Vision 框架（Swift）
  return new Promise((resolve) => {
    // 將 dataURL 寫入暫存 PNG
    const tmpDir   = os.tmpdir()
    const tmpImg   = path.join(tmpDir, `ocr_img_${Date.now()}.png`)
    const tmpSwift = path.join(tmpDir, `ocr_run_${Date.now()}.swift`)
    try {
      const b64 = dataURL.replace(/^data:image\/\w+;base64,/, '')
      fs.writeFileSync(tmpImg, Buffer.from(b64, 'base64'))
      fs.writeFileSync(tmpSwift, SWIFT_OCR)
    } catch (err) {
      resolve({ success: false, error: '暫存檔案寫入失敗：' + err.message })
      return
    }

    const cleanup = () => {
      try { fs.unlinkSync(tmpImg)   } catch {}
      try { fs.unlinkSync(tmpSwift) } catch {}
    }

    exec(`swift "${tmpSwift}" "${tmpImg}"`, { timeout: 60000 }, (err, stdout, stderr) => {
      cleanup()
      if (err) {
        resolve({ success: false, error: stderr.trim() || err.message })
      } else {
        resolve({ success: true, text: stdout.trim() })
      }
    })
  })
})

// ─── Remove Background (macOS 12+ Vision framework via Swift) ────────────────

const SWIFT_REMOVE_BG = `
import Vision
import AppKit

guard CommandLine.arguments.count >= 3 else {
  fputs("ERROR: usage: swift script.swift <input> <output>\\n", stderr); exit(1)
}
let imgPath = CommandLine.arguments[1]
let outPath = CommandLine.arguments[2]

guard let nsImg = NSImage(contentsOfFile: imgPath),
      let tiff  = nsImg.tiffRepresentation,
      let rep   = NSBitmapImageRep(data: tiff),
      let cg    = rep.cgImage else {
  fputs("ERROR: Cannot load image\\n", stderr); exit(1)
}

if #available(macOS 12.0, *) {
  let handler = VNImageRequestHandler(cgImage: cg, options: [:])
  let request = VNGenerateForegroundInstanceMaskRequest()
  do {
    try handler.perform([request])
  } catch {
    fputs("ERROR: \\(error.localizedDescription)\\n", stderr); exit(1)
  }
  guard let result = request.results?.first else {
    fputs("ERROR: No foreground detected\\n", stderr); exit(1)
  }
  do {
    let masked = try result.generateMaskedImage(
      ofInstances: result.allInstances,
      from: handler,
      croppedToInstancesExtent: false
    )
    let ci  = CIImage(cvPixelBuffer: masked)
    let ctx = CIContext()
    guard let out = ctx.createCGImage(ci, from: ci.extent) else {
      fputs("ERROR: Cannot create output image\\n", stderr); exit(1)
    }
    let outRep = NSBitmapImageRep(cgImage: out)
    guard let png = outRep.representation(using: .png, properties: [:]) else {
      fputs("ERROR: Cannot encode PNG\\n", stderr); exit(1)
    }
    try png.write(to: URL(fileURLWithPath: outPath))
    print("OK")
  } catch {
    fputs("ERROR: \\(error.localizedDescription)\\n", stderr); exit(1)
  }
} else {
  fputs("ERROR: Requires macOS 12 or later\\n", stderr); exit(1)
}
`

ipcMain.handle('remove-background', (event, { dataURL }) => {
  if (process.platform !== 'darwin') {
    return { success: false, error: '此功能僅支援 macOS 12 以上' }
  }
  return new Promise((resolve) => {
    const tmpDir    = os.tmpdir()
    const tmpImg    = path.join(tmpDir, `rmbg_in_${Date.now()}.png`)
    const tmpOut    = path.join(tmpDir, `rmbg_out_${Date.now()}.png`)
    const tmpSwift  = path.join(tmpDir, `rmbg_${Date.now()}.swift`)
    try {
      const b64 = dataURL.replace(/^data:image\/\w+;base64,/, '')
      fs.writeFileSync(tmpImg, Buffer.from(b64, 'base64'))
      fs.writeFileSync(tmpSwift, SWIFT_REMOVE_BG)
    } catch (err) {
      resolve({ success: false, error: '暫存檔寫入失敗：' + err.message })
      return
    }
    const cleanup = () => {
      try { fs.unlinkSync(tmpImg)   } catch {}
      try { fs.unlinkSync(tmpSwift) } catch {}
    }
    exec(`swift "${tmpSwift}" "${tmpImg}" "${tmpOut}"`, { timeout: 60000 }, (err, stdout, stderr) => {
      cleanup()
      if (err) {
        try { fs.unlinkSync(tmpOut) } catch {}
        resolve({ success: false, error: stderr.trim() || err.message })
        return
      }
      try {
        const outBuf = fs.readFileSync(tmpOut)
        fs.unlinkSync(tmpOut)
        resolve({ success: true, dataURL: 'data:image/png;base64,' + outBuf.toString('base64') })
      } catch (readErr) {
        resolve({ success: false, error: readErr.message })
      }
    })
  })
})

// ─── Drag OUT export (renderer → OS drag) ────────────────────────────────────

ipcMain.on('start-drag-export', (event, { dataURL }) => {
  try {
    const base64  = dataURL.replace(/^data:image\/\w+;base64,/, '')
    const tmpPath = path.join(os.tmpdir(), `export-${Date.now()}.png`)
    fs.writeFileSync(tmpPath, Buffer.from(base64, 'base64'))
    const icon = nativeImage.createFromPath(tmpPath).resize({ width: 64, height: 64 })
    event.sender.startDrag({ file: tmpPath, icon })
  } catch (err) {
    console.error('start-drag-export failed:', err.message)
  }
})

// ─── Screenshot History ───────────────────────────────────────────────────────

function getHistoryPath() {
  return path.join(app.getPath('userData'), 'history.json')
}

ipcMain.handle('get-history', () => {
  try {
    return JSON.parse(fs.readFileSync(getHistoryPath(), 'utf8'))
  } catch {
    return []
  }
})

ipcMain.handle('add-history-entry', (_, entry) => {
  try {
    let history = []
    try { history = JSON.parse(fs.readFileSync(getHistoryPath(), 'utf8')) } catch {}
    history.unshift(entry)
    if (history.length > 20) history = history.slice(0, 20)
    fs.writeFileSync(getHistoryPath(), JSON.stringify(history))
    return true
  } catch {
    return false
  }
})

ipcMain.handle('open-history-file', (_, filePath) => {
  if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' }
  mainWindow.hide()
  openEditorWindow(filePath)
  return { success: true }
})

// ─── Brand Colors ─────────────────────────────────────────────────────────────

function getBrandColorsPath() {
  return path.join(app.getPath('userData'), 'brand-colors.json')
}

ipcMain.handle('get-brand-colors', () => {
  try {
    const raw = fs.readFileSync(getBrandColorsPath(), 'utf8')
    return JSON.parse(raw)
  } catch {
    return []
  }
})

ipcMain.handle('save-brand-colors', (_, colors) => {
  try {
    fs.writeFileSync(getBrandColorsPath(), JSON.stringify(colors))
    return true
  } catch {
    return false
  }
})

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  posFilePath  = path.join(app.getPath('userData'), 'toolbar-pos.json')
  savePrefPath = path.join(app.getPath('userData'), 'save-pref.json')
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
