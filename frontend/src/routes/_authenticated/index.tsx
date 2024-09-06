import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  LuPlus,
  LuLoader2,
} from "react-icons/lu"
import { Link, createFileRoute, useLoaderData } from "@tanstack/react-router"
import { coursesQueryOptions } from "@/utils/queryOptions"
import { Course } from "@/utils/fetchData"
import { auth } from "@/utils/auth"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import React from "react"
import { Separator } from "@/components/ui/separator"
import { cn } from '@/lib/utils';

function getBreadcrumbItems() {
  return []
}

const Loader = ({ className }: { className?: string }) => {
  return (
    <LuLoader2
      className={cn('mx-4 my-28 h-8 w-8 text-primary/60 animate-spin', className)}
    />
  );
};

export const Route = createFileRoute("/_authenticated/")({
  loader: async (opts) => {
    const coursesPromise = opts.context.queryClient.ensureQueryData(
      coursesQueryOptions()
    )
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
  const { courses } = useLoaderData({ from: "/_authenticated/" })
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      
      <CoursesDeck courses={courses} user={user} />
    </div>
  )
}

function CoursesDeck({ courses, user }: { courses: Course[]; user: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div></div>
      <p className="text-2xl font-bold my-10 text-center">
        {user === "" ? "Hello! 👋": `Hello, ${user}! 👋`}
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
            <p className="text-xl font-bold">{course.course_code}</p>
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
  return (
    <Dialog open={addDialogOpen} onOpenChange={(open) => {
      setAddDialogOpen(open)
      if (!open) {
        // should also abort any ongoing requests
        setStep(0)
        setAddType("")
      }
    }}>
      <DialogTrigger asChild>
        <Button title="Add Course">
          <LuPlus />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Course {step} {addType}</DialogTitle>
        </DialogHeader>
        <Separator />
        {step === 0 && <AddCourseType setStep={setStep} setAddType={setAddType} />}
        {step === 1 && addType === "sync" &&
          <div className="flex items-center justify-center h-80">
            Loading available courses from Canvas...
            <Loader/>
          </div>}
        {step === 1 && addType === "manual" && <div>Manual</div>}
        
        
      </DialogContent>
    </Dialog>
  )
}

function AddCourseType({ setStep, setAddType }: { setStep: (step: number) => void; setAddType: (type: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 h-80">
      <Button
        onClick={() => {
          setStep(1)
          setAddType("sync")
        }}
        variant="outline"
        title="Sync from Canvas" 
        className="content-center rounded-lg h-full">
        Sync from Canvas
      </Button>
      <Button
        onClick={() => {
          setStep(1)
          setAddType("manual")
        }}
        variant="outline"
        title="Sync from Canvas" 
        className="content-center rounded-lg h-full">
        Add Manually
      </Button>
    </div>
  )
}