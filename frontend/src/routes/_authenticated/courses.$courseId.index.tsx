import { createFileRoute } from "@tanstack/react-router"
import {
  LuFiles,
  LuMail,
  LuMegaphone,
  LuRefreshCcw,
  LuUsers,
} from "react-icons/lu"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  SectionList,
  AssignmentList,
} from "@/routes/-components/courseDetailLists"
import {
  sectionsQueryOptions,
  assignmentsQueryOptions,
  courseQueryOptions,
  canvasCourseQueryOptions,
} from "@/utils/queryOptions"
import { seo } from "@/utils/utils"
import { CanvasCourse, Course, Section } from "@/utils/fetchData"
import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query"
import { TBreadcrumbItem } from "../-components/breadcrumbs"
import { Button } from "@/components/ui/button"
import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  AllProgressCompleted,
  SelectCourseSections,
} from "../-components/syncCanvasCourse"

export const Route = createFileRoute("/_authenticated/courses/$courseId/")({
  parseParams: (params) => ({
    courseId: parseInt(params.courseId),
  }),
  stringifyParams: (params) => ({
    courseId: params.courseId.toString(),
  }),
  loader: async (opts) => {
    const courseId = opts.params.courseId
    const coursePromise = opts.context.queryClient.ensureQueryData(
      courseQueryOptions(courseId)
    )
    const sectionsPromise = opts.context.queryClient.ensureQueryData(
      sectionsQueryOptions(courseId)
    )
    const assignmentsPromise = opts.context.queryClient.ensureQueryData(
      assignmentsQueryOptions(courseId)
    )

    // parallelize the two queries
    const [course, sections, assignments] = await Promise.all([
      coursePromise,
      sectionsPromise,
      assignmentsPromise,
    ])
    console.log("course", course)
    console.log("sections", sections)
    console.log("assignments", assignments)
    return {
      course: course,
      sections: sections,
      assignments: assignments,
      title: course.course_code ?? course.name ?? "Course",
      breadcrumbItems: getBreadcrumbItems(course),
    }
  },
  meta: ({ loaderData }) =>
    seo({
      title: loaderData?.title,
    }),
  component: CourseDashboard,
})

function getBreadcrumbItems(course: Course): TBreadcrumbItem[] {
  return [
    {
      title: "Home",
      to: "/",
      params: {},
    },
    {
      title: course.course_code ?? course.name ?? "Course",
      to: "/courses/$courseId",
      params: { courseId: course.id },
    },
  ]
}

function CourseDashboard() {
  const courseId = Route.useParams().courseId
  const [{ data: course }] = useSuspenseQueries({
    queries: [courseQueryOptions(courseId)],
  })
  const [{ data: sections }, { data: assignments }] = useSuspenseQueries({
    queries: [
      sectionsQueryOptions(courseId),
      assignmentsQueryOptions(courseId),
    ],
  })
  const total_sub_count = assignments.reduce(
    (acc, assignment) => acc + assignment.submission_count,
    0
  )
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-5xl font-bold">
          {course?.name ?? "Course with ID" + course?.canvas_id}
        </h1>
        <div className="flex flex-row items-center justify-center gap-2">
          <p className="text-2xl text-muted-foreground">
            {course?.course_code} {course?.term ? `(${course?.term})` : ""}
          </p>
          {course.canvas_id && <SyncCourseDialogWithTrigger course={course} existing_sections={sections} />}
        </div>
      </div>
      <div className="grid gap-4 grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <LuUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sections.reduce(
                (acc, section) => acc + section.students_count,
                0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              99 active enrollments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <LuFiles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total_sub_count}</div>
            <p className="text-xs text-muted-foreground">99 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <LuMail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">999</div>
            <p className="text-xs text-muted-foreground">99 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Announcements</CardTitle>
            <LuMegaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">999</div>
            <p className="text-xs text-muted-foreground">99 this week</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2 lg:order-last">
          <CardContent className="grid gap-0 px-0">
            <AssignmentList assignments={assignments} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Sections</CardTitle>
              <CardDescription></CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <SectionList sections={sections} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function SyncCourseDialogWithTrigger({ course, existing_sections }: { course: Course, existing_sections: Section[] }) {
  const defaultStep = 1
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [step, setStep] = React.useState(defaultStep)
  const [courseId, setCourseId] = React.useState(course.id)
  const [canvasCourse, setCanvasCourse] = React.useState<CanvasCourse | null>(
    null
  )
  const courseCanvasId = course.canvas_id
  // define the three steps of the dialog
  // choose the type (sync from canvas or add manually)
  // if sync from canvas, show the list of courses to choose from
  // if add manually, show the form to add the course
  return (
    <Dialog
      open={addDialogOpen}
      onOpenChange={(open) => {
        setAddDialogOpen(open)
        if (!open) {
          // should also abort any ongoing requests
          setStep(defaultStep)
          setCanvasCourse(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          title="Sync Course with Canvas"
        >
          Sync with Canvas <LuRefreshCcw className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync Course {step}</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="h-96">
          {step === 1 && (
            <FetchCanvasCourse
              setStep={setStep}
              setCanvasCourse={setCanvasCourse}
              courseCanvasId={courseCanvasId}
            />
          )}
          {step === 2 && canvasCourse && (
            <SelectCourseSections
              existingSections={existing_sections}
              selectedCanvasCourse={canvasCourse}
              setStep={setStep}
              setCourseId={setCourseId}
            />
          )}
          {step === 3 && <AllProgressCompleted courseId={courseId} setAddDialogOpen={setAddDialogOpen} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FetchCanvasCourse({
  courseCanvasId,
  setStep,
  setCanvasCourse,
}: {
  courseCanvasId: string
  setStep: React.Dispatch<React.SetStateAction<number>>
  setCanvasCourse: React.Dispatch<React.SetStateAction<CanvasCourse | null>>
}) {
  const { data: canvasCourse } = useSuspenseQuery(
    canvasCourseQueryOptions(courseCanvasId)
  )
  React.useEffect(() => {
    if (canvasCourse) {
      console.log("canvasCourse", canvasCourse)
      setCanvasCourse(canvasCourse)
      setStep(2)
    }
  }, [canvasCourse, setCanvasCourse, setStep])
  if (!canvasCourse) {
    return (
      <div className="grid grid-cols-1 h-full">
        <div className="flex justify-center items-center">
          <p>Loading course details from Canvas. This may take a while...</p>
        </div>
      </div>
    )
  }
}
