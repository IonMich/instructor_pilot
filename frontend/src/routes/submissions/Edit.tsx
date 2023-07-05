import { updateSubmissionGradeOfAssignment , updateSubmissionStudentOfAssignment} from './submissions-api'

export const action =
  (queryClient) =>
  async ({ request, params }) => {
    const formData = await request.formData()
    
    console.log('params', params)
    // convert name grades[${i}].grade and value grade to an object with questionPosition and grade
    // i corresponds to grades[i].questionPosition and grade corresponds to grades[i].grade
    const gradeUpdates = {} as any
    const selectedStudentId = formData.get('studentId')
    console.log('selectedStudentId', selectedStudentId)
    

    if (selectedStudentId) {
        const selectedStudentUpdates = { studentId: selectedStudentId }
        console.log('selectedStudentUpdates', selectedStudentUpdates)
        
        await updateSubmissionStudentOfAssignment(
            params.submissionId,
            params.assignmentId,
            selectedStudentUpdates,
        )
    }




    for (const [name, value] of formData.entries()) {
        console.log('name', name)
        console.log('value', value)
        if (name.startsWith('grades[')) {
            const position = name.match(/\[(.*?)\]/)[1]
            gradeUpdates[position] = Number(value)
        }
    }
    console.log('gradeUpdates', gradeUpdates)
    await Promise.all(
        Object.entries(gradeUpdates).map(([questionPosition, grade]) =>
            updateSubmissionGradeOfAssignment(
                Number(questionPosition),
                params.submissionId, 
                params.assignmentId,
                grade,
            ),
        ),
    )
                
    queryClient.invalidateQueries({ queryKey: ['submissions'] })
    const submissions = await queryClient.fetchQuery({
        queryKey: ['submissions', 'list', params.assignmentId],
    })
    return submissions
  }
