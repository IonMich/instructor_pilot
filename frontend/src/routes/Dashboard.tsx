import {
  useLoaderData,
  Form,
  NavLink,
  useSubmit,
} from 'react-router-dom'

import { useQuery, useIsFetching } from '@tanstack/react-query'

import { useDebounce } from 'rooks'

import { createCourse, getCourses } from './courses/courses-api'

interface QueryString {
  q?: string
}

interface Course {
  id: number
  name: string
  code: string
  term: string
  favorite: boolean
  imageUrl: string
  description: string
  createdAt: string
}

const courseListQuery = (q: QueryString) => ({
  queryKey: ['courses', 'list', q ?? 'all'],
  queryFn: () => getCourses(q) as Promise<Course[]>,
})

export const loader =
  (queryClient) =>
  async ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')
    console.log('layout loader', q)
    if (!queryClient.getQueryData(courseListQuery(q).queryKey)) {
      await queryClient.fetchQuery(courseListQuery(q))
    }
    return { q }
  }

export const action = (queryClient) => async () => {
  const course = await createCourse()
  queryClient.invalidateQueries({ queryKey: ['courses', 'list'] })
  return course
}



export default function Dashboard() {
  const { q } = useLoaderData()
  const { data: courses } = useQuery(courseListQuery(q))
  const searching = useIsFetching(['courses', 'list']) > 0

  const submit = useSubmit()
  const debouncedSubmit = useDebounce(submit, 500)

  return (
    <div id="sidebar">
        <h1>My Courses</h1>
        <div>
          <form id="search-form" role="search">
            <input
              id="q"
              aria-label="Search courses"
              placeholder="Search"
              type="search"
              name="q"
              key={q}
              autoFocus
              defaultValue={q}
              className={searching ? 'loading' : ''}
              onChange={(event) => {
                debouncedSubmit(event.currentTarget.form)
              }}
            />
            <div id="search-spinner" aria-hidden hidden={!searching} />
            <div className="sr-only" aria-live="polite"></div>
          </form>
          <Form method="post">
            <button type="submit">New</button>
          </Form>
        </div>
        <nav>
          {courses.length ? (
            <ul>
              {courses.map((course) => (
                <li key={course.id}>
                  <NavLink
                    to={`courses/${course.id}`}
                    className={({ isActive, isPending }) =>
                      isActive ? 'active' : isPending ? 'pending' : ''
                    }
                  >
                    {course.name || course.code ? (
                      <>
                        {course.name} ({course.code})
                      </>
                    ) : (
                      <i>No Name</i>
                    )}{' '}
                    {course.favorite && <span>★</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              <i>No courses</i>
            </p>
          )}
        </nav>
      </div>
  )
}
