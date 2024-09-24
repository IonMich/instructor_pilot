import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LuPlus } from "react-icons/lu"
import { Link, createFileRoute } from "@tanstack/react-router"
import { coursesQueryOptions } from "@/utils/queryOptions"
import { useSuspenseQueries } from "@tanstack/react-query"
import { CanvasCourse, Course } from "@/utils/fetchData"
import { auth } from "@/utils/auth"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import React from "react"
import { Separator } from "@/components/ui/separator"
import { DialogDescription } from "@radix-ui/react-dialog"
import {
  AllProgressCompleted,
  SelectCanvasCourse,
  SelectCourseSections,
} from "../-components/syncCanvasCourse"

function getBreadcrumbItems() {
  return []
}

export const Route = createFileRoute("/_authenticated/")({
  loader: async (opts) => {
    const coursesPromise = opts.context.queryClient.ensureQueryData({
      ...coursesQueryOptions(),
      // If set to true, stale data will be refetched in the background,
      // but cached data will be returned immediately.
      revalidateIfStale: true,
    })
    const courses = await coursesPromise
    return {
      courses: courses,
      title: "Instructor Pilot",
      breadcrumbItems: getBreadcrumbItems(),
    }
  },
  component: Index,
})

function Index() {
  const user = auth.getUsername() || ""
  const [{ data: courses }] = useSuspenseQueries({
    queries: [coursesQueryOptions()],
  })
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <CoursesDeck courses={courses} user={user} />
    </div>
  )
}

function CoursesDeck({ courses, user }: { courses: Course[]; user: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="hidden lg:block"></div>
      <p className="text-2xl font-bold my-10 text-center">
        {user === "" ? "Hello!" : `Hello, ${user}!`}
        <span
          role="img"
          aria-label="wave"
          className="mx-2 inline-block hover:transform hover:scale-125 duration-200"
        >
          👋
        </span>
      </p>
      <div className="flex items-center justify-end">
        <AddCourseDialogWithTrigger />
      </div>
      {courses.map((course) => (
        <Link
          key={course.id}
          to={"/courses/$courseId"}
          params={{ courseId: course.id }}
        >
          <Card className="flex flex-col items-center justify-center h-40 p-4 hover:bg-accent duration-200">
            <p className="text-xl font-bold">
              {course.course_code} {course?.term ? course?.term : ""}
            </p>
            <p title={course.name}>
              {course.name.length > 40
                ? course.name.slice(0, 40) + "..."
                : course.name}
            </p>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function AddCourseDialogWithTrigger() {
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  // define the three steps of the dialog
  // choose the type (sync from canvas or add manually)
  // if sync from canvas, show the list of courses to choose from
  // if add manually, show the form to add the course
  const [step, setStep] = React.useState(0)
  const [addType, setAddType] = React.useState("")
  const [createdCourseId, setCreatedCourseId] = React.useState<number | null>(
    null
  )
  const [selectedCourse, setSelectedCourse] =
    React.useState<CanvasCourse | null>(null)
  return (
    <Dialog
      open={addDialogOpen}
      onOpenChange={(open) => {
        setAddDialogOpen(open)
        if (!open) {
          // should also abort any ongoing requests
          setStep(0)
          setAddType("")
        }
      }}
    >
      <DialogTrigger asChild>
        <Button title="Add Course">
          <LuPlus />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Add Course {step} {addType}
          </DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="h-96">
          {step === 0 && (
            <AddCourseType setStep={setStep} setAddType={setAddType} />
          )}
          {step === 1 && addType === "sync" && (
            <SelectCanvasCourse
              setStep={setStep}
              setSelectedCourse={setSelectedCourse}
            />
          )}
          {step === 1 && addType === "manual" && <div>Manual</div>}
          {step === 2 && selectedCourse && (
            <SelectCourseSections
              existingSections={[]}
              selectedCanvasCourse={selectedCourse}
              setStep={setStep}
              setCourseId={setCreatedCourseId}
            />
          )}
          {step === 3 && (
            <AllProgressCompleted
              courseId={createdCourseId!}
              setAddDialogOpen={setAddDialogOpen}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AddCourseType({
  setStep,
  setAddType,
}: {
  setStep: (step: number) => void
  setAddType: (type: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-2 h-full">
      <Button
        onClick={() => {
          setStep(1)
          setAddType("sync")
        }}
        variant="outline"
        title="Sync from Canvas"
        className="content-center rounded-lg h-full"
      >
        Sync from Canvas
      </Button>
      <Button
        onClick={() => {
          setStep(1)
          setAddType("manual")
        }}
        disabled
        variant="outline"
        title="Sync from Canvas"
        className="content-center rounded-lg h-full"
      >
        Add Manually
      </Button>
    </div>
  )
}
