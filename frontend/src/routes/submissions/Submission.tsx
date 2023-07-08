import './Submission.css'
import { useParams, useFetcher, useOutletContext, Link } from 'react-router-dom'
import { 
    useQuery,
} from '@tanstack/react-query';
import { 
    assignmentSubmissionsListQuery, 
    courseStudentsListQuery, 
    apply_filters 
} from '../assignments/Assignment'

import { Fragment } from 'react'

import { useRef, CSSProperties } from 'react';

import Select from 'react-select';

interface StudentOption {
    label: string;
    value: string;
    name: string;
}

interface GroupedOption {
  label: string;
  options: Array<StudentOption>;
}

const groupStyles = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const groupBadgeStyles: CSSProperties = {
  backgroundColor: '#EBECF0',
  borderRadius: '2em',
  color: '#172B4D',
  display: 'inline-block',
  fontSize: 12,
  fontWeight: 'normal',
  lineHeight: '1',
  minWidth: 1,
  padding: '0.16666666666667em 0.5em',
  textAlign: 'center',
};

const formatGroupLabel = (data: GroupedOption) => (
  <div style={groupStyles}>
    <span>{data.label}</span>
    <span style={groupBadgeStyles}>{data.options.length}</span>
  </div>
);

export function StudentSelect ( { students, studentIdOfSubmission, handleStudentChange, subId } ) {

    // group students by section
    const groupedOptions = students.reduce((acc, student) => {
        const section = student.section
        const label = `${section.name}`
        const existingGroup = acc.find((group) => group.label === label)
        if (existingGroup) {
            existingGroup.options.push({
                label: `${student.name} (${student.id} ${student.uniId})`,
                value: `${student.id}`,
                name: `${student.name}`,

            })
        } else {
            acc.push({
                label,
                options: [
                    {
                        label: `${student.name} (${student.id} ${student.uniId})`,
                        value: `${student.id}`,
                        name: `${student.name}`,
                    },
                ],
            })
        }
        return acc
    }, [] as Array<GroupedOption>)

    const optionWithStudentId = groupedOptions.reduce((acc, group) => {
        const groupWithStudentId = group.options.find((option) => option.value === studentIdOfSubmission)
        if (groupWithStudentId) {
            acc = groupWithStudentId
        }
        return acc
    }, null)


  return <Select<GroupedOption>
    options={groupedOptions}
    styles={{
      container: (base) => ({
        ...base,
        flex: 1,
      }),
      control: (base) => ({
        ...base,
        fontWeight: "400",
        textAlign: "center",
        verticalAlign: "middle",
        border: "1px solid #6c757d",
        fontSize: "1rem",
        lineHeight: "1.5",
        borderRadius: "0.25rem",
      }),
      placeholder: (base) => ({
        ...base,
      }),
      menu: (base) => ({
        ...base,
        minWidth: "200px",
      }),
    }}
    placeholder="Select student"
    isClearable={true}
    formatGroupLabel={formatGroupLabel}
    defaultValue={optionWithStudentId}
    key={`sub${subId}student`}
    name="studentId"
    type="text"
    onChange={handleStudentChange}
  />
}


// const submissionDetailQuery = (id, assignmentId) => ({
//     queryKey: ['submissions', 'detail', id],
//     queryFn: async () => {
//         const submission = await getSubmissionOfAssignment(id, assignmentId)
//         console.log('query Fn happened', submission)
//         if (!submission) {
//             throw new Response('', {
//                 status: 404,
//                 statusText: 'Submission not Found',
//             })
//         }
//         return submission
//     },
// })

export const loader =
    (queryClient) =>
    async ({ params }) => {
    console.log('submission loader called')
    const submissionsQuery = assignmentSubmissionsListQuery(params.assignmentId)
    const studentsQuery = courseStudentsListQuery(params.courseId)
    const promise = await Promise.all([
        queryClient.getQueryData(submissionsQuery.queryKey) ??
        (await queryClient.fetchQuery(submissionsQuery)),
        queryClient.getQueryData(studentsQuery.queryKey) ??
        (await queryClient.fetchQuery(studentsQuery)),
    ])

    const submission = promise[0].find((submission) => submission.id === params.submissionId)

    return { ...submission, submissions: promise[0], students: promise[1] }
    }

    

export default function Submission() {
    const [filters, setFilters] = useOutletContext();
    const fetcher = useFetcher()
    const identifyFormRef = useRef(null)
    const params = useParams()
    const { data: submissions } = useQuery(assignmentSubmissionsListQuery(params.assignmentId))
    const { data: students } = useQuery(courseStudentsListQuery(params.courseId))
    const submission = submissions.find((submission) => submission.id === params.submissionId)
    const student = (students) ? students.find((student) => student.id === submission.studentId) : null
    console.log('submission', submission)
    const filteredSubmissions = apply_filters(submissions, filters, students)
    const filteredSubmissionIndex = filteredSubmissions.findIndex((submission) => submission.id === params.submissionId)
    // current sub could be filtered out
    // so I should have a sortedSubmissions array
    // that has the same order as the filteredAndSortedSubmissions
    // and then I can find the index I of the current sub in the sortedSubmissions array
    // The sub with max index K such that K < I and sortedSubmissions[K] is not filtered out is the previous sub
    // The sub with min index M such that M > I and sortedSubmissions[M] is not filtered out is the next sub
    const filteredSubmissionNext = (filteredSubmissionIndex !== filteredSubmissions.length - 1) ? filteredSubmissions[filteredSubmissionIndex + 1] : null
    const filteredSubmissionPrev = (filteredSubmissionIndex !== 0) ? filteredSubmissions[filteredSubmissionIndex - 1] : null
    
    const gradesSorted = submission.grades.sort((a, b) => a.questionPosition - b.questionPosition)

    const studentIdOfSubmission = fetcher.formData?.get("studentId") || submission.studentId;

    const handleStudentChange = () => {
        console.log('Handle student change')
        const form = identifyFormRef.current
        console.log('form', form)

        // without a delay, a race condition appears
        // ¯\_(ツ)_/¯
        setTimeout(() => {
            fetcher.submit(form)
        }, 10)
    }
  return (
    <div className="submission-detail">
        <div>
            <h3>Submission Detail</h3>
            <p>Sub Name: {submission.name}</p>
            <p>Sub ID: {submission.id}</p>
            <p>Student ID: {submission.studentId}</p>
            <p>Student Name: {student?.name}</p>
            <p>Student Section: {student?.section.name}</p>
            {/* previous next button group. If there is no previous or next submission, the button is disabled */}
            
        </div>
        
        <div className="submission-center">
            <div className="submission-imgs">
                <div className="submission-page">
                </div>
                <div className="submission-page">
                </div>
                <div className="submission-page">
                </div>
                <div className="submission-page">
                </div>
            </div>
        </div>
        <div>
            <fetcher.Form action="edit" method="post" ref={identifyFormRef}>
                <StudentSelect students={students} studentIdOfSubmission={studentIdOfSubmission} handleStudentChange={handleStudentChange} subId={submission.id} />
            </fetcher.Form>
        
            <h2 style={{marginTop: "1em"}}>
                Grade
                <span className="total-grade">
                    {submission.totalGrade} / total
                </span>
            </h2>
            <p>Grade: {submission.totalGrade}</p>
            <fetcher.Form action="edit" method="post">
                {gradesSorted.map((grade, i) =>

                    <Fragment key={grade.questionPosition}>
                        <p>{grade.questionName} (Position {grade.questionPosition})</p>
                        <input
                            type="text" 
                            name={`grades[${i}].grade`}
                            defaultValue={grade.grade}
                            key={`sub${submission.id}grade${grade.questionPosition}`}
                        />
                    </Fragment>
                )}
            <button type="submit">
                Update
            </button>
            </fetcher.Form>
            <div style={{marginTop: "2em", display: "flex", flexDirection: "row"}}>
                <Link to={`/courses/${params.courseId}/assignments/${params.assignmentId}/submissions/${filteredSubmissionPrev?.id}`}>
                    <button disabled={filteredSubmissionPrev === null}>
                        Previous
                    </button>
                </Link>
                <div>
                {filters.map((filter) =>
                    <span key={filter.label}>
                        {filter.label}
                    </span>
                )}
                </div>
                <Link to={`/courses/${params.courseId}/assignments/${params.assignmentId}/submissions/${filteredSubmissionNext?.id}`}>
                    <button disabled={filteredSubmissionNext === null}>
                        Next
                    </button>
                </Link>
            </div>
        </div>
    </div>
  )
}