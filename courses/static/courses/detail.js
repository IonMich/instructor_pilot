import { 
    orchistrateCourseElementsUpdateOrCreate, 
    getCanvasCourse,
    getAvailableCanvasSectionsStudentsDescription, 
} from './api.js';

import {
    renderCanvasSectionsDivBody,
} from './renderSectionsSelect.js';

import {
    createAllProgressItems,
    updateProgressItem,
} from './renderProgress.js';

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
                    console.log("form is not valid");
                    event.preventDefault()
                    event.stopPropagation()
                    event.stopImmediatePropagation()
                }
                form.classList.add('was-validated');
            }, false)
        })
})()

function createToastElement (message, message_type) {
    const toast = document.createElement('div');
    toast.classList.add('toast', 'fade', 'border-0');
    toast.setAttribute('role', 'alert');
    toast.setAttribute('data-bs-autohide', 'false');
    if (message_type === "success") {
        toast.classList.add('bg-success', 'text-white');
    } else if (message_type === "warning") {
        toast.classList.add('bg-warning', 'text-dark');
    } else if (message_type === "danger") {
        toast.classList.add('bg-danger', 'text-white');
    } else if (message_type === "info") {
        toast.classList.add('bg-primary', 'text-white');
    }
    toast.innerHTML = `
    <div class="d-flex">
        <div class="toast-body">
            ${message}
        </div>
        <button 
            type="button" class="btn-close btn-close-white me-2 m-auto" 
            data-bs-dismiss="toast" aria-label="Close">
        </button>
    </div>`;
    return toast;
}

const syncCourseForm = document.getElementById('syncCourseForm');

syncCourseForm.addEventListener("submit", async (event) => {
    console.log("prevent default");
    event.preventDefault();
    event.stopPropagation();

    const syncCourseButton = document.querySelector('button[name="sync_from_canvas"]');
    const buttonText = syncCourseButton.innerHTML;
    const courseId = syncCourseForm.querySelector('input[name="course_id"]').value;
    const courseCanvasId = syncCourseForm.querySelector('input[name="course_canvas_id"]').value;
    if (courseCanvasId === "") {
        console.log("courseCanvasId is empty");
    }
    const csrfToken = syncCourseForm.querySelector('input[name=csrfmiddlewaretoken]').value;

    // disable the add course button
    syncCourseButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Syncing...';
    syncCourseButton.disabled = true;

    const reloadPrompt = '<a href="/courses/' + courseId + '/" style="color: #fff; text-decoration: underline;">Reload</a> to see the changes.';

    let canvasCourse = null;
    let canvasSections = [];
    let canvasStudents = [];

    if (!syncCourseForm.checkValidity()) {
        console.log("form is not valid");
        // enable the add course button
        syncCourseButton.innerHTML = buttonText;
        syncCourseButton.disabled = false;
        return;
    }

    try {
        const modal = createCourseSyncModal();
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        const responseCanvasCourse = await getCanvasCourse(courseCanvasId);
        canvasCourse = responseCanvasCourse;
        const [
            responseCanvasSections,
            responseCanvasStudents,
            responseDescription,
        ] = await getAvailableCanvasSectionsStudentsDescription(courseCanvasId);
        canvasSections = responseCanvasSections;
        canvasStudents = responseCanvasStudents;

        if (responseDescription) {
            if (canvasCourse.id.toString() !== courseCanvasId) {
                return;
            }
            console.log(`responseDescription: ${responseDescription}`)
            canvasCourse.description = responseDescription;
        };
        if (!canvasSections || canvasSections.length === 0) {
            throw new Error('No Canvas sections found.');
        }
        if (!canvasStudents || canvasStudents.length === 0) {
            throw new Error('No Canvas students found.');
        }
        console.log("canvasCourse", canvasCourse);
        console.log("canvasStudents", canvasStudents);
        const autoSelectSections = tryAutoSelectSections(canvasSections);
        console.log("canvasSections", canvasSections);
        console.log("autoSelectSections", autoSelectSections);

        if (autoSelectSections != [] && autoSelectSections.length > 0) {
            const selectedCanvasSections = autoSelectSections;
            const selectedCanvasSectionsIds = selectedCanvasSections.map((section) => section.id);
            const selectedCanvasStudents = canvasStudents.filter(
                (student) => selectedCanvasSectionsIds.includes(
                    student.enrollments[0].course_section_id
                    ));
            console.log("selectedCanvasSections", selectedCanvasSections);
            console.log("selectedCanvasStudents", selectedCanvasStudents);
            initiateCourseSync(
                selectedCanvasSections, 
                selectedCanvasStudents,
                courseCanvasId,
                courseId,
            );
            
        } else {
            // render the canvasSectionsDiv
            console.log("render the canvasSectionsDiv for manual selection");
            const canvasSectionsDiv = document.querySelector('#canvasSections');
            canvasSectionsDiv.classList.remove('d-none');
            const progressDiv = document.querySelector('#progressDiv');
            progressDiv.innerHTML = '';
            // add title
            const title = document.createElement('p');
            title.innerHTML = 'Select the Canvas sections to sync:';
            canvasSectionsDiv.appendChild(title);
            renderCanvasSectionsDivBody(canvasSections, canvasSectionsDiv)
            // add event listeners to the submit button
            const submitButton = document.querySelector('#submitButton');
            submitButton.addEventListener('click', () => {
                // get the selected sections
                canvasSectionsDiv.classList.add('d-none');
                const selectedCanvasSections = getSelectedCanvasSections(canvasSections);
                const selectedCanvasSectionsIds = selectedCanvasSections.map((section) => section.id);
                console.log("selectedCanvasSectionsIds", selectedCanvasSectionsIds);
                const selectedCanvasStudents = canvasStudents.filter(
                    (student) => selectedCanvasSectionsIds.includes(
                        student.enrollments[0].course_section_id
                        ));
                console.log("selectedCanvasSections", selectedCanvasSections);
                console.log("selectedCanvasStudents", selectedCanvasStudents);
                initiateCourseSync(
                    selectedCanvasSections, 
                    selectedCanvasStudents,
                    courseCanvasId,
                    courseId,
                );
            });
        }
        
    } catch (error) {
        console.log(error);
        // enable the add course button
        syncCourseButton.innerHTML = buttonText;
        syncCourseButton.disabled = false;
        // show the error message
        const full_message = error.message + ' ' + reloadPrompt;
        const toast = createToastElement (full_message, "danger")
        const toastContainer = document.querySelector('#toast-container');
        toastContainer.appendChild(toast);
        console.log("toast", toast);
        var toastElement = new bootstrap.Toast(toast,
            {delay: 10000, autohide: false});
        toastElement.show();
        return;
    }

    // reset the button text and enable the button
    syncCourseButton.innerHTML = buttonText;
    syncCourseButton.disabled = false;
});

async function initiateCourseSync (
    selectedCanvasSections, 
    selectedCanvasStudents,
    courseCanvasId,
    courseId,
    ) {
    const progressListDiv = createAllProgressItems();
    // append the progressListDiv to the canvasSectionsDiv
    const progressDiv = document.querySelector('#progressDiv');
    progressDiv.innerHTML = '';
    progressDiv.appendChild(progressListDiv);
    await orchistrateCourseElementsUpdateOrCreate(
        selectedCanvasSections,
        selectedCanvasStudents,
        courseCanvasId,
        courseId,
        updateProgressItem,
    );
    // show a centered reload button at the bottom of the modal
    const reloadButton = document.createElement('button');
    reloadButton.classList.add('btn', 'btn-primary', 'mx-auto');
    reloadButton.setAttribute('type', 'button');

    reloadButton.innerHTML = 'Reload';
    reloadButton.addEventListener('click', () => {
        window.location.reload();
    });
    const modal = document.querySelector('#courseSyncModal');
    const modalFooter = modal.querySelector('.modal-footer');
    modalFooter.innerHTML = '';
    modalFooter.appendChild(reloadButton);
    modalFooter.classList.remove('d-none');
}

function getSelectedCanvasSections (canvasSections) {
    // get the selected sections
    const canvasSectionsInputs = document.querySelectorAll('input[name="canvas_sections"]');
    console.log("canvasSectionsInputs", canvasSectionsInputs);
    if (!canvasSectionsInputs || canvasSectionsInputs.length === 0) {
        throw new Error('No Canvas sections found.');
    }
    const selectedCanvasSectionsInputs = Array.from(canvasSectionsInputs).filter((input) => input.checked);
    console.log("selectedCanvasSectionsInputs", selectedCanvasSectionsInputs);
    if (!selectedCanvasSectionsInputs || selectedCanvasSectionsInputs.length === 0) {
        throw new Error('No Canvas sections selected.');
    }
    let selectedCanvasSections = [];
    for (const selectedCanvasSectionsInput of selectedCanvasSectionsInputs) {
        const selectedCanvasSectionId = parseInt(selectedCanvasSectionsInput.value);
        const selectedCanvasSection = canvasSections.find((section) => section.id === selectedCanvasSectionId);
        if (!selectedCanvasSection) {
            throw new Error(`Canvas section with id ${selectedCanvasSectionId} not found.`);
        }
        selectedCanvasSections.push(selectedCanvasSection);
    }
    return selectedCanvasSections;
}


function createCourseSyncModal () {
    // create a bootstrap modal that can hold the update progress items
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.classList.add('fade');
    modal.setAttribute('id', 'courseSyncModal');
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'courseSyncModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('data-bs-backdrop', 'static');
    modal.setAttribute('data-bs-keyboard', 'false');
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="courseSyncModalLabel">Syncing Course</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div id="canvasSections" class="d-none">
                    </div>
                    <div id="progressDiv">
                        <p class="text-center">Fetching course information. This may take a while.</p>
                        <div class="d-flex justify-content-center">
                            <div class="spinner-border spinner-border-sm" role="status">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer d-none">
                </div>
            </div>
        </div>
    `;
    return modal;

}


function tryAutoSelectSections (canvasSections) {
    // if only the already added sections are have manualStudentCount > 0, 
    // then auto select all added sections
    const addedSections = canvasSections.filter((section) => section.alreadyAdded)
    const sectionsWithManualStudentCount = canvasSections.filter((section) => section.manual_total_students > 0);
    // if the two arrays are identical (same section.id), then auto select all added sections
    const addedSectionsIds = addedSections.map((section) => section.id);
    const sectionsWithManualStudentCountIds = sectionsWithManualStudentCount.map((section) => section.id);
    console.log("addedSectionsIds", addedSectionsIds);
    console.log("addedSectionsWithManualStudentCountIds", sectionsWithManualStudentCountIds);
    // compare the the sets of ids
    const addedSectionsIdsSet = new Set(addedSectionsIds);
    const sectionsWithManualStudentCountIdsSet = new Set(sectionsWithManualStudentCountIds);
    const sectionsIdsSetDifference = new Set(
        [...sectionsWithManualStudentCountIdsSet].filter(x => !addedSectionsIdsSet.has(x)));

    if (sectionsIdsSetDifference.size === 0) {
        // added sections are the only sections worth adding
        // so don't bother the user with the selection
        return addedSections;
    } else {
        return [];
    }
}
        

// get all buttons with class="assignment-canvas-btn"
// and add an event listener to the mouseover event
// the button is contained in an anchor tag with href attribute. Change the href attribute
// to the assignment canvas url. The anchor tag is not the direct parent of the button
// When the mouse leaves the button, change the href attribute back to the assignment detail url

const assignmentCanvasBtns = document.querySelectorAll('.assignment-canvas-btn');

if (assignmentCanvasBtns) {
    assignmentCanvasBtns.forEach((btn) => {
        const btnDiv = btn.parentElement;
        const assignmentCanvasAnchor = btn.parentElement.parentElement.parentElement;
        const assignmentDetailUrl = assignmentCanvasAnchor.href;
        const assignmentCanvasUrl = btn.dataset.assignmentCanvasUrl;
        btnDiv.addEventListener('mouseover', (event) => {
            // change the href attribute of the anchor tag
            assignmentCanvasAnchor.href = assignmentCanvasUrl;
            // make the anchor tag open in a new tab
            assignmentCanvasAnchor.target = "_blank";
            console.log(assignmentCanvasAnchor.href);
        });
        btnDiv.addEventListener('mouseout', (event) => {
            // change the href attribute of the anchor tag
            assignmentCanvasAnchor.href = assignmentDetailUrl;
            // make the anchor tag open in the same tab
            assignmentCanvasAnchor.target = "_self";
            console.log(assignmentCanvasAnchor.href);
        });
    });
}


$('button[data-bs-toggle="pill"]').on('show.bs.tab', function (e) {
    console.log("New tab activated. Saving to local storage.");
    localStorage.setItem('activePill', $(e.target).attr('data-bs-target'));
});

var activePill = localStorage.getItem('activePill');
if(activePill){
    const query = 'button[data-bs-target="' + activePill + '"]';
    console.log(query);
    const activeTab = document.querySelector(query);
    console.log(activeTab);
    if (activeTab) {
        activeTab.click();
    }
}