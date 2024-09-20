import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LuCheckCircle, LuPlus, LuUser2 } from "react-icons/lu"
import { RxReload } from "react-icons/rx"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import {
  canvasCourseSectionsQueryOptions,
  canvasCoursesQueryOptions,
  coursesQueryOptions,
  useCreateCourseWithCanvasSectionsMutation,
  usePopulateStudentsCanvasMutation,
  useCreateAssignmentsCanvasMutation,
  useCreateAnnouncementsCanvasMutation,
} from "@/utils/queryOptions"
import { useQuery, useSuspenseQueries } from "@tanstack/react-query"
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
import { useToast } from "@/components/ui/use-toast"

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
            <p className="text-xl font-bold">{course.course_code} {course?.term ? course?.term : ""}</p>
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
              selectedCourse={selectedCourse}
              setStep={setStep}
              setCreatedCourseId={setCreatedCourseId}
            />
          )}
          {step === 3 && <AllProgressCompleted courseId={createdCourseId!} />}
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
  setStep,
  setCreatedCourseId,
}: {
  selectedCourse: CanvasCourse
  setStep: (step: number) => void
  setCreatedCourseId: (courseId: number) => void
}) {
  const { queryKey, queryFn } = canvasCourseSectionsQueryOptions(
    selectedCourse.canvas_id
  )
  const router = useRouter()
  const { toast } = useToast()
  const createCourseCanvasMutation = useCreateCourseWithCanvasSectionsMutation()
  const populateStudentsCanvasMutation = usePopulateStudentsCanvasMutation()
  const createAssignmentsCanvasMutation = useCreateAssignmentsCanvasMutation()
  const createAnnouncementsCanvasMutation =
    useCreateAnnouncementsCanvasMutation()
  const formSchema = z.object({
    sections: z.array(z.number()),
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const mutationData = {
      courseCanvasId: selectedCourse.canvas_id,
      sectionCanvasIds: values.sections,
    }
    const data = await createCourseCanvasMutation.mutateAsync(mutationData, {
      onError: (error) => {
        console.error(error)
        toast({
          title: "Error creating course or course sections",
          description: "An error occurred while creating the course.",
          variant: "destructive",
        })
      },
    })
    console.log("Course created", data)
    const courseId = data.course.course_id
    const populateMutationData = {
      selectedCanvasStudents: data.students,
      courseId,
    }

    await populateStudentsCanvasMutation.mutateAsync(populateMutationData, {
      onError: (error) => {
        console.error(error)
        toast({
          title: "Error populating students in sections",
          description: "An error occurred while creating the course.",
          variant: "destructive",
        })
      },
    })
    const assignmentMutationData = {
      courseCanvasId: selectedCourse.canvas_id,
      courseId,
    }
    await createAssignmentsCanvasMutation.mutateAsync(assignmentMutationData, {
      onError: (error) => {
        console.error(error)
        toast({
          title: "Error creating assignments or assignment groups",
          description: "An error occurred while creating the course.",
          variant: "destructive",
        })
      },
    })
    const announceMutationData = {
      courseCanvasId: selectedCourse.canvas_id,
      courseId,
    }
    await createAnnouncementsCanvasMutation.mutateAsync(announceMutationData, {
      onError: (error) => {
        console.error(error)
        toast({
          title: "Error creating announcements",
          description: "An error occurred while creating the course.",
          variant: "destructive",
        })
      },
      onSuccess: () => {
        router.invalidate()
        setCreatedCourseId(courseId)
        setStep(3)
        // router.navigate({to: "/courses/$courseId", params: {courseId}})
      },
    })
  }

  // if any of the steps is not finished, show the progress
  if (form.formState.isSubmitting) {
    return (
      <ProgressAddFromCanvas
        finishedItems={{
          sections: createCourseCanvasMutation.isSuccess,
          students: populateStudentsCanvasMutation.isSuccess,
          assignments: createAssignmentsCanvasMutation.isSuccess,
          announcements: createAnnouncementsCanvasMutation.isSuccess,
        }}
      />
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full space-y-8">
        <FormField
          control={form.control}
          name="sections"
          render={() => (
            <FormItem className="overflow-y-auto h-5/6">
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
                              checked={field.value?.includes(section.canvas_id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([
                                      ...field.value,
                                      section.canvas_id,
                                    ])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== section.canvas_id
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
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          Add Course
        </Button>
      </form>
    </Form>
  )
}

function ProgressAddFromCanvas({
  finishedItems,
}: {
  finishedItems: {
    sections: boolean
    students: boolean
    assignments: boolean
    announcements: boolean
  }
}) {
  const descriptions = {
    sections: "Creating course sections",
    students: "Populating students",
    assignments: "Creating assignments",
    announcements: "Creating announcements",
  }
  return (
    <div className="grid grid-cols-1 gap-4 h-full justify-center items-center">
      <div className="flex flex-col justify-start items-start gap-4 h-full">
        <p className="text-lg font-bold">Creating course:</p>
        {Object.entries(finishedItems).map(([key, value]) => (
          <div
            key={key}
            className="flex flex-row justify-start items-start gap-4"
          >
            {value ? <LuCheckCircle className="text-green-500" /> : <Loader />}
            <p>{descriptions[key as keyof typeof descriptions]}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function AllProgressCompleted({ courseId }: { courseId: number }) {
  return (
    <div className="grid grid-cols-1 h-full">
      <div className="flex justify-center items-center gap-4">
        <LuCheckCircle className="text-green-500" />
        <p className="text-lg font-bold">Course created successfully!</p>
      </div>
      <Link to="/courses/$courseId" params={{ courseId }}>
        <Button>View Course</Button>
      </Link>
    </div>
  )
}
