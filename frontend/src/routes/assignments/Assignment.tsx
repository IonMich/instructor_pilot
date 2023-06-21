import './Assignment.css';


import { useParams } from 'react-router-dom';
import { 
  useQuery, 
  useQueryClient,
} from '@tanstack/react-query';

import { getAssignmentOfCourse } from './assignments-api';
import { 
  setSubmissionsOfAssignment, 
  getSubmissionsOfAssignment, 
  createRandomSubmissionItem, 
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

const assignmentSubmissionsListQuery = (assignmentId : string) => ({
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

export const loader =
  (queryClient) =>
  async ({ params }) => {
    console.log('loader', params)
    const assignmentQuery = assignmentDetailQuery(params.assignmentId, params.courseId)
    const submissionsQuery = assignmentSubmissionsListQuery(params.assignmentId)
    console.log('loader', assignmentQuery, submissionsQuery)
    const promise = await Promise.all([
      queryClient.getQueryData(assignmentQuery.queryKey) ??
        (await queryClient.fetchQuery(assignmentQuery)),
      queryClient.getQueryData(submissionsQuery.queryKey) ??
        (await queryClient.fetchQuery(submissionsQuery)),
    ])
    return { ...promise[0], assignments: promise[1] }
}

export default function Assignment() {
  const params = useParams() as any
  const queryClient = useQueryClient()
  console.log("params", params)
  const { data: assignment } = useQuery(assignmentDetailQuery(params.assignmentId, params.courseId))
  const { data: submissions } = useQuery(assignmentSubmissionsListQuery(params.assignmentId))
  const maxGrade = assignment?.maxGrade
  const assignmentName = assignment?.name
  const assignmentId = assignment?.id

  console.log("page data", assignment, submissions)

  async function handleAddNew() {
    console.log("handleAddNew")
    const newSubmission = createRandomSubmissionItem(maxGrade, assignmentId)
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
        <AssignmentSummaryStats subs={submissions} maxGrade={maxGrade} />
      </div>
      <DeckHeader title="Submissions" subs={submissions} setSubs={setSubmissionsOfAssignment} handleAddNew={handleAddNew} />
      <Deck assignment={assignment} subs={submissions} setSubs={setSubmissionsOfAssignment} maxGrade={maxGrade} handleAddNew={handleAddNew} />
    </div>
  );
}