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
import { LuVenetianMask, LuCheck, LuImage, LuSettings2 } from "react-icons/lu"
import { FaRegFilePdf } from "react-icons/fa"
import { PaperSubmissionImage, Submission } from "@/utils/types"
import { FaRobot } from "react-icons/fa6"

function PageIcon({ page }: { page: number | string }) {
  return (
    <div className="flex items-center justify-center border border-gray-300 bg-slate-200 text-gray-700 text-xs font-bold rounded-none rounded-tl-sm rounded-br-sm h-8 aspect-[0.77]">
      {page}
    </div>
  )
}

export function InfoExtractedSidebar({
  submission,
  containerRef,
}: {
  submission: Submission
  containerRef: React.RefObject<HTMLDivElement>
}) {
  const extractedFields = submission.extracted_fields
  if (!extractedFields) {
    return null
  }

  // Create map for images keyed by id (as string)
  const imagesMap = new Map(
    submission.papersubmission_images.map((img) => [img.id.toString(), img])
  )

  // Group items by title
  const groupedFields = extractedFields.reduce(
    (acc, field) => {
      const key = field.info_field.title
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(field)
      return acc
    },
    {} as Record<string, typeof extractedFields>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Accordion
          type="multiple"
          className="w-full"
          defaultValue={Object.keys(groupedFields)}
        >
          {Object.entries(groupedFields).map(([title, fields]) => (
            <AccordionItem key={title} value={title}>
              <AccordionTrigger>
                {title.replace(/_/g, " ").toUpperCase()}
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-2">
                  {/* Write the description only once under the title */}
                  <p className="text-xs text-gray-500">
                    {fields[0].info_field.description}
                  </p>
                  {fields
                    .slice()
                    .sort((a, b) => {
                      const aPage =
                        imagesMap.get(a.paper_submission_image_id)?.page ??
                        Number.MAX_VALUE
                      const bPage =
                        imagesMap.get(b.paper_submission_image_id)?.page ??
                        Number.MAX_VALUE
                      return aPage - bPage
                    })
                    .map((field, index) => {
                      const image = imagesMap.get(
                        field.paper_submission_image_id
                      )
                      const handleScroll = () => {
                        if (containerRef.current) {
                          const totalPages =
                            submission.papersubmission_images.length
                          const page = image ? image.page : 1
                          containerRef.current.scrollTop =
                            (containerRef.current.scrollHeight / totalPages) *
                            (page - 1)
                        }
                      }
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={handleScroll}
                        >
                          {image ? (
                            <PageIcon page={image.page} />
                          ) : (
                            <PageIcon page="N/A" />
                          )}
                          <Card className="p-2">
                            <p>{field.value}</p>
                          </Card>
                        </div>
                      )
                    })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  )
}

export function SubmissionSettingsSidebar({
  initialQuestionFocus,
  setInitialQuestionFocus,
  zoomImgPercent,
  setZoomImgPercent,
  anonymousGrading,
  setAnonymousGrading,
  rendeder,
  setRenderer,
}: {
  initialQuestionFocus: number | null
  setInitialQuestionFocus: (value: number | null) => void
  zoomImgPercent: number
  setZoomImgPercent: (value: number) => void
  anonymousGrading: boolean
  setAnonymousGrading: (value: boolean) => void
  rendeder: "pdf" | "images"
  setRenderer: (value: "pdf" | "images") => void
}) {
  return (
    <>
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

export function LeftSidebar({
  initialQuestionFocus,
  setInitialQuestionFocus,
  zoomImgPercent,
  setZoomImgPercent,
  anonymousGrading,
  setAnonymousGrading,
  rendeder,
  setRenderer,
  submission,
  containerRef,
}: {
  initialQuestionFocus: number | null
  setInitialQuestionFocus: (value: number | null) => void
  zoomImgPercent: number
  setZoomImgPercent: (value: number) => void
  anonymousGrading: boolean
  setAnonymousGrading: (value: boolean) => void
  rendeder: "pdf" | "images"
  setRenderer: (value: "pdf" | "images") => void
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
          <LuSettings2 className="h-5 w-5" />
          <span className="hidden md:block">Controls</span>
        </TabsTrigger>
        <TabsTrigger value="info" className="flex items-center gap-2 mx-auto">
          <FaRobot className="h-5 w-5" />
          <span className="hidden md:block">Info</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="controls" className="flex flex-col gap-4">
        <SubmissionSettingsSidebar
          initialQuestionFocus={initialQuestionFocus}
          setInitialQuestionFocus={setInitialQuestionFocus}
          zoomImgPercent={zoomImgPercent}
          setZoomImgPercent={setZoomImgPercent}
          anonymousGrading={anonymousGrading}
          setAnonymousGrading={setAnonymousGrading}
          rendeder={rendeder}
          setRenderer={setRenderer}
        />
      </TabsContent>
      <TabsContent value="info">
        <InfoExtractedSidebar
          submission={submission}
          containerRef={containerRef}
        />
      </TabsContent>
    </Tabs>
  )
}
