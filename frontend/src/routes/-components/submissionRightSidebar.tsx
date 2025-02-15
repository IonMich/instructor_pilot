import * as React from "react"
import { Link, useRouter, useBlocker } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  LuChevronLeft,
  LuChevronRight,
  LuMessageSquare,
  LuCornerDownLeft,
  LuMic,
  LuPaperclip,
  LuStar,
} from "react-icons/lu"
import {
  Submission,
  Assignment,
  Student,
  AssignmentSavedComment,
} from "@/utils/types"
import { cn } from "@/lib/utils"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandDialog,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  useUpdateSubmissionMutation,
  useCreateCommentMutation,
} from "@/utils/queryOptions"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

// Define the prop types for RightSidebar
interface RightSidebarProps {
  submission: Submission
  assignment: Assignment
  enableNavigation: boolean
  prevSubmission: Submission | null
  nextSubmission: Submission | null
  prevSubmissionUrl?: string
  nextSubmissionUrl?: string
  initialQuestionFocus: number | null
  students: Student[]
  anonymousGrading: boolean
}

export function RightSidebar({
  submission,
  assignment,
  enableNavigation,
  prevSubmission,
  nextSubmission,
  prevSubmissionUrl,
  nextSubmissionUrl,
  initialQuestionFocus,
  students,
  anonymousGrading,
}: RightSidebarProps) {
  return (
    <div className="md:h-[85vh] col-span-8 md:col-span-2 my-2 order-first md:order-last flex md:flex-col flex-row gap-4">
      {/* Navigation */}
      {submission && assignment && enableNavigation && (
        <Card className="p-4 flex flex-row gap-2 justify-center items-center">
          <Link to={prevSubmissionUrl} disabled={!prevSubmission} tabIndex={-1}>
            <Button
              variant="outline"
              size="sm"
              disabled={!prevSubmission}
              aria-label="Previous"
            >
              <LuChevronLeft className="h-4 w-4 inline" />
            </Button>
          </Link>
          <Link to={nextSubmissionUrl} disabled={!nextSubmission} tabIndex={-1}>
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
      {/* Right sidebar content */}
      <div className="flex md:flex-col flex-row gap-4 overflow-x-auto overflow-y-auto">
        {/* Grade form */}
        {submission && assignment && (
          <>
            <GradeForm
              submission={submission}
              assignment={assignment}
              initialQuestionFocus={initialQuestionFocus}
            />
          </>
        )}
        {/* Comments */}
        {submission && assignment && (
          <>
            <CommentsChat
              submission={submission}
              starredComments={assignment.saved_comments || []}
            />
          </>
        )}
        {/* Student combobox */}
        {submission && assignment && students && !anonymousGrading && (
          <Card className="p-4 md:order-first">
            <StudentComboboxForm submission={submission} students={students} />
          </Card>
        )}
      </div>
    </div>
  )
}

export function GradeForm({
  submission,
  assignment,
  initialQuestionFocus,
}: {
  submission: Submission
  assignment: Assignment
  initialQuestionFocus: number | null
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

  React.useEffect(() => {
    form.reset()
  }, [submission.id, form])

  useBlocker({
    shouldBlockFn: () => {
      const isDanger = form.formState.isDirty
      if (!isDanger) {
        return false
      } else {
        const shouldLeaveWithPermission = window.confirm(
          "Are you sure you want to navigate?"
        )
        return !shouldLeaveWithPermission
      }
    },
  })
  return (
    <Card className="p-4">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex md:flex-col flex-row gap-4 md:max-w-[70%]"
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
                        type="button"
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
            <Button
              type="submit"
              size="sm"
              className="lg:px-12 md:px-4"
              tabIndex={-1}
            >
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

function CommentsChat({
  submission,
  starredComments,
}: {
  submission: Submission
  starredComments: AssignmentSavedComment[]
}) {
  return (
    <Card className="hidden md:block">
      <div className="text-sm border-gray-200 flex flex-row p-4 justify-between">
        <div className="flex gap-2">
          <span>Comments</span>
          <SavedCommentsDialog starredComments={starredComments} />
        </div>
        {submission.submission_comments.length > 0 && (
          <div className="flex gap-2 items-center">
            <span>{submission.submission_comments.length}</span>
            <LuMessageSquare className="h-4 w-4 inline" />
          </div>
        )}
      </div>
      <Separator orientation="horizontal" />
      <div
        className="overflow-y-auto flex flex-col gap-2 px-4"
        style={{ scrollbarWidth: "none" }}
      >
        {submission.submission_comments.map((comment) => (
          <div
            key={comment.id}
            className="flex gap-2 ml-auto first:mt-4 last:mb-4 snap-y"
          >
            <Card className="xl:ml-12 p-2 bg-primary text-primary-foreground snap-center">
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

  React.useEffect(() => {
    form.reset()
  }, [submission.id, form])

  useBlocker({
    shouldBlockFn: () => {
      const isDanger = form.formState.isDirty || createCommentMutation.isPending
      if (!isDanger) {
        return false
      } else {
        const shouldLeaveWithPermission = window.confirm(
          "Are you sure you want to navigate?"
        )
        return !shouldLeaveWithPermission
      }
    },
  })

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
                  className="min-h-12 border-0 p-3 shadow-none focus-visible:ring-0"
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

export function SavedCommentsDialog({
  starredComments,
}: {
  starredComments: AssignmentSavedComment[]
}) {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <p className="text-sm text-muted-foreground">
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>J
        </kbd>
      </p>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search for saved comments or type a command..." />
        {/* <CommandSeparator /> */}
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Saved comments">
            {starredComments.map((comment) => (
              <CommandItem key={comment.id}>
                <LuStar />
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    {comment.title}
                  </span>
                  <span>{comment.text}</span>
                </div>
                {/* <CommandShortcut>⌘S</CommandShortcut> */}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

interface StudentSectionLabelVal {
  label: string
  value: string
  section_id: number
  section_name: string
  uni_id: string // added field
}

export function StudentComboboxForm({
  submission,
  students,
}: {
  submission: Submission
  students: Student[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const updateSubmissionMutation = useUpdateSubmissionMutation(submission.id)
  const [open, setOpen] = React.useState(false)

  function getSection(student: Student, courseId: number) {
    const section = student.sections.find((section) => {
      const sectionCourse = section.course
      if (typeof sectionCourse === "object") {
        return sectionCourse.id === courseId
      } else {
        return sectionCourse === courseId
      }
    })
    if (!section) {
      throw new Error(
        `Student ${student.id} is not enrolled in course ${courseId}`
      )
    }
    return section
  }
  const courseId = submission.assignment.course.id

  const studentsSectionsLabelVals: StudentSectionLabelVal[] = students.map(
    (student) => {
      const section = getSection(student, courseId)
      return {
        label: `${student.first_name} ${student.last_name}`,
        value: student.id.toString(),
        section_id: section.id,
        section_name: section.name,
        uni_id: student.uni_id, // map uni_id
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
              <FormLabel className="hidden md:block">Student</FormLabel>
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
                        ? (() => {
                            const sel = studentsSectionsLabelVals.find(
                              (s) => s.value === field.value
                            )
                            // warp to a new line if the text is too long
                            return sel ? (
                              <span className="flex flex-row flex-wrap gap-1 items-center">
                                <span>{sel.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {" "}
                                  {sel.uni_id}
                                </span>
                              </span>
                            ) : (
                              "No Student"
                            )
                          })()
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
                              <CommandItem
                                value={student.label}
                                key={student.value}
                                onSelect={() => {
                                  studentForm.setValue("student", student.value)
                                  studentForm.handleSubmit(onSubmit)()
                                  setOpen(false)
                                }}
                              >
                                <span className="flex flex-row items-center gap-1">
                                  <span>{student.label}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {student.uni_id}
                                  </span>
                                </span>
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
