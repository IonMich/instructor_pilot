import './Assignment.css';
import { useEffect, useState } from 'react';
import AssignmentHeader from './AssignmentHeader';
import AssignmentQuickActions from './AssignmentQuickActions';
import AssignmentSummaryStats from './AssignmentSummaryStats';
import DeckHeader from './DeckHeader';
import Deck from './Deck';
import { NavLink, useLoaderData, useOutletContext } from 'react-router-dom';
// import { Switch, Route, useHistory } from 'react-router-dom'; 
// import Footer from './Footer';

export function loader({ params }) {
  console.log(params.assignmentId);
  let fetchedMaxGrade = 10;
  if (params.assignmentId !== "1") {
    fetchedMaxGrade = 20;
  }
  let first_grade = 4;
  if (params.assignmentId !== "1") {
    first_grade += 3;
  }

  const assignementInfo = {
      data: {
        name: `Assignment ${params.assignmentId}`,
        assignmentId: params.assignmentId,
        maxGrade: fetchedMaxGrade,
        submissions: [
          {
            id: 1,
            studentName: "John Doe",
            grade: first_grade,
            canvasId: "12345678",
          },
          {
            id: 2,
            studentName: "Jane Doe",
            grade: 10*fetchedMaxGrade/10,
            canvasId: "87654321",
          },
          {
            id: 3,
            studentName: "John Smith",
            grade: 8*fetchedMaxGrade/10,
            canvasId: "12348765",
          },
      ]
    }
  }
  // with Math.random() < 0.2, 20% of the time, submissions is null
  if (Math.random() < 0.6) {
    assignementInfo.data.submissions = null;
  }
  console.log("recreating loader");
  const manualSubmissions = assignementInfo.data.submissions;
  const submissions = manualSubmissions ? manualSubmissions : createInitialSubs(fetchedMaxGrade);
  const assignmentId = assignementInfo.data.assignmentId;
  const assignmentName = assignementInfo.data.name;
  return { submissions, fetchedMaxGrade, assignmentId, assignmentName };
}

function createInitialSubs (maxGrade) {
  console.log("creating initial submissions");
  let initSubmissionItems = [];
  for (let i = 0; i < 20; i++) {
    initSubmissionItems.push(createRandomSubmissionItem(maxGrade));
  }
  console.log(initSubmissionItems);
  return initSubmissionItems;
}

function createRandomSubmissionItem(maxGrade) {
  const randomCanvasId = Math.floor(Math.random() * 10000000).toString();
  const randomGrade = Math.min(Math.round(Math.random() * maxGrade), maxGrade);
  // name is 20% likely to be null, rest of the time it's a random string of length 5
  const randomName = Math.random() < 0.2 ? null : Math.random().toString(36).substring(2, 7);
  return {
    id: Math.floor(Math.random() * 10000000),
    studentName: randomName,
    grade: randomGrade,
    canvasId: randomCanvasId,
  };
}


function Assignment() {    
    const { assignments, courseId } = useOutletContext();
    const {submissions, fetchedMaxGrade, assignmentId, assignmentName}= useLoaderData();
    const [subs, setSubs] = useState([]);
    const [maxGrade, setMaxGrade] = useState(fetchedMaxGrade);
    console.log("maxGrade", maxGrade);

    // weird that this is needed
    // there has to be a better way
    useEffect(() => {
      console.log("useEffect");
      setSubs(submissions);
      setMaxGrade(fetchedMaxGrade);
    }, [submissions, fetchedMaxGrade]);
    
    function handleAddNew() {
      setSubs([...subs, createRandomSubmissionItem(maxGrade)]);
    }

  return (
    <div className="Assignment">
      
      <AssignmentHeader assignmentName={assignmentName} assignmentId={assignmentId} />
      {assignments.map((assignment) =>
        <NavLink
          key={assignment.id}
          to={`/course/${courseId}/assignment/${assignment.id}`}
          className="assignment-link"
        >
          {assignment.name}
        </NavLink>
      )}
      <div className="assignment-main">
        <AssignmentQuickActions />
        <AssignmentSummaryStats subs={subs} maxGrade={maxGrade} />
      </div>
      <DeckHeader title="Submissions" subs={subs} setSubs={setSubs} handleAddNew={handleAddNew} />
      <Deck subs={subs} setSubs={setSubs} maxGrade={maxGrade} handleAddNew={handleAddNew} />
    </div>
  );
}

export default Assignment;