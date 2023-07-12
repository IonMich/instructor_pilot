import {
    assignmentDetailQuery,
    assignmentSubmissionsListQuery,
    courseStudentsListQuery,
} from './queries';

export const loader =
  (queryClient) =>
  async ({ params }) => {
    console.log('loader', params)
    const assignmentQuery = assignmentDetailQuery(params.assignmentId, params.courseId)
    const submissionsQuery = assignmentSubmissionsListQuery(params.assignmentId)
    const studentsQuery = courseStudentsListQuery(params.courseId)
    console.log('loader', assignmentQuery, submissionsQuery)
    const promise = await Promise.all([
      queryClient.getQueryData(assignmentQuery.queryKey) ??
        (await queryClient.fetchQuery(assignmentQuery)),
      queryClient.getQueryData(submissionsQuery.queryKey) ??
        (await queryClient.fetchQuery(submissionsQuery)),
      queryClient.getQueryData(studentsQuery.queryKey) ??
        (await queryClient.fetchQuery(studentsQuery)),
    ])
    return { ...promise[0], assignments: promise[1], students: promise[2] }
}