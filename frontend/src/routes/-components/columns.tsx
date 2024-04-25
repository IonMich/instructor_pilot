import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/ui/table-fancy-header"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Submission } from "@/utils/fetchData"
import { Link, useRouter } from "@tanstack/react-router"
import { LuArrowUpRight, LuMoreHorizontal } from "react-icons/lu"

import {
  useDeleteSubmissionMutation,
  useIdentifySubmissionMutation,
} from "@/utils/queryOptions"
import * as React from "react"
import { queryClient } from "@/app"

enum Dialogs {
  dialog1 = "dialog1",
  dialog2 = "dialog2",
}

export const columns: ColumnDef<Submission>[] = [
  {
    id: "index",
    accessorFn: (_, index) => index + 1,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="#" className="pl-2" />
    ),
  },
  {
    accessorFn: (submission) => submission.id.split("-")[0],
    header: "Sub ID",
  },
  {
    id: "assignment",
    accessorFn: (submission) => submission.assignment.name,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Assignment" />
    ),
  },
  {
    id: "student",
    accessorFn: (submission) =>
      submission.student
        ? submission.student.last_name + ", " + submission.student.first_name
        : "",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Student" />
    ),
  },
  {
    id: "uni_id",
    accessorFn: (submission) => submission.student?.uni_id ?? "",
    header: "Student ID",
  },
  {
    id: "version",
    accessorFn: (submission) => submission.version?.name ?? "",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Version" />
    ),
  },
  {
    id: "section",
    accessorFn: (submission) => submission.student?.sections[0] ?? "",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Section" />
    ),
  },
  {
    accessorFn: (submission) => submission.question_grades?.split(",")[0],
    header: "Q1",
  },
  {
    accessorFn: (submission) => submission.question_grades?.split(",")[1],
    header: "Q2",
  },
  {
    accessorKey: "grade",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Grade" />
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const submission = row.original
      return <SubmissionDropdownMenu submission={submission} />
    },
  },
  {
    id: "view",
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Link
          to="/submissions/$submissionId"
          params={{ submissionId: row.original.id }}
        >
          <LuArrowUpRight />
        </Link>
      </div>
    ),
  },
]

function SubmissionDropdownMenu({ submission }: { submission: Submission }) {
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
            <DropdownMenuItem>Delete</DropdownMenuItem>
          </DialogTrigger>
          <DropdownMenuSeparator />
          <DialogTrigger
            asChild
            onClick={() => {
              setDialog(Dialogs.dialog2)
            }}
          >
            <DropdownMenuItem>Identify</DropdownMenuItem>
          </DialogTrigger>
          <DropdownMenuItem>Version</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Export PDF</DropdownMenuItem>
          <DropdownMenuItem>Export Images</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <p>
              Sync &nbsp;<code>canvas_id</code>
            </p>
          </DropdownMenuItem>
          <CanvasViewDropdownMenuItem url={submission.canvas_url} />
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog === Dialogs.dialog1 ? (
        <DeleteDialogContent submission={submission} setDialog={setDialog} />
      ) : (
        <IdentifyDialogContent submission={submission} />
      )}
    </Dialog>
  )
}

function DeleteDialogContent({
  submission,
  setDialog,
}: {
  submission: Submission
  setDialog: React.Dispatch<React.SetStateAction<Dialogs | null>>
}) {
  const router = useRouter()
  const deleteSubmissionMutation = useDeleteSubmissionMutation()
  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Delete Submission</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <DialogDescription>
          Are you sure you want to delete the submission with ID {submission.id}
          ?
        </DialogDescription>
      </div>
      <DialogFooter>
        <Button
          onClick={async (e) => {
            e.preventDefault()
            deleteSubmissionMutation.mutate(submission.id)
            setDialog(null)
            router.invalidate()
            queryClient.invalidateQueries()
          }}
        >
          Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

function IdentifyDialogContent({ submission }: { submission: Submission }) {
  const router = useRouter()
  const identifySubmissionMutation = useIdentifySubmissionMutation()
  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Identify Submission</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <DialogDescription>
          Are you sure you want to identify the submission with ID{" "}
          {submission.id}?
        </DialogDescription>
      </div>
      <DialogFooter>
        <Button
          onClick={() => {
            identifySubmissionMutation.mutate(submission.id)
            router.invalidate()
            queryClient.invalidateQueries()
          }}
        >
          Identify
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

function CanvasViewDropdownMenuItem({ url }: { url: string }) {
  return (
    <DropdownMenuItem
      onClick={() => {
        const url_no_params = url.split("?")[0]
        return window.open(url_no_params, "_blank")
      }}
    >
      View on Canvas
    </DropdownMenuItem>
  )
}
