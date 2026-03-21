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

let mainWindow    = null
let overlayWindows = []   // one per display

// ─── Main window ─────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 880,
    height: 560,
    minWidth: 680,
    minHeight: 440,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  mainWindow.loadFile('src/index.html')
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
  win.loadFile('src/editor.html')
  win.webContents.once('did-finish-load', () => {
    win.webContents.send('load-image', imagePath)
  })
}

// Save final image (called from editor renderer after burn-in)
function isoFilename(ext) {
  const n = new Date()
  const p = v => String(v).padStart(2, '0')
  return `${n.getFullYear()}-${p(n.getMonth()+1)}-${p(n.getDate())}-${p(n.getHours())}-${p(n.getMinutes())}.${ext}`
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
  let s = sharp(buffer)
  if      (format === 'jpg')  s = s.jpeg({ quality: 90 })
  else if (format === 'webp') s = s.webp({ quality: 90 })
  else if (format === 'gif')  s = s.gif()
  else                        s = s.png()
  await s.toFile(result.filePath)
  return { success: true, path: result.filePath }
})

// Open image file (from main window "開啟圖片" button)
ipcMain.handle('open-image-file', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const result = await dialog.showOpenDialog(win, {
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] }],
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return
  openEditorWindow(result.filePaths[0])
})

// ─── Capture helpers ──────────────────────────────────────────────────────────

// Returns the display the main window currently lives on
function mainWindowDisplay() {
  const b = mainWindow.getBounds()
  return screen.getDisplayNearestPoint({
    x: Math.round(b.x + b.width  / 2),
    y: Math.round(b.y + b.height / 2)
  })
}


// Capture a global rect (logical pixels) using the system screencapture tool.
// screencapture handles HiDPI automatically — no scaleFactor math needed.
async function captureGlobalRect(x, y, w, h) {
  const tmpPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.png`)
  // -x: no shutter sound   -R: rect in global logical screen coordinates
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
  // Sort displays left-to-right by their virtual x position
  const displays = screen.getAllDisplays().sort((a, b) => a.bounds.x - b.bounds.x)

  mainWindow.minimize()
  await wait(450) // wait for macOS minimize animation

  try {
    if (displays.length === 1) {
      // Single display — original behaviour
      const { bounds } = displays[0]
      const { image, tmpPath } = await captureGlobalRect(
        bounds.x, bounds.y, bounds.width, bounds.height
      )
      clipboard.writeImage(image)
      const { width, height } = image.getSize()
      mainWindow.restore()
      openEditorWindow(tmpPath)
      return { success: true, path: tmpPath, width, height }
    }

    // Multiple displays — capture each screen then stitch horizontally.
    // Per SDD v0.6: use the smallest height as the common height (crop taller screens).
    const captures = []
    for (const d of displays) {
      const { bounds } = d
      const { image, tmpPath } = await captureGlobalRect(
        bounds.x, bounds.y, bounds.width, bounds.height
      )
      captures.push({ tmpPath, size: image.getSize() })
    }

    const minHeight  = Math.min(...captures.map(c => c.size.height))
    const totalWidth = captures.reduce((sum, c) => sum + c.size.width, 0)

    const compositeInputs = []
    let offsetX = 0
    for (const c of captures) {
      const { width, height } = c.size
      const input = height > minHeight
        ? await sharp(c.tmpPath).extract({ left: 0, top: 0, width, height: minHeight }).toBuffer()
        : c.tmpPath
      compositeInputs.push({ input, left: offsetX, top: 0 })
      offsetX += width
    }

    const stitchedPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.png`)
    await sharp({
      create: { width: totalWidth, height: minHeight, channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 255 } }
    })
      .composite(compositeInputs)
      .png()
      .toFile(stitchedPath)

    // Clean up individual screen captures
    captures.forEach(c => fs.unlink(c.tmpPath, () => {}))

    const finalImage = nativeImage.createFromPath(stitchedPath)
    clipboard.writeImage(finalImage)
    const { width, height } = finalImage.getSize()

    mainWindow.restore()
    openEditorWindow(stitchedPath)
    return { success: true, path: stitchedPath, width, height }

  } catch (err) {
    mainWindow.restore()
    if (err.message === 'PERMISSION') return { success: false, needsPermission: true }
    return { success: false, error: err.message }
  }
})

// ─── IPC: open rectangle-selection overlay ────────────────────────────────────

ipcMain.handle('open-overlay', async () => {
  await wait(80)

  // Open one overlay per display so the user can drag on any screen
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
  // Identify which overlay triggered this via its webContents ID
  const senderId = event.sender.id
  const active   = overlayWindows.find(w => !w.isDestroyed() && w.webContents.id === senderId)
  const windowBounds = active ? active.getBounds() : { x: 0, y: 0 }

  // Close every overlay
  closeAllOverlays()
  await wait(100)

  try {
    // Convert overlay-relative logical coords → global logical screen coords
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
      // Exclude macOS background XPC service windows — they have no visible UI.
      // These follow the pattern "AppName.XxxService", "AppName.XxxHelper", etc.
      if (/\.[A-Z]\w*(Service|Helper|Agent|Daemon)[\d.]*$/.test(name)) return false
      if (s.thumbnail.isEmpty()) return false
      return true
    })
    .map(s => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() }))
})

ipcMain.handle('capture-window', async (_, sourceId) => {
  // Electron source IDs on macOS are formatted as "window:<CGWindowID>:<displayID>"
  const match = sourceId.match(/^window:(\d+)/)
  if (!match) return { success: false, error: '無效的視窗 ID' }
  const windowId = match[1]

  mainWindow.minimize()
  await wait(450)

  const tmpPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.png`)
  try {
    // -o: no shadow (prevents transparent shadow pixels rendering as white in apps
    //     that don't support alpha channel)
    await execAsync(`/usr/sbin/screencapture -l ${windowId} -o -x "${tmpPath}"`)
    const image = nativeImage.createFromPath(tmpPath)
    if (!image || image.isEmpty()) {
      fs.unlink(tmpPath, () => {})
      throw new Error('PERMISSION')
    }
    clipboard.writeImage(image)
    const { width, height } = image.getSize()
    mainWindow.restore()
    openEditorWindow(tmpPath)
    return { success: true, path: tmpPath, width, height }
  } catch (err) {
    mainWindow.restore()
    if (err.message === 'PERMISSION') return { success: false, needsPermission: true }
    return { success: false, error: err.message }
  }
})

// ─── IPC: cancel overlay ─────────────────────────────────────────────────────

ipcMain.handle('cancel-overlay', () => closeAllOverlays())

// ─── IPC: open screen-recording permission pane ───────────────────────────────

ipcMain.handle('open-permission-settings', () => {
  shell.openExternal(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
  )
})

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
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
