'use strict'
const { contextBridge, ipcRenderer } = require('electron')

const INVOKE_CH = new Set([
  'capture-selected-screen', 'capture-all-screens-merged', 'cancel-screen-select',
])
const ON_CH = new Set(['screen-select-init'])

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
})
