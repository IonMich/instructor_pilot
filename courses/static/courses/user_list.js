import { 
    orchistrateCourseElementsUpdateOrCreate, 
    getAvailableCanvasCourses,
    getAvailableCanvasSectionsStudentsDescription, 
} from './api.js';

import {
    renderCanvasSectionsDivBody,
} from './renderSectionsSelect.js';

import {
    createAllProgressItems,
    updateProgressItem,
} from './renderProgress.js';

let canvasCourses = [];
let canvasSections = [];
let canvasStudents = [];

(function () {
    'use strict'
    var forms = document.querySelectorAll('.needs-validation')
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

const addCourseForm = document.querySelector("#manualForm");

// for each course card without a course image, 
// display a fancy animated gradient background
// Create the background gradient by selecting two random colors
// and then creating a gradient between them. Rotate the gradient
// infinitely

function createGradient() {
    const colors = [
        'blue',
        'purple',
        'red',
        'orange',
    ];

    const randomColor1 = colors[Math.floor(Math.random() * colors.length)];
    // remove the first color from the array
    const index = colors.indexOf(randomColor1);
    colors.splice(index, 1);
    const randomColor2 = colors[Math.floor(Math.random() * colors.length)];
    // remove the second color from the array
    const index2 = colors.indexOf(randomColor2);
    colors.splice(index2, 1);
    const randomColor3 = colors[Math.floor(Math.random() * colors.length)];
    // remove the third color from the array
    const index3 = colors.indexOf(randomColor3);
    colors.splice(index3, 1);
    const randomColor4 = colors[Math.floor(Math.random() * colors.length)];
    const rotation_angle = Math.floor(Math.random() * 360);
    const gradient = `linear-gradient( ${rotation_angle}deg, ${randomColor1},  ${randomColor2})`;
    // make the gradient rotate infinitely
    const animation = 'gradient 20s ease infinite';

    // create keyframes for the gradient animation
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes gradient {
            0% {
                background-position: 0% 50%;
            }
            50% {
                background-position: 100% 50%;
            }
            100% {
                background-position: 0% 50%;
            }
        }
    `;
    document.head.appendChild(style);


    return [gradient, animation];
}

async function allImgsFullyLoaded () {
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
    // get all image tags with class card-img-top whose src attribute is not empty
    const imgs = document.querySelectorAll('.card-img-top[src]');
    // get image urls via map
    const imageUrls = Array.from(imgs).map(img => img.src);
    try {
        const images = await Promise.allSettled(imageUrls.map(loadImage));
        
        images.forEach((image) => {
            console.log(image, `\nloaded? ${image.status === 'fulfilled'}`);
            if (image.status === 'fulfilled') {
                imageStatuses.push(true);
            } else {
                imageStatuses.push(false);
            }
        });
        
        // get the clientHeights of the fulfilled promises
        let heights = [];
        for (let i = 0; i < imgs.length; i++) {
            console.log(imgs[i].clientHeight);
            if (imageStatuses[i]) {
                heights.push(imgs[i].clientHeight);
            }
        }
        maxHeight = Math.max(...heights);
        
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

let maxHeight = 0;
let imageStatuses = [];
const courseCards = document.querySelectorAll('.course-card');
addAllGradients();

async function addAllGradients() {
    const allLoaded = await allImgsFullyLoaded();
    console.log(allLoaded);
    courseCards.forEach( (courseCard, index) => {
        const courseImage = courseCard.querySelector('.card-img-top');
        courseImage.style.height = `${maxHeight}px`
        // set to cover
        courseImage.style.objectFit = 'cover';
        if (courseImage.src && imageStatuses[index] === true) {
            // if the course card has an image, don't create the gradient
            
            return;
        }
        const backgroundString = createGradient();
        // set the aspect ratio of the course card images to 3:2
        courseImage.style.background = backgroundString[0];
        courseImage.style.backgroundSize = '400% 400%';
        courseImage.style.animation = backgroundString[1];
    });
}

// update glow origin position on mousemove
function handleOnMouseMove (event) {
    const { currentTarget: target } = event;

    const boundingRect = target.getBoundingClientRect();
    const relX = event.clientX - boundingRect.left;
    const relY = event.clientY - boundingRect.top;

    target.style.setProperty('--mouse-x', `${relX}px`);
    target.style.setProperty('--mouse-y', `${relY}px`);
}

for (const courseCard of courseCards) {
    courseCard.addEventListener('mousemove', handleOnMouseMove);
}

const fetchCanvasCoursesButton = document.querySelector('#fetchCanvasCoursesBtn');
if (fetchCanvasCoursesButton) {
    fetchCanvasCoursesButton.addEventListener('click', handleFetchCanvasCoursesBtn);
}

const addCoursesManuallyButton = document.querySelector('#addCoursesManuallyBtn');
if (addCoursesManuallyButton) {
    addCoursesManuallyButton.addEventListener('click', handleAddCoursesManuallyBtn);
}

async function handleFetchCanvasCoursesBtn () {
    // add a spinner to the button
    const spinner = document.createElement('span');
    spinner.classList.add('spinner-border');
    spinner.classList.add('ms-2');
    spinner.classList.add('spinner-border-sm');
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-hidden', 'true');
    fetchCanvasCoursesButton.innerHTML = 'Fetching...';
    fetchCanvasCoursesButton.appendChild(spinner);
    // add style display none to the invalid feedback div
    const invalidFeedbackDiv = document.querySelector('#course_code_feedback');
    invalidFeedbackDiv.style.display = 'none';
    // get the canvas courses
    fetchCanvasCoursesButton.disabled = true; 
    try {
        canvasCourses = await getAvailableCanvasCourses();
    } catch (error) {
        console.error(error);
    } finally {
        // remove the spinner from the button
        const spinner = fetchCanvasCoursesButton.querySelector('.spinner-border');
        fetchCanvasCoursesButton.removeChild(spinner);
        fetchCanvasCoursesButton.disabled = false;
        fetchCanvasCoursesButton.innerHTML = 'Sync from Canvas';
    }

    // sort the courses by term.end_at date
    const canvasCoursesWithTermEndAt = canvasCourses.filter( (course) => {
        return course.term && course.term.end_at;
    });
    canvasCoursesWithTermEndAt.sort( (a, b) => {
        return new Date(b.term.end_at) - new Date(a.term.end_at);
    });
    const canvasCoursesWithFutureTermEndAt = canvasCoursesWithTermEndAt.filter( (course) => {
        return new Date(course.term.end_at) > new Date();
    });
    const canvasCoursesWithPastTermEndAt = canvasCoursesWithTermEndAt.filter( (course) => {
        return new Date(course.term.end_at) < new Date();
    });
    const canvasCoursesWithoutTermEndAt = canvasCourses.filter( (course) => {
        return !course.term || !course.term.end_at;
    });

    console.log(canvasCourses);
    const canvasCoursesDiv = document.querySelector('#canvasCourses');
    // remove display none from the canvasCoursesDiv
    canvasCoursesDiv.classList.remove('d-none');
    // add display none to the id="chooseSyncMethodBlock"
    const chooseSyncMethodBlock = document.querySelector('#chooseSyncMethodBlock');
    chooseSyncMethodBlock.classList.add('d-none');
    canvasCoursesDiv.innerHTML = '';
    // add radio buttons for each course

    function renderCourseRadioInput (course) {
        const courseDiv = document.createElement('div');
        courseDiv.classList.add('form-check');
        courseDiv.classList.add('d-flex');
        courseDiv.classList.add('justify-content-start');
        courseDiv.classList.add('align-items-center');
        courseDiv.classList.add('mb-2');
        courseDiv.classList.add('mx-2');
        const courseInputDiv = document.createElement('div');
        courseInputDiv.innerHTML = `
            <input 
                type="radio" 
                name="canvas_courses" 
                value="${course.id}" 
                id="canvas_course_${course.id}" 
                class="form-check-input"
            >
        `;
        const courseLabelDiv = document.createElement('div');
        const courseLabel = document.createElement('label');
        courseLabel.classList.add('form-check-label');
        courseLabel.setAttribute('for', `canvas_course_${course.id}`);
        courseLabelDiv.appendChild(courseLabel);
        if (course.name && course.course_code && course.term) {
            courseLabel.innerHTML = `
                <p class="my-0" id="main_text">${(course.name.length > 40) ? `${course.name.slice(0, 40)}...` : course.name}</p>
                <p class="my-0">
                    <span class="text-muted">
                        ${course.course_code}
                    </span> 
                    <span class="text-muted">
                        (${course.term.name})
                    </span>
                    ${course.teachers && course.teachers.length > 0 ? `<span class="text-muted"> - ${course.teachers[0].display_name}</span>` : ''}
                </p>
            `;
        } else if (course.name && course.course_code) {
            courseLabel.innerText = `${course.name} (${course.course_code})`;
            // max length of course name is 50 characters
            if (courseLabel.innerText.length > 40) {
                courseLabel.innerText = `${courseLabel.innerText.slice(0, 40)}...`;
            }
        } else {
            courseLabel.innerText = course.course_code || `Course with id ${course.id}`;
        }
        // if course.alreadyExists is true, add badge to the course name
        // and disable the radio button
        if (course.already_exists) {
            const mainText = courseLabel.querySelector('#main_text')
            if (mainText) {
                const badgeSpan = document.createElement('span');
                badgeSpan.classList.add('badge');
                badgeSpan.classList.add('bg-secondary');
                badgeSpan.classList.add('ms-2');
                badgeSpan.innerText = 'Added';
                mainText.appendChild(badgeSpan);
            }

            courseInputDiv.querySelector('input[type="radio"][name="canvas_courses"]').disabled = true;
        }
        courseLabelDiv.setAttribute('title', course.name || course.course_code || course.id);
        courseDiv.appendChild(courseInputDiv);
        courseDiv.appendChild(courseLabelDiv);
        canvasCoursesDiv.appendChild(courseDiv);
        // add a listener to the radio button
        // on change, hide the course code and term input fields
        const courseCodeInputEl = courseInputDiv.querySelector('input[type="radio"][name="canvas_courses"]');
        courseCodeInputEl.addEventListener('change', () => {
            // if checked, hide the course code and term input fields
            if (!courseCodeInputEl.checked) {
                console.log('not checked');
                return;
            }
            console.log('checked');
            const invalidFeedbackDiv = document.querySelector('#course_code_feedback');
            invalidFeedbackDiv.style.display = 'none';
            // show a spinner and say "Fetching Canvas sections...This may take a while."
            const spinner = document.createElement('span');
            spinner.classList.add('spinner-border');
            spinner.classList.add('ms-2');
            spinner.classList.add('spinner-border-sm');
            spinner.setAttribute('role', 'status');
            spinner.setAttribute('aria-hidden', 'true');
            // hide the canvaCoursesDiv
            canvasCoursesDiv.classList.add('d-none');
            // fill the canvasSectionsDiv with a spinner
            const canvasSectionsDiv = document.querySelector('#canvasSections');
            canvasSectionsDiv.innerHTML = '';
            canvasSectionsDiv.appendChild(spinner);
            // change the modal title to the "{course code} {term name}" or "course with id {id}"
            const modalTitle = document.querySelector('#addCourseModalTitle');
            modalTitle.innerText = course.term ? `${course.course_code} ${course.term.name}` : `Course with id ${course.id}`;
            // get the sections for the course
            const courseCanvasId = course.id;
            handleFetchCanvasSections(courseCanvasId);
        });
    }
    canvasCoursesDiv.innerHTML = `
    <h5 class="mb-3">Ongoing courses</h5>
    `;
    canvasCoursesWithFutureTermEndAt.forEach( (course) => {
        renderCourseRadioInput(course);
    });
    
    canvasCoursesWithoutTermEndAt.forEach( (course) => {
        renderCourseRadioInput(course);
    });
    // add a "Show all" button centered below the radio buttons
    const showAllButtonDiv = document.createElement('div');
    const showAllButton = document.createElement('button');
    showAllButton.classList.add('btn');
    showAllButton.type = 'button';
    showAllButton.id = 'showAllButton';
    showAllButton.classList.add('btn-outline-primary');
    showAllButton.innerText = 'Show all';
    showAllButton.addEventListener('click', () => {
        console.log('show all');
        canvasCoursesDiv.innerHTML = '';

        canvasCoursesDiv.innerHTML = `
        <h5 class="mb-3">Ongoing courses</h5>
        `;
        canvasCoursesWithFutureTermEndAt.forEach( (course) => {
            renderCourseRadioInput(course);
        });
        
        canvasCoursesWithoutTermEndAt.forEach( (course) => {
            renderCourseRadioInput(course);
        });

        canvasCoursesWithPastTermEndAt.forEach( (course) => {
            renderCourseRadioInput(course);
        });
        console.log("show all button clicked, removing button");
    });
    showAllButtonDiv.appendChild(showAllButton);
    showAllButtonDiv.classList.add('d-flex');
    showAllButtonDiv.classList.add('justify-content-center');
    showAllButtonDiv.classList.add('mt-3');
    canvasCoursesDiv.appendChild(showAllButtonDiv);
}

async function handleFetchCanvasSections (courseCanvasId) {
    const canvasCoursesDiv = document.querySelector('#canvasCourses');
    // disable all the name="canvas_courses" radio buttons and show a spinner
    const canvasCoursesRadioButtons = canvasCoursesDiv.querySelectorAll('input[type="radio"][name="canvas_courses"]');
    canvasCoursesRadioButtons.forEach( (radioButton) => {
        radioButton.disabled = true;
    });
    const spinner = document.createElement('span');
    spinner.classList.add('spinner-border');
    spinner.classList.add('spinner-border-sm');
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-hidden', 'true');
    // fill the canvasSectionsDiv with a centered spinner
    spinner.classList.add('mx-auto');
    spinner.classList.add('d-block');

    const canvasSectionsDiv = document.querySelector('#canvasSections');
    canvasSectionsDiv.classList.remove('d-none');
    canvasSectionsDiv.innerHTML = '<p>Fetching Canvas sections...This may take a while.</p>';
    canvasSectionsDiv.appendChild(spinner);
    try {
        const [
            responseCanvasSections,
            responseCanvasStudents,
            responseDescription,
        ] = await getAvailableCanvasSectionsStudentsDescription(courseCanvasId);
        canvasSections = responseCanvasSections;
        canvasStudents = responseCanvasStudents;

        console.log(canvasSections);
        console.log(canvasStudents);

        if (responseDescription) {
            canvasCourses.forEach( (course) => {
                if (course.id.toString() !== courseCanvasId) {
                    return;
                }
                console.log(`responseDescription: ${responseDescription}`)
                course.description = responseDescription;
            });
        }

        if (!canvasSections || canvasSections.length === 0) {
            throw new Error('No Canvas sections found.');
        }
        const canvasSectionsDiv = document.querySelector('#canvasSections');
        canvasSectionsDiv.innerHTML = '';
        renderCanvasSectionsDivBody(canvasSections, canvasSectionsDiv);
        const submitButton = document.querySelector('#submitButton');
        submitButton.innerText = 'Add course';
        submitButton.addEventListener('click', () => {
            initiateCourseCreation();
        });
        
    } catch (error) {
        console.log(error);
        const canvasSectionsDiv = document.querySelector('#canvasSections');
        canvasSectionsDiv.innerHTML = '<p>No Canvas sections found.</p>';
    }
}

async function handleCreateCourseSubmit (selectedCourse) {
    const url = '/courses/';
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const formData = new FormData();
    formData.append('canvas_id', selectedCourse.id);
    formData.append('name', selectedCourse.name);
    if (selectedCourse.term) {
        formData.append('term', selectedCourse.term.name);
    }
    if (selectedCourse.start_at_date) {
        const date = selectedCourse.start_at_date.split('T')[0];
        formData.append('start_date', date);
    }
    if (selectedCourse.end_at_date) {
        const date = selectedCourse.end_at_date.split('T')[0];
        formData.append('end_date', date);
    }
    formData.append('description', selectedCourse.public_description || selectedCourse.description || '');
    formData.append('course_code', selectedCourse.course_code || '');
    formData.append('image_url', selectedCourse.image_download_url || '');
    console.log(...formData)
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        // stringify the formData object
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
    }
    return data;
}

function getSelectedCanvasStudents (sectionsCanvasIds, canvasStudents) {
    const selectedCanvasStudents = [];
    for (const student of canvasStudents) {
        if (!sectionsCanvasIds.includes(student.enrollments[0].course_section_id.toString())) {
            console.log(`Skipping ${student.sortable_name} because they are not in a selected section`);
            continue;
        }
        selectedCanvasStudents.push(student);
    }
    return selectedCanvasStudents;
}

async function initiateCourseCreation() {
    const selectedCourseInput = document.querySelector('input[type="radio"][name="canvas_courses"]:checked');
    const courseCanvasId = selectedCourseInput.value;
    const selectedCourse = canvasCourses.find( (course) => {
        return course.id.toString() === courseCanvasId.toString();
    });
    const courseCreationData = await handleCreateCourseSubmit(selectedCourse);
    const courseId = courseCreationData.course_id;
    if (!courseCreationData.success)
        return;

    const selectedSectionsInputs = document.querySelectorAll('input[type="checkbox"][name="canvas_sections"]:checked');
    const selectedSectionsCanvasIds = Array.from(selectedSectionsInputs).map( (input) => {
        return input.value;
    });
    console.log(`selectedSectionsCanvasIds: ${selectedSectionsCanvasIds}`);
    const selectedCanvasSections = canvasSections.filter( (section) => {
        return selectedSectionsCanvasIds.includes(section.id.toString());
    });
    console.log(`selectedCanvasSections: ${selectedCanvasSections}`);

    const selectedCanvasStudents = getSelectedCanvasStudents(selectedSectionsCanvasIds, canvasStudents);
    // add d-none to the canvasSectionsDiv
    const canvasSectionsDiv = document.querySelector('#canvasSections');
    canvasSectionsDiv.classList.add('d-none');

    const progressListDiv = createAllProgressItems();
    const progressDiv = document.querySelector('#progressDiv');
    progressDiv.classList.remove('d-none');
    progressDiv.appendChild(progressListDiv);
    const courseUpdateData = await orchistrateCourseElementsUpdateOrCreate (
        selectedCanvasSections, 
        selectedCanvasStudents,
        courseCanvasId, 
        courseId,
        updateProgressItem,
        );
    console.log(courseUpdateData);
    // add a "Go to course" button and a horizontal rule
    const hr = document.createElement('hr');
    hr.classList.add('my-3');
    progressDiv.appendChild(hr);
    const goToCourseButton = document.createElement('button');
    goToCourseButton.setAttribute('type', 'button');
    goToCourseButton.classList.add('btn', 'btn-primary', 'mx-auto');
    goToCourseButton.classList.add('d-block');
    goToCourseButton.innerText = 'Go to course';
    goToCourseButton.addEventListener('click', () => {
        window.location.href = `/courses/${courseId}`;
    });
    progressDiv.appendChild(goToCourseButton);
}

function handleAddCoursesManuallyBtn () {
    const canvasSectionsDiv = document.querySelector('#manualFormDiv');
    canvasSectionsDiv.classList.remove('d-none');
    document.querySelector('#chooseSyncMethodBlock').classList.add('d-none');
    // add an event listener to the submit button
    const submitButton = document.querySelector('#addCourseBtnSubmit');
    submitButton.addEventListener('click', (event) => {
        manualCourseCreateSubmit(event);
    }
    );
}

async function manualCourseCreateSubmit (event) {
    console.log("prevent default");
    event.preventDefault();
    // validate the form
    const form = document.querySelector('#manualForm');
    if (!form.checkValidity()) {
        console.log("form not valid");
        form.classList.add('was-validated');
        return;
    }

    const url = '/courses/';
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const formData = new FormData(form);
    // name is `course_code (term)`
    const name = `${formData.get('course_code')} (${formData.get('term')})`;
    formData.set('name', name);
    let imageFile;
    if (document.querySelector('#imageFileInput').files.length > 0) {
        console.log("image file found");
        // remove the image from the form data
        imageFile = formData.get('image');
        formData.delete('image');
    }
    formData.delete('csrfmiddlewaretoken');
    console.log(...formData)
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
        if (data.success) {
            if (!imageFile) {
                return data;
            }
            const courseId = data.course_id;
            const imageUploadData = await uploadImage(courseId, imageFile);
            console.log(imageUploadData);
            if (imageUploadData.success) {
                window.location.href = `/courses/${courseId}`;
            }
        } else {
            console.log(data.errors);
        }
    }
    catch (error) {
        console.log(error);
    }
    return data;
}

async function uploadImage (courseId, imageFile) {
    const url = `/courses/${courseId}/image/`;
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const formData = new FormData();
    formData.append('image', imageFile);
    console.log(...formData);
    let data;
    try {
        const response = await fetch(url, 
            {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                },
                body: formData,
            }
        );
        data = await response.json();
        console.log(data);
    }
    catch (error) {
        console.log(error);
    }
    return data;
}