'use strict'
const { contextBridge, ipcRenderer, clipboard, nativeImage } = require('electron')

// Listener wrapper map: keeps original callback → wrapped handler mapping
// so removeListener works correctly across the context bridge.
const listenerMap = new WeakMap()

contextBridge.exposeInMainWorld('electronAPI', {
  // ── IPC ────────────────────────────────────────────────────────────────────
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
  },

  // ── Clipboard ───────────────────────────────────────────────────────────────
  copyImageToClipboard: (dataURL) => {
    clipboard.writeImage(nativeImage.createFromDataURL(dataURL))
  },

  copyText: (text) => clipboard.writeText(text),

  // ── PNG pHYs chunk strip (Buffer ops run here in Node context) ──────────────
  // Accepts ArrayBuffer, returns ArrayBuffer (pHYs chunk removed if present).
  stripPNGPhysChunk: (arrayBuffer) => {
    const buf = Buffer.from(arrayBuffer)
    const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10]
    for (let s = 0; s < 8; s++) if (buf[s] !== PNG_SIG[s]) return arrayBuffer
    const parts = [buf.slice(0, 8)]
    let i = 8
    while (i + 12 <= buf.length) {
      const dataLen = buf.readUInt32BE(i)
      const type    = buf.slice(i + 4, i + 8).toString('ascii')
      const total   = 4 + 4 + dataLen + 4
      if (i + total > buf.length) break
      if (type !== 'pHYs') parts.push(buf.slice(i, i + total))
      i += total
    }
    if (parts.length === 1) return arrayBuffer
    // Buffer.concat always produces a contiguous buffer with byteOffset=0
    const out = Buffer.concat(parts)
    return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength)
  }
})
