import './Assignment.css';

import { useParams, useOutletContext } from 'react-router-dom';
import { 
  useQuery, 
  useQueryClient,
} from '@tanstack/react-query';

import { 
  setSubmissionsOfAssignment, 
  setAnswersOfAssignment,
  createSubmissionOfAssignment,
} from '../submissions/submissions-api';

import {
  assignmentDetailQuery,
  assignmentSubmissionsListQuery,
  assignmentVersionsListQuery,
  courseStudentsListQuery,
  assignmentQuestionsListQuery,
  assignmentAnswersListQuery,
} from './queries';

import AssignmentHeader from './AssignmentHeader';
import AssignmentQuickActions from './AssignmentQuickActions';
import AssignmentSummaryStats from './AssignmentSummaryStats';
import AssignmentFreshStart from './AssignmentFreshStart';
import DeckHeader from './DeckHeader';
import Deck from './Deck';

export function apply_filters(submissions, filters, students, answers) {
  console.log("submissions", submissions)
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
        const subAnswers = answers.filter((answer) => answer.submissionId === submission.id)
        const grade = subAnswers.reduce((a, b) => a + b.grade, 0)
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
  console.log("ASSIGNMENT params", params)
  const { data: assignment } = useQuery(assignmentDetailQuery(params.assignmentId, params.courseId))
  const { data: submissions } = useQuery(assignmentSubmissionsListQuery(params.assignmentId))
  const { data: students } = useQuery(courseStudentsListQuery(params.courseId))
  const { data: versions } = useQuery(assignmentVersionsListQuery(params.assignmentId))
  const { data: questions } = useQuery(assignmentQuestionsListQuery(params.assignmentId))
  const { data: answers } = useQuery(assignmentAnswersListQuery(params.assignmentId))

  // add questions to versions:
  versions?.forEach((version) => {
    version.questions = questions.filter((question) => question.versionId === version.id)
  })

  const questionsWithoutVersion = questions.filter((question) => question.versionId === null || question.versionId === undefined)
  const questionsOfVersions = questions.filter((question) => question.versionId !== null)
  
  // num versions with non-null versionId
  const numVersions = versions?.length || 0

  const maxGrade = assignment?.maxGrade
  const assignmentName = assignment?.name
  const assignmentId = assignment?.id
  const courseId = params.courseId

  const hasAllSameNumQs =  versions?.every((version) => version.questions.length === versions[0].questions.length)

  const filteredSubmissions = apply_filters(submissions, filters, students, answers)

  async function handleAddNew() {
    console.log("handleAddNew")
    const {newSub, newAnswers} = await createSubmissionOfAssignment(assignmentId, courseId)
    console.log("newSubmission", newSub)
    console.log("newGrades", newAnswers)
    const results = await Promise.all([
      setAnswersOfAssignment([...answers, ...newAnswers], assignmentId),
      setSubmissionsOfAssignment([...submissions, newSub], assignmentId)
    ])

    console.log("results", results)
    queryClient.setQueryData(['answers', 'list', assignmentId], results[0])
    queryClient.setQueryData(['submissions', 'list', assignmentId], results[1])

    // The following would be preferable, but it leads to some race condition in the histogram
    // await Promise.all([
    //   queryClient.invalidateQueries(['submissions', 'list', assignmentId]),
    //   queryClient.invalidateQueries(['answers', 'list', assignmentId]),
    // ])
    
  }
    

  async function handleDeletion(sub) {
      console.log("handleDeletion")
      const updated_submissions = await setSubmissionsOfAssignment(submissions.filter((s) => s.id !== sub.id), assignmentId)
      const updated_answers = await setAnswersOfAssignment(answers.filter((a) => a.submissionId !== sub.id), assignmentId)
      queryClient.setQueryData(['submissions', 'list', assignmentId], updated_submissions)
      queryClient.setQueryData(['answers', 'list', assignmentId], updated_answers)
  }
  return (
    <div className="Assignment">
      <AssignmentHeader assignmentName={assignmentName} assignmentId={assignmentId} />

      <div className="assignment-main">
        {(submissions.length !== 0) ? (
          <>
            <AssignmentQuickActions />
            <AssignmentSummaryStats 
              subs={submissions} 
              filteredSubmissions={filteredSubmissions}
              answers={answers}
              filters={filters}
              questions={questions}
              versions={versions}
              />
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
        setAnswers={setAnswersOfAssignment} 
        filters={filters} 
        setFilters={setFilters} 
        versions={versions}
        filteredSubmissionsLength={filteredSubmissions.length}
        handleAddNew={handleAddNew} />
      <Deck 
        assignment={assignment} 
        subs={filteredSubmissions} 
        answers={answers}
        questions={questions}
        maxGrade={maxGrade} 
        handleAddNew={handleAddNew} 
        handleDeletion={handleDeletion}
        />
    </div>
  );
}