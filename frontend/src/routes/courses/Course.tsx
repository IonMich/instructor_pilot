import './Course.css'
import { useLoaderData, Form, useFetcher, useParams, Link } from 'react-router-dom'


import { useQuery } from '@tanstack/react-query'
// suspense the image loading

import { Suspense } from 'react'


import {
  courseAssignmentsListQuery,
  courseDetailQuery,
} from './queries'

import {
  courseSectionsListQuery,
} from '../assignments/queries'


export default function Course() {
  const data = useLoaderData()
  const params = useParams()
  console.log('params', params)
  console.log('data', data)
  const { data : course } = useQuery(courseDetailQuery(params.courseId))
  const { data : assignments } = useQuery(courseAssignmentsListQuery(params.courseId))
  const { data : sections } = useQuery(courseSectionsListQuery(params.courseId))
  // NOTE: useLoaderData() would not fetch again if the data is already in the cache
  // so we use useQuery() instead, which refetches on rerender if the data becomes 
  // inactive or invalidated.
  // Of course the loader is still called immediately (before useParams) 
  // when the component mounts, so that some data is available before 
  // the useQuery is called.
  // const course = useLoaderData()
  console.log('course', course)
  console.log('assignments', assignments)

  return (
    <div id="course" className="Course">
      <div className='course-image-sm-container'>
          <img
            className='course-image'
            src={course.imageUrl}
            alt={`The course ${course.name}`}
          />
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
      <div className="course-items">
        <div className="course-assignments">
          <h2>Assignments</h2>
          <div>
              {Object.values(assignments)?.map((assignment) => (
                  <div key={assignment.id}>
                      <Link to={`assignments/${assignment.id}`}>
                          {assignment.name}
                      </Link>
                  </div>
              ))}
          </div>
        </div>
        <div className="course-sections">
          <h2>Sections</h2>
          <div>
            {sections?.map((section) => (
              <div key={section.id}>
                <Link to={`sections/${section.id}`}>{section.name}</Link>
              </div>
            ))}
          </div>
        </div>
        <div className="course-announcements">
          <h2>Announcements</h2>
          <div>
            {course.announcements?.map((announcement) => (
              <div key={announcement.id}>
                <Link to={`announcements/${announcement.id}`}>
                  {announcement.title}
                </Link>
              </div>
            ))}
          </div>
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
    <div style={{ display: 'inline-block' }}>
      <fetcher.Form method="post" action="">
        <button
          name="favorite"
          value={favorite ? 'false' : 'true'}
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {favorite ? '★' : '☆'}
        </button>
      </fetcher.Form>
    </div>
  )
}
// border-radius: 50%;
// width: 150px;
// margin: 0.5rem;
const FallbackImageDiv = (
  <div style={{ width: '150px', height: '150px', margin: '0.5rem', backgroundColor: 'grey', borderRadius: '50%' }} />
)