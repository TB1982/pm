// OCR utility process — runs in a clean Node.js context (worker_threads supported)
// Spawned by main.js via utilityProcess.fork()

const { createWorker } = require('tesseract.js')

process.parentPort.on('message', async ({ data }) => {
  const { dataURL, cachePath } = data
  try {
    const worker = await createWorker(['chi_tra', 'eng'], 1, {
      cachePath,
      logger: m => {
        process.parentPort.postMessage({
          type: 'progress',
          status: m.status,
          progress: m.progress || 0
        })
      }
    })

    const { data: { text } } = await worker.recognize(dataURL)
    await worker.terminate()
    process.parentPort.postMessage({ type: 'result', success: true, text: text.trim() })
  } catch (err) {
    process.parentPort.postMessage({ type: 'result', success: false, error: err.message })
  }
})
