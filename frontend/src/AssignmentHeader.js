import './AssignmentHeader.css'
import React from 'react'

const AssignmentHeader = ({assignmentName, assignmentId}) => {
  return (
    <h1 className="pageHeader">{assignmentName} (ID: {assignmentId})</h1>
  )
}

export default AssignmentHeader