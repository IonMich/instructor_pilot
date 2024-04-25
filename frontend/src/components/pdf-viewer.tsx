const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
import { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist/legacy/build/pdf.mjs"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export const subPdfRender = ({ url }: { url: string }) => {
  let currPage = 1 //Pages are 1-based not 0-based
  let numPages = 0
  let thePDF = null as PDFDocumentProxy | null
  const loadingTask = pdfjs.getDocument(url)
  const canvasDiv = document.getElementById("the-canvas-div") as HTMLDivElement
  if (canvasDiv === null) {
    console.error("Canvas not found")
    return
  }
  loadingTask.promise.then(function (pdf) {
    numPages = pdf.numPages
    console.log("# Number of pages: " + numPages)
    thePDF = pdf
    pdf.getPage(1).then((page) => {
      handlePages(page)
    })
  })
  function handlePages(page: PDFPageProxy) {
    const canvasesRendered = document.querySelectorAll("canvas")
    // if the-canvas-{currPage} already exists, remove it
    canvasesRendered.forEach((canvas) => {
      if (canvas.id === `the-canvas-${currPage}`) {
        canvas.remove()
      }
    })
    const canvas = document.createElement("canvas")
    canvas.id = `the-canvas-${currPage}`
    canvas.classList.add("mx-auto")
    const viewport = page.getViewport({ scale: 1.1 })
    canvasDiv.appendChild(canvas)

    if (canvas === null) {
      console.error("Canvas not found")
      return
    }
    canvas.style.display = "block"
    const context = canvas.getContext("2d")
    if (context === null) {
      console.error("Context not found")
      return
    }

    canvas.width = viewport.width
    canvas.height = viewport.height

    //Draw it on the canvas
    page.render({ canvasContext: context, viewport: viewport })

    //Move to next page
    currPage++
    if (thePDF !== null && currPage <= numPages) {
      thePDF.getPage(currPage).then(handlePages)
    }
  }
}
