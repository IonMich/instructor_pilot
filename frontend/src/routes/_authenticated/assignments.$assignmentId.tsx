import { createFileRoute } from "@tanstack/react-router"
import {
  assignmentQueryOptions,
  studentsInCourseQueryOptions,
  submissionQueryOptions,
  submissionsQueryOptions,
} from "@/utils/queryOptions"
import { SubmissionsTable } from "../-components/assignmentDetailLists"
import { Assignment, Course } from "@/utils/types"
import { TBreadcrumbItem } from "../-components/breadcrumbs"
import { fallback, zodSearchValidator } from "@tanstack/router-zod-adapter"
import { z } from "zod"

const submissionSearchSchema = z.object({
  page: fallback(z.number(), 0),
  filter: fallback(z.string(), ""),
  locationListType: fallback(z.enum(["rows", "cards", "detail"]), "rows"),
  submissionId: fallback(z.string(), ""),
})

function getBreadcrumbItems(
  assignment: Assignment,
  course: Course
): TBreadcrumbItem[] {
  return [
    {
      title: "Home",
      to: "/",
      params: {},
    },
    {
      title: course.course_code,
      to: "/courses/$courseId",
      params: { courseId: course.id },
    },
    {
      title: assignment.name,
      to: "/assignments/$assignmentId",
      params: { assignmentId: assignment.id },
    },
  ]
}

export const Route = createFileRoute(
  "/_authenticated/assignments/$assignmentId"
)({
  staticData: {
    title: "Assignment",
  },
  parseParams: (params) => ({
    assignmentId: parseInt(params.assignmentId),
  }),
  stringifyParams: (params) => ({
    assignmentId: params.assignmentId.toString(),
  }),
  validateSearch: zodSearchValidator(submissionSearchSchema),
  loaderDeps: ({ search: { submissionId } }) => ({ submissionId }),
  pendingMs: 5000,
  loader: async (opts) => {
    const assignmentId = opts.params.assignmentId
    const assignmentPromise = opts.context.queryClient.ensureQueryData({
      ...assignmentQueryOptions(assignmentId),
      revalidateIfStale: true,
    })
    const submissionsPromise = opts.context.queryClient.ensureQueryData({
      ...submissionsQueryOptions(assignmentId),
      revalidateIfStale: true,
    })
    const [assignment, submissions] = await Promise.all([
      assignmentPromise,
      submissionsPromise,
    ])
    const course = assignment.course
    let subData
    console.log(opts.deps)
    if (opts.deps.submissionId) {
      const submissionPromise = opts.context.queryClient.ensureQueryData({
        ...submissionQueryOptions(opts.deps.submissionId),
        revalidateIfStale: true,
      })
      const studentPromise = opts.context.queryClient.ensureQueryData({
        ...studentsInCourseQueryOptions(course.id),
        revalidateIfStale: true,
      })
      const [submission, students] = await Promise.all([
        submissionPromise,
        studentPromise,
      ])
      subData = {
        submission: submission,
        students: students,
        title: `Submission ${submission.id.split("-")[0]}`,
      }
    }
    return {
      assignment: assignment,
      submissions: submissions,
      title: assignment.name ?? "Assignment",
      breadcrumbItems: getBreadcrumbItems(assignment, course),
      ...subData,
    }
  },
  component: SubmissionsTable,
})
