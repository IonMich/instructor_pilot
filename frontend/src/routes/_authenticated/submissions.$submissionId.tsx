import * as React from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useRouter } from "@tanstack/react-router"
// import { useTheme } from "@/components/theme-provider"
import { Submission, Assignment, Course, Student } from "@/utils/fetchData"
import {
  submissionQueryOptions,
  assignmentQueryOptions,
  useUpdateSubmissionMutation,
  useCreateCommentMutation,
  studentsInCourseQueryOptions,
  submissionsQueryOptions,
} from "@/utils/queryOptions"

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import {
  LuMessageSquare,
  LuCornerDownLeft,
  LuMic,
  LuPaperclip,
  LuChevronLeft,
  LuChevronRight,
} from "react-icons/lu"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"
import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query"
import { PdfViewer } from "@/components/pdf-viewer"

export const Route = createFileRoute(
  "/_authenticated/submissions/$submissionId"
)({
  parseParams: (params) => ({
    submissionId: params.submissionId,
  }),
  stringifyParams: (params) => ({
    submissionId: params.submissionId.toString(),
  }),
  loader: async (opts) => {
    const submissionId = opts.params.submissionId
    const submissionPromise = opts.context.queryClient.ensureQueryData(
      submissionQueryOptions(submissionId)
    )
    const submission = await submissionPromise
    const assignmentId = submission.assignment.id
    const courseId = submission.assignment.course as number
    const assignmentPromise = opts.context.queryClient.ensureQueryData(
      assignmentQueryOptions(assignmentId)
    )
    const submissionsPromise = opts.context.queryClient.ensureQueryData(
      submissionsQueryOptions(assignmentId)
    )
    const studentsPromise = opts.context.queryClient.ensureQueryData(
      studentsInCourseQueryOptions(courseId)
    )
    const [assignment, submissions, students] = await Promise.all([
      assignmentPromise,
      submissionsPromise,
      studentsPromise,
    ])
    const course = assignment.course as Course
    return {
      submission,
      assignment,
      submissions,
      students,
      title: `Submission ${submission.id.split("-")[0]}` ?? "Submission",
      breadcrumbItems: getBreadcrumbItems(submission, assignment, course),
    }
  },
  meta: ({ loaderData }) => [
    {
      title: loaderData?.title,
    },
  ],
  component: SubmissionDetail,
})

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

function getBreadcrumbItems(
  submission: Submission,
  assignment: Assignment,
  course: Course
) {
  return [
    {
      title: "Home",
      to: "/",
      params: {},
    },
    {
      title: course.course_code,
      to: "/courses/$courseId",
      params: { courseId: course.id },
    },
    {
      title: assignment.name,
      to: "/assignments/$assignmentId",
      params: { assignmentId: assignment.id },
    },
    {
      title: submission.student
        ? `${submission.student.first_name} ${submission.student.last_name}`
        : `Submission ${submission.id.split("-")[0]}`,
      to: "/submissions/$submissionId",
      params: { submissionId: submission.id },
    },
  ]
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

function SubmissionDetail() {
  // const { theme } = useTheme()
  const [allImgsLoaded, setAllImgsLoaded] = React.useState(false)
  const submissionId = Route.useParams().submissionId
  const { data: submission } = useSuspenseQuery(
    submissionQueryOptions(submissionId)
  )
  const assignmentId = submission.assignment.id
  const courseId = submission.assignment.course as number
  const [{ data: assignment }, { data: submissions }, { data: students }] =
    useSuspenseQueries({
      queries: [
        assignmentQueryOptions(assignmentId),
        submissionsQueryOptions(assignmentId),
        studentsInCourseQueryOptions(courseId),
      ],
    })

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
  const [initialQuestionFocus, setInitialQuestionFocus] = React.useState(0)
  const scrollHeightImgDiv = imgDivScrollHeights[initialQuestionFocus]
  const [pageValue, setPageValue] = React.useState(1)
  const [zoomImgPercent, setZoomImgPercent] = React.useState(100)

  const images = submission?.papersubmission_images ?? []

  React.useEffect(() => {
    setAllImgsLoaded(false)
  }, [submission.id])

  // on all images loaded, scroll to the middle of the image div
  React.useEffect(() => {
    if (allImgsLoaded) {
      const canvasContainer =
        document.querySelector("canvas")?.parentElement?.parentElement
      const numImages = canvasContainer?.childElementCount
      const imgCard = canvasContainer?.parentElement?.parentElement
      if (imgCard && numImages) {
        imgCard.scrollTop =
          (imgCard.scrollHeight / numImages) * scrollHeightImgDiv
      }
    }
  }, [allImgsLoaded, scrollHeightImgDiv])

  return (
    <>
      <div
        onKeyDown={(e) => navigateOnKey(e)}
        className="container grid grid-cols-8 md:gap-4 gap-1 md:px-8 px-0 py-0"
      >
        <Card className="md:h-[85vh] col-span-1 p-4 hidden lg:flex my-2 text-center flex-col gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newPageValue = (pageValue % images.length) + 1
              setPageValue(newPageValue)
              const canvasContainer =
                document.querySelector("canvas")?.parentElement?.parentElement
              const numImages = canvasContainer?.childElementCount
              const imgCard = canvasContainer?.parentElement?.parentElement
              if (imgCard && numImages) {
                imgCard.scrollTop =
                  (imgCard.scrollHeight / numImages) * (newPageValue - 1)
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
            Q {initialQuestionFocus + 1}
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
        </Card>
        <div className="lg:col-span-5 md:col-span-6 col-span-8 md:py-2 py-0">
          <Card className="h-[70vh] md:h-[85vh] overflow-y-auto bg-gray-500">
            {/* {submission?.papersubmission_images.map((image) => (
              <img
                key={image.id}
                src={image.image}
                alt={`Page ${image.page}`}
                onLoad={handleImageLoad}
                // hidden={!allImgsLoaded}
                // ----PDF Rendering----
                hidden={true}
                height="110"
                width="80"
                className={cn(
                  theme === "dark" && "invert brightness-[0.9] contrast-[0.9]",
                  "mx-auto",
                  zoomImgPercent === 5
                    ? "w-5/6"
                    : zoomImgPercent === 4
                      ? "w-4/6"
                      : zoomImgPercent === 3
                        ? "w-3/6"
                        : "w-full"
                )}
              />
            ))} */}
            {/* ----PDF Rendering---- */}
            {/* <div key={submission.pdf} id="the-canvas-div" /> */}
            <PdfViewer
              url={submission.pdf}
              zoom_percent={zoomImgPercent}
              setFullRenderSuccess={setAllImgsLoaded}
            />
          </Card>
        </div>
        <div className="md:h-[85vh] col-span-8 md:col-span-2 my-2 order-first md:order-last flex md:flex-col flex-row gap-4">
          {/* navigation */}
          {submission && assignment && (
            <Card className="p-4 flex flex-row gap-2 justify-center items-center">
              <Link
                to={prevSubmissionUrl}
                disabled={!prevSubmission}
                tabIndex={-1}
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!prevSubmission}
                  aria-label="Previous"
                >
                  <LuChevronLeft className="h-4 w-4 inline" />
                </Button>
              </Link>
              <Link
                to={nextSubmissionUrl}
                disabled={!nextSubmission}
                tabIndex={-1}
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!nextSubmission}
                  aria-label="Next"
                >
                  <LuChevronRight className="h-4 w-4 inline" />
                </Button>
              </Link>
            </Card>
          )}
          <div
            className="flex md:flex-col flex-row gap-4 overflow-x-auto overflow-y-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {/* grade form */}
            {submission && assignment && (
              <>
                <GradeForm
                  submission={submission}
                  assignment={assignment}
                  initialQuestionFocus={initialQuestionFocus}
                />
              </>
            )}
            {/* comments */}
            {submission && assignment && (
              <CommentsChat submission={submission} />
            )}
            {/* student form */}
            {submission && assignment && students && (
              <Card className="p-4 md:order-first">
                <StudentComboboxForm
                  submission={submission}
                  students={students}
                />
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export function GradeForm({
  submission,
  assignment,
  initialQuestionFocus,
}: {
  submission: Submission
  assignment: Assignment
  initialQuestionFocus: number
}) {
  const router = useRouter()
  const updateSubmissionMutation = useUpdateSubmissionMutation(submission.id)
  const stepSize = 0.5
  const createEmptySubQGradesArr = (
    assignmentMaxQuestionScores: string
  ): ""[] => {
    return assignmentMaxQuestionScores.split(",").map(() => "")
  }

  const createEmptySubQGrades = (assignmentMaxQuestionScores: string) => {
    return createEmptySubQGradesArr(assignmentMaxQuestionScores).join(",")
  }

  const QGradesSubFetchSchema = z.preprocess(
    (gradesStr) =>
      gradesStr === null || gradesStr === ""
        ? createEmptySubQGrades(assignment.max_question_scores)
        : gradesStr,
    z
      .string()
      .transform((gradesStr) =>
        gradesStr
          .split(",")
          .map((gradeStr) => (gradeStr === "" ? "" : parseFloat(gradeStr)))
      )
  )
  const subQGrades = QGradesSubFetchSchema.parse(submission.question_grades)

  const formSchema = z.object({
    question_grades: z
      .array(
        z.union([
          z.literal(""),
          z.coerce
            .number()
            .multipleOf(stepSize, {
              message: `Question grade must be a multiple of the step size: ${stepSize}.
            Enter a valid grade, or change the step size.`,
            })
            .nonnegative({ message: "Question grade cannot be negative" })
            .safe(),
        ])
      )
      .length(assignment.max_question_scores?.split(",").length)
      .superRefine((items, ctx) => {
        // check that all grades are less than or equal to the max question score
        for (let index = 0; index < items.length; index++) {
          const item = items[index]
          if (item === "") {
            continue
          }
          const maxQuestionScore = parseFloat(
            assignment.max_question_scores.split(",")[index]
          )
          if (item > maxQuestionScore) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Value cannot be greater than the max question score: ${maxQuestionScore}`,
              path: [index],
            })
          }
        }
        return z.NEVER
      }),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      question_grades: createEmptySubQGradesArr(assignment.max_question_scores),
    },
    values: {
      question_grades: subQGrades,
    },
  })

  const { toast } = useToast()

  function onSubmit(data: z.infer<typeof formSchema>) {
    let question_grades = data.question_grades.join(",")
    if (question_grades === submission.question_grades) {
      toast({
        title: "No changes",
        description: "No changes were made to the submission.",
      })
      return
    }

    if (
      question_grades === createEmptySubQGrades(assignment.max_question_scores)
    ) {
      question_grades = ""
    }

    const patchData = { id: submission.id, question_grades: question_grades }

    updateSubmissionMutation.mutate(patchData, {
      onError: (error) => {
        console.error(error)
        toast({
          title: "Error updating submission",
          description: "An error occurred while updating the submission.",
          variant: "destructive",
        })
      },
      onSuccess: () => {
        toast({
          title: "Submission updated successfully",
          description: (
            <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
              <code className="text-white">
                {JSON.stringify(patchData, null, 2)}
              </code>
            </pre>
          ),
        })
      },
    })
    router.invalidate()
  }

  return (
    <Card className="p-4">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex md:flex-col flex-row gap-4"
        >
          {assignment.max_question_scores
            ?.split(",")
            .map((max_grade: string, index: number) => (
              <FormField
                key={index}
                control={form.control}
                name={`question_grades.${index}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question {index + 1}</FormLabel>
                    <div className="flex gap-0">
                      <FormControl className="rounded-r-none min-w-8">
                        <Input
                          {...field}
                          className="md:pl-4 p-2 pr-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="?"
                          type="number"
                          key={`${submission.id}-${index}`}
                          autoFocus={index === initialQuestionFocus}
                          onFocus={(e) => e.target.select()}
                          onClick={(e) => e.currentTarget.select()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              // submit form
                              form.handleSubmit(onSubmit)()
                            }
                          }}
                        />
                      </FormControl>
                      <Button
                        className="flex items-center whitespace-nowrap rounded-l-none sm:px-4 px-2"
                        disabled
                        variant="secondary"
                      >
                        / {max_grade}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          <div className="flex flex-row items-center justify-between">
            <Button type="submit" size="sm" className="lg:px-12 md:px-4">
              Update
            </Button>
            <div className="flex flex-col items-center sm:px-4 px-2 whitespace-nowrap">
              <span className="text-sm">
                {submission.grade} / {assignment.max_score}
              </span>
            </div>
          </div>
        </form>
      </Form>
    </Card>
  )
}

function CommentsChat({ submission }: { submission: Submission }) {
  return (
    <Card className="hidden md:block">
      <div className="text-sm border-gray-200 text-gray-500 flex flex-row p-4 justify-between">
        <p>Comments</p>
        {submission.submission_comments.length > 0 && (
          <div className="flex gap-2 items-center">
            <span>{submission.submission_comments.length}</span>
            <LuMessageSquare className="h-4 w-4 inline" />
          </div>
        )}
      </div>
      <Separator orientation="horizontal" />
      <div
        className="max-h-48 overflow-y-auto flex flex-col gap-2 px-4"
        style={{ scrollbarWidth: "none" }}
      >
        {submission.submission_comments.map((comment) => (
          <div
            key={comment.id}
            className="flex gap-2 ml-auto first:mt-4 last:mb-4"
          >
            <Card className="ml-12 p-2 bg-primary text-primary-foreground">
              <p className="text-sm whitespace-pre-line">{comment.text}</p>
              <p className="text-xs text-primary-foreground text-right pt-1">
                {new Date(comment.created_at).toLocaleString()}
              </p>
            </Card>
          </div>
        ))}
      </div>
      <Separator orientation="horizontal" />
      <ChatForm submission={submission} />
    </Card>
  )
}

function ChatForm({ submission }: { submission: Submission }) {
  const router = useRouter()
  const { toast } = useToast()
  const createCommentMutation = useCreateCommentMutation(submission.id)
  const CommentFormSchema = z.object({
    text: z.string().min(1),
  })
  const form = useForm<z.infer<typeof CommentFormSchema>>({
    resolver: zodResolver(CommentFormSchema),
    defaultValues: {
      text: "",
    },
  })

  function onSubmit(data: z.infer<typeof CommentFormSchema>) {
    createCommentMutation.mutate(data.text, {
      onError: (error) => {
        console.error(error)
        toast({
          title: "Error creating comment",
          description: "An error occurred while creating the comment.",
          variant: "destructive",
        })
      },
      onSuccess: () => {
        toast({
          title: "Comment created successfully",
          description: (
            <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
              <code className="text-white">
                {JSON.stringify(data, null, 2)}
              </code>
            </pre>
          ),
        })
      },
    })
    router.invalidate()
    form.reset()
  }
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="relative overflow-hidden rounded-lg rounded-t-none bg-background focus-within:ring-1 focus-within:ring-ring"
      >
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  id="text"
                  placeholder="Type your comment here..."
                  className="min-h-12 resize-none border-0 p-3 shadow-none focus-visible:ring-0"
                  {...field}
                />
              </FormControl>
              <FormMessage className="p-2" />
            </FormItem>
          )}
        />
        <div className="flex items-center p-3 pt-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" type="button">
                <LuPaperclip className="size-4" />
                <span className="sr-only">Attach file</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Attach File</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" type="button">
                <LuMic className="size-4" />
                <span className="sr-only">Use Microphone</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Use Microphone</TooltipContent>
          </Tooltip>
          <Button type="submit" size="sm" className="ml-auto gap-1.5">
            Add Comment
            <LuCornerDownLeft className="size-3.5" />
          </Button>
        </div>
      </form>
    </Form>
  )
}

interface StudentSectionLabelVal {
  label: string
  value: string
  section_id: number
  section_name: string
}

export function StudentComboboxForm({
  submission,
  students,
}: {
  submission: Submission
  students: Student[]
}) {
  const router = useRouter()
  const updateSubmissionMutation = useUpdateSubmissionMutation(submission.id)
  const [open, setOpen] = React.useState(false)

  function getSection(student: Student, courseId: number) {
    const section = student.sections.find(
      (section) => section.course === courseId
    )
    if (!section) {
      throw new Error(
        `Student ${student.id} is not enrolled in course ${courseId}`
      )
    }
    return section
  }
  const courseId = submission.assignment.course as number

  const studentsSectionsLabelVals: StudentSectionLabelVal[] = students.map(
    (student) => {
      const section = getSection(student, courseId)
      return {
        label: `${student.first_name} ${student.last_name}`,
        value: student.id.toString(),
        section_id: section.id,
        section_name: section.name,
      }
    }
  )

  // group students by section
  const studentsGroupedBySection = studentsSectionsLabelVals.reduce(
    (acc, student) => {
      if (!acc[student.section_id]) {
        acc[student.section_id] = []
      }
      acc[student.section_id].push(student)
      return acc
    },
    {} as Record<string, StudentSectionLabelVal[]>
  )

  const studentFormSchema = z.object({
    student: z.string({
      required_error: "Please select a Student.",
    }),
  })

  const studentForm = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      student: submission.student?.id.toString() ?? "",
    },
    values: {
      student: submission.student?.id.toString() ?? "",
    },
  })

  function onSubmit(data: z.infer<typeof studentFormSchema>) {
    const student_id = parseInt(data.student)
    if (student_id === submission.student?.id) {
      toast({
        title: "No changes",
        description: "No changes were made to the student.",
      })
      return
    }

    const patchData = { id: submission.id, student_id: student_id }

    console.log(patchData)

    updateSubmissionMutation.mutate(patchData, {
      onError: (error) => {
        console.error(error)
        toast({
          title: "Error updating submission",
          description: "An error occurred while updating the submission.",
          variant: "destructive",
        })
      },
      onSuccess: () => {
        toast({
          title: "Submission updated successfully",
          description: (
            <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
              <code className="text-white">
                {JSON.stringify(patchData, null, 2)}
              </code>
            </pre>
          ),
        })
      },
    })
    router.invalidate()
  }

  // useEffect is needed to update the form value when the submission.student.id changes
  React.useEffect(() => {
    studentForm.reset({ student: submission.student?.id.toString() ?? "" })
  }, [submission, studentForm])

  return (
    <Form {...studentForm}>
      <form onSubmit={studentForm.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={studentForm.control}
          name="student"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Student</FormLabel>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className={cn(
                        "justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? studentsSectionsLabelVals.find(
                            (student) => student.value === field.value
                          )?.label
                        : "No Student"}
                      <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className=" p-0">
                  <Command>
                    <CommandList>
                      <CommandInput
                        placeholder="Search Student..."
                        className="h-9"
                      />
                      <CommandEmpty>No Student found.</CommandEmpty>
                      {Object.entries(studentsGroupedBySection).map(
                        ([sectionId, students]) => (
                          <CommandGroup key={sectionId}>
                            <CommandItem
                              value={sectionId.toString()}
                              onSelect={() => {}}
                              disabled
                            >
                              {students[0].section_name}
                            </CommandItem>
                            {students.map((student) => (
                              // if submission.student.id === student.id, then the student is selected
                              <CommandItem
                                value={student.label}
                                key={student.value}
                                onSelect={() => {
                                  studentForm.setValue("student", student.value)
                                  studentForm.handleSubmit(onSubmit)()
                                  setOpen(false)
                                }}
                              >
                                {student.label}
                                <CheckIcon
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    student.value === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
