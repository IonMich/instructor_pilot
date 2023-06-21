import './SubmissionCard.css';
import CardToolbar from './CardToolbar';
import { BsFileEarmarkPlus } from 'react-icons/bs';
import { Link } from 'react-router-dom';

const SubmissionCard = ({sub, maxGrade, handleNavToCanvasSub, handleDeletion}) => {
  return (
    <div className="submission-card">
        <Link to={`submissions/${sub.id}`}
            className="submission-card-link">
        </Link>
        <div className="submission-card-img">
            {/* I should place the carousel in here */}
        </div>
        <h2>{sub.studentName ? sub.studentName : <i style={{color: "grey"}}>No student</i>}</h2>
        <p>Grade {sub.grade}/{maxGrade}</p>
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
