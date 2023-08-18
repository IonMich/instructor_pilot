import {
    assignmentDetailQuery,
    assignmentSubmissionsListQuery,
    courseStudentsListQuery,
    assignmentQuestionsListQuery,
    assignmentVersionsListQuery,
    assignmentAnswersListQuery,
} from './queries';

export const loader =
  (queryClient) =>
  async ({ params }) => {
    console.log('loader', params)
    const assignmentQuery = assignmentDetailQuery(params.assignmentId, params.courseId)
    const submissionsQuery = assignmentSubmissionsListQuery(params.assignmentId)
    const studentsQuery = courseStudentsListQuery(params.courseId)
    const questionsQuery = assignmentQuestionsListQuery(params.assignmentId)
    const versionsQuery = assignmentVersionsListQuery(params.assignmentId)
    const answersQuery = assignmentAnswersListQuery(params.assignmentId)
    console.log('loader', assignmentQuery, submissionsQuery)
    const promise = await Promise.all([
      queryClient.getQueryData(assignmentQuery.queryKey) ??
        (await queryClient.fetchQuery(assignmentQuery)),
      queryClient.getQueryData(submissionsQuery.queryKey) ??
        (await queryClient.fetchQuery(submissionsQuery)),
      queryClient.getQueryData(studentsQuery.queryKey) ??
        (await queryClient.fetchQuery(studentsQuery)),
      queryClient.getQueryData(questionsQuery.queryKey) ??
        (await queryClient.fetchQuery(questionsQuery)),
      queryClient.getQueryData(versionsQuery.queryKey) ??
        (await queryClient.fetchQuery(versionsQuery)),
      queryClient.getQueryData(answersQuery.queryKey) ??
        (await queryClient.fetchQuery(answersQuery)),
    ])
    return { ...promise[0], submissions: promise[1], students: promise[2], questions: promise[3], versions: promise[4], answers: promise[5] }
}