import * as React from "react"
import { Link, useRouter } from "@tanstack/react-router"

import {
  useIdentifyAutomationWorkflowMutation,
} from "@/utils/queryOptions"

import {
  LuArrowUpRight,
  LuRocket,
  LuInfo,
  LuArrowRight,
} from "react-icons/lu"
import { Toggle } from "@/components/ui/toggle"
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
import { Separator } from "@/components/ui/separator"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
} from "@/components/ui/form"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function IdentifySubmissionsDialogWithTrigger({
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
            target="_blank"
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