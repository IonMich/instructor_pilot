import * as React from "react"
import { Link, useRouter } from "@tanstack/react-router"

import {
  assignmentQueryOptions,
  submissionsQueryOptions,
  useExportSubmissionsPDFsQueryOptions,
  useDeleteAllSubmissionsMutation,
  useIdentifyAutomationWorkflowMutation,
} from "@/utils/queryOptions"

import { columnsForAssignment } from "./columns"
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
  LuDownloadCloud,
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
import { Assignment, Submission } from "@/utils/types"
import { Separator } from "@/components/ui/separator"
import { SubmissionPDFsForm } from "./assignmentDetailForms"
import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query"
import { getRouteApi } from "@tanstack/react-router"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
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
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AssignmentScoresHistogram } from "./courseDetailLists"
import { cn } from "@/lib/utils"
import { Loader } from "@/components/ui/loader"
import { InfoExtractDialogWithTrigger } from "./infoExtractionDialog"
import { VersioningDialogWithTrigger } from "./groupVersionsDialog"

const route = getRouteApi("/_authenticated/assignments/$assignmentId")

enum DialogsSubs {
  dialog1 = "dialog1",
  dialog2 = "dialog2",
}

enum DialogsGrades {
  dialog1 = "dialog1",
  dialog2 = "dialog2",
}

export function SubmissionsTable() {
  const assignmentId = route.useParams().assignmentId
  const { filter, page, locationListType } = route.useSearch()
  const [{ data: assignment }, { data: submissions }] = useSuspenseQueries({
    queries: [
      assignmentQueryOptions(assignmentId),
      submissionsQueryOptions(assignmentId),
    ],
  })
  const columnsOfAssignment = columnsForAssignment(assignment).filter(
    (column) => column.id !== "assignment" && column.id !== "assignmentgroup"
  )
  const lenSubsGraded = submissions.filter(
    (submission) => submission.grade !== null
  ).length

  return (
    <>
      <div className="container mx-auto py-2">
        {locationListType !== "detail" && (
          <div className="mt-8 grid gap-8 md:grid-cols-4 grid-cols-1">
            <div
              className={cn(
                "bt-8 flex flex-row flex-wrap justify-evenly items-center col-span-2",
                lenSubsGraded === 0 && "md:col-span-4 justify-center gap-8"
              )}
            >
              <h1 className="text-5xl font-bold md:my-8">{assignment.name}</h1>
              {assignment.canvas_id && (
                <CanvasDialogWithTrigger
                  assignment={assignment}
                  submissions={submissions}
                />
              )}
            </div>
            {lenSubsGraded !== 0 && (
              <Card className="p-8 sm:p-10 col-span-2 md:row-span-3 md:col-start-3 md:col-end-5 md:row-start-1 order-last">
                <AssignmentScoresHistogram
                  assignmentId={assignment.id}
                  className="mx-auto w-[100%] h-[100%]"
                  showXTicks={true}
                  showYTicks={true}
                  filled={false}
                />
              </Card>
            )}
            <AssignmentDetailCards
              assignment={assignment}
              submissions={submissions}
            />
          </div>
        )}
        <DataTable
          columns={columnsOfAssignment}
          data={submissions}
          initialState={{
            columnVisibility: {
              canvas_id: assignment.canvas_id ? true : false,
            },
            pageIndex: page,
            locationListType: locationListType,
          }}
        />
      </div>
    </>
  )
}

function CanvasDialogWithTrigger({
  assignment,
  submissions,
}: {
  assignment: Assignment
  submissions: Submission[]
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border border-primary my-auto">
          Canvas
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Canvas Info for {assignment.name}</DialogTitle>
        </DialogHeader>
        <CanvasAssignmentInfo
          assignment={assignment}
          submissions={submissions}
        />
      </DialogContent>
    </Dialog>
  )
}

function CanvasAssignmentInfo({
  assignment,
  submissions,
}: {
  assignment: Assignment
  submissions: Submission[]
}) {
  const num_subs = submissions.length
  const num_subs_canvas_id = submissions.filter(
    (submission) => submission.canvas_id
  ).length
  // const [step, setStep] = React.useState(1)
  return (
    <div className="space-y-4">
      <div className="flex flex-row gap-1 items-center justify-end">
        <DialogDescription>
          <span className="font-bold">Canvas ID:</span> {assignment.canvas_id}
        </DialogDescription>
      </div>
      <CanvasSyncWarnings submissions={submissions} />
      {num_subs_canvas_id === num_subs && (
        <Alert>
          <LuRocket />
          <AlertTitle>All Submissions Linked</AlertTitle>
          <AlertDescription>
            All submissions have been linked to Canvas submission.
            <br />
            Feel free to double-check that the correct Canvas ID has been
            associated with each submission by clicking on the submission Canvas
            link.
          </AlertDescription>
        </Alert>
      )}
      <Button
        title="Synchronize the submissions by extracting the Canvas ID from Canvas"
        variant="outline"
        className="border border-primary mx-auto flex flex-row items-center gap-2"
      >
        <span>
          {num_subs_canvas_id === num_subs ? "Link Again" : "Link IDs"}
        </span>{" "}
        <LuDownloadCloud className="h-4 w-4" />
      </Button>
      {num_subs_canvas_id > 0 && (
        <>
          {num_subs_canvas_id < num_subs && (
            <>
              <Separator orientation="horizontal" />
              <p className="text-xs text-muted-foreground">
                Focus on the {num_subs_canvas_id} linked submission
                {num_subs_canvas_id > 0 && "s"}.
              </p>
            </>
          )}

          <Button
            variant="outline"
            className="border border-primary mx-auto flex flex-row items-center gap-2"
          >
            Continue <LuArrowRight className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  )
}

function CanvasSyncWarnings({ submissions }: { submissions: Submission[] }) {
  const num_subs = submissions.length
  const num_subs_identified = submissions.filter(
    (submission) => submission.student
  ).length
  const num_subs_canvas_id = submissions.filter(
    (submission) => submission.canvas_id
  ).length
  return (
    <>
      {num_subs_identified < num_subs && (
        <Alert>
          <LuInfo />
          <AlertTitle>Unidentified Submissions Found</AlertTitle>
          <AlertDescription>
            Some of the submissions have not been associated with a student.
            Such submissions cannot be linked to a Canvas submission. Use the
            automation workflow to identify the remaining students, or manually
            associate the submissions with a student.
          </AlertDescription>
        </Alert>
      )}
      {num_subs_canvas_id < num_subs && (
        <Alert>
          <LuInfo />
          <AlertTitle>Submission without Canvas Identifiers</AlertTitle>
          <AlertDescription>
            This assignment is already linked to a Canvas assignment. However,
            {num_subs_canvas_id === 0
              ? " no submissions"
              : `only ${num_subs_canvas_id} out of ${num_subs} submissions`}{" "}
            have a Canvas ID associated with them. Get the Canvas ID for the
            submissions by synchronizing the submissions. This action{" "}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-bold text-accent-foreground underline decoration-wavy">
                  will not upload
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                It performs a{" "}
                <a
                  href="https://canvas.instructure.com/doc/api/submissions.html#method.submissions_api.index"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  GET request
                </a>{" "}
                to the Canvas API.
              </TooltipContent>
            </Tooltip>{" "}
            any data to Canvas.
          </AlertDescription>
        </Alert>
      )}
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
    <>
      <Card className="md:col-span-2 lg:col-span-1">
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
      <Card className="md:col-span-2 lg:col-span-1">
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
            {assignment && submissions && (
              <GradesDropdownMenu
                assignment={assignment}
                submissions={submissions}
              />
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="col-span-2 lg:col-span-1">
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
      <Card className="col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Automations</CardTitle>
          <LuFileScan className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xs">
            <div className="mt-1 mb-1 flex flex-row justify-between items-center">
              <div className="font-bold">Identify Students by ID</div>
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
            <Separator orientation="horizontal" />
            <div className="mt-1 flex flex-row justify-between items-center">
              <div className="font-bold">Extract Information from Docs</div>
              <InfoExtractDialogWithTrigger
                assignment={assignment}
                submissions={submissions}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

function AllSubmissionsDropdownMenu({
  assignment,
}: {
  assignment: Assignment
}) {
  const [dialog, setDialog] = React.useState<DialogsSubs | null>(null)
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
              setDialog(DialogsSubs.dialog1)
            }}
          >
            <DropdownMenuItem>Delete All</DropdownMenuItem>
          </DialogTrigger>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setDialog(DialogsSubs.dialog2)
            }}
          >
            Export PDFs
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog === DialogsSubs.dialog1 ? (
        <DeleteAllDialogContent assignment={assignment} setDialog={setDialog} />
      ) : null}
      {dialog === DialogsSubs.dialog2 ? (
        <ExportPDFsDialogContent
          assignment={assignment}
          setDialog={setDialog}
        />
      ) : null}
    </Dialog>
  )
}

function DeleteAllDialogContent({
  assignment,
  setDialog,
}: {
  assignment: Assignment
  setDialog: React.Dispatch<React.SetStateAction<DialogsSubs | null>>
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
          submissions for assignment {assignment.name} and any associated
          grades? This action is{" "}
          <span className="font-bold text-accent-foreground">IRREVERSIBLE</span>
          .
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

function GradesDropdownMenu({
  assignment,
  submissions,
}: {
  assignment: Assignment
  submissions: Submission[]
}) {
  const [dialog, setDialog] = React.useState<DialogsGrades | null>(null)
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
              setDialog(DialogsGrades.dialog1)
            }}
          >
            <DropdownMenuItem>Modify Grading Scheme</DropdownMenuItem>
          </DialogTrigger>
          <DialogTrigger
            asChild
            onClick={() => {
              setDialog(DialogsGrades.dialog2)
            }}
          >
            <DropdownMenuItem>Compare</DropdownMenuItem>
          </DialogTrigger>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>Export Grades CSV</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog === DialogsGrades.dialog1 ? (
        <GradingSchemeFormDialogContent
          assignment={assignment}
          submissions={submissions}
          setDialog={setDialog}
        />
      ) : (
        <ComparisonDialogContent
          assignment={assignment}
          submissions={submissions}
          setDialog={setDialog}
        />
      )}
    </Dialog>
  )
}

function GradingSchemeFormDialogContent({
  assignment,
  submissions,
  setDialog,
}: {
  assignment: Assignment
  submissions: Submission[]
  setDialog: React.Dispatch<React.SetStateAction<DialogsGrades | null>>
}) {
  console.log(submissions)
  // create a form to update the max_question_scores
  const max_question_scores = assignment.max_question_scores
    .split(",")
    .map((score) => Number(score))
  const max_score = assignment.max_score
  const num_questions_default = max_question_scores.length

  // creat a slider to update the number of questions
  const [num_questions, setNumQuestions] = React.useState<number>(
    num_questions_default
  )
  const max_questions_possible = Math.max(Math.min(5, max_score), num_questions)

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Grading Scheme</DialogTitle>
      </DialogHeader>
      <DialogDescription>
        Update the grading scheme for assignment {assignment.name}.
      </DialogDescription>
      <DialogDescription>
        Number of questions: {num_questions} (Max grade: {max_score})
      </DialogDescription>
      <div className="grid grid-cols-4 gap-4">
        <Slider
          onValueChange={(value) => {
            if (value[0] < 1) {
              value[0] = 1
            }
            setNumQuestions(value[0])
          }}
          value={[num_questions]}
          min={0}
          max={max_questions_possible}
          step={1}
          className="col-span-3"
        />
        <Input
          type="number"
          value={num_questions}
          onChange={(e) => {
            setNumQuestions(parseInt(e.target.value))
          }}
          min={1}
          max={100}
        />
      </div>
      {num_questions > 0 && num_questions <= 100 && (
        <ScrollArea className="max-h-[400px]">
          <GradingSchemeForm
            assignment={assignment}
            num_questions={num_questions}
            max_question_scores={max_question_scores}
            setDialog={setDialog}
          />
        </ScrollArea>
      )}
    </DialogContent>
  )
}

function GradingSchemeForm({
  assignment,
  num_questions,
  max_question_scores,
  setDialog,
}: {
  assignment: Assignment
  num_questions: number
  max_question_scores: number[]
  setDialog: React.Dispatch<React.SetStateAction<DialogsGrades | null>>
}) {
  const router = useRouter()
  // const updateAssignmentMutation = useUpdateAssignmentMutation(assignment.id)

  // use RHF creator suggestion on how to handle array with variable number of elements
  const formSchema = z.object({
    max_question_scores: z.array(z.number().positive()).length(num_questions),
  })
  const { toast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      max_question_scores,
    },
  })
  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("values", values)
    console.log(router)
    console.log(setDialog)
    toast({
      title: "Updating grading scheme...",
      description:
        "Updating the grading scheme for assignment " + assignment.name,
    })
    // const data = await updateAssignmentMutation.mutateAsync(values, {
    //   onSuccess: () => {
    //     router.invalidate()
    //     setDialog(null)
    //   },
    // })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full space-y-8">
        <FormField
          control={form.control}
          name="max_question_scores"
          render={() => {
            return (
              <FormItem>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-4 py-2">
                    <FormDescription>
                      Enter the maximum score for each question:
                    </FormDescription>
                    <div className="flex flex-row gap-4 items-center">
                      {[...Array(num_questions)].map((_, i) => (
                        <FormField
                          key={i}
                          control={form.control}
                          name={`max_question_scores.${i}`}
                          render={({ field }) => {
                            return (
                              <div className="flex flex-row gap-4 items-center">
                                <FormItem key={i}>
                                  <FormLabel>Question {i + 1}</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} />
                                  </FormControl>
                                </FormItem>
                              </div>
                            )
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-row justify-center gap-4">
                    <Button
                      type="submit"
                      disabled={
                        form.formState.isSubmitting || !form.formState.isDirty
                      }
                    >
                      Update
                    </Button>
                  </div>
                </div>
              </FormItem>
            )
          }}
        />
      </form>
    </Form>
  )
}

function ComparisonDialogContent({
  assignment,
  submissions,
  setDialog,
}: {
  assignment: Assignment
  submissions: Submission[]
  setDialog: React.Dispatch<React.SetStateAction<DialogsGrades | null>>
}) {
  const num_questions = assignment?.max_question_scores.split(",").length
  const subsGraded =
    submissions.filter((submission) => submission.grade !== null) || []
  const subsAverage =
    subsGraded
      .map((submission) => submission.grade)
      .reduce((a, b) => a + b, 0) / subsGraded.length
  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Comparison</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <DialogDescription>
          The average grade for {num_questions} question
          {num_questions > 1 && "s"} is{" "}
          {subsAverage.toFixed(2) != "NaN" ? (
            subsAverage.toFixed(2)
          ) : (
            <Skeleton className="h-4 w-[3ch] inline-block" />
          )}
          .
        </DialogDescription>
      </div>
      <DialogFooter>
        <Button
          onClick={() => {
            setDialog(null)
          }}
        >
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
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

function ExportPDFsDialogContent({
  assignment,
  setDialog,
}: {
  assignment: Assignment
  setDialog: React.Dispatch<React.SetStateAction<DialogsSubs | null>>
}) {
  const {
    data: blob,
    isLoading,
    isError,
  } = useSuspenseQuery(useExportSubmissionsPDFsQueryOptions(assignment.id))
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (blob) {
      const url = window.URL.createObjectURL(blob)
      setDownloadUrl(url)
      return () => window.URL.revokeObjectURL(url)
    }
  }, [blob])

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Export PDFs</DialogTitle>
      </DialogHeader>
      {isLoading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader wait="delay-0" />
          <p>Preparing ZIP file...</p>
        </div>
      ) : isError ? (
        <div>
          <p>Failed to export PDFs.</p>
          <Button onClick={() => setDialog(null)}>Close</Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <p>Export ready! Click the link below to download:</p>
          <a
            href={downloadUrl || ""}
            download={`${assignment.name}-submission-PDFs.zip`}
            className="text-blue-500 underline"
          >
            Download ZIP
          </a>
          <Button onClick={() => setDialog(null)}>Close</Button>
        </div>
      )}
    </DialogContent>
  )
}
