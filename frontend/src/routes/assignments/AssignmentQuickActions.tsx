import './AssignmentQuickActions.css'

const AssignmentQuickActions = () => {
  return (
    <div className="quick-actions">
        <h2>Quick Actions</h2>
        {/* tiles for quick actions */}
        <div className="tile">Identify Students</div>
        <div className="tile">Find Versions</div>
        <div className="tile">Preview Links</div>
        <div className="tile">Upload to Canvas</div>  
    </div>
  )
}

export default AssignmentQuickActions