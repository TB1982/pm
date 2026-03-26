'use strict'
const { contextBridge, ipcRenderer } = require('electron')

const listenerMap = new WeakMap()

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

  send: (channel, ...args) => ipcRenderer.send(channel, ...args),

  on: (channel, callback) => {
    const wrapper = (_, ...args) => callback(...args)
    listenerMap.set(callback, wrapper)
    ipcRenderer.on(channel, wrapper)
  },

  removeListener: (channel, callback) => {
    const wrapper = listenerMap.get(callback)
    if (wrapper) ipcRenderer.removeListener(channel, wrapper)
  }
})
