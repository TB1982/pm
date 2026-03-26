'use strict'
const { contextBridge, ipcRenderer, clipboard, nativeImage } = require('electron')

const INVOKE_CH = new Set([
  'save-image-as', 'get-brand-colors', 'save-brand-colors',
  'ocr-recognize', 'privacy-scan',
])
const ON_CH = new Set(['load-image', 'ocr-progress'])
const SEND_CH = new Set(['close-editor-window', 'start-drag-export'])

// Map user-land callbacks → wrapped callbacks (for removeListener)
const listenerMap = new WeakMap()

contextBridge.exposeInMainWorld('electronAPI', {
  invoke(channel, ...args) {
    if (!INVOKE_CH.has(channel)) throw new Error(`[preload] blocked invoke: ${channel}`)
    return ipcRenderer.invoke(channel, ...args)
  },

  send(channel, ...args) {
    if (!SEND_CH.has(channel)) throw new Error(`[preload] blocked send: ${channel}`)
    ipcRenderer.send(channel, ...args)
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

  clipboard: {
    writeText:  (text)    => clipboard.writeText(text),
    writeImage: (dataURL) => clipboard.writeImage(nativeImage.createFromDataURL(dataURL)),
    clear:      ()        => clipboard.clear(),
  },
})
