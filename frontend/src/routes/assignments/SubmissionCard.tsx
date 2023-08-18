import './SubmissionCard.css';
import CardToolbar from './CardToolbar';
import { BsFileEarmarkPlus } from 'react-icons/bs';
import { Link } from 'react-router-dom';

const SubmissionCard = ({sub, subAnswers, subQuestions, handleNavToCanvasSub, handleDeletion}) => {
    const lenQuestions = subQuestions.length
  return (
    <div className="submission-card">
        <Link to={`submissions/${sub.id}`}
            className="submission-card-link">
        </Link>
        <div className="submission-card-img">
            {/* I should place the carousel in here */}
        </div>
        <h2>{sub.name ? sub.name : <i style={{color: "grey"}}>No student</i>}</h2>
        {Array.from(Array(lenQuestions).keys()).map((position) => {
            const question = subQuestions.find((q) => q.position === position)
            const answer = subAnswers.find((a) => a.position === position)
            return (
                <div key={position}>
                    <p>{question.name}</p>
                    <p>{answer?.grade}/{question.maxGrade}</p>
                </div>
            )
            }
        )}
        <p>{sub.canvasId}</p>
        <CardToolbar 
            sub={sub}
            handleNavToCanvasSub={handleNavToCanvasSub}
            handleDeletion={handleDeletion}
        />
    </div>
  )
}

const SubmissionCardAdd = ({handleAddNew}) => {
    return (
        <div className="submission-card create-sub-card"
            onClick={() => handleAddNew()}
            >
            <BsFileEarmarkPlus />
        </div>
    )
}

export {SubmissionCard, SubmissionCardAdd}
