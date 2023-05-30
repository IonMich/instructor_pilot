(function () {
    'use strict'
  
    // apply custom Bootstrap validation styles to forms with the .needs-validation class
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    var forms = document.querySelectorAll('.needs-validation')

    // Loop over them and prevent submission
    Array.prototype.slice.call(forms)
        .forEach(function (form) {
            form.addEventListener('submit', function (event) {
                if (!form.checkValidity()) {
                    event.preventDefault()
                    event.stopPropagation()
                }
                form.classList.add('was-validated');
            }, false)
        })
})()

function navigatorHandler (event) {
    // if any textareas are focused and their value is not empty, do not navigate
    const element_focused = document.activeElement;
    if (element_focused.tagName === "TEXTAREA" && element_focused.value !== "") {
        return;
    }
    switch(event.key) {
        case "ArrowLeft":
            if (pk === firstPk) {
                return
            }
            handleChangesAndNavigate(prev_url);
            break;
        case "ArrowRight":
            if (pk === lastPk) {
                return
            }
            handleChangesAndNavigate(next_url);
            break;
    }
};

function checkIfChanges() {
    let unsavedChanges = false;
    // check if the grades have changed
    const grade_inputs = document.querySelectorAll(".grade-input");
    for (const [index, input] of grade_inputs.entries()) {
        // if input value is empty string, set it to null
        if (input.value === "") {
            inputValue = null;
        } else {
            inputValue = input.value;
        }
        if (inputValue !== initial_grades[index][0]) {
            unsavedChanges = true;
            console.log("changes");
            break;
        }
    };
    // check if the comment area has changed
    if (text_area.value !== "") {
        unsavedChanges = true;
    }
    return unsavedChanges
}

function handleChangesAndNavigate(url) {
    unsavedChanges = checkIfChanges();
    if (unsavedChanges) {
        withConfirm = confirm("You are navigating out of the page. Do you want to save the changes?");
        if (withConfirm) {
            saveChanges();
            navigate(url)
        }
    }
    else {
        navigate(url);
    }
}

function navigate(url) {
    window.location.replace(url)
}

function handleScroll () {
    const imgdiv = document.querySelector("#div-imgs");
    const imgEl = document.querySelector("#img-1");

    const loadImage = src =>
        new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve(img);
                console.log("img loaded");
            };
            img.onerror = reject;
            img.src = src;
        });
    
    // get all image tags in the div
    const imgs = imgdiv.querySelectorAll("img");
    // get image urls via map
    const imageUrls = Array.from(imgs).map(img => img.src);

    Promise.all(imageUrls.map(loadImage)).then(images => {
        images.forEach((image, i) => {
            console.log(image, `\nloaded? ${image.complete}`);
        });
        let page_height = imgEl.height;
        let margin = 10;

        console.log(page_height);
        // get all grade input elements
        const grade_inputs = document.querySelectorAll(".grade-input");
        // for each grade input element add event listener on focus
        grade_inputs.forEach((input, i) => {
            input.addEventListener("focus", () => {
                console.log("focus");
                input.select();
                console.log(scrollFactors);
                // if the scroll height factor is not empty, scroll to the corresponding scroll height factor
                if (scrollFactors[i] === "") {
                    console.log("empty");
                    return;
                }
                imgdiv.scrollTo({
                    top:(page_height+margin)*scrollFactors[i], 
                    left:0, 
                    behavior: "smooth"
                });
            });
        $('#id_grade_question_1').focus();
        });
    });
};

// Define the function setInitialInputValues that will set the initial input values of the offcanvas inputs
// based on the scroll height factors of the user preferences. The user preferences
// contain the scroll height factors corresponding to each question of each assignment
// of each course. The scroll height factors are stored in a JSON object in the user
// preferences. The JSON object is parsed and the scroll height factors are set as
// the initial values of the offcanvas inputs. If the scroll height factors for the
// current assignment are not present in the user preferences, the scroll height
// factors are set to the course default scroll height factors. If the course default
// scroll height factors are not present in the user preferences, the scroll height
// factors are set to empty strings.
function setInitialInputValues () {
    // set the initial input values of the offcanvas inputs and return the scroll height factors
    const offcanvas = document.querySelector("#offcanvasExample");
    const offcanvasScrollInputs = offcanvas.querySelectorAll(".scroll-height-input");
    // if course_id is not present in the user preferences, set the scroll height factors to empty strings
    // if user_scroll_height_factors is null, set the scroll height factors to empty strings
    if (user_scroll_height_factors === null) {
        offcanvasScrollInputs.forEach(input => {
            input.value = "";
        });
    } else if (!user_scroll_height_factors.hasOwnProperty(course_id)) {
        offcanvasScrollInputs.forEach(input => {
            input.value = "";
        });
    } else {
        // if user_scroll_height_factors[course_id] is null, set the scroll height factors to empty strings
        if (user_scroll_height_factors[course_id] === null) {
            console.log("null");
            offcanvasScrollInputs.forEach(input => {
                input.value = "";
            });
        } else if (!user_scroll_height_factors[course_id].hasOwnProperty(assignment_id)) {
            if (user_scroll_height_factors[course_id].hasOwnProperty("default")) {
                offcanvasScrollInputs.forEach((input, i) => {
                    input.value = user_scroll_height_factors[course_id]["default"][i];
                });
            } else {
                offcanvasScrollInputs.forEach(input => {
                    input.value = "";
                });
            }
        } else {
            // if the assignment_id is present in the user preferences, set the scroll height factors to the scroll height factors
            // corresponding to the assignment_id
            offcanvasScrollInputs.forEach((input, i) => {
                input.value = user_scroll_height_factors[course_id][assignment_id][i];
            });
        }
    }
    console.log("initial values set");
    console.log("returning scroll height factors:");
    console.log(Array.from(offcanvasScrollInputs).map(input => input.value));
    return Array.from(offcanvasScrollInputs).map(input => input.value);
}
    
// Handle changes in the offcanvas settings inputs:
// The offcanvas contains one scroll height input for each question in the assignment.
// The scroll height is the factor multiplying the page height to get the scroll position.
// The scroll height is the height that the div containing the images should scroll to when the corresponding question input is focused.
// the offcanvas allows the user to change the div scroll height for each question.
// The html element for the scroll height input is named: id_scroll_height_question_<question_number>
// note that the function handleScroll should take as parameter the scroll height factors for each question
// and scroll to the correct height for each question.
// Finally, the scroll height factors should be saved in the user preferences,
// and specifically in the field "scroll_height_factors" of the user.profile.preferences field

function handleOffcanvasScrollInputs () {
    const offcanvas = document.querySelector("#offcanvasExample");
    const offcanvasScrollInputs = offcanvas.querySelectorAll(".scroll-height-input");
    // get the scroll height factors of this assignment from the django template

    // set the initial input values of the offcanvas inputs
    scrollFactors = setInitialInputValues();
    console.log("after set", scrollFactors);

    offcanvasScrollInputs.forEach( (input, i) => {
        input.addEventListener("change", () => {
            // get the form
            const form = document.querySelector("#offcanvas-scroll-form");
            // get csrf token from input element of form
            const csrfToken = form.querySelector('input[name="csrfmiddlewaretoken"]').value;
            
            console.log("input changed");
            console.log(input);
            console.log("before", scrollFactors);
            offcanvasScrollInputs.forEach((inputIter, j) => {
                console.log(j);
                scrollFactors[j] = inputIter.value;
            });
            console.log("after", scrollFactors);
            handleScroll(scrollFactors);
            // save scroll height factors in user preferences
            const url = "/profile/preferences/edit/";
            const data = {
                "scroll_height_factors": {
                    [course_id]: {
                        [assignment_id]: scrollFactors
                    }
                }
            };
            console.log("data",data);
            console.log(JSON.stringify(data))
            const options = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                },
                body: JSON.stringify(data)
            };
            fetch(url, options)
                .then(response => response.json())
                .then(data => {
                    console.log(data);
                })
                .catch(error => {
                    console.log(error);
                });
        });
    });
};

// function to set grade inputs step size from grade_steps
function setInitialGradeStep() {
    // if grade_steps is null, set the step size to 0.5
    if (grade_steps && grade_steps[course_id] && grade_steps[course_id][assignment_id]) {
        gradeStep = grade_steps[course_id][assignment_id];
        default_type = null;
    } else {
        if (grade_steps && grade_steps[course_id] && grade_steps[course_id]["default"]) {
            gradeStep = grade_steps[course_id]["default"];
            default_type = "course";
        } else if (grade_steps && grade_steps["default"]) {
            gradeStep = grade_steps["default"];
            default_type = "user";
        } else {
            gradeStep = 0.5;
            default_type = "global";
        }
        // set the offcanvasGradeStepInput text as muted
        offcanvasGradeStepInput.classList.add("text-muted");
        // get the bootstrap info alert to the offcanvasGradeStepInput explaining 
        // that the step size is set here to the course default step size
        const alert = document.querySelector("#offcanvas-grade-step-alert");
        alert.classList.remove("d-none");
        // alert.classList.add("alert", "alert-info", "alert-dismissible", "fade", "show", "mt-1");
        // alert.setAttribute("role", "alert");
        alert.innerHTML = `
            <strong>Info:</strong> No step size is set for this assignment. Using the ${default_type} default step size of ${gradeStep}.
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        offcanvasGradeStepInput.parentElement.appendChild(alert);

    }
    console.log("grade step", gradeStep);
    const gradeInputs = document.querySelectorAll(".grade-input");
    gradeInputs.forEach(input => {
        input.step = gradeStep;
    });
    // set the initial value of the grade step input
    offcanvasGradeStepInput.value = gradeStep;
}



const text_area = document.getElementById("newCommentTextArea");
const prevBtn = document.getElementById("btnPrev");
const nextBtn = document.getElementById("btnNext");
const offcanvas = document.querySelector("#offcanvasExample");
const offcanvasGradeStepInput = offcanvas.querySelector("#id_grade_step");
const url = new URL(window.location.href);
// add previous to the end of the url
const prev_url = url.href + "previous/";
// add next to the end of the url
const next_url = url.href + "next/";
let scrollFactors = [];
let gradeStep = null;

const user_scroll_height_factors = JSON.parse(
    document.querySelector("#scroll_height_factors").textContent
    );
const grade_steps = JSON.parse(
    document.querySelector("#grade_steps").textContent
    );
const gradeStepForm = document.querySelector("#offcanvas-grade-step-form");
// get csrf token from input element of form
const gradeStepCsrfToken = gradeStepForm.querySelector('input[name="csrfmiddlewaretoken"]').value;
const course_id = JSON.parse(
    document.querySelector("#course_id").textContent
    );
const assignment_id = JSON.parse(
    document.querySelector("#assignment_id").textContent
    );
const initial_grades = JSON.parse(
    document.getElementById("grades-initial").textContent
    );
const pk = JSON.parse(
    document.getElementById("sub-pk").textContent
    );
const firstPk = JSON.parse(
    document.getElementById("first-sub-pk").textContent
    );
const lastPk = JSON.parse(
    document.getElementById("last-sub-pk").textContent
    );
console.log(scroll_height_factors, course_id, assignment_id);
console.log(pk, firstPk, lastPk);
if (pk === lastPk) {
    nextBtn.disabled = true;
}
if (pk === firstPk) {
    prevBtn.disabled = true;
}

prevBtn.addEventListener("click", () => {
    handleChangesAndNavigate(prev_url);
});
nextBtn.addEventListener("click", () => {
    handleChangesAndNavigate(next_url);
});

console.log(initial_grades);

handleOffcanvasScrollInputs();
handleScroll();

setInitialGradeStep();
handleOffcanvasGradeStepInput();

document.addEventListener('keydown', navigatorHandler);

// remove the muted class from the offcanvasGradeStepInput if the input value is changed
offcanvasGradeStepInput.addEventListener("change", () => {
    offcanvasGradeStepInput.classList.remove("text-muted");
    // remove the alert from the offcanvasGradeStepInput
    const alert = document.querySelector("#offcanvas-grade-step-alert");
    alert.classList.add("d-none");
    alert.innerHTML = "";
});


gradeStepForm.addEventListener("submit", (event) => {
    // prevent default form submission
    event.preventDefault();
    // if the form is not valid, return   
    if (!gradeStepForm.checkValidity()) {
        offcanvasGradeStepInput.reportValidity();
        return;
    }

    gradeStep = offcanvasGradeStepInput.value;
    // trigger a call to the custom form submit function
    // save grade step in user preferences
    const url = "/profile/preferences/edit/";
    const data = {
        "grade_steps": {
            [course_id]: {
                [assignment_id]: gradeStep
            }
        }
    };
    console.log("data",data);
    console.log(JSON.stringify(data))
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": gradeStepCsrfToken
        },
        body: JSON.stringify(data)
    };
    fetch(url, options)
        .then(response => response.json())
        .then(data => {
            console.log(data);
        })
        .catch(error => {
            console.log(error);
        });
    // set the step size of the grade inputs
    const gradeInputs = document.querySelectorAll(".grade-input");
    gradeInputs.forEach(input => {
        input.step = gradeStep;
    });
});
    
// handle changes in the offcanvas grade step input
// the gradeStepForm submit event is triggered when the input is changed
function handleOffcanvasGradeStepInput() {
    offcanvasGradeStepInput.addEventListener("change", (event) => {
        // trigger a call to the custom form submit function
        gradeStepForm.dispatchEvent(new Event("submit"));
    });
}
// However, the user can also submit the form by pressing enter, which
// would trigger the submit event twice. To prevent this, listen for the
// submit enterkey event when the input is focused and simply unfocus the
// input when the enterkey is pressed, instead of submitting the form.
offcanvasGradeStepInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        offcanvasGradeStepInput.blur();
    }
});

// for each old comment, add a hover event listener for the div containing the comment

const oldComments = document.querySelectorAll(".old-comment");
oldComments.forEach(comment => {
    // when the user hovers over the div, show the .comment-tools div
    const commentTools = comment.querySelector(".comment-tools");
    const deleteBtn = comment.querySelector(".btn-delete-comment");
    const starBtn = comment.querySelector(".btn-star-comment");
    const editBtn = comment.querySelector(".btn-edit-comment");
    comment.addEventListener("mouseenter", () => {
        commentTools.classList.remove("d-none");
    });
    // when the user hovers out of the div, hide the .comment-tools div
    comment.addEventListener("mouseleave", () => {
        commentTools.classList.add("d-none");
    });
    // when the user hovers over the delete button, change the color to red
    deleteBtn.addEventListener("mouseenter", () => {
        deleteBtn.classList.add("text-danger");
    }
    );
    // when the user hovers out of the delete button, change the color back to black
    deleteBtn.addEventListener("mouseleave", () => {
        deleteBtn.classList.remove("text-danger");
    }
    );
    // when the user hovers over the star button, change the color to yellow
    starBtn.addEventListener("mouseenter", () => {
        starBtn.classList.add("text-warning");
    }
    );
    // when the user hovers out of the star button, change the color back to black
    starBtn.addEventListener("mouseleave", () => {
        starBtn.classList.remove("text-warning");
    }
    );
    // when the user hovers over the edit button, change the color to green
    editBtn.addEventListener("mouseenter", () => {
        editBtn.classList.add("text-success");
    }
    );
    // when the user hovers out of the edit button, change the color back to black
    editBtn.addEventListener("mouseleave", () => {
        editBtn.classList.remove("text-success");
    }
    );




}
);

// add a click event listener to the delete button of each old comment
// when the user clicks the delete button, open a modal to confirm the deletion

oldComments.forEach(comment => {
    const deleteBtn = comment.querySelector(".btn-delete-comment");
    deleteBtn.addEventListener("click", () => {
        // get the comment id
        const commentId = deleteBtn.getAttribute("data-bs-pk");
        // get the modal
        const modalCommentDelete = document.querySelector("#deleteCommentModal");
        // get the modal delete button
        const modalDeleteBtn = modalCommentDelete.querySelector("#btnDeleteCommentConfirmed");
        // set the comment id as data attribute of the modal delete button
        modalDeleteBtn.setAttribute("data-bs-pk", commentId);
        // show the modal
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalCommentDelete);
        modalInstance.show();
    });
}
);

// add a click event listener to the star button of each old comment
oldComments.forEach(comment => {
    const starBtn = comment.querySelector(".btn-star-comment");
    // if there is no .comment-text element, the comment probably has a file
    // disable the star button
    if (!comment.querySelector(".comment-text")) {
        starBtn.setAttribute("disabled", "");
    } 
    starBtn.addEventListener("click", () => {
        // get the comment id
        const commentId = starBtn.getAttribute("data-bs-pk");
        // get the modal
        const modalCommentStar = document.querySelector("#starCommentModal");
        // get the modal star button
        const modalStarBtn = modalCommentStar.querySelector("#btnStarCommentConfirmed");
        // set the comment id as data attribute of the modal star button
        modalStarBtn.setAttribute("data-bs-pk", commentId);
        // set the text of the modal text area to the text of the comment
        // the text is a <p> element inside the comment div with class .comment-text
        const commentText = comment.querySelector(".comment-text").textContent;
        const modalCommentText = modalCommentStar.querySelector("#id_saved_text");
        modalCommentText.textContent = commentText;

        // show the modal
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalCommentStar);
        // remove was-validated class from the form
        modalCommentStar.querySelector("form").classList.remove("was-validated");
        modalInstance.show();
    });
}
);

// add a click event listener to the edit button of each old comment
oldComments.forEach(comment => {
    const editBtn = comment.querySelector(".btn-edit-comment");
    // if there is no .comment-text element, the comment probably has a file
    // disable the edit button
    if (!comment.querySelector(".comment-text")) {
        editBtn.setAttribute("disabled", "");
    }
    editBtn.addEventListener("click", () => {
        // get the comment id
        const commentId = editBtn.getAttribute("data-bs-pk");
        // get the modal
        const modalCommentEdit = document.querySelector("#editCommentModal");
        // get the modal edit button
        const modalEditBtn = modalCommentEdit.querySelector("#btnEditCommentConfirmed");
        // set the comment id as data attribute of the modal edit button
        modalEditBtn.setAttribute("data-bs-pk", commentId);
        // set the text of the modal text area to the text of the comment
        // the text is a <p> element inside the comment div with class .comment-text
        const commentText = comment.querySelector(".comment-text").textContent;
        const modalCommentText = modalCommentEdit.querySelector("#id_edit_comment_text");
        modalCommentText.textContent = commentText;
        // focus the text area
        modalCommentText.focus();

        // show the modal
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalCommentEdit);
        // remove was-validated class from the form
        modalCommentEdit.querySelector("form").classList.remove("was-validated");
        modalInstance.show();
    });
}
);


// add a click event listener to the modal delete button
// when the user clicks the modal delete button, send a fetch request to delete the comment
const modalDeleteBtn = document.querySelector("#btnDeleteCommentConfirmed");
modalDeleteBtn.addEventListener("click", () => {
    // get the comment id
    const commentId = modalDeleteBtn.getAttribute("data-bs-pk");
    //  get the corresponding comment div, in order to remove it from the DOM later
    // the id of the comment div is the not the same as the comment id, so we need to
    // get the comment div by using the fact that its btn-delete-comment button has the
    // same data-bs-pk attribute as the comment id:
    const commentDiv = document.querySelector(`.btn-delete-comment[data-bs-pk="${commentId}"]`).closest(".old-comment");
    // get the csrf token from the modal form
    modal = document.querySelector("#deleteCommentModal");
    console.log(modal);
    modalform = document.querySelector("#deleteCommentModal form");
    console.log(modalform);
    const csrfToken = modalform.querySelector("input[name='csrfmiddlewaretoken']").value;
    // send a fetch request to delete the comment
    const url = `/courses/${course_id}/assignments/${assignment_id}/submissions/${pk}/comments/${commentId}/delete/`;
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        }
    };
    fetch(url, options)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            // remove the comment div
            commentDiv.remove();
            // hide the modal
            const modalInstance = bootstrap.Modal.getInstance(modal);
            modalInstance.hide();
        })
        .catch(error => {
            console.log(error);
        });
}
);

// add a click event listener to the modal star button #btnStarCommentConfirmed
// when the user clicks the modal Save button, send a fetch request to save the comment
const modalStarBtn = document.querySelector("#btnStarCommentConfirmed");
const starModal = document.querySelector("#starCommentModal");
const starModalform = starModal.querySelector("form");
starModalform.addEventListener("submit", (event) => {
    console.log("prevent default");
    event.preventDefault();
    // if was-validated os in the class list of the form, it means that the form is valid
    // and we can send the fetch request
    console.log(starModalform)
    if (!starModalform.checkValidity()) {
        return;
    }
    // get the comment id
    const commentId = modalStarBtn.getAttribute("data-bs-pk");
    // get the csrf token from the modal form
    const csrfToken = starModalform.querySelector("input[name='csrfmiddlewaretoken']").value;
    // send a fetch request to delete the comment
    const url = `/courses/${course_id}/assignments/${assignment_id}/submissions/${pk}/comments/${commentId}/modify/`;
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        // add saved_titlte, saved_token, is_saved=True and text to the body of the request
        body: JSON.stringify({
            "comment_action": starModalform.querySelector("input[name='comment_action']").value,
            "text": starModalform.querySelector("#id_saved_text").value,
            "saved_title": starModalform.querySelector("#id_saved_title").value,
            "saved_token": starModalform.querySelector("#id_saved_token").value,
            "is_saved": true
            
        })
    };
    fetch(url, options)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            // update the text on the old comment using data-bs-pk attribute
            const oldComment = document.querySelector(`.old-comment .btn-edit-comment[data-bs-pk="${commentId}"]`).closest(".old-comment");
            oldComment.querySelector(".comment-text").textContent = starModalform.querySelector("#id_saved_text").value;
            const modalInstance = bootstrap.Modal.getInstance(starModal);
            modalInstance.hide();
        })
        .catch(error => {
            console.log(error);
        });
}
);

// add a click event listener to the modal edit button #btnEditCommentConfirmed
// when the user clicks the modal Save button, send a fetch request to save the comment
const modalEditBtn = document.querySelector("#btnEditCommentConfirmed");
const editModal = document.querySelector("#editCommentModal");
const editModalform = editModal.querySelector("form");
editModalform.addEventListener("submit", (event) => {
    console.log("prevent default");
    event.preventDefault();
    // if was-validated os in the class list of the form, it means that the form is valid
    // and we can send the fetch request
    console.log(editModalform)
    if (!editModalform.checkValidity()) {
        return;
    }
    // get the comment id
    const commentId = modalEditBtn.getAttribute("data-bs-pk");
    // get the csrf token from the modal form
    const csrfToken = editModalform.querySelector("input[name='csrfmiddlewaretoken']").value;
    // send a fetch request to delete the comment
    const url = `/courses/${course_id}/assignments/${assignment_id}/submissions/${pk}/comments/${commentId}/modify/`;
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        // add text to the body of the request
        body: JSON.stringify({
            "comment_action": editModalform.querySelector("input[name='comment_action']").value,
            "text": editModalform.querySelector("#id_edit_comment_text").value,
        })
    };
    fetch(url, options)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            const oldComment = document.querySelector(`.old-comment .btn-edit-comment[data-bs-pk="${commentId}"]`).closest(".old-comment");
            oldComment.querySelector(".comment-text").textContent = editModalform.querySelector("#id_edit_comment_text").value;
            // change the updated_at date in comment-info to the current date and time
            // display it in the format "Updated MMM. DD YYYY, HH:MM:SS a.m/p.m."
            current_date = new Date();
            display_date = current_date.toLocaleString("en-US", {month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "numeric", hour12: true});
            oldComment.querySelector(".comment-info").textContent = `Updated ${display_date}`;
            // hide the modal
            const modalInstance = bootstrap.Modal.getInstance(editModal);
            modalInstance.hide();
        })
        .catch(error => {
            console.log(error);
        });
}
);

// the form contains a button with id "show-assignment-saved-comments"
// when the user clicks the button, show the saved comments that the user has saved for this assignment
// and hide the textarea
// this is done by removing the "d-none" class from the select with id id_assignment_saved_comments
// if saved comments are shown, the button should hide the saved comments and show the textarea again
// note that selectpicker creates a div with class "btn-group bootstrap-select" around the select
// so we need to get the parent of the parent of the select and add the "d-none" class to it
const showSavedCommentsBtn = document.querySelector("#show-assignment-saved-comments");
    showSavedCommentsBtn.addEventListener("click", (event) => {
    
    // override the default behaviour of the button
    event.preventDefault();
    const savedCommentsDiv = document.querySelector("div.saved-comments")
    const previewCommentDiv = document.querySelector("div.preview-comment")
    const expander = document.querySelector("#expander");
    // if active
    if (showSavedCommentsBtn.classList.contains("active")) {
        // copy the selected text to the textarea
        const previewCommentArea = document.querySelector("#newCommentPreview");
        previewCommentArea.value = text_area.value;
        // reduce the height of the preview comment to fit the textarea text
        if (previewCommentArea.value.length > 0) {
            height = text_area.scrollHeight;
            previewCommentArea.style.height = `${height}px`;
        } 

        console.log("closing textarea");
        text_area.setAttribute("closing", "");
        
        text_area.addEventListener(
            "animationend",
            () => {
                text_area.removeAttribute("closing");
                text_area.classList.add("d-none");
                
            },
            { once: true }
            );
        console.log("opening saved comments");
        savedCommentsDiv.classList.remove("d-none");
        savedCommentsDiv.setAttribute("opening", "");
        savedCommentsDiv.addEventListener(
            "animationend",
            () => {
                savedCommentsDiv.removeAttribute("opening");
                // click on the selectpicker savedCommentsSelect to show the dropdown
                // this is done by triggering a click event on the button with class "dropdown-toggle"

                // get the button with class "dropdown-toggle"
                const dropdownToggle = savedCommentsDiv.querySelector(".dropdown-toggle");
                // trigger a click event on the button
                dropdownToggle.click();
            },
            { once: true }
            );

        expander.classList.toggle("expanded");
        // previewCommentDiv.classList.remove("d-none");
        // previewCommentDiv.setAttribute("opening", "");

        // previewCommentDiv.addEventListener(
        //     "animationend",
        //     () => {
                    
        //             previewCommentDiv.removeAttribute("opening");
                    
        //         }
        //     );
        
    } else {
        console.log("closing saved comments");
        savedCommentsDiv.setAttribute("closing", "");
        savedCommentsDiv.addEventListener(
            "animationend",
            () => {
                savedCommentsDiv.removeAttribute("closing");
                savedCommentsDiv.classList.add("d-none");
                
            },
            { once: true }
            );

        text_area.classList.remove("d-none");
        console.log("opening textarea");
        text_area.setAttribute("opening", "");
        
        text_area.addEventListener(
            "animationend",
            () => {
                text_area.removeAttribute("opening");
            },
            { once: true }
            );
        
        
        expander.classList.toggle("expanded");
        // previewCommentDiv.setAttribute("closing", "");
        // previewCommentDiv.addEventListener(
        //     "animationend",
        //     () => {
        //         previewCommentDiv.removeAttribute("closing");
        //         previewCommentDiv.classList.add("d-none");
        //     },
        //     { once: true }

        // );
    }
    
    // const savedCommentsSelect = document.querySelector("#id_assignment_saved_comments");
    // if (savedCommentsSelect.classList.contains("d-none")) {
    //     savedCommentsSelect.classList.remove("d-none");
    //     // also remove the "d-none" class from the div with class "btn-group bootstrap-select"
    //     savedCommentsSelect.parentElement.classList.remove("d-none");
    // } else {
    //     savedCommentsSelect.classList.add("d-none");
    //     // also add the "d-none" class to the div with class "btn-group bootstrap-select"
    //     savedCommentsSelect.parentElement.classList.add("d-none");
    // }
    // // if the textarea is hidden, show it
    // if (text_area.classList.contains("d-none")) {
    //     text_area.classList.remove("d-none");
    // } else {
    //     text_area.classList.add("d-none");
    // }

}
);

// when the saved-comments selectpicker is changed, update the textarea with the selected comment(s)
// and update the preview comment div
const savedCommentsSelect = document.querySelector("#id_assignment_saved_comments");

savedCommentsSelect.addEventListener("change", (event) => {
    // get the selected comment(s)
    const selectedComments = event.target.selectedOptions;
    // text_area is already defined above

    // get the preview comment area
    const previewCommentArea = document.querySelector("#newCommentPreview");
    
    text_area.value = "";
    previewCommentArea.value = "";
    
    // loop through the selected comments
    for (let i = 0; i < selectedComments.length; i++) {
        // get the comment data-subtext attribute of the selected comment
        const commentText = selectedComments[i].getAttribute("data-subtext");
        // add the comment text to the textarea
        text_area.value += commentText + "\n\n";
        
        // add the comment text to the preview comment div
        previewCommentArea.value += commentText + "\n\n";

        // if the value of the textarea does not fit in the textarea, increase the height of the textarea
        // this is done by setting the height of the textarea to the scrollHeight
        // the scrollHeight is the height of the textarea including the height of the text
        // if the scrollHeight is greater than the height of the textarea, increase the height of the textarea
        if (text_area.scrollHeight > text_area.clientHeight) {
            text_area.style.height = text_area.scrollHeight + 20 + "px";
        }

        // if the value of the preview comment div does not fit in the preview comment div, increase the height of the preview comment div
        // this is done by setting the height of the preview comment div to the scrollHeight
        // the scrollHeight is the height of the preview comment div including the height of the text
        // if the scrollHeight is greater than the height of the preview comment div, increase the height of the preview comment div
        if (previewCommentArea.scrollHeight > previewCommentArea.clientHeight) {
            previewCommentArea.style.height = previewCommentArea.scrollHeight + 40 + "px";
        }

    }
    // strip all trailing newlines from the textarea and the preview comment div
    text_area.value = text_area.value.replace(/\n+$/, "");
    previewCommentArea.value = previewCommentArea.value.replace(/\n+$/, "");
}
);

