import './Deck.css'
import { SubmissionCard, SubmissionCardAdd } from './SubmissionCard'

const Deck = ({subs, setSubs, maxGrade, handleAddNew}) => {
    const assignment = {
        canvasId: 12345678
    }
    
    function handleDeletion(sub) {
        setSubs(subs.filter((s) => s.id !== sub.id))
    }

    function handleNavToCanvasSub(sub) {
        window.open(`https://elearning.ufl.edu/courses/${assignment.canvasId}/assignments/${sub.canvasId}`, '_blank')
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
            ) : <p style={{color: "grey"}}>No submissions</p>
            }
        </main>
        
    )
}

export default Deck