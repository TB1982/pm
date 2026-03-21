const {
  app, BrowserWindow, globalShortcut,
  screen, ipcMain, systemPreferences,
  clipboard, nativeImage, shell
} = require('electron')
const { exec } = require('child_process')
const { promisify } = require('util')
const path = require('path')
const fs   = require('fs')
const os   = require('os')

const execAsync = promisify(exec)

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

// Check macOS Screen Recording permission
function screenPermissionStatus() {
  if (process.platform !== 'darwin') return 'granted'
  try {
    return systemPreferences.getMediaAccessStatus('screen') // 'granted'|'denied'|'restricted'|'unknown'|'not-determined'
  } catch {
    return 'unknown'
  }
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
  const status = screenPermissionStatus()
  if (status === 'denied' || status === 'restricted') {
    return { success: false, needsPermission: true }
  }

  // Determine display BEFORE minimizing
  const display = mainWindowDisplay()
  const { bounds } = display

  mainWindow.minimize()
  await wait(450) // wait for macOS minimize animation

  try {
    const { image, tmpPath } = await captureGlobalRect(
      bounds.x, bounds.y, bounds.width, bounds.height
    )
    clipboard.writeImage(image)
    const { width, height } = image.getSize()

    mainWindow.restore()
    return { success: true, path: tmpPath, width, height }
  } catch (err) {
    mainWindow.restore()
    if (err.message === 'PERMISSION') return { success: false, needsPermission: true }
    return { success: false, error: err.message }
  }
})

// ─── IPC: open rectangle-selection overlay ────────────────────────────────────

ipcMain.handle('open-overlay', async () => {
  const status = screenPermissionStatus()
  if (status === 'denied' || status === 'restricted') {
    return { needsPermission: true }
  }

  const display = mainWindowDisplay()
  const { bounds } = display

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

  overlayWindow._captureDisplay = display
})

// ─── IPC: capture cropped rect ────────────────────────────────────────────────

ipcMain.handle('capture-rect', async (_, rect) => {
  const display = overlayWindow._captureDisplay
  const { bounds } = display

  overlayWindow.close()
  overlayWindow = null
  await wait(100)

  try {
    // Convert overlay-relative logical coords → global logical screen coords
    const gx = Math.round(bounds.x + rect.x)
    const gy = Math.round(bounds.y + rect.y)
    const gw = Math.round(rect.width)
    const gh = Math.round(rect.height)

    const { image, tmpPath } = await captureGlobalRect(gx, gy, gw, gh)
    clipboard.writeImage(image)
    const { width, height } = image.getSize()

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

// ─── IPC: cancel overlay ─────────────────────────────────────────────────────

ipcMain.handle('cancel-overlay', () => {
  if (overlayWindow) {
    overlayWindow.close()
    overlayWindow = null
  }
})

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
