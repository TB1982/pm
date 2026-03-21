const { app, BrowserWindow, globalShortcut } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
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

  win.loadFile('src/index.html')
}

app.whenReady().then(() => {
  createWindow()

  // Global shortcuts (all customizable later)
  globalShortcut.register('CommandOrControl+Ctrl+1', () => {
    // TODO: fullscreen capture (S1)
  })
  globalShortcut.register('CommandOrControl+Ctrl+2', () => {
    // TODO: window capture (S1)
  })
  globalShortcut.register('CommandOrControl+Ctrl+X', () => {
    // TODO: rectangle capture (S1)
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
