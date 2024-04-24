import { createFileRoute } from "@tanstack/react-router"
import {
  assignmentQueryOptions,
  submissionsQueryOptions,
} from "@/utils/queryOptions"
import { SubmissionsTable } from "../-components/assignmentDetailLists"
import { seo } from "@/utils/utils"
import { Assignment, Course } from "@/utils/fetchData"

function getBreadcrumbItems(assignment: Assignment, course: Course) {
  return [
    {
      title: "Home",
      path: "/",
    },
    {
      title: course.course_code,
      path: `/courses/${course.id}`,
    },
    {
      title: assignment.name,
      path: `/assignments/${assignment.id}`,
    },
  ]
}

export const Route = createFileRoute(
  "/_authenticated/assignments/$assignmentId"
)({
  parseParams: (params) => ({
    assignmentId: parseInt(params.assignmentId),
  }),
  stringifyParams: (params) => ({
    assignmentId: params.assignmentId.toString(),
  }),
  loader: async (opts) => {
    const assignmentId = opts.params.assignmentId
    const assignmentPromise = opts.context.queryClient.ensureQueryData(
      assignmentQueryOptions(assignmentId)
    )
    const submissionsPromise = opts.context.queryClient.ensureQueryData(
      submissionsQueryOptions(assignmentId)
    )
    const [assignment, submissions] = await Promise.all([
      assignmentPromise,
      submissionsPromise,
    ])
    const course = assignment.course as Course
    return {
      assignment: assignment,
      submissions: submissions,
      title: assignment.name ?? "Assignment",
      breadcrumbItems: getBreadcrumbItems(assignment, course),
    }
  },
  meta: ({ loaderData }) => [
    ...seo({
      title: loaderData?.title,
    }),
  ],
  component: SubmissionsTable,
})
