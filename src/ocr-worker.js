// OCR worker — runs as a worker_threads Worker inside Electron main process
const { workerData, parentPort } = require('worker_threads')
const { createWorker } = require('tesseract.js')

async function run() {
  const { dataURL, cachePath } = workerData
  try {
    const worker = await createWorker(['chi_tra', 'eng'], 1, {
      cachePath,
      logger: m => {
        parentPort.postMessage({
          type: 'progress',
          status: m.status,
          progress: m.progress || 0
        })
      }
    })

    const { data: { text } } = await worker.recognize(dataURL)
    await worker.terminate()
    parentPort.postMessage({ type: 'result', success: true, text: text.trim() })
  } catch (err) {
    parentPort.postMessage({ type: 'result', success: false, error: err.message })
  }
}

run()
