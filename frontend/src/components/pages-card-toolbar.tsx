import * as React from "react"
import { LuArrowUp, LuArrowDown, LuZoomIn, LuZoomOut } from "react-icons/lu"
import { Separator } from "@/components/ui/separator"

interface PagesCardToolbarProps {
  pageValue: number
  setPageValue: (value: number) => void
  numImages: number
  pagesContainerRef: React.RefObject<HTMLDivElement>
  zoomImgPercent: number
  setZoomImgPercent: (value: number) => void
  isScrolling: boolean
}

export function PagesCardToolbar({
  pageValue,
  setPageValue,
  numImages,
  pagesContainerRef,
  zoomImgPercent,
  setZoomImgPercent,
  isScrolling,
}: PagesCardToolbarProps) {
  const scrollToPage = (newPage: number) => {
    if (pagesContainerRef.current) {
      const scrollHeight = pagesContainerRef.current.scrollHeight
      pagesContainerRef.current.scrollTop = (scrollHeight / numImages) * (newPage - 1)
    }
  }
  return (
    <div
      // Added frosted glass effect on hover with backdrop-blur and semi-transparent background
      className={`absolute top-[5px] left-1/2 transform -translate-x-1/2 rounded-xl py-2 px-8 text-center backdrop-blur-md bg-white/30 transition-all duration-300 flex items-center justify-center 
     ${isScrolling ? "opacity-50" : "opacity-0 hover:opacity-100"}`}
    >
      <button
        onClick={() => {
          if (pageValue > 1) {
            const newPage = pageValue - 1
            setPageValue(newPage)
            scrollToPage(newPage)
          }
        }}
      >
        <LuArrowUp />
      </button>
      <span className="mx-2">
        Page <span className="w-[2ch] inline-block text-center">{pageValue}</span> of {numImages}
      </span>
      <button
        onClick={() => {
          if (pageValue < numImages) {
            const newPage = pageValue + 1
            setPageValue(newPage)
            scrollToPage(newPage)
          }
        }}
      >
        <LuArrowDown />
      </button>
      <Separator orientation="vertical" className="mx-4" />
      <button
        onClick={() => {
          if (zoomImgPercent > 50) setZoomImgPercent(zoomImgPercent - 10)
        }}
        aria-label="Zoom Out"
        disabled={zoomImgPercent <= 50}
      >
        <LuZoomOut />
      </button>
      <span className="text-sm mx-2">{zoomImgPercent}%</span>
      <button
        onClick={() => {
          if (zoomImgPercent < 100) setZoomImgPercent(zoomImgPercent + 10)
        }}
        aria-label="Zoom In"
        disabled={zoomImgPercent >= 100}
      >
        <LuZoomIn />
      </button>
    </div>
  )
}
