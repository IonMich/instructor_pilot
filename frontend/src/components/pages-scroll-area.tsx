import * as React from "react"
import { useDebounceCallback, useResizeObserver } from "usehooks-ts"
import { useTheme } from "@/components/theme-provider"
import { PaperSubmissionImage } from "@/utils/types"
import { cn } from "@/lib/utils"

interface PagesScrollAreaProps {
  images: PaperSubmissionImage[]
  zoomImgPercent: number
  allImgsLoaded: boolean
  setFullRenderSuccess: (loaded: boolean) => void
  anonymousGrading?: boolean // new prop
}

export function PagesScrollArea({
  images,
  zoomImgPercent,
  allImgsLoaded,
  setFullRenderSuccess,
  anonymousGrading,
}: PagesScrollAreaProps) {
  const { theme } = useTheme()
  const [numLoadedImages, setNumLoadedImages] = React.useState(0)

  // New zoom functionality using resize observer
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = React.useState(800)
  const onResize = useDebounceCallback((size: { width?: number }) => {
    if (size.width !== undefined) setContainerWidth(size.width)
  }, 100)
  useResizeObserver({ ref: containerRef, onResize })
  const maxWidth = 800
  const effectiveWidth =
    Math.min(maxWidth, containerWidth) * (zoomImgPercent / 100)

  const handleImageLoad = () => {
    setNumLoadedImages((prev) => prev + 1)
  }

  React.useEffect(() => {
    if (numLoadedImages === images.length) {
      setFullRenderSuccess(true)
    }
  }, [numLoadedImages, images.length, setFullRenderSuccess])

  React.useEffect(() => {
    setNumLoadedImages(0)
  }, [images])

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      {images.map((image) => (
        <img
          key={image.id}
          src={image.image}
          alt={`Page ${image.page}`}
          onLoad={handleImageLoad}
          style={{ width: effectiveWidth }}
          className={cn(
            allImgsLoaded ? "block" : "hidden",
            theme === "dark" && "invert brightness-[0.9] contrast-[0.9]",
            anonymousGrading &&
              "[clip-path:polygon(0%_15%,0%_100%,100%_100%,100%_0%,50%_0%,50%_15%)]",
            "mx-auto"
          )}
        />
      ))}
    </div>
  )
}
