import './AssignmentFreshStart.css'
const AssignmentFreshStart = () => {
  return (
    <>
    <div className="grading-scheme">
        <h2>Grading Scheme</h2>
        <form action="change-max-grades" method="post">
            <label htmlFor="max-grades">Max Grades: </label>
            <input type="number" id="max-grades" name="max-grades" min="1" max="100" step="1" />
            <br />
            <input type="submit" value="Change" />
        </form>
    </div>
    <div className="upload-subs">
        <h2>Upload Submissions</h2> 
        <form action="upload" method="post" encType="multipart/form-data">
            <label htmlFor="file">Choose file(s) to upload: </label>
            <input type="file" id="file" name="file" multiple />
            <br />
            <label htmlFor="file">Number of pages per submission: </label>
            <input type="number" id="pages" name="pages" min="1" max="100" step="1" />
            <br />
            <input type="submit" value="Upload" />
        </form>

    </div>
    </>
  )
}

export default AssignmentFreshStart