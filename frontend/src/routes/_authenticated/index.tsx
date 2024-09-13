import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LuPlus, LuUser2 } from "react-icons/lu"
import { RxReload } from "react-icons/rx"
import { Link, createFileRoute, useLoaderData } from "@tanstack/react-router"
import {
  canvasCourseSectionsQueryOptions,
  canvasCoursesQueryOptions,
  coursesQueryOptions,
} from "@/utils/queryOptions"
import { useQuery } from "@tanstack/react-query"
import { CanvasCourse, Course } from "@/utils/fetchData"
import { auth } from "@/utils/auth"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import React from "react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { DialogDescription } from "@radix-ui/react-dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "@/components/ui/use-toast"

function getBreadcrumbItems() {
  return []
}

const Loader = ({ className }: { className?: string }) => {
  return (
    <RxReload
      className={cn("mx-4 h-8 w-8 text-primary/60 animate-spin", className)}
    />
  )
}

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
      <div className="hidden lg:block"></div>
      <p className="text-2xl font-bold my-10 text-center">
        {user === "" ? "Hello!" : `Hello, ${user}!`}
        <span
          role="img"
          aria-label="wave"
          className="mx-2 inline-block hover:transform hover:scale-110 duration-200"
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
            <SelectCourseSections selectedCourse={selectedCourse} />
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

function SelectCanvasCourse({
  setStep,
  setSelectedCourse,
}: {
  setStep: (step: number) => void
  setSelectedCourse: (course: CanvasCourse) => void
}) {
  const { queryKey, queryFn } = canvasCoursesQueryOptions()
  const response = useQuery({
    queryKey,
    queryFn,
  })
  const { data: canvasCourses, isFetching } = response
  if (isFetching || !canvasCourses) {
    return (
      <div className="grid grid-cols-1 h-full">
        <div className="flex justify-center items-center">
          <p>Loading available courses from Canvas...</p>
          <Loader />
        </div>
      </div>
    )
  }

  return (
    <RadioGroup
      onValueChange={(value) => {
        setSelectedCourse(
          canvasCourses.find((course) => course.canvas_id.toString() === value)!
        )
        setStep(2)
      }}
      className="overflow-y-auto h-full"
    >
      {canvasCourses.map((course) => (
        <div key={course.canvas_id} className="flex items-center space-x-2">
          <RadioGroupItem
            value={course.canvas_id.toString()}
            id={course.canvas_id.toString()}
            disabled={course.already_exists}
          />
          <Label
            htmlFor={course.canvas_id.toString()}
            className={cn(
              "grow px-2",
              !course.already_exists && "cursor-pointer"
            )}
          >
            <Card className="flex flex-col items-center gap-1 justify-center h-20 px-4">
              <p
                className={cn(course.already_exists && "text-muted-foreground")}
              >
                {course.name.length > 40
                  ? course.name.slice(0, 40) + "..."
                  : course.name}
              </p>
              <div className="flex items-center justify-center gap-1">
                {course.course_code ? (
                  <span
                    className={cn(
                      course.already_exists && "text-muted-foreground"
                    )}
                  >
                    {course.course_code === course.name
                      ? course.term.name
                      : `${course.course_code} (${course.term.name})`}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Course with Canvas ID {course.canvas_id}
                  </span>
                )}
                {course.already_exists && (
                  <Badge variant="secondary">Added</Badge>
                )}
                <Badge variant="secondary">
                  <LuUser2 className="inline-block" />
                  <span className="ml-1">{course.total_students}</span>
                </Badge>
              </div>
            </Card>
          </Label>
        </div>
      ))}
    </RadioGroup>
  )
}

function SelectCourseSections({
  selectedCourse,
}: {
  selectedCourse: CanvasCourse
}) {
  const { queryKey, queryFn } = canvasCourseSectionsQueryOptions(
    selectedCourse.canvas_id
  )
  const formSchema = z.object({
    sections: z.array(z.string()),
  })
  const response = useQuery({
    queryKey,
    queryFn,
  })
  const { data: canvasCourseSections, isFetching } = response

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sections: [],
    },
  })

  if (isFetching || !canvasCourseSections) {
    return (
      <div className="grid grid-cols-1 h-full">
        <div className="flex justify-center items-center">
          <p>Loading student sections. This may take a while...</p>
          <Loader />
        </div>
      </div>
    )
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(values, null, 2)}</code>
        </pre>
      ),
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="overflow-y-auto h-full space-y-8"
      >
        <FormField
          control={form.control}
          name="sections"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Course Sections</FormLabel>
                <FormDescription>
                  Select student sections to add to the course.
                </FormDescription>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {canvasCourseSections.map((section) => (
                  <FormField
                    key={section.canvas_id}
                    control={form.control}
                    name="sections"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={section.canvas_id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(
                                section.canvas_id.toString()
                              )}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([
                                      ...field.value,
                                      section.canvas_id.toString(),
                                    ])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) =>
                                          value !== section.canvas_id.toString()
                                      )
                                    )
                              }}
                            />
                          </FormControl>
                          <FormLabel className="grow px-2 flex items-center justify-between">
                            <span
                              className="truncate max-w-[30ch]"
                              title={section.name}
                            >
                              {section.name}
                            </span>
                            <Badge variant="secondary">
                              <LuUser2 className="inline-block" />
                              <span className="ml-1">
                                {section.total_students}
                              </span>
                            </Badge>
                          </FormLabel>
                        </FormItem>
                      )
                    }}
                  />
                ))}
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Add Course
        </Button>
      </form>
    </Form>
  )
}
