import { 
    assignmentSubmissionsListQuery, 
    courseStudentsListQuery, 
    assignmentDetailQuery,
} from '../assignments/queries'

export const loader =
    (queryClient) =>
    async ({ params }) => {
        console.log('submission loader called')
        const assignmentQuery = assignmentDetailQuery(params.assignmentId, params.courseId)
        const submissionsQuery = assignmentSubmissionsListQuery(params.assignmentId)
        const studentsQuery = courseStudentsListQuery(params.courseId)
        const promise = await Promise.all([
            queryClient.getQueryData(assignmentQuery.queryKey) ??
            (await queryClient.fetchQuery(assignmentQuery)),
            queryClient.getQueryData(submissionsQuery.queryKey) ??
            (await queryClient.fetchQuery(submissionsQuery)),
            queryClient.getQueryData(studentsQuery.queryKey) ??
            (await queryClient.fetchQuery(studentsQuery)),
        ])

        const submission = promise[1].find((submission) => submission.id === params.submissionId)

        return { 
            ...submission, 
            assignments: promise[0],
            submissions: promise[1], 
            students: promise[2] 
        }
    }