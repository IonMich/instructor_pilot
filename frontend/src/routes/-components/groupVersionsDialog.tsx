import * as React from "react"
import { useRouter } from "@tanstack/react-router"

import { useVersionAutomationWorkflowMutation } from "@/utils/queryOptions"

import {
  LuFile,
  LuRocket,
  LuInfo,
  LuArrowRight,
  LuArrowLeft,
} from "react-icons/lu"
import { Toggle } from "@/components/ui/toggle"
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
import { Assignment, Submission, Version } from "@/utils/types"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export function VersioningDialogWithTrigger({
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

type VersioningWithSubmissions = Partial<Version> & {
  submissions: Submission[]
}
const outliersNameId = "Uncategorized"

function getVersions(
  submissions: Submission[]
): Record<string, VersioningWithSubmissions> {
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
                          {remainingSubmissionsToVersion.length ===
                          assignment.submission_count
                            ? "All"
                            : `${remainingSubmissionsToVersion.length} of ${assignment.submission_count}`}{" "}
                          submissions remain ungrouped.
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
