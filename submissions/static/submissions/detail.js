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
    // if any modal is open, do not navigate
    const modals = document.querySelectorAll(".modal");
    for (const modal of modals) {
        if (modal.classList.contains("show")) {
            return;
        }
    }
    // if any text inputs are focused and their value is not empty, do not navigate
    // only exception is the grade input.
    if (element_focused.tagName === "INPUT" && element_focused.value !== "" && !element_focused.classList.contains("grade-input")) {
        return;
    }
    

    // if the offcanvas is open, do not navigate
    if (offcanvas.classList.contains("show")) {
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

async function handleScroll () {
    // check if all images are loaded
    const areImagesLoaded = await allImgsFullyLoaded()
    console.log("images loaded: ", areImagesLoaded);
    // get all grade input elements
    const grade_inputs = document.querySelectorAll(".grade-input");
    // for each grade input element add event listener on focus
    grade_inputs.forEach((input, i) => {
        console.log('adding event listener for 0-indexed input', i);
        input.addEventListener("focus", scrollImgAndWindow);
    });
    const grade_scroll_height_inputs = document.querySelectorAll(".scroll-height-input");
    // for each grade input element add event listener on focus
    grade_scroll_height_inputs.forEach((input, i) => {
        console.log('adding event listener for 0-indexed input', i);
        input.addEventListener("focus", scrollImgAndWindow);
    });

    // focus on the grade input with data-position=0
    const firstGradeInput = document.querySelector(`input[data-position="0"]`);
    console.log("focusing on first grade input");
    firstGradeInput.focus();
};

async function allImgsFullyLoaded () {
    const imgsDiv = document.querySelector("#div-imgs");
    const loadImage = src =>
        new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve(img);
            };
            img.onerror = reject;
            img.src = src;
        }
    );
    // get all image tags in the div
    const imgs = imgsDiv.querySelectorAll("img");
    // get image urls via map
    const imageUrls = Array.from(imgs).map(img => img.src);
    try {
        const images = await Promise.all(imageUrls.map(loadImage));
        images.forEach((image, i) => {
            console.log(image, `\nloaded? ${image.complete}`);
        });
        page_height = imgs[0].height;
        console.log("page height: ", page_height);
        return new Promise((resolve, reject) => {
            resolve(true);
        });
    } catch (error) {
        console.error(error);
        return new Promise((resolve, reject) => {
            resolve(false);
        });
    }
}

function applyThemeSubmissionImages () {
    // invert the colors of the image if the theme is dark
    const getStoredTheme = () => localStorage.getItem('theme')
    const storedTheme = getStoredTheme()
    console.log(storedTheme);
    if ((storedTheme === 'dark') 
    || (storedTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        // get all image tags in the div
        const imgsDiv = document.querySelector("#div-imgs");
        const imgs = imgsDiv.querySelectorAll("img");
        // style with invert filter
        imgs.forEach((img, i) => {
            img.style.filter = "invert(1) brightness(2)"
        });
    }
}

function scrollImgAndWindow(event) {
    const gradeInput = event.target;
    // get the 0-indexed question position from the data-position attribute
    const questionPosition = gradeInput.dataset.position;
    console.log(questionPosition);
    console.log("scroll");
    // and select the corresponding grade input element
    console.log(scrollFactors);
    // if the scroll height factor is not empty, scroll to the corresponding scroll height factor
    if (scrollFactors[questionPosition] === "") {
        console.log("empty");
        return;
    }
    const imgsDiv = document.querySelector("#div-imgs");
    console.log(page_height);
    imgsDiv.scrollTo({
        top:(page_height+margin)*scrollFactors[questionPosition],
        left:0, 
        behavior: "smooth"
    });
    // TODO: Chrome does not scroll to the input element (works only when switching tabs)
    gradeInput.scrollIntoView({behavior: "smooth", block: "end"});
    // TODO: Safari does not select the text in the input element
    // input.select(); does not work, so use the following workaround
    setTimeout(() => {
        gradeInput.select();
    }, 30);
}


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

function handleOffcanvasScrollInputs () {
    const offcanvas = document.querySelector("#offcanvasExample");
    const offcanvasScrollInputs = offcanvas.querySelectorAll(".scroll-height-input");
    // get the scroll height factors of this assignment from the django template

    // set the initial input values of the offcanvas inputs
    scrollFactors = setInitialInputValues();
    console.log("after set", scrollFactors);

    offcanvasScrollInputs.forEach( (input, i) => {
        input.addEventListener("change", (event) => {
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
                    scrollImgAndWindow(event);
                    const toastDiv = document.createElement("div");
                    toastDiv.classList.add("toast", "align-items-center", "text-white", "bg-success", "border-0");
                    toastDiv.setAttribute("role", "alert");
                    toastDiv.setAttribute("aria-live", "assertive");
                    toastDiv.setAttribute("aria-atomic", "true");
                    toastDiv.innerHTML = `<div class="d-flex">
                                            <div class="toast-body">
                                                Scroll height factor for question ${i+1} saved successfully!
                                            </div>
                                            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                                            </div>`;
                    document.querySelector(".toast-container").appendChild(toastDiv);
                    const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastDiv);
                    toastBootstrap.show();
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
const url_this = new URL(window.location.href);
// add previous to the end of the url
const prev_url = url_this.href + "previous/";
// add next to the end of the url
const next_url = url_this.href + "next/";
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
applyThemeSubmissionImages();
handleOffcanvasScrollInputs();
let page_height;
const margin = 10;
handleScroll();

setInitialGradeStep();
handleOffcanvasGradeStepInput();

document.addEventListener('keydown', navigatorHandler);

// API call to get the starred comments for the current user and the current assignment
const url_saved_comments_list = `/assignments/${assignment_id}/starcomments/`;

async function getSavedComments() {
    const options = {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        }
    };
    let savedComments = null;
    try {
        const response = await fetch(url_saved_comments_list, options);
        const data = await response.json();
        savedComments = JSON.parse(data);
    } catch (error) {
        console.log(error);
    }
    return savedComments;
}

constructStarredCommentList();


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
    // get the csrf token from the modal form
    const csrfToken = starModalform.querySelector("input[name='csrfmiddlewaretoken']").value;
    // send a fetch request to delete the comment
    const url = `/assignments/${assignment_id}/starcomments/`;
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        // add saved_titlte, saved_token, and text to the body of the request
        body: JSON.stringify({
            "comment_action": starModalform.querySelector("input[name='comment_action']").value,
            "text": starModalform.querySelector("#id_saved_text").value,
            "title": starModalform.querySelector("#id_saved_title").value,
            "token": starModalform.querySelector("#id_saved_token").value, 
        })
    };
    fetch(url, options)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if (data.message === "failure") {
                // remove was-validated from the form
                starModalform.classList.remove("was-validated");
                // add the is-invalid pseudo class to all the inputs and textareas
                starModalform.querySelectorAll("input, textarea").forEach(input => {
                    input.classList.add("is-invalid");
                });
                // change the text of the invalid-feedback div
                starModalform.querySelector(".invalid-feedback").textContent = "Something went wrong";
                // execute the catch block
                throw new Error("Something went wrong");
            }
            const modalInstance = bootstrap.Modal.getInstance(starModal);
            modalInstance.hide();
            // destroy and reconstruct the starred comment list
            destroyStarredCommentList();
            constructStarredCommentList();
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

const editSavedCommentsBtn = document.querySelector("#edit-assignment-saved-comments");

showSavedCommentsBtn.addEventListener("click", handleToggleSavedComments);

function handleToggleSavedComments (event) {
    // override the default behaviour of the button
    if (event) {
        event.preventDefault();
    }
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
        editSavedCommentsBtn.classList.remove("d-none");
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
        
    } else {
        console.log("closing saved comments");
        editSavedCommentsBtn.classList.add("d-none");
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
    }
}

let draggedSource = null;
const toggleReorderBtn = document.querySelector("#btnToggleReorder");


function handleDragStart(event) {
    event.target.style.opacity = 0.4;
    draggedSource = event.target;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/html", event.target.innerHTML);
}

function handleDragEnd(event) {
    const draggableSavedComments = document.querySelectorAll(".draggable-saved-comment");
    event.target.style.opacity = 1;
    draggableSavedComments.forEach(draggableSavedComment_i => {
        draggableSavedComment_i.classList.remove("dragged-over");
    }
    );
}

function handleDragOver(event) {
    if (event.preventDefault) {
        event.preventDefault();
    }
    event.dataTransfer.dropEffect = "move";
    return false;
}

function handleDragEnter(event, comment) {
    comment.classList.add("dragged-over"); 
}

function handleDragLeave(event, comment) {
    comment.classList.remove("dragged-over");
}

async function handleDrop(event) {
    if (event.stopPropagation) {
        event.stopPropagation();
    }
    if (draggedSource != event.target) {
        draggedSource.innerHTML = event.target.innerHTML;
        event.target.innerHTML = event.dataTransfer.getData("text/html");
    }
    
    const pk_dragged = draggedSource.getAttribute("data-pk");
    const pk_dropped_on = event.target.getAttribute("data-pk");
    console.log("pk_dragged: ", pk_dragged);
    console.log("pk_dropped_on: ", pk_dropped_on);

    const old_positions = await getPositions();
    console.log("old_positions: ", old_positions);
    handleOrderSwapConfirmed();

    async function getPositions() {
        const saved_comments = await getSavedComments();
        const dropped_comment = saved_comments.find(saved_comment => saved_comment.pk == pk_dropped_on);
        const old_dropped_comment_position = dropped_comment.fields.position;
        const dragged_comment = saved_comments.find(saved_comment => saved_comment.pk == pk_dragged);
        const old_dragged_comment_position = dragged_comment.fields.position;
        return [old_dropped_comment_position, old_dragged_comment_position];
    }

    async function handleOrderSwapConfirmed() {
        const new_dragged_position = old_positions[0];
        const new_dropped_on_position = old_positions[1];
        console.log("new_dragged_position: ", new_dragged_position);
        console.log("new_dropped_on_position: ", new_dropped_on_position);
        
        const urls = [
            `/assignments/${assignment_id}/starcomments/${pk_dropped_on}/`,
            `/assignments/${assignment_id}/starcomments/${pk_dragged}/`
        ];
        const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;
        const options = (position) => {
                return {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                },
                // add saved_titlte, saved_token, is_saved=True and text to the body of the request
                body: JSON.stringify({
                    "position": position
                })
            };
        };

        try {
            await fetch(urls[0], options(new_dropped_on_position))
            await fetch(urls[1], options(new_dragged_position))
            draggedSource.setAttribute("data-pk", pk_dropped_on);
            event.target.setAttribute("data-pk", pk_dragged);
        } catch (error) {
            console.log(error);
        }
    
        toggleForms(null);
        // add bootstrap toast to the page
        const toastDiv = document.createElement("div");
        toastDiv.classList.add("toast", "align-items-center", "text-white", "bg-success", "border-0");
        toastDiv.setAttribute("role", "alert");
        toastDiv.setAttribute("aria-live", "assertive");
        toastDiv.setAttribute("aria-atomic", "true");
        toastDiv.innerHTML = `<div class="d-flex">
                                <div class="toast-body">
                                    Comments re-ordered.
                                </div>
                                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                                </div>`;
        document.querySelector(".toast-container").appendChild(toastDiv);
        const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastDiv);
        toastBootstrap.show();

        // destroyStarredCommentList();
        // constructStarredCommentList(isDraggable=true);
        reloadSavedCommentsToSelect();
    }

    return false;
}

function addDragListenersToComment (comment) {
    comment.addEventListener("dragstart", handleDragStart);
    comment.addEventListener("dragend", handleDragEnd);
    comment.addEventListener("dragover", handleDragOver);
    comment.addEventListener("dragenter", (event) => {
        handleDragEnter(event, comment);
    });

    comment.addEventListener("dragleave", (event) => {
        handleDragLeave(event, comment);
    });

    comment.addEventListener("drop", handleDrop);
};

function removeDragListenersFromComment (comment) {
    comment.removeEventListener("dragstart", handleDragStart);
    comment.removeEventListener("dragend", handleDragEnd);
    comment.removeEventListener("dragover", handleDragOver);
    comment.removeEventListener("dragenter", (event) => {
        handleDragEnter(event, comment);
    });
    comment.removeEventListener("dragleave", (event) => {
        handleDragLeave(event, comment);
    });
    comment.removeEventListener("drop", handleDrop);
};

function destroyStarredCommentList () {
    // get all the draggable saved comments
    const draggableSavedComments = document.querySelectorAll(".draggable-saved-comment");
    draggableSavedComments.forEach(draggableSavedComment_i => {
        draggableSavedComment_i.remove();
    }
    );
}

async function constructStarredCommentList(isDraggable=false) {
    const savedComments = await getSavedComments();

    // for (let i = 0; i < savedComments.length; i++) {
    //     const comment = savedComments[i];
    //     constructStarredCommentOverview(comment, isDraggable);
    // }

    // sort by fields.position
    const sortedSavedComments = savedComments.sort((a, b) => a.fields.position - b.fields.position);
    console.log("sortedSavedComments: ", sortedSavedComments);
    for (let i = 0; i < sortedSavedComments.length; i++) {
        const comment = sortedSavedComments[i];
        constructStarredCommentOverview(comment, isDraggable);
    }
    reloadSavedCommentsToSelect();
}

function constructStarredCommentOverview (comment, isDraggable=false) {
    const modalBody = document.querySelector("#savedCommentsEditModal .modal-body");
    const commentDiv = document.createElement("div");
    commentDiv.classList.add("mb-3", "p-2", "draggable-saved-comment");
    commentDiv.setAttribute("draggable", isDraggable);
    commentDiv.setAttribute("data-pk", comment.pk);
    const commentOverviewDiv = document.createElement("div");
    commentOverviewDiv.classList.add("comment-overview", "mb-2", "d-flex", "flex-row", "align-items-center", "justify-content-start");
    commentOverviewDiv.setAttribute("id", `starred-comment-overview-${comment.pk}`);
    commentOverviewDiv.setAttribute("data-pk", comment.pk);
    const dragIndicatorDiv = document.createElement("div");
    dragIndicatorDiv.classList.add("drag-indicator", "me-2");
    const dragIndicatorIcon = document.createElement("i");
    dragIndicatorIcon.classList.add("bi", "bi-grip-vertical");
    dragIndicatorDiv.appendChild(dragIndicatorIcon);
    commentOverviewDiv.appendChild(dragIndicatorDiv);
    const commentTextDiv = document.createElement("div");
    commentTextDiv.classList.add("d-flex", "flex-column", "align-items-start", "justify-content-start", "me-auto");
    const commentTitleDiv = document.createElement("div");
    commentTitleDiv.classList.add("d-flex", "flex-row", "align-items-start", "justify-content-start");
    const commentTitle = document.createElement("h5");
    commentTitle.classList.add("comment-title", "d-inline-block", "me-2");
    commentTitle.setAttribute("id", `id_starred_title_${comment.pk}`);
    commentTitle.textContent = comment.fields.title;
    commentTitleDiv.appendChild(commentTitle);
    const commentTokenSpan = document.createElement("span");
    commentTokenSpan.setAttribute("id", `id_starred_token_${comment.pk}`);
    commentTokenSpan.classList.add("comment-tags");
    if (comment.fields.token) {
        commentTokenSpan.classList.add("ms-2", "bg-secondary-subtle", "border", "border-secondary-subtle", "rounded-3", "p-1");
        commentTokenSpan.textContent = comment.fields.token;
    } else {
        commentTokenSpan.textContent = "";
    }
    commentTitleDiv.appendChild(commentTokenSpan);
    commentTextDiv.appendChild(commentTitleDiv);
    const commentTextP = document.createElement("p");
    commentTextP.classList.add("comment-text");
    commentTextP.setAttribute("id", `id_starred_p_${comment.pk}`);
    commentTextP.textContent = comment.fields.text;
    commentTextDiv.appendChild(commentTextP);
    commentOverviewDiv.appendChild(commentTextDiv);
    const nonDragActionsDiv = document.createElement("div");
    nonDragActionsDiv.classList.add("btn-group-sm", "d-inline-flex", "non-drag-actions");
    const editButton = document.createElement("button");
    editButton.setAttribute("type", "button");
    editButton.classList.add("btn", "btn-edit-star");
    editButton.setAttribute("aria-label", "Edit");
    editButton.setAttribute("title", "Edit Star Attributes");
    editButton.setAttribute("tabindex", "-1");
    const editButtonIcon = document.createElement("i");
    editButtonIcon.classList.add("bi", "bi-pencil-fill");
    editButton.appendChild(editButtonIcon);
    if (isDraggable) {
        console.log("is draggable");
    } else {
        editButton.addEventListener("click", toggleForms);
    }
    nonDragActionsDiv.appendChild(editButton);
    const removeButton = document.createElement("button");
    removeButton.setAttribute("type", "button");
    removeButton.classList.add("btn", "btn-remove-star");
    removeButton.setAttribute("aria-label", "Delete");
    removeButton.setAttribute("title", "Toggle star comment");
    removeButton.setAttribute("tabindex", "-1");
    const removeButtonIcon = document.createElement("i");
    removeButtonIcon.classList.add("bi", "bi-trash-fill");
    removeButton.appendChild(removeButtonIcon);
    if (isDraggable) {
        console.log("is draggable");
    } else {
        removeButton.addEventListener("click", toggleForms);
    }
    nonDragActionsDiv.appendChild(removeButton);
    commentOverviewDiv.appendChild(nonDragActionsDiv);
    commentDiv.appendChild(commentOverviewDiv);
    
    modalBody.appendChild(commentDiv);

    // insert commentDiv in correct position
    // const commentDivs = document.querySelectorAll(".draggable-saved-comment");
    // if (commentDivs.length === 0) {
    //     modalBody.appendChild(commentDiv);
    // }
    // else if (commentDivs.length === 1) {
    //     if (comment.fields.position === 0) {
    //         modalBody.insertBefore(commentDiv, commentDivs[0]);
    //     } else {
    //         modalBody.appendChild(commentDiv);
    //     }
    // } else {
    //     if (comment.fields.position === 0) {
    //         modalBody.insertBefore(commentDiv, commentDivs[0]);
    //     } else if (comment.fields.position === commentDivs.length) {
    //         modalBody.appendChild(commentDiv);
    //     } else {
    //         modalBody.insertBefore(commentDiv, commentDivs[comment.fields.position]);
    //     }
    // }
}

// when the edit button is clicked, append the edit form to the div with class "starred-comment-edit"
function starredCommentEditFormConstructor (event) {
    // get the comment div with class draggable-saved-comment
    const commentDiv = event.target.closest(".draggable-saved-comment");
    // get the comment pk from the data-pk attribute of the comment div
    const commentPk = commentDiv.getAttribute("data-pk");
    console.log(commentPk);
    // add form element to edit the comment
    const editForm = document.createElement("form");
    editForm.setAttribute("method", "put");
    editForm.setAttribute("action", "");
    editForm.setAttribute("id", `edit-saved-comment-form-${commentPk}`);
    editForm.classList.add("mb-2");
    // get a csrf token input
    const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;
    const csrfTokenInput = document.createElement("input");
    csrfTokenInput.setAttribute("type", "hidden");
    csrfTokenInput.setAttribute("name", "csrfmiddlewaretoken");
    csrfTokenInput.setAttribute("value", csrfToken);
    editForm.appendChild(csrfTokenInput);
    commentDiv.appendChild(editForm);

    // append a child div to the comment div with class "draggable-saved-comment"
    const editFormDiv = document.createElement("div");
    editFormDiv.classList.add("mb-2", "starred-comment-edit");
    editFormDiv.setAttribute("id", `starred-comment-edit-${commentPk}`);
    editForm.appendChild(editFormDiv);
    // create a textarea with the comment text
    const textarea = document.createElement("textarea");
    textarea.classList.add("form-control", "mb-2");
    textarea.setAttribute("id", "id_saved_text");
    textarea.setAttribute("name", "saved_text");
    // textarea.setAttribute("disabled", "");
    textarea.value = commentDiv.querySelector(".comment-text").innerHTML;
    editFormDiv.appendChild(textarea);
    // create a hidden input with name "comment_action" and value "edit_saved_comment"
    const commentActionInput = document.createElement("input");
    commentActionInput.setAttribute("type", "hidden");
    commentActionInput.setAttribute("name", "comment_action");
    commentActionInput.setAttribute("value", "star_comment");
    editFormDiv.appendChild(commentActionInput);
    const commentIdInput = document.createElement("input");
    commentIdInput.setAttribute("type", "hidden");
    commentIdInput.setAttribute("name", "comment_id");
    commentIdInput.setAttribute("value", commentPk);
    editFormDiv.appendChild(commentIdInput);
    // create a label for the title input
    const titleLabel = document.createElement("label");
    titleLabel.setAttribute("for", `id_saved_title`);
    titleLabel.innerHTML = "Title";
    editFormDiv.appendChild(titleLabel);
    // create a title input with the comment title
    const titleInput = document.createElement("input");
    titleInput.setAttribute("type", "text");
    titleInput.classList.add("form-control", "mb-2");
    titleInput.setAttribute("id", `id_saved_title`);
    titleInput.setAttribute("name", "saved_title");
    titleInput.setAttribute("value", commentDiv.querySelector(".comment-title").innerText);
    titleInput.setAttribute("required", "");
    editFormDiv.appendChild(titleInput);
    // create a label for the token input
    const tokenLabel = document.createElement("label");
    tokenLabel.setAttribute("for", `id_saved_token`);
    tokenLabel.innerHTML = "Search tags";
    editFormDiv.appendChild(tokenLabel);
    // create a token input with the comment token
    const tokenInput = document.createElement("input");
    tokenInput.setAttribute("type", "text");
    tokenInput.classList.add("form-control", "mb-2");
    tokenInput.setAttribute("id", `id_saved_token`);
    tokenInput.setAttribute("name", "saved_token");
    tokenInput.setAttribute("value", commentDiv.querySelector(".comment-tags").innerText);
    editFormDiv.appendChild(tokenInput);
    // create a div with class "invalid-feedback"
    const invalidFeedbackDiv = document.createElement("div");
    invalidFeedbackDiv.classList.add("invalid-feedback");
    invalidFeedbackDiv.innerHTML = "Please enter a title.";
    editFormDiv.appendChild(invalidFeedbackDiv);
    // create a button with class "btn btn-secondary btn-sm" and innerHTML "Cancel"
    const cancelButton = document.createElement("button");
    cancelButton.classList.add("cancel-edit-star", "btn", "btn-secondary", "me-2");
    cancelButton.setAttribute("type", "button");
    cancelButton.innerHTML = "Cancel";
    editFormDiv.appendChild(cancelButton);
    // create a button with class "btn btn-primary btn-sm" and innerHTML "Save"
    const saveButton = document.createElement("button");
    saveButton.classList.add("submit-edit-star", "btn", "btn-primary");
    saveButton.setAttribute("type", "button");
    saveButton.innerHTML = "Save";
    editFormDiv.appendChild(saveButton);

    // add event listeners to the cancel and save buttons
    cancelButton.addEventListener("click", toggleForms);

    saveButton.addEventListener("click", (event) => {
        console.log("save button clicked");
        handleEditStarCommentConfirmed(event);
    });
};

function handleEditStarCommentConfirmed (event) {
    console.log("prevent default");
    event.preventDefault();
    console.log("handle edit star");

    const editStarForm = event.target.closest("form");
    console.log(editStarForm)
    if (!editStarForm.checkValidity()) {
        return;
    }
    // get the comment primary key
    const savedCommentPk = editStarForm.parentElement.getAttribute("data-pk");
    // get the csrf token from the modal form
    const csrfToken = editStarForm.querySelector("input[name='csrfmiddlewaretoken']").value;
    console.log(csrfToken);
    console.log(savedCommentPk);
    const newText = editStarForm.querySelector("#id_saved_text").value;
    const newTitle = editStarForm.querySelector("#id_saved_title").value;
    const newToken = editStarForm.querySelector("#id_saved_token").value;
    // send a fetch request to delete the comment
    const url = `/assignments/${assignment_id}/starcomments/${savedCommentPk}/`;
    const options = {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        // add saved_titlte, saved_token, is_saved=True and text to the body of the request
        body: JSON.stringify({
            "text": newText,
            "title": newTitle,
            "token": newToken,
        })
    };
    console.log(url);
    console.log(options);
    fetch(url, options)
    .then(response => response.json())
    .then(data => {
        toggleForms(null);
        // add bootstrap toast to the page
        const toastDiv = document.createElement("div");
        toastDiv.classList.add("toast", "align-items-center", "text-white", "bg-success", "border-0");
        toastDiv.setAttribute("role", "alert");
        toastDiv.setAttribute("aria-live", "assertive");
        toastDiv.setAttribute("aria-atomic", "true");
        toastDiv.innerHTML = `<div class="d-flex">
                                <div class="toast-body">
                                    Comment updated.
                                </div>
                                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                                </div>`;
        document.querySelector(".toast-container").appendChild(toastDiv);
        const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastDiv);
        toastBootstrap.show();

        const commentDiv = document.querySelector(`.comment-overview[data-pk="${savedCommentPk}"]`);
        // delete the old star comment overview parent, and reconstruct it
        commentDiv.parentElement.remove();
        // create a new comment overview div
        const comment = JSON.parse(data)[0];
        console.log(comment);
        // constructStarredCommentOverview(comment, isDraggable=false);
        destroyStarredCommentList();
        // create the saved comments modal again
        constructStarredCommentList();
    })
    .catch(error => {
        console.log(error);
    });
}

function starredCommentDeleteFormConstructor (event) {
    // get the comment div with class draggable-saved-comment
    const commentDiv = event.target.closest(".draggable-saved-comment");
    // get the comment pk from the data-pk attribute of the comment div
    const commentPk = commentDiv.getAttribute("data-pk");
    console.log(commentPk);
    // add form element to edit the comment
    const deleteStarForm = document.createElement("form");
    deleteStarForm.classList.add("starred-comment-delete");
    commentDiv.appendChild(deleteStarForm);
    // create a csrf token input
    const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;
    const csrfTokenInput = document.createElement("input");
    csrfTokenInput.setAttribute("type", "hidden");
    csrfTokenInput.setAttribute("name", "csrfmiddlewaretoken");
    csrfTokenInput.setAttribute("value", csrfToken);
    deleteStarForm.appendChild(csrfTokenInput);
    // create a div with class "mb-3"
    const formDiv = document.createElement("div");
    formDiv.classList.add("mb-3");
    deleteStarForm.appendChild(formDiv);
    // create a label with class "form-label" and innerHTML "Are you sure you want to delete this comment?"
    const formLabel = document.createElement("label");
    formLabel.classList.add("form-label");
    formLabel.innerHTML = "Are you sure you want to delete this comment?";
    formDiv.appendChild(formLabel);
    // create a button with class "btn btn-secondary btn-sm" and innerHTML "Cancel"
    const cancelButton = document.createElement("button");
    cancelButton.classList.add("cancel-delete-star", "btn", "btn-secondary", "me-2");
    cancelButton.setAttribute("type", "button");
    cancelButton.innerHTML = "Cancel";
    deleteStarForm.appendChild(cancelButton);
    // add event listener to the cancel button
    cancelButton.addEventListener("click", toggleForms);

    // create a button with class "btn btn-danger btn-sm" and innerHTML "Delete"
    const deleteButton = document.createElement("button");
    deleteButton.classList.add("btn", "btn-danger");
    deleteButton.setAttribute("type", "button");
    deleteButton.innerHTML = "Delete";
    deleteStarForm.appendChild(deleteButton);
    // add event listener to the delete button
    deleteButton.addEventListener("click", (event) => {
        console.log("delete button clicked");
        handleDeleteStarCommentConfirmed(event);
        toggleForms(event);
    });
};

function handleDeleteStarCommentConfirmed (event) {
    console.log("prevent default");
    event.preventDefault();
    console.log("handle delete star");

    const deleteStarForm = event.target.closest("form");
    console.log(deleteStarForm)
    if (!deleteStarForm.checkValidity()) {
        return;
    }
    // get the comment primary key
    const savedCommentPk = deleteStarForm.parentElement.getAttribute("data-pk");
    // get the csrf token from the modal form
    const csrfToken = deleteStarForm.querySelector("input[name='csrfmiddlewaretoken']").value;
    console.log(csrfToken);
    console.log(savedCommentPk);
    // send a fetch request to delete the comment
    const url = `/assignments/${assignment_id}/starcomments/${savedCommentPk}/`;
    const options = {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        // add saved_titlte, saved_token, is_saved=True and text to the body of the request
        body: JSON.stringify({
        })
    };
    console.log(url);
    console.log(options);
    fetch(url, options)
    .then(response => response.json())
    .then(data => {
        toggleForms(null);
        // add bootstrap toast to the page
        const toastDiv = document.createElement("div");
        toastDiv.classList.add("toast", "align-items-center", "text-white", "bg-success", "border-0");
        toastDiv.setAttribute("role", "alert");
        toastDiv.setAttribute("aria-live", "assertive");
        toastDiv.setAttribute("aria-atomic", "true");
        toastDiv.innerHTML = `<div class="d-flex">
                                <div class="toast-body">
                                    Comment Deleted.
                                </div>
                                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                                </div>`;
        document.querySelector(".toast-container").appendChild(toastDiv);
        const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastDiv);
        toastBootstrap.show();

        const commentDiv = document.querySelector(`.comment-overview[data-pk="${savedCommentPk}"]`);
        // delete the old star comment overview parent, and reconstruct it
        commentDiv.parentElement.remove();
        destroyStarredCommentList();
        // create the saved comments modal again
        constructStarredCommentList();
        
    })
    .catch(error => {
        console.log(error);
    });
}


function toggleForms (event) {
    // destroy all existing edit forms
    const editForms = document.querySelectorAll(".starred-comment-edit");
    editForms.forEach(editForm => {
        editForm.remove();
    });
    // destroy all existing delete forms
    const deleteForms = document.querySelectorAll(".starred-comment-delete");
    deleteForms.forEach(deleteForm => {
        deleteForm.remove();
    });
    // remove d-none from all comment overview divs
    const commentOverviews = document.querySelectorAll(".comment-overview");
    commentOverviews.forEach(commentOverview => {
        commentOverview.classList.remove("d-none");
    });

    if (!event) {
        console.log("generic toggle forms");
        return;
    }

    const targetButton = event.target.closest("button");

    if (targetButton.classList.contains("cancel-edit-star")) {
        console.log("cancel edit form");
    } else if (targetButton.classList.contains("cancel-delete-star")) {
        console.log("cancel delete form");
    } else if (targetButton.classList.contains("btn-edit-star")) {
        // construct the edit form for the clicked comment
        starredCommentEditFormConstructor(event);
        // add d-none to the clicked comment overview div
        const commentOverview = targetButton.closest(".comment-overview");
        commentOverview.classList.add("d-none");
    } else if (targetButton.classList.contains("btn-remove-star")) {
        // construct the delete form for the clicked comment
        starredCommentDeleteFormConstructor(event);
        // add d-none to the clicked comment overview div
        const commentOverview = targetButton.closest(".comment-overview");
        commentOverview.classList.add("d-none");
    } else {
        console.log(targetButton);
        console.log("generic toggle edit forms");
    }
}

function toggleReorder() {
    const draggableSavedComments = document.querySelectorAll(".draggable-saved-comment");
    if (toggleReorderBtn.classList.contains("active")) {
        console.log("toggle reorder on");
        draggableSavedComments.forEach(draggableSavedComment => {
            draggableSavedComment.setAttribute("draggable", "true");
            addDragListenersToComment(draggableSavedComment);
        });
        const editButtons = document.querySelectorAll(".btn-edit-star");
        editButtons.forEach(editButton => {
            editButton.removeEventListener("click", starredCommentEditFormConstructor);
        });
        const deleteButtons = document.querySelectorAll(".btn-remove-star");
        deleteButtons.forEach(deleteButton => {
            deleteButton.removeEventListener("click", starredCommentDeleteFormConstructor);
        });
    } else {
        console.log("toggle reorder off");
        draggableSavedComments.forEach(draggableSavedComment => {
            draggableSavedComment.setAttribute("draggable", "false");
            removeDragListenersFromComment(draggableSavedComment);
        });
        const editButtons = document.querySelectorAll(".btn-edit-star");
        editButtons.forEach(editButton => {
            editButton.addEventListener("click", toggleForms);
        });
        const deleteButtons = document.querySelectorAll(".btn-remove-star");
        deleteButtons.forEach(deleteButton => {
            deleteButton.addEventListener("click", toggleForms);
        });
    }
    toggleForms(null);
}

toggleReorderBtn.addEventListener("click", (event) => {
    event.preventDefault();
    toggleReorder();
});


// when the saved-comments bootdtrap selectpicker is changed, update the textarea with the selected comment(s)
// and update the preview comment div
const savedCommentsSelect = document.querySelector("#id_assignment_saved_comments");

// load the saved comments from the database
async function reloadSavedCommentsToSelect() {
    // remove all existing options
    
    const options = savedCommentsSelect.querySelectorAll("option");
    options.forEach(option => {
        option.remove();
    });
    const savedComments = await getSavedComments()
    const sortedSavedComments = savedComments.sort((a, b) => a.fields.position - b.fields.position);
    sortedSavedComments.forEach( (savedComment, i) => {
        console.log(`option ${i}: ${savedComment.pk} created`);
        const option = document.createElement("option");
        option.setAttribute("value", savedComment.pk);
        option.setAttribute("data-container", "body");
        option.setAttribute("data-tokens", savedComment.fields.token);
        option.setAttribute("data-subtext", savedComment.fields.text);
        if (savedComment.fields.title) {
            // truncate the saved title to 50 characters
            option.innerHTML = savedComment.fields.title.substring(0, 50);
        }
        savedCommentsSelect.appendChild(option);
    });

    $(savedCommentsSelect).selectpicker("destroy");
    $(savedCommentsSelect).selectpicker();
}

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

// listen for the dropdown to be closed in the student name selectpicker
// when the dropdown is closed, console.log the selected student
const studentNameSelect = document.querySelector("#id_student");
studentNameSelect.addEventListener("change", (event) => {
    console.log(event.target.value);

    // get the student pk from the selectpicker
    const studentPk = event.target.value;
    // get the student name from the selectpicker
    const studentName = event.target.selectedOptions[0].text;
    console.log(studentName);
    // send the student name change to the server
    handleNameChange(event);
});

// send the name change to the server
async function handleNameChange (event) {
    // get the student pk from the selectpicker
    const assignmentPk = JSON.parse(
        document.querySelector("#assignment_id").textContent
    );
    const studentPk = event.target.value;
    const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;
    // get the student name from the selectpicker
    const studentName = event.target.selectedOptions[0].text;
    console.log(studentName);
    // send the student name change to the server
    const url = `/assignments/${assignmentPk}/submissions/${pk}/`;
    const data = {
        "student": studentPk,
        "classification_type": "M",
        "csrfmiddlewaretoken": csrfToken,
    };
    const options = {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify(data),
    };
    try {
        const response = await fetch(url, options);
        const json = await response.json();
        console.log(json.student);
        console.log(studentPk);
        if (json.student.toString() !== studentPk) {
            throw new Error("Student name change failed");
        }
        const toastDiv = document.createElement("div");
        toastDiv.classList.add("toast", "align-items-center", "text-white", "bg-success", "border-0");
        toastDiv.setAttribute("role", "alert");
        toastDiv.setAttribute("aria-live", "assertive");
        toastDiv.setAttribute("aria-atomic", "true");
        toastDiv.innerHTML = `<div class="d-flex">
                                <div class="toast-body">
                                    Student name changed to ${studentName}
                                </div>
                                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                                </div>`;
        document.querySelector(".toast-container").appendChild(toastDiv);
        const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastDiv);
        toastBootstrap.show();
    } catch (error) {
        console.log(error);
        const toastDiv = document.createElement("div");
        toastDiv.classList.add("toast", "align-items-center", "text-white", "bg-danger", "border-0");
        toastDiv.setAttribute("role", "alert");
        toastDiv.setAttribute("aria-live", "assertive");
        toastDiv.setAttribute("aria-atomic", "true");
        toastDiv.innerHTML = `<div class="d-flex">
                                <div class="toast-body">
                                    Error changing student name
                                </div>
                                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                                </div>`;
        document.querySelector(".toast-container").appendChild(toastDiv);
        const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastDiv);
        toastBootstrap.show();
    }
}

// get the grading-progress-bar and set the color to primary if data-bs-theme is light
// get the grading-progress-bar and set the color to orange if
// - data-bs-theme is dark
// - data-bs-theme is auto and prefers-color-scheme is dark

const gradingProgressBar = document.querySelector("#grading-progress-bar");

if (gradingProgressBar) {
    console.log("gradingProgressBar exists");
    const getStoredTheme = () => localStorage.getItem('theme')
    const storedTheme = getStoredTheme()
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    
    if (storedTheme === "light") {
        gradingProgressBar.classList.add("bg-primary");
    } else if (storedTheme === "dark" || (storedTheme === "auto" && prefersDarkScheme.matches)) {
        gradingProgressBar.classList.add("bg-warning");
    }
}
