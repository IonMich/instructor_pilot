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
                form.classList.add('was-validated')
            }, false)
        })
})()

function navigatorHandler (event) {
    let areaIsFocused = (document.activeElement === text_area);
    if (areaIsFocused && text_area.value !== "") {
        return
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



const text_area = document.getElementById("newComment");
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
// when the user hovers over the div, show the delete button
const oldComments = document.querySelectorAll(".old-comment");
oldComments.forEach(comment => {
    const deleteBtn = comment.querySelector(".btn-delete-comment");
    comment.addEventListener("mouseenter", () => {
        deleteBtn.classList.remove("d-none");
    });
    comment.addEventListener("mouseleave", () => {
        deleteBtn.classList.add("d-none");
    });
}
);
