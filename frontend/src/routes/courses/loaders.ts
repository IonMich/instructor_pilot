import { updateCourse } from './courses-api'

import {
    courseAssignmentsListQuery,
    courseDetailQuery,
} from './queries'

  
export const loader =
  (queryClient) =>
  async ({ params }) => {
    console.log('queryClient', queryClient)
    console.log('course loader called', params)
    const query = courseDetailQuery(params.courseId)
    const assignmentsQuery = courseAssignmentsListQuery(params.courseId)
    console.log('loader', query, assignmentsQuery)
    const promise = await Promise.all([
      queryClient.getQueryData(query.queryKey) ??
        (await queryClient.fetchQuery(query)),
      queryClient.getQueryData(assignmentsQuery.queryKey) ??
        (await queryClient.fetchQuery(assignmentsQuery)),
    ])
    console.log('loader promise', promise)
    return { ...promise[0], assignments: promise[1] }
  }

export const action =
  (queryClient) =>
  async ({ request, params }) => {
    let formData = await request.formData()
    const course = await updateCourse(params.courseId, {
      favorite: formData.get('favorite') === 'true',
    })
    await queryClient.invalidateQueries({ queryKey: ['courses'] })
    return course
  }