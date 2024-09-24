import * as React from "react"
import { Link, useRouter } from "@tanstack/react-router"

import {
  assignmentQueryOptions,
  submissionsQueryOptions,
  useDeleteAllSubmissionsMutation,
  useIdentifyAutomationWorkflowMutation,
  useVersionAutomationWorkflowMutation,
} from "@/utils/queryOptions"

import { columns } from "./columns"
import { DataTable } from "./submissions-data-table"

import {
  LuFile,
  LuFilePlus2,
  LuMoreHorizontal,
  LuFileBarChart2,
  LuFileScan,
  LuArrowUpRight,
  LuRocket,
  LuInfo,
  LuArrowRight,
  LuArrowLeft,
} from "react-icons/lu"
import { FaTasks } from "react-icons/fa"
import { Toggle } from "@/components/ui/toggle"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Assignment, Submission, Version } from "@/utils/fetchData"
import { Separator } from "@/components/ui/separator"
import { SubmissionPDFsForm } from "./assignmentDetailForms"
import { useSuspenseQueries } from "@tanstack/react-query"
import { getRouteApi } from "@tanstack/react-router"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
} from "@/components/ui/form"

import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

const route = getRouteApi("/_authenticated/assignments/$assignmentId")

enum Dialogs {
  dialog1 = "dialog1",
  dialog2 = "dialog2",
}

export function SubmissionsTable() {
  const assignmentId = route.useParams().assignmentId
  const [{ data: assignment }, { data: submissions }] = useSuspenseQueries({
    queries: [
      assignmentQueryOptions(assignmentId),
      submissionsQueryOptions(assignmentId),
    ],
  })
  const columnsOfAssignment = columns.filter(
    (column) => column.id !== "assignment"
  )
  return (
    <>
      <div className="container mx-auto py-2">
        <h1 className="text-5xl font-bold py-8">{assignment?.name}</h1>
        <AssignmentDetailCards
          assignment={assignment}
          submissions={submissions}
        />
        <DataTable
          columns={columnsOfAssignment}
          data={submissions}
          searchby={["student", "uni_id"]}
        />
      </div>
    </>
  )
}

function AssignmentDetailCards({
  assignment,
  submissions,
}: {
  assignment: Assignment
  submissions: Submission[]
}) {
  const num_questions = assignment?.max_question_scores.split(",").length
  const subsGraded =
    submissions.filter((submission) => submission.grade !== null) || []
  const subsIdentified =
    submissions.filter((submission) => submission.student !== null) || []
  const subsAverage =
    subsGraded
      .map((submission) => submission.grade)
      .reduce((a, b) => a + b, 0) / subsGraded.length
  const percentGraded = assignment?.submission_count
    ? parseInt(
        ((subsGraded.length / assignment?.submission_count) * 100).toFixed(0)
      )
    : 0
  const percentIdentified = assignment?.submission_count
    ? parseInt(
        ((subsIdentified.length / assignment?.submission_count) * 100).toFixed(
          0
        )
      )
    : 0

  const gradedChartData = [
    // graded
    { label: "Graded", count: subsGraded.length, fill: "var(--color-safari)" },
  ]
  const identifiedChartData = [
    // identified
    {
      label: "Identified",
      count: subsIdentified.length,
      fill: "var(--color-safari)",
    },
  ]
  const chartConfig = {
    safari: {
      label: "Safari",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig

  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Submissions</CardTitle>
          <LuFile className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-row justify-between">
          <div className="text-2xl font-bold">
            {assignment?.submission_count}
          </div>
          <div className="mt-8 flex flex-row space-x-2">
            {assignment && (
              <AllSubmissionsDropdownMenu assignment={assignment} />
            )}
            <AddSubmissionsDialogWithTrigger assignment={assignment} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Grades</CardTitle>
          <LuFileBarChart2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-row justify-between">
          <div className="flex flex-col gap-2">
            {submissions && subsGraded.length > 0 && (
              <div className="text-2xl font-bold" title="Average grade">
                {subsAverage.toFixed(2) != "NaN" ? (
                  subsAverage.toFixed(2)
                ) : (
                  <Skeleton className="h-4 w-[3ch] inline-block" />
                )}
                <span className="text-sm font-normal">
                  {" "}
                  / {assignment?.max_score}
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {num_questions} question
              {num_questions > 1 && "s"}{" "}
              {subsGraded.length === 0 &&
                "| Max score: " + assignment?.max_score}{" "}
              {num_questions > 1 && `(${assignment.max_question_scores})`}
            </p>
          </div>
          <div className="mt-8">
            {/* - compare graph with other assignment would be nice*/}
            {/* - change questions in assignment*/}
            <Button variant="ghost" size="sm">
              <LuMoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasks</CardTitle>
          <FaTasks className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-0">
          {assignment && submissions && (
            <div className="text-xs flex flex-col gap-2 items-center">
              <ul className="flex flex-row gap-4">
                <li className="mb-2">
                  <ProgressPieChart
                    chartData={gradedChartData}
                    chartConfig={chartConfig}
                    percentDone={percentGraded}
                  />
                </li>
                <li className="mb-2">
                  <ProgressPieChart
                    chartData={identifiedChartData}
                    chartConfig={chartConfig}
                    percentDone={percentIdentified}
                  />
                </li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Automations</CardTitle>
          <LuFileScan className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xs">
            <div className="mt-1 mb-1 flex flex-row justify-between items-center">
              <div className="font-bold">Identify Students By ID</div>
              <IdentifySubmissionsDialogWithTrigger
                assignment={assignment}
                submissions={submissions}
              />
            </div>
            <Separator orientation="horizontal" />
            <div className="mt-1 flex flex-row justify-between items-center">
              <div className="font-bold">Group Assignment Versions</div>
              <VersioningDialogWithTrigger
                assignment={assignment}
                submissions={submissions}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AllSubmissionsDropdownMenu({
  assignment,
}: {
  assignment: Assignment
}) {
  const [dialog, setDialog] = React.useState<Dialogs | null>(null)
  const onOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setDialog(null)
    }
  }
  return (
    <Dialog open={dialog !== null} onOpenChange={onOpenChange}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <LuMoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DialogTrigger
            asChild
            onClick={() => {
              setDialog(Dialogs.dialog1)
            }}
          >
            <DropdownMenuItem>Delete All</DropdownMenuItem>
          </DialogTrigger>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Export PDFs</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog === Dialogs.dialog1 ? (
        <DeleteAllDialogContent assignment={assignment} setDialog={setDialog} />
      ) : null}
    </Dialog>
  )
}

function DeleteAllDialogContent({
  assignment,
  setDialog,
}: {
  assignment: Assignment
  setDialog: React.Dispatch<React.SetStateAction<Dialogs | null>>
}) {
  const router = useRouter()
  const deleteAllSubmissionsMutation = useDeleteAllSubmissionsMutation()
  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Delete Submission</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <DialogDescription>
          Are you sure you want to delete all {assignment.submission_count}{" "}
          submissions for assignment {assignment.name}?
        </DialogDescription>
      </div>
      <DialogFooter>
        <Button
          onClick={async (e) => {
            e.preventDefault()
            const data = await deleteAllSubmissionsMutation.mutateAsync(
              assignment.id,
              {
                onSuccess: () => {
                  router.invalidate()
                  setDialog(null)
                },
              }
            )
            console.log("data", data)
          }}
        >
          Delete All
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

function AddSubmissionsDialogWithTrigger({
  assignment,
}: {
  assignment: Assignment
}) {
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  return (
    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
      <DialogTrigger asChild>
        <Button title="Upload a new submission" size="sm">
          <LuFilePlus2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Submissions</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Upload PDFs to create submissions for assignment {assignment.name}.
          Each PDF will be split into the specified number of pages per
          submission.
        </DialogDescription>
        <SubmissionPDFsForm
          assignment={assignment}
          setAddDialogOpen={setAddDialogOpen}
        />
      </DialogContent>
    </Dialog>
  )
}

function IdentifySubmissionsDialogWithTrigger({
  assignment,
  submissions,
}: {
  assignment: Assignment
  submissions: Submission[]
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [step, setStep] = React.useState(1)
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={submissions.length === 0}>
          <LuArrowRight className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Identify Student in Submissions</DialogTitle>
        </DialogHeader>
        {step === 1 && (
          <IdentifySubmissionsForm
            assignment={assignment}
            submissions={submissions}
            setStep={setStep}
          />
        )}
        {step === 2 && (
          <IdentifyOverview
            assignment={assignment}
            submissions={submissions}
            setDialogOpen={setDialogOpen}
            setStep={setStep}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function IdentifySubmissionsForm({
  assignment,
  submissions,
  setStep,
}: {
  assignment: Assignment
  submissions: Submission[]
  setStep: React.Dispatch<React.SetStateAction<number>>
}) {
  const router = useRouter()
  const identifyMutation = useIdentifyAutomationWorkflowMutation(assignment.id)
  const maxPages = assignment.max_page_number
  const remainingSubmissionsToIdentify = submissions.filter(
    (submission) => submission.student === null
  )
  const formSchema = z.object({
    pages: z.array(z.number()),
  })
  const { toast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pages: [...Array(maxPages)].map((_, i) => i + 1).filter((v) => v == 1),
    },
  })
  async function onSubmit(values: z.infer<typeof formSchema>) {
    toast({
      title: "Identifying students...",
      description:
        "Searching for student IDs in page(s): " + values.pages.join(),
    })
    const data = await identifyMutation.mutateAsync(values.pages, {
      onSuccess: () => {},
    })
    console.log("data", data)
    router.invalidate()
    setStep(2)
  }

  if (form.formState.isSubmitting) {
    return <IdentifyAnimation num_digits={8} />
  }
  return (
    <Form {...form}>
      <DialogDescription>
        This will attempt to identify students in the submissions based on their
        university ID. More information can be found in the{" "}
        <a
          href="https://github.com/IonMich/instructor_pilot/wiki/Grading-Workflow"
          className="text-blue-500"
        >
          wiki
        </a>
        .
      </DialogDescription>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full space-y-8">
        <FormField
          control={form.control}
          name="pages"
          render={() => (
            <FormItem>
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 py-2">
                  <div className="flex flex-row gap-2 items-center">
                    {remainingSubmissionsToIdentify.length > 0 ? (
                      <Alert>
                        <LuInfo />
                        <AlertTitle>Status</AlertTitle>
                        <AlertDescription>
                          {remainingSubmissionsToIdentify.length} of{" "}
                          {assignment.submission_count} submissions remain
                          unidentified.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert>
                        <LuRocket />
                        <AlertTitle>Status</AlertTitle>
                        <AlertDescription>
                          All submissions have already been associated with a
                          student.
                        </AlertDescription>
                      </Alert>
                    )}
                    {remainingSubmissionsToIdentify.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStep(2)
                        }}
                      >
                        View
                      </Button>
                    )}
                  </div>

                  <FormDescription>
                    Choose the pages that contain the student ID:
                  </FormDescription>
                  <div className="flex flex-row gap-2 flex-wrap justify-center">
                    {[...Array(maxPages)].map((_, i) => (
                      <FormField
                        key={i + 1}
                        control={form.control}
                        name="pages"
                        render={({ field }) => {
                          return (
                            <FormItem key={i + 1}>
                              <FormControl>
                                <Toggle
                                  pressed={field.value.includes(i + 1)}
                                  variant="primary"
                                  size="lg"
                                  className="rounded-none rounded-tl-sm rounded-br-sm"
                                  title={`Page ${i + 1}`}
                                  onPressedChange={(pressed) => {
                                    return pressed
                                      ? field.onChange([...field.value, i + 1])
                                      : field.onChange(
                                          field.value.filter((v) => v !== i + 1)
                                        )
                                  }}
                                >
                                  {i + 1}
                                </Toggle>
                              </FormControl>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid gap-4">
                  <div className="flex flex-row gap-2 items-center">
                    <DialogDescription>
                      Focusing on the top left corner of the page.
                    </DialogDescription>
                    <Button variant="outline" size="sm" disabled>
                      Change
                    </Button>
                  </div>
                </div>
                <div className="flex flex-row justify-center gap-4">
                  <Button type="submit">Identify</Button>
                </div>
              </div>
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

function IdentifyOverview({
  assignment,
  submissions,
  setDialogOpen,
  setStep,
}: {
  assignment: Assignment
  submissions: Submission[]
  setDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  setStep: React.Dispatch<React.SetStateAction<number>>
}) {
  const numIdentified = submissions.filter(
    (submission) => submission.student !== null
  ).length
  const numSubmissions = assignment.submission_count
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 py-2">
        {numIdentified === numSubmissions ? (
          <Alert>
            <LuRocket />
            <AlertTitle>Status</AlertTitle>
            <AlertDescription>
              All submissions have been associated with a student.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <LuInfo />
            <AlertTitle>Status</AlertTitle>
            <AlertDescription>
              {numIdentified} of {numSubmissions} submissions have been
              associated with a student.
            </AlertDescription>
          </Alert>
        )}
      </div>
      {numIdentified < numSubmissions && (
        <>
          <Separator orientation="horizontal" />
          <div className="grid gap-4 overflow-y-auto max-h-[400px]">
            <DialogDescription className="sticky top-0 bg-background my-0 py-2">
              Remaining submissions to identify:
            </DialogDescription>
            {submissions
              .filter((submission) => submission.student === null)
              .map((submission) => (
                <div
                  key={submission.id}
                  className="flex flex-row gap-2 items-center justify-center"
                >
                  <DialogDescription className="text-bold">
                    Submission {submission.id.split("-")[0]}
                  </DialogDescription>
                  {/* open in new tab */}
                  <Link
                    to={`/submissions/$submissionId`}
                    params={{ submissionId: submission.id }}
                    target="_blank"
                  >
                    <Button variant="outline" size="icon">
                      <LuArrowUpRight size={12} />
                    </Button>
                  </Link>
                </div>
              ))}
          </div>
        </>
      )}
      <div className="flex flex-row justify-center gap-4">
        <Button
          onClick={() => {
            setStep(1)
          }}
        >
          Back
        </Button>
        <Button
          onClick={() => {
            setDialogOpen(false)
            setStep(1)
          }}
        >
          Close
        </Button>
      </div>
    </div>
  )
}

function IdentifyAnimation({ num_digits }: { num_digits: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 py-2">
        <DialogDescription>Running Workflow...</DialogDescription>
        {/* row table of 1 by `num_digits` showing digits changing constantly */}
        <div className="flex flex-row gap-1 justify-center">
          {[...Array(num_digits)].map((_, i) => (
            <ChangingDigit
              key={i}
              className="h-8 w-8 border border-gray-200 rounded-none flex items-center justify-center"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ChangingDigit({ className }: { className: string }) {
  const [digit, setDigit] = React.useState(Math.floor(Math.random() * 10))
  React.useEffect(() => {
    const interval = setInterval(() => {
      setDigit(Math.floor(Math.random() * 10))
    }, 50)
    return () => clearInterval(interval)
  }, [])
  return <div className={className}>{digit}</div>
}

function VersioningDialogWithTrigger({
  assignment,
  submissions,
}: {
  assignment: Assignment
  submissions: Submission[]
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [step, setStep] = React.useState(1)
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={submissions.length === 0}>
          <LuArrowRight className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Group Assignment Versions</DialogTitle>
        </DialogHeader>
        {step === 1 && (
          <VersioningForm
            assignment={assignment}
            submissions={submissions}
            setStep={setStep}
          />
        )}
        {step === 2 && (
          <VersioningOverview
            assignment={assignment}
            submissions={submissions}
            setStep={setStep}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type VersioningWithSubmissions = Partial<Version> & { submissions: Submission[] } 
const outliersNameId = "Uncategorized"

function getVersions(submissions: Submission[]): Record<string, VersioningWithSubmissions> {
  const versions = submissions.reduce(
    (acc, submission) => {
      if (!acc[submission.version?.id || outliersNameId]) {
        acc[submission.version?.id || outliersNameId] = {
          name: submission.version?.name || outliersNameId,
          version_image: submission.version?.version_image,
          submissions: [],
        }
      }
      acc[submission.version?.id || outliersNameId].submissions.push(submission)
      return acc
    },
    {} as Record<string, VersioningWithSubmissions>
  )
  return versions
}

function VersioningForm({
  assignment,
  submissions,
  setStep,
}: {
  assignment: Assignment
  submissions: Submission[]
  setStep: React.Dispatch<React.SetStateAction<number>>
}) {
  const router = useRouter()
  const versionMutation = useVersionAutomationWorkflowMutation(assignment.id)
  const maxPages = assignment.max_page_number
  const versions = getVersions(submissions)
  const num_versions = Object.keys(versions).filter(
    (version) => version !== outliersNameId
  ).length
  const remainingSubmissionsToVersion = submissions.filter(
    (submission) => submission.version === null
  )
  const formSchema = z.object({
    pages: z.array(z.number()),
  })
  const { toast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pages: [...Array(maxPages)].map((_, i) => i + 1).filter((v) => v == 1),
    },
  })
  async function onSubmit(values: z.infer<typeof formSchema>) {
    toast({
      title: "Grouping submissions...",
      description:
        "Grouping submissions based on page(s): " + values.pages.join(),
    })
    const data = await versionMutation.mutateAsync(values.pages, {
      onSuccess: () => {},
    })
    console.log("data", data)
    router.invalidate()
    setStep(2)
  }

  if (form.formState.isSubmitting) {
    return <GroupingAnimation num_submissions={assignment.submission_count} />
  }
  return (
    <Form {...form}>
      <DialogDescription>
        This will group submissions into{" "}
        <span className="font-bold text-accent-foreground">Versions</span> based
        on the printed text similarity in the selected pages. More information
        can be found in the{" "}
        <a
          href="github.com/IonMich/instructor_pilot/wiki/Grading-Workflow"
          className="text-blue-500"
        >
          wiki
        </a>
        .
      </DialogDescription>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full space-y-8">
        <FormField
          control={form.control}
          name="pages"
          render={() => (
            <FormItem>
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 py-2">
                  <div className="flex flex-row gap-2 items-center">
                    {remainingSubmissionsToVersion.length > 0 ? (
                      <Alert>
                        <LuInfo />
                        <AlertTitle>Status</AlertTitle>
                        <AlertDescription>
                          Number of versions: {num_versions}
                        </AlertDescription>
                        <AlertDescription>
                          {remainingSubmissionsToVersion.length} of{" "}
                          {assignment.submission_count} submissions remain
                          ungrouped.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert>
                        <LuRocket />
                        <AlertTitle>Status</AlertTitle>
                        <AlertDescription>
                          Number of versions: {num_versions}
                        </AlertDescription>
                        <AlertDescription>
                          All submissions have already been grouped.
                        </AlertDescription>
                      </Alert>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStep(2)
                      }}
                    >
                      View
                    </Button>
                  </div>

                  <FormDescription>
                    Choose the pages to extract text from:
                  </FormDescription>
                  <div className="flex flex-row gap-2 flex-wrap justify-center">
                    {[...Array(maxPages)].map((_, i) => (
                      <FormField
                        key={i + 1}
                        control={form.control}
                        name="pages"
                        render={({ field }) => {
                          return (
                            <FormItem key={i + 1}>
                              <FormControl>
                                <Toggle
                                  pressed={field.value.includes(i + 1)}
                                  variant="primary"
                                  size="lg"
                                  className="rounded-none rounded-tl-sm rounded-br-sm"
                                  title={`Page ${i + 1}`}
                                  onPressedChange={(pressed) => {
                                    return pressed
                                      ? field.onChange([...field.value, i + 1])
                                      : field.onChange(
                                          field.value.filter((v) => v !== i + 1)
                                        )
                                  }}
                                >
                                  {i + 1}
                                </Toggle>
                              </FormControl>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid gap-4">
                  <div className="flex flex-row gap-2 items-center">
                    <DialogDescription>
                      Focusing on the top left corner of the page.
                    </DialogDescription>
                    <Button variant="outline" size="sm" disabled>
                      Change
                    </Button>
                  </div>
                </div>
                <div className="flex flex-row justify-center gap-4">
                  <Button type="submit">Group</Button>
                </div>
              </div>
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

function VersioningOverview({
  assignment,
  submissions,
  setStep,
}: {
  assignment: Assignment
  submissions: Submission[]
  setStep: React.Dispatch<React.SetStateAction<number>>
}) {
  const versions = getVersions(submissions)
  const num_versions = Object.keys(versions).filter(
    (version) => version !== outliersNameId
  ).length
  const [tabValue, setTabValue] = React.useState(Object.keys(versions)[0])
  const numVersioned = submissions.filter(
    (submission) => submission.version !== null
  ).length
  const numSubmissions = assignment.submission_count
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 py-2">
        {numVersioned === numSubmissions ? (
          <Alert>
            <LuRocket />
            <AlertTitle>Status</AlertTitle>
            <AlertDescription>
              All submissions have been grouped into {num_versions} version(s).
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <LuInfo />
            <AlertTitle>Status</AlertTitle>
            <AlertDescription>
              {numVersioned} of {numSubmissions} submissions have been grouped.
            </AlertDescription>
          </Alert>
        )}
      </div>
      <Tabs value={tabValue}>
        <TabsList className="grid grid-flow-col h-100 gap-2 mt-2">
          {Object.entries(versions).map(([versionId, version]) => {
            return (
              <TabsTrigger
                value={versionId}
                className="text-wrap inline-block"
                key={versionId}
                onClick={() => setTabValue(versionId)}
              >
                <span className="text-sm font-medium leading-none text-center">
                  Version {version.name}{" "}
                  <Badge>
                    {version.submissions?.length || 0}
                    <LuFile />
                  </Badge>
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>
        {Object.entries(versions).map(([versionId, version]) => {
          return (
            <TabsContent value={versionId} key={versionId}>
              <div className="grid gap-4 h-60 overflow-hidden px-12">
                {version.version_image && (
                  <img
                    src={version.version_image.toString()}
                    alt={`Version ${version.name}`}
                    height="20rem"
                    className="w-full rounded-lg object-cover mt-[-110px]"
                  />
                )}
              </div>
            </TabsContent>
          )
        })}
      </Tabs>

      <div className="flex flex-row gap-4">
        <Button
          variant="outline"
          onClick={() => {
            setStep(1)
          }}
        >
          <LuArrowLeft className="me-1" />
          Back
        </Button>
      </div>
    </div>
  )
}

function GroupingAnimation({ num_submissions }: { num_submissions: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 py-2">
        <DialogDescription>Grouping Submissions...</DialogDescription>
        {/* row table of 1 by `num_submissions` showing digits changing constantly */}
        <div className="flex flex-row gap-1 flex-wrap overflow-y-hidden">
          {[...Array(Math.min(32, num_submissions))].map((_, i) => (
            <Skeleton
              key={i}
              className="h-11 w-8 border border-gray-200 rounded-none flex"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProgressPieChart({
  percentDone,
  chartData,
  chartConfig,
}: {
  percentDone: number
  chartData: { label: string; count: number; fill: string }[]
  chartConfig: ChartConfig
}) {
  const startAngle = 90
  const endAngle = 360 * (percentDone / 100) + startAngle
  return (
    <ChartContainer
      config={chartConfig}
      className="me-auto aspect-square h-[100px]"
    >
      <RadialBarChart
        title={percentDone + "%"}
        data={chartData}
        startAngle={90}
        endAngle={endAngle}
        innerRadius={43}
        outerRadius={60}
      >
        <PolarGrid
          gridType="circle"
          radialLines={false}
          stroke="none"
          className="first:fill-muted last:fill-background"
          polarRadius={[48, 37]}
        />
        <RadialBar dataKey="count" background cornerRadius={10} />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-xl font-bold"
                    >
                      {chartData[0].count}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 24}
                      className="fill-muted-foreground"
                    >
                      {chartData[0].label}
                    </tspan>
                  </text>
                )
              }
            }}
          />
        </PolarRadiusAxis>
      </RadialBarChart>
    </ChartContainer>
  )
}
