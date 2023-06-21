import * as React from 'react'
import { Form, useFetcher, useParams, Link } from 'react-router-dom'
import { getCourse, updateCourse } from './courses-api'
import { getAssignmentsOfCourse } from '../assignments/assignments-api'
import { useQuery } from '@tanstack/react-query'

const courseDetailQuery = (id) => ({
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

const courseAssignmentsListQuery = (id) => ({
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

export const loader =
  (queryClient) =>
  async ({ params }) => {
    console.log('loader', params)
    const query = courseDetailQuery(params.courseId)
    const assignmentsQuery = courseAssignmentsListQuery(params.courseId)
    console.log('loader', query, assignmentsQuery)
    const promise = await Promise.all([
      queryClient.getQueryData(query.queryKey) ??
        (await queryClient.fetchQuery(query)),
      queryClient.getQueryData(assignmentsQuery.queryKey) ??
        (await queryClient.fetchQuery(assignmentsQuery)),
    ])
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

export default function Course() {
  const params = useParams()
  const { data: course } = useQuery(courseDetailQuery(params.courseId))
  const { data: assignments } = useQuery(courseAssignmentsListQuery(params.courseId))
  // NOTE: useLoaderData() would not fetch again if the data is already in the cache
  // so we use useQuery() instead, which refetches on rerender if the data becomes 
  // inactive or invalidated.
  // Of course the loader is still called immediately (before useParams) 
  // when the component mounts, so that some data is available before 
  // the useQuery is called.
  // const course = useLoaderData()

  return (
    <div id="course" className="Course">
      <div>
        <img key={course.imageUrl} src={course.imageUrl || null} />
      </div>

      <div>
        <h1>
          {course.name || (course.code && course.term) ? (
            <>
              {course.name} ({course.code} {course.term})
            </>
          ) : (
            <i>No Name</i>
          )}{' '}
          <Favorite course={course} />
        </h1>

        {course.description && <p>{course.description}</p>}

        <div>
          <Form action="edit">
            <button type="submit">Edit</button>
          </Form>
          <Form
            method="post"
            action="destroy"
            onSubmit={(event) => {
              // eslint-disable-next-line no-restricted-globals
              if (!confirm('Please confirm you want to delete this record.')) {
                event.preventDefault()
              }
            }}
          >
            <button type="submit">Delete</button>
          </Form>
        </div>
      </div>
      <div>
        <h2>Assignments</h2>
        <div>
            {Object.values(assignments).map((assignment) => (
                <div key={assignment.id}>
                    <Link to={`assignments/${assignment.id}`}>
                        {assignment.name}
                    </Link>
                </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function Favorite({ course }) {
  const fetcher = useFetcher()
  let favorite = course.favorite
  if (fetcher.formData) {
    favorite = fetcher.formData.get('favorite') === 'true'
  }

  return (
    <fetcher.Form method="post" action="">
      <button
        name="favorite"
        value={favorite ? 'false' : 'true'}
        aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {favorite ? '★' : '☆'}
      </button>
    </fetcher.Form>
  )
}