import { Form, useLoaderData, redirect, useNavigate } from 'react-router-dom'

import { updateCourse } from './courses-api'

export const action =
  (queryClient) =>
  async ({ request, params }) => {
    const formData = await request.formData()
    const updates = Object.fromEntries(formData)
    await updateCourse(params.courseId, updates)
    queryClient.invalidateQueries({ queryKey: ['courses'] })
    return redirect(`/courses/${params.courseId}`)
  }

export default function Edit() {
  const course = useLoaderData()
  const navigate = useNavigate()

  return (
    <Form method="post" id="course-form">
      <p>
        <span>Name</span>
        <input
          placeholder="e.g. Math 101 - Calculus"
          aria-label="Course name"
          type="text"
          name="name"
          defaultValue={course.name}
        />
      </p>
      <p>
      <label>
        <span>Code</span>
        <input
          placeholder="e.g. MATH101"
          aria-label="Course code"
          type="text"
          name="code"
          defaultValue={course.code}
        />
        </label>
        <label>
          <span>Term</span>
          <input
            placeholder="e.g. Summer C 2023"
            aria-label="Course Term"
            type="text"
            name="term"
            defaultValue={course.term}
          />
        </label>
      </p>
      <label>
        <span>Image URL</span>
        <input
          placeholder="e.g. https://example.com/course_image.jpg"
          aria-label="Image URL"
          type="text"
          name="image_url"
          defaultValue={course.image_url}
        />
      </label>
      <label>
        <span>Description</span>
        <textarea name="description" defaultValue={course.description} rows={6} />
      </label>
      <p>
        <button type="submit">Save</button>
        <button
          type="button"
          onClick={() => {
            navigate(-1)
          }}
        >
          Cancel
        </button>
      </p>
    </Form>
  )
}
