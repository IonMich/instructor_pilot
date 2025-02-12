import * as React from "react"
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"
import { useSuspenseQuery } from "@tanstack/react-query"
import { useExportGradesCSVQueryOptions } from "@/utils/queryOptions"
import { Assignment, DialogsGrades } from "@/utils/types"

export function ExportGradesCSVDialogContent({
  assignment,
  setDialog,
}: {
  assignment: Assignment
  setDialog: React.Dispatch<React.SetStateAction<DialogsGrades | null>>
}) {
  const {
    data: csvBlob,
    isLoading,
    isError,
  } = useSuspenseQuery(useExportGradesCSVQueryOptions(assignment.id))
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (csvBlob) {
      const url = window.URL.createObjectURL(csvBlob)
      setDownloadUrl(url)
      return () => window.URL.revokeObjectURL(url)
    }
  }, [csvBlob])

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Export Grades as CSV</DialogTitle>
      </DialogHeader>
      {isLoading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader wait="delay-0" />
          <p>Preparing CSV file…</p>
        </div>
      ) : isError ? (
        <div>
          <p>Failed to export CSV.</p>
          <Button onClick={() => setDialog(null)}>Close</Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <p>Export ready! Click the link below to download:</p>
          <a
            href={downloadUrl || ""}
            download={`${assignment.name}-grades.csv`}
            className="text-blue-500 underline"
          >
            Download CSV
          </a>
          <Button onClick={() => setDialog(null)}>Close</Button>
        </div>
      )}
    </DialogContent>
  )
}
