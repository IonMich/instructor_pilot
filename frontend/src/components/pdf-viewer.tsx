const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export const subPdfRender = ({ url }: { url: string }) => {
  const loadingTask = pdfjs.getDocument(url)
  loadingTask.promise.then(function (pdf) {
    const scale = 1.5
    pdf.getPage(1).then(function (page) {
      // you can now use *page* here
      const viewport = page.getViewport({ scale: scale })
      // Support HiDPI-screens.
      const outputScale = window.devicePixelRatio || 1

      const canvas = document.getElementById("the-canvas") as HTMLCanvasElement
      if (!canvas) {
        console.log("Canvas not found")
        return
      }
      const context = canvas.getContext("2d")
      if (!context) {
        console.log("Context not found")
        return
      }

      canvas.width = Math.floor(viewport.width * outputScale)
      canvas.height = Math.floor(viewport.height * outputScale)
      canvas.style.width = Math.floor(viewport.width) + "px"
      canvas.style.height = Math.floor(viewport.height) + "px"

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      }
      page.render(renderContext)
    })
  })
}
