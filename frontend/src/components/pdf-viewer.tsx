import * as React from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { useDebounceCallback, useResizeObserver } from "usehooks-ts"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

const maxWidth = 800

type Size = {
  width?: number
  height?: number
}

export const PdfViewer = ({
  url,
  zoom_percent,
  setFullRenderSuccess,
}: {
  url: string
  zoom_percent: number
  setFullRenderSuccess: (value: boolean) => void
}) => {
  const docContainerRef = React.useRef<HTMLDivElement>(null)
  const [numPages, setNumPages] = React.useState<number>(0)
  const [successRenderCount, setSuccessRenderCount] = React.useState<number>(0)

  const [{ width }, setSize] = React.useState<Size>({
    width: undefined,
    height: undefined,
  })

  const onResize = useDebounceCallback(setSize, 100)

  useResizeObserver({
    ref: docContainerRef,
    onResize,
  })

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setSuccessRenderCount(0)
  }

  React.useEffect(() => {
    if (successRenderCount === numPages && numPages > 0) {
      console.log("FullRenderSuccess")
      setFullRenderSuccess(true)
    }
  }, [successRenderCount, numPages, setFullRenderSuccess])

  return (
    <div ref={docContainerRef} className="container mx-0 px-0">
      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        className="flex flex-col justify-center items-center"
        loading=""
      >
        {Array.from(new Array(numPages), (_, index) => {
          const pageWidth = Math.min(maxWidth, width || maxWidth)

          return (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              canvasBackground="transparent"
              onRenderSuccess={() => {
                setSuccessRenderCount((prev) => prev + 1)
              }}
              width={pageWidth * (zoom_percent / 100)}
              loading=""
            />
          )
        })}
      </Document>
    </div>
  )
}
