const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
import { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist/legacy/build/pdf.mjs"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export const subPdfRender = ({
  url,
  zoom_percent = 100,
}: {
  url: string
  zoom_percent: number
}) => {
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
      handlePages(page, zoom_percent)
    })
  })
  function handlePages(page: PDFPageProxy, zoom_percent: number) {
    const canvasesRendered = document.querySelectorAll("canvas")
    // if the-canvas-{currPage} already exists, remove it
    // since we are re-rendering the page
    let existingCanvasPage = null as HTMLCanvasElement | null
    canvasesRendered.forEach((canvas) => {
      if (canvas.id === `the-canvas-${currPage}`) {
        existingCanvasPage = canvas
        // canvas.remove()
      }
    })
    const canvas = document.createElement("canvas")
    canvas.id = `the-canvas-${currPage}`
    canvas.classList.add("mx-auto")
    const viewport = page.getViewport({ scale: 3.0 })
    if (existingCanvasPage !== null) {
      canvasDiv.replaceChild(canvas, existingCanvasPage)
    } else {
      canvasDiv.appendChild(canvas)
    }

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

    canvas.style.width = `${zoom_percent}%`

    //Draw it on the canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    }
    page.render(renderContext)

    //Move to next page
    currPage++
    if (thePDF !== null && currPage <= numPages) {
      thePDF.getPage(currPage).then((page) => {
        handlePages(page, zoom_percent)
      })
    }
  }
}
