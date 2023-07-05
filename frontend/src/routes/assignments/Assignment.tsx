import './Assignment.css';

import { useState } from 'react';

import { useParams, useOutletContext } from 'react-router-dom';
import { 
  useQuery, 
  useQueryClient,
} from '@tanstack/react-query';

import { getStudentsOfCourse } from '../students/students-api';

import { getAssignmentOfCourse } from './assignments-api';

import { 
  setSubmissionsOfAssignment, 
  getSubmissionsOfAssignment, 
  createSubmissionOfAssignment, 
} from '../submissions/submissions-api';

import AssignmentHeader from './AssignmentHeader';
import AssignmentQuickActions from './AssignmentQuickActions';
import AssignmentSummaryStats from './AssignmentSummaryStats';
import DeckHeader from './DeckHeader';
import Deck from './Deck';

const assignmentDetailQuery = (assignmentId: string, courseId: string) => ({
  queryKey: ['assignments', 'detail', assignmentId],
  queryFn: async () => {
    const assignment = await getAssignmentOfCourse(assignmentId, courseId)
    console.log('assignment detail query Fn happened', assignment)
    if (!assignment) {
      throw new Response('', {
        status: 404,
        statusText: 'Not Found',
      })
    }
    return assignment
  },
  placeholderData: () => {
    return {
      id: assignmentId,
      name: <span style={{ color: 'grey', fontStyle: 'italic' }}>Loading...</span>,
      maxGrade: "??",
    }
  }
})

export const assignmentSubmissionsListQuery = (assignmentId : string) => ({
  queryKey: ['submissions', 'list', assignmentId],
  queryFn: async () => {
    const submissions = await getSubmissionsOfAssignment(assignmentId)
    console.log('submission list query Fn happened', submissions)
    if (!submissions) {
      throw new Response('', {
        status: 404,
        statusText: 'Submissions not found',
      })
    }
    return submissions
  },
  placeholderData: () => {
    return []
  }
})

export const courseStudentsListQuery = (courseId : string) => ({
  queryKey: ['students', 'list', courseId],
  queryFn: async () => {
    const students = await getStudentsOfCourse(courseId)
    console.log('student list query Fn happened', students)
    if (!students) {
      throw new Response('', {
        status: 404,
        statusText: 'Students not found',
      })
    }
    return students
  },
})

export const loader =
  (queryClient) =>
  async ({ params }) => {
    console.log('loader', params)
    const assignmentQuery = assignmentDetailQuery(params.assignmentId, params.courseId)
    const submissionsQuery = assignmentSubmissionsListQuery(params.assignmentId)
    const studentsQuery = courseStudentsListQuery(params.courseId)
    console.log('loader', assignmentQuery, submissionsQuery)
    const promise = await Promise.all([
      queryClient.getQueryData(assignmentQuery.queryKey) ??
        (await queryClient.fetchQuery(assignmentQuery)),
      queryClient.getQueryData(submissionsQuery.queryKey) ??
        (await queryClient.fetchQuery(submissionsQuery)),
      queryClient.getQueryData(studentsQuery.queryKey) ??
        (await queryClient.fetchQuery(studentsQuery)),
    ])
    return { ...promise[0], assignments: promise[1], students: promise[2] }
}

export function apply_filters(submissions, filters, students) {
  let filteredSubmissions = [...submissions]
  console.log("applying filters", filters)
  for (let i = 0; i < filters.length; i++) {
    const filter = filters[i]
    console.log("filter", filter)
    if (filter.section !== undefined) {
      console.log("filtering by section", filter.section)
      const filterFunc = (submission) => {
        const studentId = submission.studentId
        if (studentId === null) {
          return false
        }
        const student = students.find((student) => student.id === studentId)
        console.log("found student", student)
        const section = student.section
        return (filter.section === section.id)
      }
      filteredSubmissions = [...filteredSubmissions.filter(filterFunc)]
    }
    if (filter.version !== undefined) {
      console.log("filtering by version", filter.version)
      const filterFunc = (submission) => {
        const version = submission.versionId
        return (filter.version === version)
      }
      filteredSubmissions = [...filteredSubmissions.filter(filterFunc)]
    }
    if (filter.isGraded !== undefined) {
      console.log("filtering by isGraded", filter.isGraded)
      const filterFunc = (submission) => {
        const grade = submission.totalGrade
        const isGraded = (grade !== null && grade !== undefined)
        return (filter.isGraded) ? isGraded : !isGraded
      }
      filteredSubmissions = [...filteredSubmissions.filter(filterFunc)]
    }
    if (filter.isIdentified !== undefined) {
      console.log("filtering by isIdentified", filter.isIdentified)
      const filterFunc = (submission) => {
        const studentId = submission.studentId
        const hasStudentId = (studentId !== null)
        return (filter.isIdentified) ? 
        hasStudentId : !hasStudentId
      }
      filteredSubmissions = [...filteredSubmissions.filter(filterFunc)]
    }
  }
  console.log("length of filtered submissions", filteredSubmissions.length)
  return filteredSubmissions
}

export default function Assignment() {
  const [filters, setFilters] = useOutletContext();
  const params = useParams() as any
  const queryClient = useQueryClient()
  console.log("params", params)
  const { data: assignment } = useQuery(assignmentDetailQuery(params.assignmentId, params.courseId))
  const { data: submissions } = useQuery(assignmentSubmissionsListQuery(params.assignmentId))
  const { data: students } = useQuery(courseStudentsListQuery(params.courseId))
  const maxGrade = assignment?.maxGrade
  const assignmentName = assignment?.name
  const assignmentId = assignment?.id
  const courseId = params.courseId

  const filteredSubmissions = apply_filters(submissions, filters, students)

  console.log("page data", assignment, submissions)

  async function handleAddNew() {
    console.log("handleAddNew")
    const newSubmission = await createSubmissionOfAssignment(assignmentId, courseId, maxGrade)
    console.log("newSubmission", newSubmission)
    const updated_submissions = await setSubmissionsOfAssignment([...submissions, newSubmission], assignmentId)
    console.log("updated_submissions", updated_submissions)
    queryClient.invalidateQueries(['submissions', 'list', assignmentId])
  }

  return (
    <div className="Assignment">
      <AssignmentHeader assignmentName={assignmentName} assignmentId={assignmentId} />
      <div className="assignment-main">
        <AssignmentQuickActions />
        <AssignmentSummaryStats 
          subs={submissions} 
          filteredSubmissions={filteredSubmissions}
          filters={filters}
          maxGrade={maxGrade} />
      </div>
      <DeckHeader 
        title="Submissions" 
        subs={submissions} 
        setSubs={setSubmissionsOfAssignment} 
        filters={filters} 
        setFilters={setFilters} 
        filteredSubmissionsLength={filteredSubmissions.length}
        handleAddNew={handleAddNew} />
      <Deck 
        assignment={assignment} 
        subs={filteredSubmissions} 
        setSubs={setSubmissionsOfAssignment} 
        maxGrade={maxGrade} 
        handleAddNew={handleAddNew} />
    </div>
  );
}