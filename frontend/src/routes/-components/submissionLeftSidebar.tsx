import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card } from "@/components/ui/card"
import { LuVenetianMask, LuCheck, LuImage } from "react-icons/lu"
import { FaRegFilePdf } from "react-icons/fa"
import { PaperSubmissionImage, Submission } from "@/utils/types"

// Component: SubmissionSettingsSidebar
export function SubmissionSettingsSidebar({
  pageValue,
  setPageValue,
  initialQuestionFocus,
  setInitialQuestionFocus,
  zoomImgPercent,
  setZoomImgPercent,
  anonymousGrading,
  setAnonymousGrading,
  rendeder,
  setRenderer,
  images,
  containerRef,
}: {
  pageValue: number
  setPageValue: (value: number) => void
  initialQuestionFocus: number | null
  setInitialQuestionFocus: (value: number | null) => void
  zoomImgPercent: number
  setZoomImgPercent: (value: number) => void
  anonymousGrading: boolean
  setAnonymousGrading: (value: boolean) => void
  rendeder: "pdf" | "images"
  setRenderer: (value: "pdf" | "images") => void
  images: PaperSubmissionImage[]
  containerRef: React.RefObject<HTMLDivElement>
}) {
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const newPageValue = (pageValue % images.length) + 1
          setPageValue(newPageValue)
          if (containerRef.current) {
            const cardDiv = containerRef.current
            cardDiv.scrollTop =
              (cardDiv.scrollHeight / images.length) * (newPageValue - 1)
          }
        }}
      >
        Page {pageValue} of {images.length}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          setInitialQuestionFocus(initialQuestionFocus === 0 ? 1 : 0)
        }
      >
        Q {initialQuestionFocus ? initialQuestionFocus + 1 : 1}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const newZoom = zoomImgPercent === 50 ? 100 : zoomImgPercent - 10
          setZoomImgPercent(newZoom)
        }}
      >
        Zoom {zoomImgPercent.toFixed(0)}%
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="space-x-2"
        onClick={() => setAnonymousGrading(!anonymousGrading)}
      >
        <LuVenetianMask size={20} title="Anonymous Grading" />
        {anonymousGrading ? <LuCheck size={20} /> : null}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setRenderer(rendeder === "images" ? "pdf" : "images")}
      >
        {rendeder === "images" ? (
          <LuImage size={20} />
        ) : (
          <FaRegFilePdf size={20} />
        )}
      </Button>
    </>
  )
}

// Component: InfoExtractedSidebar
export function InfoExtractedSidebar({
  submission,
}: {
  submission: Submission
}) {
  const extractedFields = submission.extracted_fields
  if (!extractedFields) {
    return null
  }
  return (
    extractedFields && (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Accordion
            type="multiple"
            className="w-full"
            defaultValue={extractedFields.map(
              (field) => field.info_field.title
            )}
          >
            {extractedFields.map((field) => (
              <AccordionItem
                key={field.info_field.title}
                value={field.info_field.title}
              >
                <AccordionTrigger>
                  {field.info_field.title.replace(/_/g, " ").toUpperCase()}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-gray-500">
                      {field.info_field.description}
                    </p>
                    <Card className="p-2">
                      <p>{field.value}</p>
                    </Card>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    )
  )
}

// Component: LeftSidebar
export function LeftSidebar({
  pageValue,
  setPageValue,
  initialQuestionFocus,
  setInitialQuestionFocus,
  zoomImgPercent,
  setZoomImgPercent,
  anonymousGrading,
  setAnonymousGrading,
  rendeder,
  setRenderer,
  images,
  submission,
  containerRef, // new prop
}: {
  pageValue: number
  setPageValue: (value: number) => void
  initialQuestionFocus: number | null
  setInitialQuestionFocus: (value: number | null) => void
  zoomImgPercent: number
  setZoomImgPercent: (value: number) => void
  anonymousGrading: boolean
  setAnonymousGrading: (value: boolean) => void
  rendeder: "pdf" | "images"
  setRenderer: (value: "pdf" | "images") => void
  images: PaperSubmissionImage[]
  submission: Submission
  containerRef: React.RefObject<HTMLDivElement>
}) {
  return (
    <Tabs defaultValue="info">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger
          value="controls"
          className="flex items-center gap-2 mx-auto"
        >
          <LuVenetianMask className="h-5 w-5" />
          <span className="hidden md:block">Controls</span>
        </TabsTrigger>
        <TabsTrigger value="info" className="flex items-center gap-2 mx-auto">
          <span className="hidden md:block">Info</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="controls" className="flex flex-col gap-4">
        <SubmissionSettingsSidebar
          pageValue={pageValue}
          setPageValue={setPageValue}
          initialQuestionFocus={initialQuestionFocus}
          setInitialQuestionFocus={setInitialQuestionFocus}
          zoomImgPercent={zoomImgPercent}
          setZoomImgPercent={setZoomImgPercent}
          anonymousGrading={anonymousGrading}
          setAnonymousGrading={setAnonymousGrading}
          rendeder={rendeder}
          setRenderer={setRenderer}
          images={images}
          containerRef={containerRef}
        />
      </TabsContent>
      <TabsContent value="info">
        <InfoExtractedSidebar submission={submission} />
      </TabsContent>
    </Tabs>
  )
}
