import * as React from "react"
import { useParams, useRouter } from "@tanstack/react-router"

import {
  assignmentQueryOptions,
  submissionsQueryOptions,
  useDeleteAllSubmissionsMutation,
} from "@/utils/queryOptions"

import { columns } from "./columns"
import { DataTable } from "./submissions-data-table"

import {
  LuFile,
  LuFilePlus2,
  LuMoreHorizontal,
  LuFileBarChart2,
  LuFileScan,
} from "react-icons/lu"
import { FaTasks } from "react-icons/fa"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
import { Assignment, Submission } from "@/utils/fetchData"
import { Separator } from "@/components/ui/separator"
import { SubmissionPDFsForm } from "./assignmentDetailForms"
import { useSuspenseQueries } from "@tanstack/react-query"

enum Dialogs {
  dialog1 = "dialog1",
  dialog2 = "dialog2",
}

export function SubmissionsTable() {
  const params = useParams({
    from: "/_authenticated/assignments/$assignmentId",
  })
  const assignmentId = params.assignmentId
  const results = useSuspenseQueries({
    queries: [
      assignmentQueryOptions(assignmentId),
      submissionsQueryOptions(assignmentId),
    ],
  })
  const [assignment, submissions] = [results[0].data, results[1].data]
  return (
    <>
      <div className="container mx-auto py-2">
        <h1 className="text-5xl font-bold py-8">{assignment?.name}</h1>
        <AssignmentDetailCards
          assignment={assignment}
          submissions={submissions}
        />
        <DataTable columns={columns} data={submissions} />
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
            <AddSubmissionsDialogWithTrigger />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Grades</CardTitle>
          <LuFileBarChart2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-row justify-between">
          <div>
            {submissions && (
              <div className="text-2xl font-bold">
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
              {assignment?.max_question_scores.split(",").length} question
              {assignment?.max_question_scores.split(",").length
                ? assignment?.max_question_scores.split(",").length > 1
                  ? "s"
                  : ""
                : ""}{" "}
            </p>
          </div>
          <div className="mt-8">
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
        <CardContent>
          {assignment && submissions && (
            <div className="text-xs">
              <ul>
                <li className="my-2">
                  <Progress value={percentGraded} />
                  <p className="text-xs text-muted-foreground">
                    <span className="whitespace-nowrap">
                      {subsGraded.length} graded
                    </span>
                    ,&nbsp;
                    <span className="whitespace-nowrap">
                      {assignment?.submission_count - subsGraded.length}{" "}
                      remaining
                    </span>
                  </p>
                </li>
                <li className="mb-2">
                  <Progress value={percentIdentified} />
                  <p className="text-xs text-muted-foreground">
                    <span className="whitespace-nowrap">
                      {subsIdentified.length} identified
                    </span>
                    ,&nbsp;
                    <span className="whitespace-nowrap">
                      {assignment?.submission_count - subsIdentified.length}{" "}
                      remaining
                    </span>
                  </p>
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
              <Button
                variant="ghost"
                size="sm"
                disabled={submissions.length === 0}
              >
                Run
              </Button>
            </div>
            <Separator orientation="horizontal" />
            <div className="mt-1 flex flex-row justify-between items-center">
              <div className="font-bold">Group Assignment Versions</div>
              <Button
                variant="ghost"
                size="sm"
                disabled={submissions.length === 0}
              >
                Run
              </Button>
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
            deleteAllSubmissionsMutation.mutate(assignment.id)
            setDialog(null)
            router.invalidate()
          }}
        >
          Delete All
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

function AddSubmissionsDialogWithTrigger() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button title="Upload a new submission" size="sm">
          <LuFilePlus2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Submissions</DialogTitle>
        </DialogHeader>
        <SubmissionPDFsForm />
      </DialogContent>
    </Dialog>
  )
}
