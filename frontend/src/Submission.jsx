import React from 'react'
import { useLoaderData } from 'react-router-dom'

export async function loader ({ params }) {
    const submissionInfo = {
        data: {
          name: `Submission ${params.submissionId}`,
          assignmentId: params.assignmentId,
          maxGrade: 20,
          submissionId: params.submissionId,
          studentName: "John Doe",
          studentId: "12345678",
          questionGrades: [
            {
                id: 1,
                grade: 4,
                comment: "Good job",
                graderId: "87654321",
                graderName: "Jane Doe",
            },
            {
                id: 2,
                grade: 0,
                comment: "You need to work on this",
                graderId: "87654321",
                graderName: "Jane Doe",
            },
        ]
      }
    }
    const questionGrades = submissionInfo.data.questionGrades;
    const submissionId = submissionInfo.data.submissionId;
    const assignmentId = submissionInfo.data.assignmentId;
    const studentName = submissionInfo.data.studentName;
    const studentId = submissionInfo.data.studentId;
    const maxGrade = submissionInfo.data.maxGrade;
    const submissionName = submissionInfo.data.name;
    return { questionGrades, submissionId, assignmentId, studentName, studentId, maxGrade, submissionName }
}
    

const Submission = () => {
    const { questionGrades, submissionId, assignmentId, studentName, studentId, maxGrade } = useLoaderData()
  return (
    <>
        <div>Submission with ID {submissionId} of student {studentName} for assignment {assignmentId}</div>
        <div>Max grade: {maxGrade}</div>
        <div>Student ID: {studentId}</div>
        <div>Grades:</div>
        <div>
            {Object.values(questionGrades).map((questionGrade) => (
                <div key={questionGrade.id}>
                    <br />
                    <div>Question {questionGrade.id}</div>
                    <div>Grade: {questionGrade.grade}</div>
                    <div>Comment: {questionGrade.comment}</div>
                    <div>Grader: {questionGrade.graderName}</div>
                    <div>Grader ID: {questionGrade.graderId}</div>
                    <br />
                </div>
            ))}
        </div>
    </>
  )
}

export default Submission