export async function setSubmissionVersion(submissionId, versionId) {
    const url = `/submissions/${submissionId}/version/`;
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const formData = new FormData();
    formData.append('version_id', versionId);
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(
            Object.fromEntries(formData)
        ),
    };
    let data;
    try {
        const response = await fetch(url, options);
        data = await response.json();
        console.log(data);
    }
    catch (error) {
        console.log(error);
        return {
            "success": false,
            "message": "Could not set submission version",
        }
    }
    if (data.success) {
        return {
            "success": true,
            "submissions": data.submissions,
            "message": "Submission version set",
        }
    }
    else {
        return {
            "success": false,
            "message": "Could not set submission version",
        }
    }
}

export async function getSubmissionsOfAssignment(assignmentId) {
    const url = `/assignments/${assignmentId}/submissions/`;
    let data;
    try {
        const response = await fetch(url);
        data = await response.json();
        console.log(data);
    }
    catch (error) {
        console.log(error);
        return {
            "success": false,
            "message": "Could not get submissions of assignment",
        }
    }
    if (data.success) {
        return {
            "success": true,
            "message": "Submissions of assignment retrieved",
            "submissions": data.submissions,
        }
    }
    else {
        return {
            "success": false,
            "message": "Could not get submissions of assignment",
        }
    }
}

// define a function to delete a comment
export async function deleteVersionTextComment(token, commentId) {
    const url = `/versiontextcomment/${commentId}/`;
    // make a request to delete the comment
    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': token,
                'Content-Type': 'application/json'
            },
        })
        const data = await response.json()
        if (data['success']) {
            return {
                "success": true,
                "message": "Comment deleted",
            }
        } else {
            console.log('error')
            return {
                "success": false,
                "message": "Could not delete comment",
            }
        }
    } catch (error) {
        console.log(error);
        return {
            "success": false,
            "message": "Could not delete comment",
        }
    }
}

export async function deleteVersionFileComment(token, commentId) {
    const url = `/versionfilecomment/${commentId}/`;
    // make a request to delete the comment
    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': token,
                'Content-Type': 'application/json'
            },
        })
        const data = await response.json()
        if (data['success']) {
            return {
                "success": true,
                "message": "Comment deleted",
            }
        } else {
            console.log('error')
            return {
                "success": false,
                "message": "Could not delete comment",
            }
        }
    } catch (error) {
        console.log(error);
        return {
            "success": false,
            "message": "Could not delete comment",
        }
    }
}