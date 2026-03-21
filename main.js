const {
  app, BrowserWindow, globalShortcut,
  desktopCapturer, screen, ipcMain,
  clipboard, nativeImage, shell
} = require('electron')
const path = require('path')
const fs   = require('fs')
const os   = require('os')

let mainWindow   = null
let overlayWindow = null

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

// ─── Capture helpers ──────────────────────────────────────────────────────────

// Returns the display the main window currently lives on
function mainWindowDisplay() {
  const b = mainWindow.getBounds()
  return screen.getDisplayNearestPoint({
    x: Math.round(b.x + b.width  / 2),
    y: Math.round(b.y + b.height / 2)
  })
}

async function captureDisplay(display) {
  const { size, scaleFactor, id } = display

  // Request larger-than-needed size so thumbnails are at native resolution
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 10000, height: 10000 }
  })

  if (!sources.length) throw new Error('找不到螢幕來源，請確認已授予「螢幕錄製」權限。')
  if (sources.length === 1) return sources[0].thumbnail

  // Match by display_id (string); fallback to largest thumbnail (primary display)
  const byId = sources.find(s => s.display_id === String(id))
  if (byId) return byId.thumbnail

  // Last resort: pick source whose thumbnail is closest to this display's size
  const target = size.width * scaleFactor
  const source = sources.reduce((best, s) => {
    const diff    = Math.abs(s.thumbnail.getSize().width - target)
    const bestDiff = Math.abs(best.thumbnail.getSize().width - target)
    return diff < bestDiff ? s : best
  })
  return source.thumbnail
}

function saveTemp(image) {
  const tmpPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.png`)
  fs.writeFileSync(tmpPath, image.toPNG())
  return tmpPath
}

// ─── IPC: full-screen capture ─────────────────────────────────────────────────

ipcMain.handle('capture-fullscreen', async () => {
  // Determine display BEFORE minimizing (getBounds still valid while animating)
  const display = mainWindowDisplay()

  mainWindow.minimize()
  await wait(450) // wait for macOS minimize animation to complete

  try {
    const image = await captureDisplay(display)

    clipboard.writeImage(image)
    const tmpPath = saveTemp(image)
    const { width, height } = image.getSize()

    mainWindow.restore()
    return { success: true, path: tmpPath, width, height }
  } catch (err) {
    mainWindow.restore()
    return { success: false, error: err.message }
  }
})

// ─── IPC: open rectangle-selection overlay ────────────────────────────────────

ipcMain.handle('open-overlay', async () => {
  // Open overlay on the same display as the main window
  const display = mainWindowDisplay()
  const { bounds } = display

  // Don't hide the main window — the overlay will cover it.
  // A brief wait lets any button-press rendering settle.
  await wait(80)

  overlayWindow = new BrowserWindow({
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

  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setVisibleOnAllWorkspaces(true)
  overlayWindow.loadFile('src/overlay.html')

  // Stash display for later use in capture-rect
  overlayWindow._captureDisplay = display
})

// ─── IPC: capture cropped rect ────────────────────────────────────────────────

ipcMain.handle('capture-rect', async (_, rect) => {
  const display = overlayWindow._captureDisplay
  overlayWindow.close()
  overlayWindow = null
  await wait(150)

  try {
    const fullImage  = await captureDisplay(display)
    const sf         = display.scaleFactor

    const cropped = fullImage.crop({
      x:      Math.round(rect.x      * sf),
      y:      Math.round(rect.y      * sf),
      width:  Math.round(rect.width  * sf),
      height: Math.round(rect.height * sf)
    })

    clipboard.writeImage(cropped)
    const tmpPath = saveTemp(cropped)

    mainWindow.webContents.send('capture-result', {
      success: true, path: tmpPath, width: rect.width, height: rect.height
    })
  } catch (err) {
    mainWindow.webContents.send('capture-result', { success: false, error: err.message })
  }
})

// ─── IPC: cancel overlay ─────────────────────────────────────────────────────

ipcMain.handle('cancel-overlay', () => {
  if (overlayWindow) {
    overlayWindow.close()
    overlayWindow = null
  }
  // No need to restore — main window was never hidden for rect mode
})

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow()

  globalShortcut.register('CommandOrControl+Ctrl+1', () => {
    mainWindow.webContents.send('shortcut-fullscreen')
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

// ─── Util ─────────────────────────────────────────────────────────────────────

function wait(ms) {
  return new Promise(r => setTimeout(r, ms))
}
