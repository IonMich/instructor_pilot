import { Link, createFileRoute } from "@tanstack/react-router"
// import { useTheme } from "@/components/theme-provider"
import { Submission, Assignment, Course } from "@/utils/fetchData"
import {
  submissionQueryOptions,
  assignmentQueryOptions,
  studentsInCourseQueryOptions,
  submissionsQueryOptions,
} from "@/utils/queryOptions"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SubmissionDetail } from "../-components/submissionDetail"

export const Route = createFileRoute(
  "/_authenticated/submissions/$submissionId"
)({
  parseParams: (params) => ({
    submissionId: params.submissionId,
  }),
  stringifyParams: (params) => ({
    submissionId: params.submissionId.toString(),
  }),
  loader: async (opts) => {
    const submissionId = opts.params.submissionId
    const submissionPromise = opts.context.queryClient.ensureQueryData(
      submissionQueryOptions(submissionId)
    )
    const submission = await submissionPromise
    const assignmentId = submission.assignment.id
    const courseId = submission.assignment.course.id
    const assignmentPromise = opts.context.queryClient.ensureQueryData(
      assignmentQueryOptions(assignmentId)
    )
    const submissionsPromise = opts.context.queryClient.ensureQueryData(
      submissionsQueryOptions(assignmentId)
    )
    const studentsPromise = opts.context.queryClient.ensureQueryData(
      studentsInCourseQueryOptions(courseId)
    )
    const [assignment, submissions, students] = await Promise.all([
      assignmentPromise,
      submissionsPromise,
      studentsPromise,
    ])
    const course = assignment.course
    return {
      submission,
      assignment,
      submissions,
      students,
      title: `Submission ${submission.id.split("-")[0]}` ?? "Submission",
      breadcrumbItems: getBreadcrumbItems(submission, assignment, course),
    }
  },
  meta: ({ loaderData }) => [
    {
      title: loaderData?.title,
    },
  ],
  component: SubmissionDetailPage,
})

function getBreadcrumbItems(
  submission: Submission,
  assignment: Assignment,
  course: Course
) {
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
    {
      title: submission.student ? (
        <span className="flex flex-row items-center gap-2">
          {submission.student.first_name} {submission.student.last_name}
          <Link
            to="/courses/$courseId/students/$studentId"
            params={{
              courseId: course.id,
              studentId: submission.student.id,
            }}
          >
            <Avatar className="h-6 w-6 mx-auto hover:scale-[4] hover:translate-y-[20px] hover:translate-x-[20px] transition-transform duration-300">
              <AvatarImage
                src={submission.student.profile.avatar?.toString()}
                alt="Avatar"
              />
              <AvatarFallback>
                {submission.student.first_name[0]}
                {submission.student.last_name[0]}
              </AvatarFallback>
            </Avatar>
          </Link>
        </span>
      ) : (
        `Submission ${submission.id.split("-")[0]}`
      ),
      to: "/submissions/$submissionId",
      params: { submissionId: submission.id },
    },
  ]
}

function SubmissionDetailPage() {
  const submissionId = Route.useParams().submissionId

  return <SubmissionDetail submissionId={submissionId} enableNavigation={true} />
}
