import * as React from "react"
import { useRouter } from "@tanstack/react-router"

import { useExtractInfoAutomationWorkflowMutation } from "@/utils/queryOptions"

import {
  LuRocket,
  LuInfo,
  LuArrowRight,
  LuArrowLeft,
  LuTrash,
} from "react-icons/lu"
import { Toggle } from "@/components/ui/toggle"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Assignment, Submission } from "@/utils/types"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"

import { Control, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function InfoExtractDialogWithTrigger({
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
      <DialogContent className="max-h-full overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Extract Information</DialogTitle>
        </DialogHeader>
        {step === 1 && (
          <InfoExtractForm
            assignment={assignment}
            submissions={submissions}
            setStep={setStep}
          />
        )}
        {step === 2 && (
          <InfoExtractOverview
            assignment={assignment}
            submissions={submissions}
            setStep={setStep}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function InfoExtractForm({
  assignment,
  submissions,
  setStep,
}: {
  assignment: Assignment
  submissions: Submission[]
  setStep: React.Dispatch<React.SetStateAction<number>>
}) {
  const router = useRouter()
  const infoExtractMutation = useExtractInfoAutomationWorkflowMutation(
    assignment.id
  )
  const maxPages = assignment.max_page_number
  const remainingSubmissionsToExtract = submissions.filter(() => true)
  const defaultEmptyInfoField = {
    title: "",
    description: "",
    assignment_id: assignment.id,
    pattern: "",
    pages: [1],
  }
  // array of InfoField objects
  const formSchema = z.object({
    info_fields: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        assignment_id: z.number(),
        pattern: z.string().optional(),
        pages: z.array(z.number()).optional(),
      })
    ),
  })
  const { toast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      info_fields: [defaultEmptyInfoField],
    },
  })
  async function onSubmit(values: z.infer<typeof formSchema>) {
    toast({
      title: "Extracting information...",
      // display value.info_fields as JSON string
      description: (
        <span className="font-mono">
          Extracting {values.info_fields.map((field) => field.title).join(", ")}{" "}
          from all submissions.
          <br />
          <pre>{JSON.stringify(values.info_fields, null, 2)}</pre>
        </span>
      ),
    })
    const data = await infoExtractMutation.mutateAsync(values.info_fields, {
      onSuccess: () => {},
    })
    console.log("data", data)
    router.invalidate()
    setStep(2)
  }

  if (form.formState.isSubmitting) {
    return <ExtractingAnimation num_submissions={assignment.submission_count} />
  }
  return (
    <Form {...form}>
      <DialogDescription>
        This pipeline will extract information from all documents for the
        specified fields. More information can be found in the{" "}
        <a
          href="https://github.com/IonMich/instructor_pilot/wiki/Grading-Workflow"
          className="text-blue-500"
          target="blank"
        >
          wiki
        </a>
        .
      </DialogDescription>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full space-y-8">
        <FormField
          control={form.control}
          name="info_fields"
          render={() => (
            <FormItem>
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 py-2">
                  <div className="flex flex-row gap-2 items-center">
                    {remainingSubmissionsToExtract.length > 0 ? (
                      <Alert>
                        <LuInfo />
                        <AlertTitle>Status</AlertTitle>
                        <AlertDescription>
                          No information has been extracted from{" "}
                          {remainingSubmissionsToExtract.length} out of{" "}
                          {assignment.submission_count} submissions.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert>
                        <LuRocket />
                        <AlertTitle>Status</AlertTitle>
                        <AlertDescription>
                          All submissions have already been extracted.
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
                </div>
                <div className="overflow-y-auto max-h-[400px] grid gap-4">
                  {form.getValues("info_fields").map((_, i) => (
                    <CreateInfoField
                      key={i}
                      index={i}
                      control={form.control}
                      remove={(index) => {
                        form.setValue(
                          "info_fields",
                          form
                            .getValues("info_fields")
                            .filter((_, i) => i !== index)
                        )
                      }}
                      maxPages={maxPages}
                    />
                  ))}
                </div>
                {/* add new information fields */}
                <div className="flex flex-row gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="mx-auto"
                    onClick={() => {
                      console.log("info_fields", form.getValues("info_fields"))
                      form.setValue("info_fields", [
                        ...form.getValues("info_fields"),
                        defaultEmptyInfoField,
                      ])
                    }}
                  >
                    Add new Field
                  </Button>
                </div>
                <div className="flex flex-row justify-center gap-4">
                  {/* disable if there are no field titles */}
                  <Button
                    disabled={
                      form
                        .getValues("info_fields")
                        .filter((field) => field.title === "").length ===
                      form.getValues("info_fields").length
                    }
                    type="submit"
                  >
                    Extract
                  </Button>
                </div>
              </div>
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

function CreateInfoField({
  index,
  control,
  remove,
  maxPages,
}: {
  index: number
  control: Control<{
    info_fields: {
      title: string
      description: string
      assignment_id: number
      pattern: string
      pages: number[]
    }[]
  }>
  remove: (index: number) => void
  maxPages: number
}) {
  return (
    <Card className="grid gap-4 p-4">
      <FormField
        control={control}
        name={`info_fields.${index}.title`}
        render={({ field }) => {
          return (
            <FormItem className="flex flex-row gap-4 items-center">
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} className="w-3/4 ml-auto" />
              </FormControl>
            </FormItem>
          )
        }}
      />
      <FormField
        control={control}
        name={`info_fields.${index}.description`}
        render={({ field }) => {
          return (
            <FormItem className="flex flex-row gap-4 items-center">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} className="w-3/4 ml-auto" />
              </FormControl>
            </FormItem>
          )
        }}
      />
      <FormField
        control={control}
        name={`info_fields.${index}.pattern`}
        render={({ field }) => {
          return (
            <FormItem className="flex flex-row gap-4 items-center">
              <FormLabel>Pattern</FormLabel>
              <FormControl>
                <Input {...field} className="w-3/4 ml-auto" />
              </FormControl>
            </FormItem>
          )
        }}
      />
      <FormDescription>
        Choose from which pages to extract this information:
      </FormDescription>
      <div className="flex flex-row gap-2 flex-wrap justify-center">
        {[...Array(maxPages)].map((_, i) => (
          <FormField
            key={i + 1}
            control={control}
            name={`info_fields.${index}.pages`}
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
      <Button
        variant="outline"
        size="icon"
        type="button"
        onClick={() => {
          remove(index)
        }}
      >
        <LuTrash />
      </Button>
    </Card>
  )
}

function InfoExtractOverview({
  assignment,
  submissions,
  setStep,
}: {
  assignment: Assignment
  submissions: Submission[]
  setStep: React.Dispatch<React.SetStateAction<number>>
}) {
  const numExtracted = submissions.filter(() => true).length
  const numSubmissions = assignment.submission_count
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 py-2">
        {numExtracted === numSubmissions ? (
          <Alert>
            <LuRocket />
            <AlertTitle>Status</AlertTitle>
            <AlertDescription>
              All submissions have been extracted.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <LuInfo />
            <AlertTitle>Status</AlertTitle>
            <AlertDescription>
              {numExtracted} of {numSubmissions} submissions have been
              extracted.
            </AlertDescription>
          </Alert>
        )}
      </div>
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

function ExtractingAnimation({ num_submissions }: { num_submissions: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 py-2">
        <DialogDescription>Extracting Information...</DialogDescription>
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
