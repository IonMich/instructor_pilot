import React from 'react'
import "./Course.css"
import { Link, useLoaderData } from 'react-router-dom'

const Course = () => {
    const { assignments, courseName, courseDescription, courseId } = useLoaderData()
    console.log(courseName, courseDescription, courseId )
    console.log(assignments)
    return (
    <div className="Course">
        <h1>{courseName}</h1>
        <p>{courseDescription}</p>
        <h2>Assignments</h2>
        <div>
            {Object.values(assignments).map((assignment) => (
                <div key={assignment.id}>
                    <Link to={`assignment/${assignment.id}`}>
                        {assignment.name}
                    </Link>
                </div>
            ))}
        </div>
    </div>
  )
}

export default Course

