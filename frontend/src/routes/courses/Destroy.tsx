import { redirect } from 'react-router-dom'
import { deleteCourse } from './courses-api'

export const action =
  (queryClient) =>
  async ({ params }) => {
    await deleteCourse(params.courseId)
    queryClient.invalidateQueries({ queryKey: ['courses'] })
    return redirect('/')
  }
