import './Assignment.css';

import { useParams, useOutletContext } from 'react-router-dom';
import { 
  useQuery, 
  useQueryClient,
} from '@tanstack/react-query';

import { 
  setSubmissionsOfAssignment, 
  createSubmissionOfAssignment,
  // getGradesOfAssignment,
} from '../submissions/submissions-api';

import {
  assignmentDetailQuery,
  assignmentSubmissionsListQuery,
  assignmentVersionsListQuery,
  courseStudentsListQuery,
  assignmentQuestionsListQuery,
} from './queries';

import AssignmentHeader from './AssignmentHeader';
import AssignmentQuickActions from './AssignmentQuickActions';
import AssignmentSummaryStats from './AssignmentSummaryStats';
import AssignmentFreshStart from './AssignmentFreshStart';
import DeckHeader from './DeckHeader';
import Deck from './Deck';

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
        if (filter.version === "no-version") {
          return (submission.versionId === null || submission.versionId === undefined)
        } else {
          return (filter.version === submission.versionId)
        }
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
  const [filters, setFilters] = useOutletContext() as any;
  const params = useParams() as any;
  const queryClient = useQueryClient()
  console.log("params", params)
  const { data: assignment } = useQuery(assignmentDetailQuery(params.assignmentId, params.courseId))
  const { data: submissions } = useQuery(assignmentSubmissionsListQuery(params.assignmentId))
  const { data: students } = useQuery(courseStudentsListQuery(params.courseId))
  const { data: versions } = useQuery(assignmentVersionsListQuery(params.assignmentId))
  for (const version of versions) {
    console.log("version", version)
  }
  const numVersions = versions?.length

  const maxGrade = assignment?.maxGrade
  const assignmentName = assignment?.name
  const assignmentId = assignment?.id
  const courseId = params.courseId

  const hasAllSameNumQs =  versions?.every((version) => version.questions.length === versions[0].questions.length)

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
    

  async function handleDeletion(sub) {
      console.log("handleDeletion")
      const updated_submissions = await setSubmissionsOfAssignment(submissions.filter((s) => s.id !== sub.id), assignmentId)
      console.log("updated_submissions", updated_submissions)
      queryClient.invalidateQueries(['submissions', 'list', assignmentId])
  }

  return (
    <div className="Assignment">
      <AssignmentHeader assignmentName={assignmentName} assignmentId={assignmentId} />
      <div className="assignment-version-info">
        <p>{numVersions} versions</p>
        {versions?.map((version) => (
          version.questions.map((question) => (
            <p key={question.position}>
              {question.name} with max grade {question.maxGrade} for version {version.name}
            </p>
          ))
        ))}
        <p>Do all versions have the same number of questions?</p>
        <p> 
          Answer: {hasAllSameNumQs ? "Yes" : "No"}
          <br />
          All versions have {versions[0]?.questions.length} questions.
        </p>
        {hasAllSameNumQs ? (
          versions[0]?.questions.map((question) => (
            <div key={question.position}>
              <p>Do all version have the same max grade for question in position {question.position}?</p>
              <p>
                Answer: {versions?.every((version) => version.questions.find((q) => q.position === question.position).maxGrade === question.maxGrade) ? "Yes" : "No"}
                <br />
                All versions have max grade {question.maxGrade} for question {question.name}.
              </p>
            </div>
          ))
        ) : (
          <p>Not all versions have the same number of questions.</p>
        )}
      </div>

      <div className="assignment-main">
        {(submissions.length !== 0) ? (
          <>
            <AssignmentQuickActions />
            <AssignmentSummaryStats 
              subs={submissions} 
              filteredSubmissions={filteredSubmissions}
              filters={filters}
              maxGrade={maxGrade} />
          </>
        ) : (
          <>
            <AssignmentFreshStart />
          </>
        )}
      </div>
      <DeckHeader 
        title="Submissions" 
        subs={submissions} 
        setSubs={setSubmissionsOfAssignment} 
        filters={filters} 
        setFilters={setFilters} 
        versions={versions}
        filteredSubmissionsLength={filteredSubmissions.length}
        handleAddNew={handleAddNew} />
      <Deck 
        assignment={assignment} 
        subs={filteredSubmissions} 
        maxGrade={maxGrade} 
        handleAddNew={handleAddNew} 
        handleDeletion={handleDeletion}
        />
    </div>
  );
}