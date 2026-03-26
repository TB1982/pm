'use strict'
const { contextBridge, ipcRenderer } = require('electron')

const INVOKE_CH = new Set(['cancel-overlay', 'capture-rect'])

contextBridge.exposeInMainWorld('electronAPI', {
  invoke(channel, ...args) {
    if (!INVOKE_CH.has(channel)) throw new Error(`[preload] blocked invoke: ${channel}`)
    return ipcRenderer.invoke(channel, ...args)
  },
})
