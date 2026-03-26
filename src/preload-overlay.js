'use strict'
const { contextBridge, ipcRenderer } = require('electron')

const listenerMap = new WeakMap()

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

  on: (channel, callback) => {
    const wrapper = (_, ...args) => callback(...args)
    listenerMap.set(callback, wrapper)
    ipcRenderer.on(channel, wrapper)
  }
})
