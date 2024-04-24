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
})

export const SubmissionPDFsForm = () => {
  const form = useForm<z.infer<typeof submissionPDFsSchema>>({
    resolver: zodResolver(submissionPDFsSchema),
    defaultValues: {
      submission_PDFs: [] as unknown as FileList,
    },
  })

  const { toast } = useToast()

  function onSubmit(data: z.infer<typeof submissionPDFsSchema>) {
    console.log(data)
    toast({
      title: "Submission updated successfully",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    })
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
                      placeholder="Picture"
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
          <Button type="submit">Add</Button>
        </form>
      </Form>
    </div>
  )
}
