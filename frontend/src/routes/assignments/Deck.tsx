import { useParams } from 'react-router-dom';
import { 
  useQuery, 
  useQueryClient,
} from '@tanstack/react-query';

import './Deck.css'
import { SubmissionCard, SubmissionCardAdd } from './SubmissionCard'

const Deck = ({assignment, subs, setSubs, maxGrade, handleAddNew}) => {
    const assignmentId = assignment.id
    console.log("assignmentId", assignmentId)

    const queryClient = useQueryClient()
    

    async function handleDeletion(sub) {
        console.log("handleDeletion")
        const updated_submissions = await setSubs(subs.filter((s) => s.id !== sub.id), assignmentId)
        console.log("updated_submissions", updated_submissions)
        queryClient.invalidateQueries(['submissions', 'list', assignmentId])
    }

    function handleNavToCanvasSub(sub) {
        window.open(`https://elearning.ufl.edu/courses/${course.canvasId}/assignments/${assignment.canvasId}/submissions/${sub.canvasId}`, '_blank')
    }

    return (
        <main>
            {(subs.length !== 0) ? (
                <div className="submission-card-deck">
                    {subs.map((sub) => (
                        <SubmissionCard
                            key={sub.id}
                            sub={sub}
                            maxGrade={maxGrade}
                            handleNavToCanvasSub={handleNavToCanvasSub}
                            handleDeletion={handleDeletion}
                        />
                    ))}
                    {/* create submission button */}
                    <SubmissionCardAdd handleAddNew={handleAddNew}/>     
                </div>
            ) : (
                <p style={{color: "grey"}}>
                    No submissions
                </p>
            )
            }
        </main>
        
    )
}

export default Deck