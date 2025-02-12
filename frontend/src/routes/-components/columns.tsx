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

import { Assignment, Submission } from "@/utils/types"
import { Link, useRouter } from "@tanstack/react-router"
import { LuArrowUpRight, LuMoreHorizontal } from "react-icons/lu"

import {
  useDeleteSubmissionMutation,
  useExportSubmissionPDFQueryOptions,
  useExportSubmissionImagesQueryOptions,
  useIdentifySubmissionMutation,
} from "@/utils/queryOptions"
import * as React from "react"
import { queryClient } from "@/app"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Loader } from "@/components/ui/loader"

enum Dialogs {
  dialog1 = "dialog1",
  dialog2 = "dialog2",
  dialog3 = "dialog3",
  dialog4 = "dialog4",
}

export const columns: ColumnDef<Submission>[] = [
  {
    id: "index",
    accessorFn: (_, index) => index + 1,
    cell: ({ row }) => <div className="pl-2">{row.index + 1}</div>,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="#" className="pl-2" />
    ),
  },
  {
    id: "sub_short_id",
    accessorFn: (submission) => submission.id.split("-")[0],
    cell: ({ row }) => (
      <Link
        to="/submissions/$submissionId"
        params={{ submissionId: row.original.id }}
        className="hover:text-primary"
      >
        {row.original.id.split("-")[0]}
      </Link>
    ),
    header: "Submission",
  },
  {
    id: "assignment",
    accessorFn: (submission) => submission.assignment.name,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Assignment" />
    ),
  },
  {
    id: "assignmentgroup",
    accessorFn: (submission) =>
      submission.assignment.assignment_group_object?.name ??
      `(${submission.assignment.assignment_group})` ??
      "None",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Group" />
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
    id: "section",
    accessorFn: (submission) => submission.student?.sections[0].name ?? "",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Section" />
    ),
  },
  {
    id: "version",
    accessorFn: (submission) => submission.version?.name ?? "",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Version" />
    ),
  },
  {
    id: "q_grades",
    accessorFn: (submission) => submission.question_grades,
    header: "Question Grades",
  },
  {
    id: "qtotal",
    accessorKey: "grade",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Grade" />
    ),
  },
  {
    id: "canvas_id",
    accessorKey: "canvas_id",
    header: "Canvas ID",
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
          className="hover:text-primary"
        >
          <LuArrowUpRight />
        </Link>
      </div>
    ),
  },
]

export const columnsForAssignment: (
  assignment: Assignment
) => ColumnDef<Submission>[] = (
  // add question columns for i in range(assignment.num_questions)
  assignment: Assignment
) => {
  const num_questions = assignment.max_question_scores.split(",").length
  const idx_total = columns.findIndex((c) => c.id === "q_grades")
  const before = columns.slice(0, idx_total)
  const after = columns.slice(idx_total + 1)
  return [
    ...before,
    ...Array.from({ length: num_questions }, (_, i) => ({
      id: `q${i + 1}`,
      accessorFn: (submission) => submission.question_grades?.split(",")[i],
      header: `Q${i + 1}`,
    })),
    ...after,
  ]
}

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
            disabled
            onClick={() => {
              setDialog(Dialogs.dialog2)
            }}
          >
            <DropdownMenuItem>Identify</DropdownMenuItem>
          </DialogTrigger>
          <DropdownMenuItem disabled>Version</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DialogTrigger
            asChild
            onClick={() => {
              setDialog(Dialogs.dialog3)
            }}
          >
            <DropdownMenuItem>Export PDF</DropdownMenuItem>
          </DialogTrigger>
          <DialogTrigger
            asChild
            onClick={() => {
              setDialog(Dialogs.dialog4)
            }}
          >
            <DropdownMenuItem>Export Images</DropdownMenuItem>
          </DialogTrigger>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <p>
              Sync &nbsp;<code>canvas_id</code>
            </p>
          </DropdownMenuItem>
          <CanvasViewDropdownMenuItem url={submission.canvas_url} />
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog === Dialogs.dialog1 ? (
        <DeleteDialogContent submission={submission} setDialog={setDialog} />
      ) : dialog === Dialogs.dialog2 ? (
        <IdentifyDialogContent submission={submission} />
      ) : dialog === Dialogs.dialog3 ? (
        <ExportSubmissionPDFDialogContent
          submission={submission}
          setDialog={setDialog}
        />
      ) : dialog === Dialogs.dialog4 ? (
        <ExportSubmissionImagesDialogContent
          submission={submission}
          setDialog={setDialog}
        />
      ) : null}
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

function ExportSubmissionPDFDialogContent({
  submission,
  setDialog,
}: {
  submission: Submission
  setDialog: React.Dispatch<React.SetStateAction<Dialogs | null>>
}) {
  const {
    data: blob,
    isLoading,
    isError,
  } = useSuspenseQuery(useExportSubmissionPDFQueryOptions(submission.id))
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    // NOTE: the blob is a ZIP file, but by setting the filename to .pdf,
    // the browser will treat it as a PDF
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
          <p>Preparing PDF file...</p>
        </div>
      ) : isError ? (
        <div>
          <p>Failed to export PDF file.</p>
          <Button onClick={() => setDialog(null)}>Close</Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <p>Export ready! Click the link below to download:</p>
          <a
            href={downloadUrl || ""}
            download={`submission_${submission.id}.pdf`}
            className="text-blue-500 underline"
          >
            Download PDF
          </a>
          <Button onClick={() => setDialog(null)}>Close</Button>
        </div>
      )}
    </DialogContent>
  )
}

function ExportSubmissionImagesDialogContent({
  submission,
  setDialog,
}: {
  submission: Submission
  setDialog: React.Dispatch<React.SetStateAction<Dialogs | null>>
}) {
  const {
    data: blob,
    isLoading,
    isError,
  } = useSuspenseQuery(useExportSubmissionImagesQueryOptions(submission.id))
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    // NOTE: the blob is a ZIP file, but by setting the filename to .pdf,
    // the browser will treat it as a PDF
    if (blob) {
      const url = window.URL.createObjectURL(blob)
      setDownloadUrl(url)
      return () => window.URL.revokeObjectURL(url)
    }
  }, [blob])

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Export Images</DialogTitle>
      </DialogHeader>
      {isLoading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader wait="delay-0" />
          <p>Preparing image files...</p>
        </div>
      ) : isError ? (
        <div>
          <p>Failed to export image files.</p>
          <Button onClick={() => setDialog(null)}>Close</Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <p>Export ready! Click the link below to download:</p>
          <a
            href={downloadUrl || ""}
            download={`submission_${submission.id}.zip`}
            className="text-blue-500 underline"
          >
            Download Images
          </a>
          <Button onClick={() => setDialog(null)}>Close</Button>
        </div>
      )}
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
