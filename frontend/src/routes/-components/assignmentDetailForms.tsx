import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useRouter } from "@tanstack/react-router"
import { Assignment } from "@/utils/types"
import { useCreateSubmissionsInAssignmentMutation } from "@/utils/queryOptions"

const ACCEPTED_FILE_TYPES = ["application/pdf"]
const MAX_FILE_SIZE = 20 //In MegaBytes

const sizeInMB = (sizeInBytes: number, decimalsNum = 2) => {
  const result = sizeInBytes / (1024 * 1024)
  return +result.toFixed(decimalsNum)
}

const submissionPDFsSchema = z.object({
  submission_PDFs: z
    .custom<FileList>()
    .refine((files) => {
      return Array.from(files ?? []).length !== 0
    }, "File is required")
    .refine((files) => {
      return Array.from(files ?? []).every(
        (file) => sizeInMB(file.size) <= MAX_FILE_SIZE
      )
    }, `The maximum file size is ${MAX_FILE_SIZE}MB`)
    .refine((files) => {
      return Array.from(files ?? []).every((file) =>
        ACCEPTED_FILE_TYPES.includes(file.type)
      )
    }, "File type is not supported"),
  pagesPerSubmission: z.coerce.number().int().positive(),
})

export const SubmissionPDFsForm = ({
  assignment,
  setAddDialogOpen,
}: {
  assignment: Assignment
  setAddDialogOpen: (open: boolean) => void
}) => {
  const router = useRouter()
  const createSubmissionsInAssignmentMutation =
    useCreateSubmissionsInAssignmentMutation(assignment.id)
  const form = useForm<z.infer<typeof submissionPDFsSchema>>({
    resolver: zodResolver(submissionPDFsSchema),
    defaultValues: {
      submission_PDFs: [] as unknown as FileList,
      pagesPerSubmission: 2,
    },
  })

  const { toast } = useToast()

  async function onSubmit(data: z.infer<typeof submissionPDFsSchema>) {
    console.log("data", data)

    await createSubmissionsInAssignmentMutation.mutateAsync(
      {
        pagesPerSubmission: data.pagesPerSubmission,
        filesToSplit: data.submission_PDFs,
      },
      {
        onError: (error) => {
          console.error(error)
          toast({
            title: "Error updating assignment",
            description: "An error occurred while updating the assignment.",
            variant: "destructive",
          })
        },
        onSuccess: () => {
          toast({
            title: "Assignment submission PDFs added",
            description: (
              <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
                <code className="text-white">
                  {data.submission_PDFs.length} files processed
                </code>
              </pre>
            ),
          })
          setAddDialogOpen(false)
        },
      }
    )
    router.invalidate()
  }

  return (
    <div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          encType="multipart/form-data"
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="submission_PDFs"
            // we need to make the form uncontrolled to be able to handle file inputs
            // so we destructure the field props to remove the value and onChange
            render={({ field: { value, onChange, ...fieldProps } }) => {
              console.log(value)
              return (
                <FormItem>
                  <FormLabel htmlFor="submission_PDFs">
                    Submission PDF
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...fieldProps}
                      placeholder="Submission File(s)"
                      type="file"
                      multiple
                      accept={ACCEPTED_FILE_TYPES.join(", ")}
                      onChange={(event) => onChange(event.target.files)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
          <FormField
            control={form.control}
            name="pagesPerSubmission"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="pagesPerSubmission">
                  Pages per submission
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="?" type="number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Adding..." : "Add"}
          </Button>
        </form>
      </Form>
    </div>
  )
}
