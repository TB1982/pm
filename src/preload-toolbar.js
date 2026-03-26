'use strict'
const { contextBridge, ipcRenderer } = require('electron')

const INVOKE_CH = new Set([
  'resize-for-modal', 'resize-to-toolbar', 'open-permission-settings',
  'capture-fullscreen', 'get-window-sources', 'capture-window',
  'open-overlay', 'open-image-file',
  'select-batch-files', 'select-output-dir', 'select-watermark-image',
  'batch-convert',
])
const ON_CH = new Set([
  'shortcut-fullscreen', 'shortcut-window', 'shortcut-rect',
  'capture-result', 'batch-progress',
])

const listenerMap = new WeakMap()

contextBridge.exposeInMainWorld('electronAPI', {
  invoke(channel, ...args) {
    if (!INVOKE_CH.has(channel)) throw new Error(`[preload] blocked invoke: ${channel}`)
    return ipcRenderer.invoke(channel, ...args)
  },

  on(channel, callback) {
    if (!ON_CH.has(channel)) throw new Error(`[preload] blocked on: ${channel}`)
    const wrapped = (_, ...args) => callback(...args)
    listenerMap.set(callback, wrapped)
    ipcRenderer.on(channel, wrapped)
  },

  removeListener(channel, callback) {
    const wrapped = listenerMap.get(callback)
    if (wrapped) {
      ipcRenderer.removeListener(channel, wrapped)
      listenerMap.delete(callback)
    }
  },
})
