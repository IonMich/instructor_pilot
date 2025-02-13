import * as React from "react"
import { Submission } from "@/utils/types"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query"
import { PagesScrollArea } from "@/components/pages-scroll-area"
import { PdfViewer } from "@/components/pdf-viewer"
import { LeftSidebar } from "./submissionLeftSidebar"
import { RightSidebar } from "./submissionRightSidebar"
import {
  assignmentQueryOptions,
  studentsInCourseQueryOptions,
  submissionQueryOptions,
  submissionsQueryOptions,
} from "@/utils/queryOptions"
import { PagesCardToolbar } from "@/components/pages-card-toolbar"

function findPrevSubmission(submission: Submission, submissions: Submission[]) {
  const currentSubmissionIndex = submissions.findIndex(
    (s) => s.id === submission.id
  )
  if (currentSubmissionIndex === 0) {
    return null
  }
  return submissions[currentSubmissionIndex - 1]
}

function findNextSubmission(submission: Submission, submissions: Submission[]) {
  const currentSubmissionIndex = submissions.findIndex(
    (s) => s.id === submission.id
  )
  if (currentSubmissionIndex === submissions.length - 1) {
    return null
  }
  return submissions[currentSubmissionIndex + 1]
}

function navigateOnKey(e: React.KeyboardEvent) {
  if (e.key === "ArrowLeft") {
    e.preventDefault()
    const prevButton = document.querySelector(
      "button[aria-label='Previous']"
    ) as HTMLButtonElement | null
    prevButton?.focus()
    prevButton?.click()
  } else if (e.key === "ArrowRight") {
    e.preventDefault()
    const nextButton = document.querySelector(
      "button[aria-label='Next']"
    ) as HTMLButtonElement | null
    nextButton?.focus()
    nextButton?.click()
  }
}

export function SubmissionDetail({
  submissionId,
  enableNavigation,
}: {
  submissionId: string
  enableNavigation: boolean
}) {
  // const { theme } = useTheme()
  const [allImgsLoaded, setFullRenderSuccess] = React.useState(false)
  const { data: submission } = useSuspenseQuery(
    submissionQueryOptions(submissionId)
  )
  const assignmentId = submission.assignment.id
  const courseId = submission.assignment.course.id
  const [{ data: assignment }, { data: submissions }, { data: students }] =
    useSuspenseQueries({
      queries: [
        assignmentQueryOptions(assignmentId),
        submissionsQueryOptions(assignmentId),
        studentsInCourseQueryOptions(courseId),
      ],
    })

  console.log(assignment)

  // navigation
  const prevSubmission = findPrevSubmission(submission, submissions)
  const nextSubmission = findNextSubmission(submission, submissions)
  const prevSubmissionUrl = prevSubmission
    ? `/submissions/${prevSubmission.id}`
    : undefined
  const nextSubmissionUrl = nextSubmission
    ? `/submissions/${nextSubmission.id}`
    : undefined

  // scrolling
  const imgDivScrollHeights = [2.2, 3.2]
  const [initialQuestionFocus, setInitialQuestionFocus] = React.useState(
    enableNavigation ? 0 : null
  )
  const scrollHeightImgDiv = initialQuestionFocus
    ? imgDivScrollHeights[initialQuestionFocus]
    : 0
  const [pageValue, setPageValue] = React.useState(1)
  const [zoomImgPercent, setZoomImgPercent] = React.useState(100)
  const [anonymousGrading, setAnonymousGrading] = React.useState(false)
  // pdf or image rendering
  const [rendeder, setRenderer] = React.useState<"pdf" | "images">("images")
  const pagesContainerRef = React.useRef<HTMLDivElement>(null)
  const images = submission?.papersubmission_images ?? []
  const numImages = images.length

  const [isScrolling, setIsScrolling] = React.useState(false)

  React.useEffect(() => {
    if (isScrolling) {
      const timer = setTimeout(() => setIsScrolling(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [isScrolling])

  React.useEffect(() => {
    setFullRenderSuccess(false)
  }, [submission.id, rendeder])

  // on all images loaded, scroll to the middle of the image div
  React.useEffect(() => {
    if (allImgsLoaded) {
      const cardDiv = pagesContainerRef.current
      console.log(cardDiv)
      if (cardDiv) {
        cardDiv.scrollTop =
          (cardDiv.scrollHeight / numImages) * scrollHeightImgDiv
        return
      }
      const canvasContainer =
        document.querySelector("canvas")?.parentElement?.parentElement
      const imgCard = canvasContainer?.parentElement?.parentElement
      if (imgCard && numImages) {
        imgCard.scrollTop =
          (imgCard.scrollHeight / numImages) * scrollHeightImgDiv
      }
    }
  }, [allImgsLoaded, scrollHeightImgDiv, numImages])

  return (
    <>
      <div
        tabIndex={-1}
        onKeyDown={(e) => {
          // if in textarea or input, don't navigate
          if (e.target instanceof HTMLTextAreaElement) {
            return
          }
          navigateOnKey(e)
        }}
        className="container grid grid-cols-9 md:gap-4 gap-1 px-0 py-0 focus:outline-none"
      >
        <Card className="md:h-[85vh] col-span-2 p-4 hidden lg:flex my-2 flex-col gap-4">
          <LeftSidebar
            initialQuestionFocus={initialQuestionFocus}
            setInitialQuestionFocus={setInitialQuestionFocus}
            zoomImgPercent={zoomImgPercent}
            setZoomImgPercent={setZoomImgPercent}
            anonymousGrading={anonymousGrading}
            setAnonymousGrading={setAnonymousGrading}
            rendeder={rendeder}
            setRenderer={setRenderer}
            submission={submission}
            containerRef={pagesContainerRef}
          />
        </Card>
        <div className="lg:col-span-5 md:col-span-7 col-span-9 md:py-2 py-0">
          <div className="relative group">
            <Card
              ref={pagesContainerRef}
              onScroll={(e) => {
                setIsScrolling(true)
                const scrollTop = e.currentTarget.scrollTop
                const scrollHeight = e.currentTarget.scrollHeight
                const pageHeight = numImages ? scrollHeight / numImages : 0
                const newPage =
                  numImages && pageHeight
                    ? Math.floor((scrollTop + pageHeight / 3) / pageHeight) + 1
                    : 1
                if (newPage !== pageValue) {
                  setPageValue(newPage)
                }
              }}
              className={cn(
                "h-[70vh] md:h-[85vh] overflow-y-auto",
                allImgsLoaded ? "bg-gray-500" : "bg-accent"
              )}
            >
              <PagesCardToolbar
                pageValue={pageValue}
                setPageValue={setPageValue}
                numImages={numImages}
                pagesContainerRef={pagesContainerRef}
                zoomImgPercent={zoomImgPercent}
                setZoomImgPercent={setZoomImgPercent}
                isScrolling={isScrolling}
              />
              {rendeder === "images" ? (
                // ----Image Rendering----
                <PagesScrollArea
                  images={images}
                  zoomImgPercent={zoomImgPercent}
                  allImgsLoaded={allImgsLoaded}
                  anonymousGrading={anonymousGrading}
                  setFullRenderSuccess={setFullRenderSuccess}
                />
              ) : (
                // ----PDF Rendering----
                <PdfViewer
                  url={submission.pdf}
                  zoom_percent={zoomImgPercent}
                  anonymousGrading={anonymousGrading}
                  setFullRenderSuccess={setFullRenderSuccess}
                />
              )}
            </Card>
          </div>
        </div>
        {/* Right sidebar */}
        <RightSidebar
          submission={submission}
          assignment={assignment}
          enableNavigation={enableNavigation}
          prevSubmission={prevSubmission}
          nextSubmission={nextSubmission}
          prevSubmissionUrl={prevSubmissionUrl}
          nextSubmissionUrl={nextSubmissionUrl}
          initialQuestionFocus={initialQuestionFocus}
          students={students}
          anonymousGrading={anonymousGrading}
        />
      </div>
    </>
  )
}
