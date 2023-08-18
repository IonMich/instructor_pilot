import { useNavigate } from 'react-router-dom';

import './Deck.css'
import { SubmissionCard, SubmissionCardAdd } from './SubmissionCard'

const Deck = ({assignment, subs, answers, questions, maxGrade, handleAddNew, handleDeletion}) => {
    const assignmentId = assignment.id
    const navigate = useNavigate()
    console.log("assignmentId", assignmentId)

    function handleNavToCanvasSub(sub) {
        window.open(`https://elearning.ufl.edu/courses/${course.canvasId}/assignments/${assignment.canvasId}/submissions/${sub.canvasId}`, '_blank')
    }

    function navigateTransition() {
        if (!document.startViewTransition) {
            console.log("no transition")
            navigate(`/courses/${course.id}/assignments/${assignment.id}/submissions/${subs[0].id}`);
            return;
        } else {
            console.log("transition")
        }
        document.startViewTransition(() => 
            navigate(`submissions/${subs[0].id}`)
        )
    }

    return (
        <main>
            {(subs.length !== 0) ? (
                <>
                    <button onClick={navigateTransition} type="button">
                        Start grading
                    </button>
                    <div className="submission-card-deck">
                        {subs.map((sub) => {
                            const subAnswers = answers.filter((a) => a.submissionId === sub.id)
                            
                            const subQuestions = questions.filter((q) => {
                                if (sub.versionId === null) {
                                    return q.versionId === null
                                }
                                return q.versionId === sub.versionId
                            })
                            return <SubmissionCard
                                key={sub.id}
                                sub={sub}
                                subAnswers={subAnswers}
                                subQuestions={subQuestions}
                                handleNavToCanvasSub={handleNavToCanvasSub}
                                handleDeletion={handleDeletion}
                            />
                        })}
                        {/* create submission button */}
                        <SubmissionCardAdd handleAddNew={handleAddNew}/>     
                    </div>
                </>
            ) : (
                <p style={{color: "grey", fontStyle: "italic"}}>
                    No submissions
                </p>
            )
            }
        </main>
        
    )
}

export default Deck