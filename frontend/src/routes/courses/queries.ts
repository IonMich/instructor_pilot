import { getCourse, } from './courses-api'
import { getAssignmentsOfCourse, } from '../assignments/assignments-api'

export const courseDetailQuery = (id) => ({
    queryKey: ['courses', 'detail', id],
    queryFn: async () => {
      const course = await getCourse(id)
      console.log('query Fn happened', course)
      if (!course) {
        throw new Response('', {
          status: 404,
          statusText: 'Not Found',
        })
      }
      return course
    },
  })
  
export const courseAssignmentsListQuery = (id) => ({
    queryKey: ['assignments', 'list', id],
    queryFn: async () => {
        const assignments = await getAssignmentsOfCourse(id)
        console.log('assignment query Fn happened', assignments)
        if (!assignments) {
        throw new Response('', {
            status: 404,
            statusText: 'Not Found',
        })
        }
        return assignments
    },
})


