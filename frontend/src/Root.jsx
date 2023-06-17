import NavBreadcrumbs from './NavBreadcrumbs'
import React from 'react'
import { Outlet, useLoaderData } from 'react-router-dom'

export async function loader({ params }) {
    const courseId = params.courseId;
    const assignments = [
        {
            id: 1,
            name: "Quiz 1",
            courseId: courseId,
            maxGrade: 10,
        },
        {
            id: 2,
            name: "Makeup 1",
            courseId: courseId,
            maxGrade: 10,
        },
    ];
    const courseInfo = {
        data: {
            courseId: courseId,
            name: "Math 101",
            description: "Learn about numbers",
            assignments: assignments,
        },
    };
    const courseName = courseInfo.data.name;
    const courseDescription = courseInfo.data.description;

    return {assignments, courseName, courseDescription, courseId}
}

const Root = () => {
    const { assignments, courseName, courseDescription, courseId } = useLoaderData()
    console.log(courseName, courseDescription, courseId )
    console.log(assignments)
    return (
        <>
            <NavBreadcrumbs />
            <div>
                <Outlet context={{courseName, courseDescription, courseId, assignments}} />
            </div> 
        </>
    )
}

export default Root