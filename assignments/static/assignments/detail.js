import { 
    render_version_modal,
    getVersionsFromSubmissions,
} from './renderVersionModal.js';

(function () {
    'use strict'
  
    // apply custom Bootstrap validation styles to forms with the .needs-validation class
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    var forms = document.querySelectorAll('.needs-validation')

    // Loop over them and prevent submission
    Array.prototype.slice.call(forms)
        .forEach(function (form) {
            console.log("form", form);
            form.addEventListener('submit', function (event) {
                if (!form.checkValidity()) {
					console.log("form is not valid");
					// prevent the default POST request that a submitted form sends to the server
                    event.preventDefault()
                    // prevent the event from triggering actions in parent elements
                    event.stopPropagation()
                    // do not trigger other event handlers that listen on this event
                    event.stopImmediatePropagation()
                } else {
                    console.log("form is client-side valid");
                }
                // `was-validated` does not mean that the form is valid. 
                // It just means that JS has checked whether it is valid or not.
                // This allows Bootstrap green/red validity indicators to be displayed on inputs
                form.classList.add('was-validated')
            }, false)
        })
})();

const uploadPDFsForm = document.getElementById('uploadPDFsForm');

if (uploadPDFsForm) {
    uploadPDFsForm.addEventListener("submit", (event) =>
    uploadPDFs(event, uploadPDFsForm));
};

const uploadMorePDFsForm = document.getElementById('uploadMorePDFsForm');

if (uploadMorePDFsForm) {
    uploadMorePDFsForm.addEventListener("submit", (event) => 
    uploadPDFs(event, uploadMorePDFsForm));
};

function uploadPDFs (event, form) {
    console.log("prevent default");
    event.preventDefault();
    
    const formData = new FormData(form);

    const uploadPDFsButton = form.querySelector('button[name="submit-upload"]');
    const buttonText = uploadPDFsButton.innerHTML;
    // Disable the upload PDFs button
    uploadPDFsButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
    uploadPDFsButton.disabled = true;
    
    formData.forEach((value, key) => {
        console.log(key, value);
    });

    // append the button name to the form data
    formData.append('submit-upload', 'Upload');
    // Fetch request to upload PDFs
    fetch(window.location.href, {
        method: "POST",
        headers: {
            "X-CSRFToken": formData.get('csrfmiddlewaretoken'),
        },
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        console.log("data", data);
        if (data.message_type === "success") {
            if ( window.history.replaceState ) {
                window.history.replaceState( null, null, window.location.href );
            }
            window.location = window.location.href;
        } else {
            // Enable the upload PDFs button
            uploadPDFsButton.innerHTML = buttonText;
            uploadPDFsButton.disabled = false;
            // clear the bootstrap validation classes
            form.classList.remove('was-validated');
            // Display error message as a toast
            const toast = createToastElement(data.message, data.message_type);
            // append the toast to the toast-container
            const toastContainer = document.querySelector('#toast-container');
            toastContainer.appendChild(toast);
            console.log("toast", toast);
            var toastElement = new bootstrap.Toast(toast,
                {delay: 10000, autohide: false});
            toastElement.show();
        }})
    .catch(error => {
        console.log("error", error);
        // Enable the upload PDFs button
        uploadPDFsButton.innerHTML = buttonText;
        uploadPDFsButton.disabled = false;
        // clear the bootstrap validation classes
        form.classList.remove('was-validated');
        // show toast
        const toast = createToastElement(
            "An error occurred while uploading the PDFs. Please try again.",
            "danger"
        );
        // append the toast to the toast-container
        const toastContainer = document.querySelector('#toast-container');
        toastContainer.appendChild(toast);
        console.log("toast", toast);
        var toastElement = new bootstrap.Toast(toast,
            {delay: 10000, autohide: false});
        toastElement.show();
    });

}

const buttonToggleIdentifyInput = document.getElementById('btn-edit-identify');
if (buttonToggleIdentifyInput) {
    // initialize the checked pages
    initializeCheckedPages();
    buttonToggleIdentifyInput.addEventListener('click', function(event) {
        const collapsibleDiv = document.getElementById('collapsible-identify');
        // set toggle grid-template-rows between 0fr (hidden) and 1fr (shown)
        const gridTemplateRows = collapsibleDiv.style.gridTemplateRows;
        console.log("gridTemplateRows", gridTemplateRows);
        if (gridTemplateRows !== '1fr') {
            collapsibleDiv.style.gridTemplateRows = '1fr';
        } else {
            collapsibleDiv.style.gridTemplateRows = '0fr';
        }
    });
}

async function getIdentifyPages() {
    const url_preferences = "/profile/preferences/";
    const options = {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        }
    };
    let identifyPages = null;
    try {
        const response = await fetch(url_preferences, options);
        const data = await response.json();
        identifyPages = data.identify_pages;
    } catch (error) {
        console.log(error);
    }
    return identifyPages;
}

async function getVersioningPages() {
    const url_preferences = "/profile/preferences/";
    const options = {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        }
    };
    let versioningPages = null;
    try {
        const response = await fetch(url_preferences, options);
        const data = await response.json();
        versioningPages = data.versioning_pages;
    } catch (error) {
        console.log(error);
    }
    return versioningPages;
}

const courseId = JSON.parse(document.getElementById('course_id').textContent);
const assignmentId = JSON.parse(document.getElementById('assignment_id').textContent);

// function to set grade inputs step size from checked_pages
async function initializeCheckedPages() {
    let checked_pages = await getIdentifyPages();
    console.log("checked_pages", checked_pages);
    console.log("course_id", courseId, "assignment_id", assignmentId);
    let checkedPages;
    let default_type;
    if (checked_pages && checked_pages[courseId] && checked_pages[courseId][assignmentId]) {
        checkedPages = checked_pages[courseId][assignmentId];
        default_type = null;
    } else {
        if (checked_pages && checked_pages[courseId] && checked_pages[courseId]["default"]) {
            checkedPages = checked_pages[courseId]["default"];
            default_type = "course";
        } else if (checked_pages && checked_pages["default"]) {
            checkedPages = checked_pages["default"];
            default_type = "user";
        } else {
            checkedPages = [0,];
            default_type = "global";
        }
        // the checkedPages is set here to a default set of checked pages
    }
    console.log("Pages to check:", checkedPages, "default_type:", default_type);
    // initialize the text describing the checked pages to say `their ID on pages ${checkedPages}`
    const checkedPagesText = document.getElementById('identify-method-text');
    if (checkedPages.length === 1) {
        // convert the page number to 1-indexed
        checkedPagesText.innerHTML = `their ID on page ${checkedPages[0] + 1}`;
    } else if (checkedPages.length > 1) {
        // convert the page numbers to 1-indexed
        checkedPagesText.innerHTML = `their ID on pages ${checkedPages.map(page => page + 1).join(', ')}`;
    } else {
        checkedPagesText.innerHTML = `their ID`;
    }
    // select inputs whose name starts with "page-selected-"
    // names are created with forloop.counter, so they are 1-indexed
    const pageCheckInputs = document.querySelectorAll('input[name^="page-selected-"]');
    pageCheckInputs.forEach(input => {
        // get the page number from the input name
        let pageNumber = input.name.split('-')[2];
        pageNumber = parseInt(pageNumber);
        console.log(pageNumber);
        // if the page number is in checkedPages, set the input to checked
        // We subtract 1 from the page number because the checkedPages is 0-indexed
        if (checkedPages.includes(Math.max(pageNumber - 1, 0))) {
            input.checked = true;
            console.log("checked");
        }
    });
}

async function initializeVersioningCheckedPages() {
    let checked_pages = await getVersioningPages();
    console.log("checked_pages", checked_pages);
    console.log("course_id", courseId, "assignment_id", assignmentId);
    let checkedPages;
    let default_type;
    if (checked_pages && checked_pages[courseId] && checked_pages[courseId][assignmentId]) {
        checkedPages = checked_pages[courseId][assignmentId];
        default_type = 'assignment';
    } else {
        if (checked_pages && checked_pages[courseId] && checked_pages[courseId]["default"]) {
            checkedPages = checked_pages[courseId]["default"];
            default_type = "course";
        } else if (checked_pages && checked_pages["default"]) {
            checkedPages = checked_pages["default"];
            default_type = "user";
        } else {
            checkedPages = [0,];
            default_type = "global";
        }
        // the checkedPages is set here to a default set of checked pages
    }
    console.log("Pages to check:", checkedPages, "default_type:", default_type);
    // initialize the text describing the checked pages to say `their ID on pages ${checkedPages}`
    // const checkedPagesText = document.getElementById('versioning-method-text');
    // if (checkedPages.length === 1) {
    //     // convert the page number to 1-indexed
    //     checkedPagesText.innerHTML = `on page ${checkedPages[0] + 1}`;
    // } else if (checkedPages.length > 1) {
    //     // convert the page numbers to 1-indexed
    //     checkedPagesText.innerHTML = `on pages ${checkedPages.map(page => page + 1).join(', ')}`;
    // } else {
    //     checkedPagesText.innerHTML = "";
    // }
    // select inputs whose name starts with "page-selected-"
    // names are created with forloop.counter, so they are 1-indexed
    const pageCheckInputs = document.querySelectorAll('input[name^="versioningpage-selected-"]');
    pageCheckInputs.forEach(input => {
        // get the page number from the input name
        let pageNumber = input.name.split('-')[2];
        pageNumber = parseInt(pageNumber);
        console.log(pageNumber);
        // if the page number is in checkedPages, set the input to checked
        // We subtract 1 from the page number because the checkedPages is 0-indexed
        if (checkedPages.includes(Math.max(pageNumber - 1, 0))) {
            input.checked = true;
            console.log("checked");
        }
    });
}

async function handleDefaultVersioningPages(event) {
    // stop the default action of the button
    event.preventDefault();

    const versioningForm = document.getElementById('initiateVersioningForm');
    const csrfToken = versioningForm.querySelector("input[name='csrfmiddlewaretoken']").value;

    // get all the checkboxes in the form
    const checkboxes = versioningForm.querySelectorAll("input[type='checkbox']");
    // get the indices of the checked checkboxes
    let page_indices = [];
    for (let i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) {
            page_indices.push(i);
        }
    }
    console.log(page_indices);
    const url = "/profile/preferences/edit/";
    const data = {
        "versioning_pages": {
            [courseId]: {
                [assignmentId]: page_indices
            }
        }
    };

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        body: JSON.stringify(data)
    };

    try {
        const response = await fetch(url, options);
        const responseJSON = await response.json();
        console.log(responseJSON);
        // if the message is success
        if (responseJSON['success']) {
            // create a toast
            const toast = createToastElement(
                "Default pages for versioning submisssions updated successfully.",
                "success"
            );
            // append the toast to the toast-container
            const toastContainer = document.querySelector('#toast-container');
            toastContainer.appendChild(toast);
            console.log("toast", toast);
            let toastElement = new bootstrap.Toast(toast,
                {delay: 10000, autohide: false});
            toastElement.show();
        }
    } catch (error) {
        // create a toast
        const toast = createToastElement(
            "Default pages for versioning submissions could not be updated.",
            "danger"
        );
        // append the toast to the toast-container
        const toastContainer = document.querySelector('#toast-container');
        toastContainer.appendChild(toast);
        console.log("toast", toast);
        let toastElement = new bootstrap.Toast(toast,
            {delay: 10000, autohide: false});
        toastElement.show();
    }
}

const identifyStudentsForm = document.getElementById('identifyStudentsForm');
const versioningSubmissionsForm = document.getElementById('versioningSubmissionsForm');

if (identifyStudentsForm) {
    identifyStudentsForm.addEventListener("submit", (event) => 
    identifyStudents(event, identifyStudentsForm));
};

function identifyStudents (event, form) {
    console.log("prevent default");
    event.preventDefault();
    const buttonName = "submit-classify"
	const buttonQuery = `button[name="${buttonName}"]`
	const submitButton = form.querySelector(buttonQuery);
    const buttonText = submitButton.innerHTML;
    const spinnerSpan = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';

    submitButton.innerHTML = `${spinnerSpan} Identifying...`;
    submitButton.disabled = true;
	
	const formData = new FormData(form);
	// append the button name to the form data
    formData.append(buttonName, 'Classify');
    // convert entries that start with page-selected-{page_number} to a single entry pages_selected with a list of page numbers
    // For example, if the form data contains the following entries:
    // page-selected-2: 1
    // page-selected-4: 1
    // then convert this to a single entry:
    // pages_selected: [2, 4]
    const numbers_selected = Array.from(formData.keys()).filter(key => key.startsWith('page-selected-')).map(key => key.split('-')[2]);
    console.log("numbers_selected", numbers_selected);
    formData.delete('pages_selected');
    // append the JSON-stringified list of page numbers to the form data
    formData.append('pages_selected', JSON.stringify(numbers_selected));
    // delete all entries that start with page-selected-
    Array.from(formData.keys()).filter(key => key.startsWith('page-selected-')).forEach(key => formData.delete(key));

    // append the crop regions to the form data for each selected page
    // get the crop regions from the cropBoxData variable
    // cropBoxData is a dictionary with keys as 0-indexed page numbers and values 
    // as crop regions (x, y, width, height) in natural image coordinates
    const cropBoxDataCopy = new Map(JSON.parse(JSON.stringify(Array.from(cropBoxData))));
    const cropRegions = {};
    for (const pageNumber of numbers_selected) {
        console.log("pageNumber", pageNumber);
        // convert the page number to 0-indexed
        cropRegions[pageNumber] = cropBoxDataCopy.get(pageNumber-1);
        console.log("cropRegions", cropRegions);
    }
    // convert all values of cropRegions to percentages using region["naturalWidth"] and region["naturalHeight"]
    // get the natural width and height of the image
    for (const [pageNumber, region] of Object.entries(cropRegions)) {
        if (!region) {
            continue;
        }
        const naturalWidth = region["naturalWidth"];
        const naturalHeight = region["naturalHeight"];
        // convert the x, y, width, height to percentages
        // store up to 2 decimal places
        region["x"] = (region["x"] / naturalWidth * 100).toFixed(2);
        region["y"] = (region["y"] / naturalHeight * 100).toFixed(2);
        region["width"] = (region["width"] / naturalWidth * 100).toFixed(2);
        region["height"] = (region["height"] / naturalHeight * 100).toFixed(2);
    }
    // remove the naturalWidth and naturalHeight keys from the cropRegions
    for (const [pageNumber, region] of Object.entries(cropRegions)) {
        if (!region) {
            continue;
        }
        delete region["naturalWidth"];
        delete region["naturalHeight"];
    }
    // append the JSON-stringified crop regions to the form data
    formData.append('crop_box', JSON.stringify(cropRegions));


	// ADAPT url if the fetch request is submitted at a different url than the current page.
	const url = window.location.href
	fetch(url, {
        method: "POST",
        headers: {
            "X-CSRFToken": formData.get('csrfmiddlewaretoken'),
        },
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        console.log("data", data);
                // ADAPT if the server JSON response does not contain a status key
        if (data.message_type !== "danger") {
            // design that makes sure that form will not be resubmitted
            // even after page reload, or back button is pressed
            if ( window.history.replaceState ) {
                window.history.replaceState( null, null, window.location.href );
            }
            window.location = window.location.href;
        } else {
            // Enable the upload PDFs button
            console.log("handled server error", data.message);
            submitButton.innerHTML = buttonText;
            submitButton.disabled = false;
            // Display error message as a Toast
            const toast = createToastElement(data.message, data.message_type);
            // append the toast to the toast-container
            const toastContainer = document.querySelector('#toast-container');
            toastContainer.appendChild(toast);
            console.log("toast", toast);
            var toastElement = new bootstrap.Toast(toast,
                {delay: 10000, autohide: false});
            toastElement.show();
        }})
    .catch(error => {
        console.log("caught JS error", error);
        // Enable the upload PDFs button
        submitButton.innerHTML = buttonText;
        submitButton.disabled = false;
        // Display error message as an alert
                
    });
};

const uploadToCanvasModalForm = document.getElementById('syncToCanvasForm');

const retrieveCanvasInfoButton = document.getElementById('btnCheckCanvasAssignmentStatus');

if (retrieveCanvasInfoButton) {
    retrieveCanvasInfoButton.addEventListener('click', async function(event) {
        event.preventDefault();
        // spinnerCanvasAssignmentStatus
        const spinner = document.getElementById('spinnerCanvasAssignmentStatus');
        spinner.classList.remove('d-none');
        let data;
        try {
            const url = `/courses/${courseId}/assignments/${assignmentId}/canvas_info/`;
            const options = {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                }
            };
            const response = await fetch(url, options);
            data = await response.json();
        } catch (error) {
            console.log(error);
        }
        console.log(data);
        spinner.classList.add('d-none');
        if (!data) {
            return;
        }
        const canvasAssignment = data.canvas_assignment;
        const canvasGradeableStudents = data.canvas_gradeable_students;
        const canvasGradedSubs = data.canvas_graded_subs;
        const canvasUngradedSubs = data.canvas_ungraded_subs;
        const dbAssignmentName = data.db_assignment_name;
        const dbAssignmentMaxPoints = data.db_assignment_max_points;
        const dbStudentCount = data.db_course_student_count;
        const dbSubsCount = data.db_subs;
        const dbGradedSubsCount = data.db_graded_subs;
        // add info to ul canvas-info-list: name, workflow_state, points_possible
        const canvasInfoList = document.getElementById('canvas-info-list');
        canvasInfoList.innerHTML = `
            <li class="list-group-item text-center bg-secondary text-white">
                Canvas Information
            </li>
            <li class="list-group-item">
                <strong>Assignment Name:</strong> ${canvasAssignment.name}
            </li>
            <li class="list-group-item">
                <strong>Workflow State:</strong> ${canvasAssignment.workflow_state}
            </li>
            <li class="list-group-item">
                <strong>Points Possible:</strong> ${canvasAssignment.points_possible}
            </li>
            <li class="list-group-item">
                <strong>Gradeable Students:</strong> ${canvasGradeableStudents.length}
            </li>
            <li class="list-group-item">
                <strong>&nbsp;&nbsp;&nbsp;&nbsp;Graded:</strong> ${canvasGradedSubs.length}
            </li>
            <li class="list-group-item">
                <strong>&nbsp;&nbsp;&nbsp;&nbsp;Ungraded:</strong> ${canvasUngradedSubs.length}
            </li>
        `;
        const dbInfoList = document.getElementById('db-info-list');
        dbInfoList.innerHTML = `
            <li class="list-group-item text-center bg-secondary text-white">
                This App
            </li>
            <li class="list-group-item">
                <strong>Assignment Name:</strong> ${dbAssignmentName}
            </li>
            <li class="list-group-item">
                <strong>Workflow State:</strong> N/A
            </li>
            <li class="list-group-item">
                <strong>Points Possible:</strong> ${dbAssignmentMaxPoints}
            </li>
            <li class="list-group-item">
                <strong>Gradeable Students:</strong> ${dbStudentCount}
            </li>
            <li class="list-group-item">
                <strong>Graded Submissions:</strong> ${dbGradedSubsCount}
            </li>
            <li class="list-group-item">
                <strong>Ungraded Submissions:</strong> ${dbSubsCount - dbGradedSubsCount}
            </li>
        `;
        // remove the d-none class from the canvas-info-div
        const canvasInfoDiv = document.getElementById('canvas-info-container');
        canvasInfoDiv.classList.remove('d-none');
    });

}


if (uploadToCanvasModalForm) {
    uploadToCanvasModalForm.addEventListener("submit", (event) => 
    uploadToCanvas(event, uploadToCanvasModalForm));
};

function uploadToCanvas (event, form) {
    console.log("prevent default");
    console.log("form", form);
    event.preventDefault();
    const buttonName = "submit-sync-to";
    const buttonQuery = `button[name="${buttonName}"]`;
    console.log("buttonQuery", buttonQuery);
    const submitButton = form.querySelector(buttonQuery);
    console.log("submitButton", submitButton);
    const buttonText = submitButton.innerHTML;
    const spinnerSpan = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';

    submitButton.innerHTML = `${spinnerSpan} Posting...`;
    submitButton.disabled = true;

    const formData = new FormData(form);
    // append the button name to the form data
    formData.append(buttonName, 'Upload to Canvas');
    
    const url = window.location.href
    fetch(url, {
        method: "POST",
        headers: {
            "X-CSRFToken": formData.get('csrfmiddlewaretoken'),
        },
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        console.log("data", data);
        if (data.message_type !== "danger") {
            if ( window.history.replaceState ) {
                window.history.replaceState( null, null, window.location.href );
            }
        } else {
            console.log("handled server error", data.message);   
        }
        // close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('syncToModal'));
        modal.hide();
        submitButton.innerHTML = buttonText;
        submitButton.disabled = false;
        // Display error message as a Toast
        const toast = createToastElement(data.message, data.message_type);
        // append the toast to the toast-container
        const toastContainer = document.querySelector('#toast-container');
        toastContainer.appendChild(toast);
        console.log("toast", toast);
        var toastElement = new bootstrap.Toast(toast,
            {delay: 10000, autohide: false});
        toastElement.show();
        
    })
    .catch(error => {
        console.log("caught JS error", error);
        // Enable the upload PDFs button
        submitButton.innerHTML = buttonText;
        submitButton.disabled = false;
    });
};
            
            


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

function syncSubsFromCanvas(event) {
    event.preventDefault();
    // get parent form
    const form = this.closest('form');
    // get csrf token from input element of form
    const csrfToken = form.querySelector('input[name="csrfmiddlewaretoken"]').value;
    console.log(csrfToken);    
    // disable button
    this.disabled = true;
    // add spinner to button
    this.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Syncing...`;
    
    // ajax request to sync subs
    fetch(window.location.href, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRFToken": csrfToken,
        },
        body: "submit-sync-from=submit-sync-from"
    })
    .then(response => response.json())
    .then(data => {
        //  the data object contains a submissions object whose entries have the following keys:
        // [pk, canvas_id, canvas_utl]
        // pk is the primary key of the submission in the database
        // canvas_id is the id of the submission on Canvas
        // canvas_url is the url of the submission on Canvas
        
        // the boby contains a row element with the class "submissions-row" which contains 
        // submissions as cards. The cards have a data attribute "data-pk" which is the primary key
        // of the submission in the database. We can use this to find the card for a submission
        // and update the div-card-tools to add a link to the submission on Canvas.

        // get the row element
        const row = document.querySelector('#submissions-row');
        console.log(data.submissions);
        // loop over submissions
        for (const sub of data.submissions) {
            if (!sub.canvas_url) {
                continue;
            }
            // get the card for the submission
            const card = row.querySelector(`.card[data-pk="${sub.pk}"]`);
            // if the card does not exist, skip it
            if (!card) {
                continue;
            }
            // update the card and append success message
            //  append success message in form. Mention also the number of submissions that are and are not synced
            // get the counts. If undefined, set to 0
            updateCard(card, sub);
        }

        // remove spinner and enable button
        btnFetch.textContent = `Reloading...`;
        btnFetch.disabled = false;
        // append success message in form
        appendSuccessMsg(form, data.submissions);
        // delay by 2 seconds and then reload the page
        setTimeout(() => {
            if ( window.history.replaceState ) {
                window.history.replaceState( null, null, window.location.href );
            }
            window.location = window.location.href;
        }
        , 2000);

    })
    .catch(error => {
        console.log("caught JS error", error);
        // remove spinner and enable button
        btnFetch.textContent = `Sync`;
        btnFetch.disabled = false;
    }
    );
};

function appendSuccessMsg(form, subs) {
    // get the number of submissions that are synced and not synced
    let syncedCount = 0;
    let notSyncedCount = 0;
    for (const sub of subs) {
        if (sub.canvas_url) {
            syncedCount++;
        } else {
            notSyncedCount++;
        }
    }
    const closeBtn = `<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    let msg;
    let msgType;
    if (notSyncedCount === 0) {
        msg = `All ${syncedCount} submissions have been synced from Canvas!`;
        msgType = "success";
    } else if (syncedCount !== 0) {
        msg = `${syncedCount} submissions are now synced from Canvas. ${notSyncedCount} submissions were not synced from Canvas.`;
        msgType = "warning";
    } else {
        msg = `No submissions were synced from Canvas. ${notSyncedCount} submissions were not synced from Canvas.`;
        msgType = "danger";
    }
    // append "Reloading page..." to msg
    msg += ` Reloading page...`;
    const alertHtml = `<div class="alert alert-${msgType} alert-dismissible fade show mt-1" role="alert">
            ${msg}
            ${closeBtn}
        </div>`;
    form.insertAdjacentHTML('beforeend', alertHtml);
}

const btnFetch = document.getElementById('btnFetch');
if (btnFetch) {
    btnFetch.addEventListener('click', syncSubsFromCanvas);
}

// in the Post to Canvas modal, when the user selects the option "specific" in the submission_sync_option
// show the select element to select the submission(s) to sync
function showSelectSubs(event) {
    const selectSubs = document.getElementById('specific-submission-select-div');
    console.log(event);
    if (event.target.value === 'specific') {
        selectSubs.classList.remove('d-none');
    } else {
        selectSubs.classList.add('d-none');
    }
}

// add event listener to the specific-submission-select element of the Post to Canvas modal
// when the user selects the option "specific" in the submission_sync_option
// show the select element to select the submission(s) to sync
const selectSyncOption = document.getElementsByName('submission_sync_option');
if (selectSyncOption) {
    selectSyncOption.forEach(el => el.addEventListener('change', showSelectSubs));
}

// on hover of a submission card, show delete button at top right
// on click of delete button, show confirmation modal
// the button has an attribute data-pk which is the primary key of the submission
const btnDeleteSub = document.querySelectorAll('.btn-delete-sub');
for (const btn of btnDeleteSub) {
    btn.addEventListener('click', function(event) {
        event.preventDefault();
        const pk = this.getAttribute('data-pk');
        const form = deleteModal.querySelector('form');
        const input = form.querySelector('input[name="pk"]');
        input.value = pk;
        const modalLabel = deleteModal.querySelector('.modal-title');
        // delete all the modal carousel items
        const deleteCarouselInner = deleteModal.querySelector('.carousel-inner');
        const deleteCarouselItems = deleteCarouselInner.querySelectorAll('.carousel-item');
        for (const item of deleteCarouselItems) {
            item.remove();
        }
        const card = this.closest('.card');
        
        const cardCarouselItems = card.querySelectorAll('.carousel-item');
        console.log(cardCarouselItems);
        for (const item of cardCarouselItems) {
            // get the image element
            const img = item.querySelector('img');
            // copy the image element
            const imgCopy = img.cloneNode();
            // append the image element to the modal carousel inner
            const carouselItem = document.createElement('div');
            // add the class carousel-item to the carousel item
            carouselItem.classList.add('carousel-item');

            // if the item the first direct child of the carousel inner, add the active class
            if (item === cardCarouselItems[0]) {
                carouselItem.classList.add('active');
            }
            carouselItem.appendChild(imgCopy);
            deleteCarouselInner.appendChild(carouselItem);
        }

        // set the modal title to the title of the submission
        const title = card.querySelector('.card-title').textContent;
        const bsDeleteModal = bootstrap.Modal.getOrCreateInstance(deleteModal);
        modalLabel.textContent = title;
        // show the modal
        console.log(deleteModal,bsDeleteModal);
        bsDeleteModal.show();
        // pause the carousel of all cards
        for (const cardCarousel of bsCarousels) {
            cardCarousel.pause();
        }

    });
}

// on click of the delete button in the delete modal, submit the form
function deleteSub (event) {
    event.preventDefault();
    const bsDeleteModal = bootstrap.Modal.getOrCreateInstance(deleteModal);
    const form = document.getElementById('delete-sub-form');
    const csrfToken = form.querySelector('input[name="csrfmiddlewaretoken"]').value;
    const pk = form.querySelector('input[name="pk"]').value;
    // the url to delete the submission is the url of the page with submissions/<pk>/delete/
    const url = window.location.href + `submissions/${pk}/delete/`;
    // ajax request to delete the submission
    fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRFToken": csrfToken,
        },
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        // if message is success, remove the card from the page
        if (data.message === 'success') {
            const card = document.querySelector(`.card[data-pk="${pk}"]`);
            // remove the event listener for this card
            const btn = card.querySelector('.btn-delete-sub');
            card.remove();
            // shift all remaining cards in the bootstrap grid to the left
            const cards = document.querySelectorAll('.card');
            
            // hide the modal
            bsDeleteModal.hide();
        }
    });
}


function showCardTools(event) {
    console.log("showing card tools");
    const divTools = this.querySelectorAll('.div-card-tools');
    // if d-none class is present, remove it
    for (const div of divTools) {
        if (div.classList.contains('d-none')) {
            div.classList.remove('d-none');
        }
    }

    console.log(divTools);
}

function hideCardTools(event) {
    console.log("hiding card tools");
    const divTools = this.querySelectorAll('.div-card-tools');
    // if d-none class is not present, add it
    for (const div of divTools) {
        if (!div.classList.contains('d-none')) {
            div.classList.add('d-none');
        }
    }

    console.log(divTools);
}

function updateCard(card, sub) {
    const deleteSubsBtn = card.querySelector('.btn-delete-sub');
    // get parent div of the delete button
    const divTools = deleteSubsBtn.closest('.div-card-tools');
    // get the footer of the card
    const cardFooter = card.querySelector('.card-footer');
    // check if the card already has a link to the submission on Canvas with the class "btn-canvas"
    const btnCanvas = card.querySelector('.btn-canvas');
    if (btnCanvas) {
        // if the card already has a link to the submission on Canvas, update the href
        btnCanvas.href = sub.canvas_url;
    } else {
        // if the card does not have a link to the submission on Canvas, create one and append it to the footer
        const btnCanvas = document.createElement('a');
        btnCanvas.classList.add('btn', 'btn-sm', 'btn-outline-primary', 'btn-canvas');
        btnCanvas.href = sub.canvas_url;
        btnCanvas.target = '_blank';
        btnCanvas.innerHTML = `<img src="https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://canvas.instructure.com&size=48" style="width: 16px; height: 16px; filter: grayscale(100%);">`;
        // prepend the button to the div containing the tools
        divTools.prepend(btnCanvas);
    }
    // also change background color of card footer to deep green to indicate that the submission has been synced
    cardFooter.style.background = 'green';
    // and the text color to white
    cardFooter.classList.add('text-white');
}


// add event listener for hover on submission cards
let cards = document.querySelectorAll('.card');
for (const card of cards) {
    card.addEventListener('mouseenter', showCardTools);
    card.addEventListener('mouseleave', hideCardTools);
}

// the images for each submission are in bootstrap carousels (one carousel per submission)
// when the previous or next button is clicked in a carousel, an event is fired.
// use bootstrap.Carousel.getInstance(element) to get the carousel instance
// use the instance to get the index of the current slide
// slide all other carousels to the same index
// this function does that
function syncCarouselSlide(event) {
    // get the carousel that was clicked
    // event.target is the button that was clicked
    // event.target.closest('.carousel') is the carousel that contains the button
    const carousel = event.target.closest('.carousel');
    const bsCarouselTargeted = bootstrap.Carousel.getInstance(carousel);
    // get the index of the current slide
    console.log(bsCarouselTargeted);
    // bsCarousel._getItems() returns an array of all the slides in the carousel. Find index of the active slide
    const index = bsCarouselTargeted._getItems().findIndex(x => x.classList.contains('active'));
    // this is the index of the slide that was clicked. If previous button was clicked, subtract 1 (modulo the length of the array)
    // if next button was clicked, add 1 (modulo the length of the array)
    console.log(event.target);
    const newIndex = event.target.classList.contains('carousel-control-prev-icon') ? (index - 1 + bsCarouselTargeted._getItems().length) % bsCarouselTargeted._getItems().length : (index + 1) % bsCarouselTargeted._getItems().length;
    console.log("new",newIndex);
    // get all the carousels
    // for each carousel, get the carousel instance and slide to the new index
    for (const bsCarousel of bsCarousels) {
        
        // if the carousel is not the one that was clicked, pause it
        if (bsCarousel !== bsCarouselTargeted) {
            bsCarousel.to(newIndex);
        }
    }
}

// if previous or next button is clicked in a carousel, sync the slide of all other carousels
// by triggering the same event on all other carousels
const cardCarousels = document.querySelectorAll('.card .carousel');
// get the corresponding set of bootstrap carousel instances
const bsCarousels = []
for (const carousel of cardCarousels) {
    bsCarousels.push(bootstrap.Carousel.getOrCreateInstance(carousel));
}

const btnCarouselPrev = document.querySelectorAll('.card .carousel-control-prev');
for (const btn of btnCarouselPrev) {
    btn.addEventListener('click', syncCarouselSlide);
}

const btnCarouselNext = document.querySelectorAll('.card .carousel-control-next');
for (const btn of btnCarouselNext) {
    btn.addEventListener('click', syncCarouselSlide);
}


// cards display the first image in the submission 
// (obj.submissions_papersubmissionimage_related.first.image.url)
// add event listener for all images to load
// then get the height of the tallest image
// and crop all images to 20% of the height of the tallest image
// and set the width of all images to auto.

// #################################
// NOTE: Uncomment the following code to force all images to load
// #################################
// const loadImage = src =>
//     new Promise((resolve, reject) => {
//         const img = new Image();
//         img.onload = () => {
//             resolve(img);
//             // console.log("img loaded");
//         };
//         img.onerror = reject;
//         img.src = src;
//     });
    
// // get all image tags in the div
// const imgs = document.querySelectorAll(".sub-img");
// // get image urls via map
// const imageUrls = Array.from(imgs).map(img => img.src);
// // console.log(imageUrls);
// // for (const imgURL of imageUrls) {
// //     // for each image, load it
// //     console.log(imgURL);
// // }

// Promise.all(imageUrls.map(loadImage)).then(images => {
//     // images.forEach((image, i) => {
//     //     console.log(image, `\nloaded? ${image.complete}`);
//     // });
//     // get the height of the tallest image
//     const heights = images.map(img => img.naturalHeight);
//     const maxHeight = Math.max(...heights);
//     const minHeight = Math.min(...heights);
//     console.log(minHeight, maxHeight);
//     // we want to keep the top 20% of the original image. We can use clip-path to do this.
//     // clip-path: polygon(0 0, 100% 0, 100% 20%, 0 20%);
//     // set the height of all images to 20% of the height of the tallest image
//     // set the width of all images to auto
    
//     // // set parent div height to 20% of the height of the tallest image
//     // const divs = document.querySelectorAll(".carousel-item");
//     // for (const img of imgs) {
//     //     img.style.clipPath = `polygon(0 0, 100% 0, 100% 20%, 0 20%)`;
//     // }
// });

// when export-grades-form is submitted, get the submission_pks of the cards
// and append them to the form data as submission_pks
// then submit the form with fetch
const exportGradesDetailedForm = document.getElementById('export-grades-detailed-form');
if (exportGradesDetailedForm) {
    exportGradesDetailedForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const form = this;
        const submissionPks = Array.from(document.querySelectorAll('.card')).map(card => card.getAttribute('data-pk'));
        const submissionPksInput = document.createElement('input');
        submissionPksInput.type = 'hidden';
        submissionPksInput.name = 'submission_pks';
        submissionPksInput.value = JSON.stringify(submissionPks);
        form.appendChild(submissionPksInput);
        // const csrfToken = form.querySelector('input[name="csrfmiddlewaretoken"]').value;
        form.submit();
        submissionPksInput.remove();
        
        // close the modal
        const modal = document.getElementById('export-grades');
        const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
        bsModal.hide();
    });
}

const exportGradesCanvasForm = document.getElementById('export-grades-canvas-form');
if (exportGradesCanvasForm) {
    exportGradesCanvasForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const form = this;
        const submissionPks = Array.from(document.querySelectorAll('.card')).map(card => card.getAttribute('data-pk'));
        const submissionPksInput = document.createElement('input');
        submissionPksInput.type = 'hidden';
        submissionPksInput.name = 'submission_pks';
        submissionPksInput.value = JSON.stringify(submissionPks);
        form.appendChild(submissionPksInput);
        // const csrfToken = form.querySelector('input[name="csrfmiddlewaretoken"]').value;
        form.submit();
        submissionPksInput.remove();
        
        // close the modal
        const modal = document.getElementById('export-grades');
        const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
        bsModal.hide();
    });
}

// handle modal close
// when the modal is closed, resume the carousel of all cards
const deleteModal = document.getElementById('modal-delete-sub');
if (deleteModal) {
    const btnDeleteConfirmed = deleteModal.querySelector('.btn-delete-confirmed');

    btnDeleteConfirmed.addEventListener('click', function(event) {
        deleteSub(event);
    });
}


// add event listener for the btn-delete-all button
// when the button is clicked, show the modal to delete all submissions
const btnDeleteAll = document.getElementById('btn-delete-all');
if (btnDeleteAll) {
    btnDeleteAll.addEventListener('click', function(event) {
        const deleteAllModal = document.getElementById('modal-delete-all');
        const bsDeleteAllModal = bootstrap.Modal.getOrCreateInstance(deleteAllModal);
        bsDeleteAllModal.show();
    });
}

// add event listener for the btn-delete-all-confirmed button
// when the button is clicked, delete all submissions
const btnDeleteAllConfirmed = document.getElementById('btn-delete-all-confirmed');
if (btnDeleteAllConfirmed) {
    btnDeleteAllConfirmed.addEventListener('click', function(event) {
        deleteAllSubs(event);
    });
}

function deleteAllSubs(event) {
    event.preventDefault();
    const form = document.getElementById('delete-all-form');
    const csrfToken = form.querySelector('input[name="csrfmiddlewaretoken"]').value;
    // the url to delete the submission is the url of the page with submissions/<pk>/delete/
    const url = window.location.href + "submissions/delete-all/";
    // ajax request to delete the submission
    fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRFToken": csrfToken,
        },
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        // if the submission was deleted successfully, reload the page without resubmitting the form
        if (data.message === "success") {
            window.location.reload();
        }
    }
    );
}

async function fetchGrades() {
    const url = `/assignments/${assignmentId}/grades/`;
    const response = await fetch(url);
    console.log(response);
    const data = await response.json();
    console.log("data", data);
    console.log(data["grades"]);
    return data["grades"];
}

var chart = document.getElementById('myChart')
if (chart) {
    const groupButtonContainer = document.createElement('div');
    groupButtonContainer.classList.add('d-flex', 'justify-content-end', 'my-2');
    // add the button group to the parent of the chart
    chart.parentElement.append(groupButtonContainer);
    // or with innerHTML
    groupButtonContainer.innerHTML = `
    <div class="d-flex justify-content-end mb-2">
        <div class="btn-group me-2" role="group" aria-label="Toggle displayed data">
            <input type="radio" name="chart-type" id="group-by-default" class="btn-check" checked autocomplete="off">
            <label class="btn btn-outline-secondary btn-sm" for="group-by-default">All Grades</label>
            <input type="radio" name="chart-type" id="group-by-version" class="btn-check" autocomplete="off">
            <label class="btn btn-outline-secondary btn-sm" for="group-by-version">Group by Version</label>
            <input type="radio" name="chart-type" id="group-by-question" class="btn-check" autocomplete="off">
            <label class="btn btn-outline-secondary btn-sm" for="group-by-question">Group by Question</label>
        </div>
    </div>
    `;
    const groupByDefaultButton = document.getElementById('group-by-default');
    const groupByVersionButton = document.getElementById('group-by-version');
    const groupByQuestionButton = document.getElementById('group-by-question');

    var ctx = chart.getContext('2d');
    // await the maxScore from the server
    const maxScore = JSON.parse(document.getElementById('max_score').textContent);
    const all_grades_old = JSON.parse(document.getElementById('all_grades').textContent);
    console.log(all_grades_old);
    // find the min and max of the grades from all_grades
    // const values = Object.values(all_grades);

    let fetched_grades = [];
    try {
        fetched_grades = await fetchGrades();
    } catch (error) {
        console.log(error);
    }

    // get the "grade" entry of each object and store them in an array
    const all_grades = fetched_grades.map(obj => obj.grade).filter(grade => grade !== "" && grade !== null);

    // set the min value of the x-axis to 0 and the max value to the max possible grade of the assignment
    const minm = 0;
    const maxm = maxScore;
    var histGenerator = d3.bin()
    .domain([minm, maxm])    // TODO: get the min and max of the grades
    .thresholds(39);  // number of thresholds; this will create 19+1 bins

    var bins = histGenerator(all_grades);
    console.log(bins);
    const x_axis = []
    const y_axis = []
    for (var i = 0; i < bins.length; i++) {
        x_axis.push(bins[i].x0)
        y_axis.push(bins[i].length)
    }
    const data = {
        labels: x_axis,
        datasets: [{
            label: 'Submission Grades',
            data: y_axis,
            backgroundColor: [
                'rgba(255, 99, 132, 0.2)',
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 1,
        }]
    };

    var myChart = new Chart(ctx);

    function updateChartGroupDefault() {
        myChart.config.type = 'bar';
        myChart.config.data = data;
        myChart.config.options.scales = {
            y: {
                beginAtZero: true,
                ticks: {
                    autoSkip: true,
                    maxTicksLimit: 10
                }
            },
            x: {
                ticks: {
                    min: 0,
                    max: maxScore,
                    stepSize: 1,
                    maxTicksLimit: 10,
                }
            }
        };
        myChart.update();
    }
    updateChartGroupDefault();
    groupByDefaultButton.addEventListener('click', updateChartGroupDefault);

    
    // add event listener for the group-by-version button
    // when the button is clicked, group the grades by version
    if (groupByVersionButton) {
        // group by version
        const grouped_version = fetched_grades.reduce((acc, obj) => {
            const version = obj.version;
            if (!acc[version]) {
                acc[version] = [];
            }
            // skip empty grades
            if (obj.grade !== "" && obj.grade !== null)
                acc[version].push(obj.grade);
            return acc;
        }, {});
        console.log(grouped_version);
        // if there is at most one version, disable the button
        if (Object.keys(grouped_version).length <= 1) {
            groupByVersionButton.disabled = true;
        }
        function updateChartGroupVersions() {
            myChart.config.type = 'violin';
            myChart.config.data = {
                labels: Object.keys(grouped_version).map(version => {
                    version = version === '' ? 'Outliers' : `Version ${version}`
                    return version;
                }
                ),
                datasets: []
            };
            const grades = Object.values(grouped_version);
    
            myChart.config.data.datasets.push({
                label: `Versions`,
                data: grades,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
                outlierColor: '#999999',
                padding: 10,
                itemRadius: 0,
            });
            
            // // change the y axis limit to the min and max of the grades
            myChart.config.options.scales.y.min = 0;
            myChart.config.options.scales.y.max = Math.max(...all_grades);
            myChart.update();
            console.log(myChart.config.data);
        }
        groupByVersionButton.addEventListener('click', updateChartGroupVersions);
    }

    
    // add event listener for the group-by-question button
    // when the button is clicked, group the grades by question
    if (groupByQuestionButton) {
        const grouped_question = fetched_grades.reduce((acc, obj) => {
            // fields `question_{i}_grade` are the grades for each question
            for (const [key, value] of Object.entries(obj)) {
                if (key.startsWith('question_')) {
                    const question = key.split('_')[1];
                    if (!acc[question]) {
                        acc[question] = [];
                    }
                    // skip empty grades
                    if (value !== "" && value !== null)
                        acc[question].push(value);

                }
            }
            return acc;
        }, {});
        console.log(grouped_question);
        if (Object.keys(grouped_question).length <= 1) {
            groupByQuestionButton.disabled = true;
        }
        function updateChartGroupQuestions() {
            myChart.config.type = 'violin';
            myChart.config.data = {
                labels: Object.keys(grouped_question).map(question => `Question ${question}`),
                datasets: []
            };
            const grades = Object.values(grouped_question);
            myChart.config.data.datasets.push({
                label: `Questions`,
                data: grades,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
                outlierColor: '#999999',
                padding: 10,
                itemRadius: 0,
            });
            // change the y axis limit to the min and max of the grades
            myChart.config.options.scales.y.min = 0;
            myChart.config.options.scales.y.max = (grades.flat().length === 0) ? 1 : Math.max(...grades.flat());
            myChart.update();
            console.log(myChart.config.data);
        }

        groupByQuestionButton.addEventListener('click', updateChartGroupQuestions);
    }
}

// add event listener for the .search-bar__button
// when the button is clicked, focus on the search bar input but only 
// if the transition ends.
// If the transition does not end, i.e. if the transition is interrupted 
// the search bar input will not be focused.
const searchBar = document.querySelector('.search-bar');
if (searchBar) {
    const searchBarInput = searchBar.querySelector('.search-bar__input');
    const searchBarButton = searchBar.querySelector('.search-bar .search-bar__button');

    // searchBarButton.addEventListener('click', function(event) {
    //     // toggle the search bar button class search-is-on
    //     // searchBarButton.classList.toggle('search-is-on');
    //     // if the search bar button has the class search-is-on, focus on the search bar input
    //     if (searchBarButton.classList.contains('search-is-on')) {
    //         searchBar.addEventListener('transitioncancel', function(event) {
    //             searchBarInput.classList.add('transition-cancelled');
    //             console.log('transition cancelled');
    //         }, {once: true});

    //         searchBar.addEventListener('transitionstart', function(event) {
    //             searchBarInput.classList.remove('transition-cancelled');
    //             console.log('transition started');
    //         }, {once: true});

    //         searchBar.addEventListener('transitionend', function(event) {
    //             if (!searchBarInput.classList.contains('transition-cancelled')) {
    //                 searchBarInput.focus();
    //                 console.log('transition ended. input focused');
    //             } else {
    //                 console.log('transition ended, but input not focused because transition was cancelled');
    //             }
    //         }, {once: true});
    //     }
    // });
}

// add event listener for the equal-grades checkbox switch of the upload_files.html
// when the checkbox is not checked, add the .expanded class to the .expander container of #grades_input_group
// when the checkbox is checked, remove the .expanded class from the .expander container
const equalGradesCheckbox = document.getElementById('equal_grades');
if (equalGradesCheckbox) {
    const expanders = document.querySelectorAll('.expander');
    // get the one with child #grades_input_group
    for (var i = 0; i < expanders.length; i++) {
        if (expanders[i].querySelector('#grades_input_group')) {
            var expander = expanders[i];
            break;
        }
    }
    equalGradesCheckbox.addEventListener('change', function(event) {
        console.log('checkbox changed');
        if (equalGradesCheckbox.checked) {
            expander.classList.remove('expanded');
            
            // also change the value of #max_grades to "x,x,x,...,x", where x=assignment.max_score/N, and N is the value of input #num_questions
            const numQuestions = document.getElementById('num_questions').value;
            const numGradesInput = document.getElementById('max_grades')
            const maxScore = JSON.parse(document.getElementById('max_score').textContent);
            var equalGrade = maxScore / numQuestions;
            // round the equalGrade to 4 decimal places
            equalGrade = Math.round(equalGrade * 10000) / 10000;
            var roundingError = maxScore - equalGrade * numQuestions;

            // create an array of length numQuestions with all elements equal to equalGrade
            const equalGrades = Array(parseInt(numQuestions)).fill(equalGrade);
            // add the rounding error to the last element of the array
            equalGrades[equalGrades.length - 1] += Math.round(roundingError * 10000) / 10000;
            
            numGradesInput.value = equalGrades.join(',');
            
        } else {
            expander.classList.add('expanded');
        }
    });
}

// when num_questions is changed, update the value of max_grades
// set the value of max_grades to "x,x,x,...,x
// where x = assignment.max_score / num_questions

const numQuestionsInput = document.getElementById('num_questions');
if (numQuestionsInput) {
    const maxGradesInput = document.getElementById('max_grades');
    numQuestionsInput.addEventListener('input', function(event) {
        const maxScore = JSON.parse(document.getElementById('max_score').textContent);
        const numQuestions = numQuestionsInput.value;
        var equalGrade = maxScore / numQuestions;
        // round the equalGrade to 4 decimal places
        equalGrade = Math.round(equalGrade * 10000) / 10000;
        var roundingError = maxScore - equalGrade * numQuestions;

        // create an array of length numQuestions with all elements equal to equalGrade
        const equalGrades = Array(parseInt(numQuestions)).fill(equalGrade);
        // add the rounding error to the last element of the array
        equalGrades[equalGrades.length - 1] = Math.round( (equalGrades[equalGrades.length - 1] + roundingError) * 10000) / 10000;
        
        maxGradesInput.value = equalGrades.join(',');
    });
}

// add event listener for the update button of the grading scheme
// send a fetch request to the server to update the grading scheme
// and change the button text to a spinner
// when the request is complete, change the button text back to "Update"
// and change the button class to "btn-success"
const updateGradingSchemeButton = document.getElementById('updateGradingSchemeBtn');
if (updateGradingSchemeButton) {
    updateGradingSchemeButton.addEventListener('click', function(event) {
        // change the button text to a spinner
        updateGradingSchemeButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
        // disable the button
        updateGradingSchemeButton.disabled = true;
        
        // get num_questions, equal_grades, max_grades, apply_to_all, assignment_id
        const numQuestions = document.getElementById('num_questions').value;
        const equalGrades = document.getElementById('equal_grades').checked;
        const maxGrades = document.getElementById('max_grades').value;
        const applyToAll = document.getElementById('apply_to_all').checked;

        const url = '/course/' + courseId + '/grading_scheme/update/';
        const data = {
            num_questions: numQuestions,
            equal_grades: equalGrades,
            max_grades: maxGrades,
            apply_to_all: applyToAll,
            assignment_id: assignmentId
        };

        const gradingSchemeForm = document.getElementById('gradingSchemeForm');
        const csrfToken = gradingSchemeForm.querySelector("input[name='csrfmiddlewaretoken']").value;

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
                
            },
            body: JSON.stringify(data)
        };

        fetch(url, options)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            // change the button text back to "Update"
            updateGradingSchemeButton.innerHTML = 'Update';
            // enable the button
            updateGradingSchemeButton.disabled = false;
            // change the button class to "btn-success"
            updateGradingSchemeButton.classList.remove('btn-primary');
            updateGradingSchemeButton.classList.add('btn-success');
        }
        );
    });
}

// Clustering/versioning changes made here
const versionButton = document.getElementById('initiateVersioningBtn');
if(versionButton) {
    initializeVersioningCheckedPages();
    versionButton.addEventListener('click', async (event) => {
        initiateVersioning(event)
    });
}

async function initiateVersioning (event) {
    // change the button text to a spinner
    // store the original text of the button
    const buttonText = versionButton.textContent;
    versionButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Versioning...';
    // disable the button
    versionButton.disabled = true;
    const versionForm = document.getElementById('initiateVersioningForm');
    const formData = new FormData(versionForm);
    const numbers_selected = Array.from(formData.keys()).filter(key => key.startsWith('versioningpage-selected-')).map(key => key.split('-')[2]);
    
    const url = `/courses/${courseId}/assignments/${assignmentId}/version/`
    const data = {
        pages: numbers_selected,
        assignment_id: assignmentId
    };
    console.log(numbers_selected, data, JSON.stringify(data), typeof(data), JSON.stringify(data));
    const csrfToken = versionForm.querySelector("input[name='csrfmiddlewaretoken']").value;

    const options = {
        method: 'POST',
        headers: {
            // 'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
            
        },
        body: JSON.stringify(data)
    };
    try {
        const response = await fetch(url, options)
        const data = await response.json();
        if (data["success"]) {
            // call the function to display the message
            render_version_modal(data["submissions"], [], [], 0);
            console.log(data);
        } else {
            throw new Error("Error while versioning");
        }
    } catch (error) {
        console.log(error);
    }
    versionButton.innerHTML = buttonText;
    versionButton.disabled = false;
}

const saveVersionCommentsBtn = document.getElementById('updateClusterBtn');
if(saveVersionCommentsBtn) {
    saveVersionCommentsBtn.addEventListener('click', async (event) => {
        const url = `/assignments/${assignmentId}/versioncomments/`
        const versionCommentsForm = document.getElementById('newVersionCommentsForm');
        const formData = new FormData(versionCommentsForm);
        console.log([...formData.entries()]);
        formData.delete('csrfmiddlewaretoken');
        
        for (const [key, value] of Array.from(formData.entries())) {
            console.log(key, value);
            // remove files of size 0 and empty strings
            if (value instanceof File && value.size == 0) {
                formData.delete(key);
                console.log([...formData.entries()]);
            } else if (value == "") {
                formData.delete(key);
            }
        }
        
        console.log([...formData.entries()]);

        const csrfToken = versionCommentsForm.querySelector("input[name='csrfmiddlewaretoken']").value;
        const options = {
            method: 'POST',
            headers: {
                // 'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: formData
        };
    try {
        const response = await fetch(url, options)
        const data = await response.json();
        console.log(data);
        if (data["success"]) {
            const modal = document.getElementById('clusterModal');
            $(modal).modal('hide');
        } else {
            console.log("error");
        }
    } catch (error) {
        console.log(error);
    }

    });
}

// add an event listener to update version button
const versioningModal = document.getElementById('clusterModal');
if (versioningModal) {
    versioningModal.addEventListener('show.bs.modal', async (event) => {
        console.log('versioning modal shown');
        const url = `/assignments/${assignmentId}/versions/`

        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        };
        let data;
        try {
            const response = await fetch(url, options)
            data = await response.json();
            console.log(data);
        } catch (error) {
            console.log(error);
        }
        if (data["success"]) {
            const versions = getVersionsFromSubmissions(data["submissions"]);
            if (versions.length > 0) {
                render_version_modal(
                    data["submissions"],
                    data["version_texts"], 
                    data["version_pdfs"],
                );
            } else {
                console.log("No submissions are versioned");
                // set clusterModalFooter d-none
                const clusterModalFooter = document.getElementById('clusterModalFooter');
                clusterModalFooter.classList.add('d-none');
                // remove initiateVersioningDiv d-none
                const initiateVersioningDiv = document.getElementById('initiateVersioningDiv');
                initiateVersioningDiv.classList.remove('d-none');
                // set versionsDetails innerHTML to ""
                const versionsDetails = document.getElementById('versionsDetails');
                versionsDetails.innerHTML = "";
            }
        } else {
            console.log("error");
        }
    });
}


const resetClusterBtn = document.getElementById('resetClusterBtn');
if(resetClusterBtn) {
    resetClusterBtn.addEventListener('click', (event) => {
        // close the modal
        let modal = document.getElementById('clusterModal');
        $(modal).modal('hide');
        console.log('reset cluster button clicked')
            
        const url = `/assignments/${assignmentId}/versionreset/`

        const csrfToken = document.querySelector("input[name='csrfmiddlewaretoken']").value;

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
        };

        fetch(url, options)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            // if the message is success
            if (data['success']) {
                const modal = document.getElementById('clusterModal');
                $(modal).modal('hide');
            } else {
                console.log('Error while resetting versions');
            }
        });

    });
}

// handle btn-default-identify-pages
const btnDefaultIdentifyPages = document.getElementById('btn-default-identify-pages');
if(btnDefaultIdentifyPages) {
    btnDefaultIdentifyPages.addEventListener('click', handleDefaultIdentifyPages);
}

const btnDefaultVersioningPages = document.getElementById('btn-default-versioning-pages');
if(btnDefaultVersioningPages) {
    btnDefaultVersioningPages.addEventListener('click', handleDefaultVersioningPages);
}

async function handleDefaultIdentifyPages(event) {
    // stop the default action of the button
    event.preventDefault();

    const identifyForm = document.getElementById('identifyStudentsForm');
    const csrfToken = identifyForm.querySelector("input[name='csrfmiddlewaretoken']").value;

    // get all the checkboxes in the form
    const checkboxes = identifyForm.querySelectorAll("input[type='checkbox']");
    // get the indices of the checked checkboxes
    let page_indices = [];
    for (let i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) {
            page_indices.push(i);
        }
    }
    console.log(page_indices);
    const url = "/profile/preferences/edit/";
    const data = {
        "identify_pages": {
            [courseId]: {
                [assignmentId]: page_indices
            }
        }
    };

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        body: JSON.stringify(data)
    };

    try {
        const response = await fetch(url, options);
        const responseJSON = await response.json();
        console.log(responseJSON);
        // if the message is success
        if (responseJSON['success']) {
            // create a toast
            const toast = createToastElement(
                "Default pages for identifying students updated successfully.",
                "success"
            );
            // append the toast to the toast-container
            const toastContainer = document.querySelector('#toast-container');
            toastContainer.appendChild(toast);
            console.log("toast", toast);
            let toastElement = new bootstrap.Toast(toast,
                {delay: 10000, autohide: false});
            toastElement.show();
        }
    } catch (error) {
        // create a toast
        const toast = createToastElement(
            "Default pages for identifying students could not be updated.",
            "danger"
        );
        // append the toast to the toast-container
        const toastContainer = document.querySelector('#toast-container');
        toastContainer.appendChild(toast);
        console.log("toast", toast);
        let toastElement = new bootstrap.Toast(toast,
            {delay: 10000, autohide: false});
        toastElement.show();
    }
}

// handle btn-identify-region
let cropBoxData = new Map();
const btnIdentifyRegion = document.getElementById('btn-identify-region-modal');
if(btnIdentifyRegion) {
    btnIdentifyRegion.addEventListener('click', handleIdentifyRegionModal);
}

async function handleIdentifyRegionModal (event) {
    // load the "#cropDetails > img" using the first image
    const cropDetails = document.getElementById('cropDetails');
    const img = cropDetails.querySelector('img');
    const identifyForm = document.getElementById('identifyStudentsForm');

    // get all the checkboxes in the form
    const checkboxes = identifyForm.querySelectorAll("input[type='checkbox']");
    // get the indices of the checked checkboxes
    let page_indices = [];
    for (let i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) {
            page_indices.push(i);
        }
    }
    console.log(page_indices);

    // destroy all children of cropInfo
    const cropInfo = document.getElementById('cropInfo');
    while (cropInfo.firstChild) {
        cropInfo.removeChild(cropInfo.firstChild);
    }

    // destroy all previous croppers
    const previousCropper = img.cropper;
    if (previousCropper) {
        previousCropper.destroy();
    }
    const sub_imgs_at_idx = document.querySelectorAll(`.sub-card .carousel-item:nth-child(${page_indices[0] + 1})`);
    const first_sub_img = sub_imgs_at_idx.length > 0 ? sub_imgs_at_idx[0].querySelector('img') : null;
    if (first_sub_img) {
        // add navigation buttons
        createIdentifyPageNavigator(page_indices);
        img.src = first_sub_img.src;
        img.style.display = 'block';
        await new Promise(r => setTimeout(r, 200));
        const cropper = await createIdentifyRegionCropper(img);
    } else {
        // hide the image
        img.style.display = 'none';
        // show an alert
        const cropInfo = document.getElementById('cropInfo');
        // create a new alert
        const alert = document.createElement('div');
        alert.className = 'alert alert-info m-5';
        alert.innerHTML = 'No pages selected.';
        // append the alert to the cropInfo
        cropInfo.appendChild(alert);
    }
}

function createIdentifyPageNavigator (page_indices) {
    // create a new div to display the page toggle buttons
    const cropInfo = document.getElementById('cropInfo');
    const pageNavigatorContainer = document.createElement('div');
    pageNavigatorContainer.className = 'd-flex justify-content-center';
    cropInfo.appendChild(pageNavigatorContainer);
    const pageNavigator = document.createElement('div');
    
    pageNavigator.className = 'btn-group m-2';
    pageNavigator.role = 'group';
    pageNavigator.setAttribute('aria-label', 'Identify Page Navigator');

    // add the buttons to the pageNavigator
    for (let i = 0; i < page_indices.length; i++) {
        // create a new button
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-outline-primary';
        button.setAttribute('data-page-index', page_indices[i]);
        button.title = 'Select page ' + (page_indices[i] + 1);
        // natural page number is 1 more than the index
        button.innerHTML = page_indices[i] + 1;
        // add active class to the first button
        if (i == 0) {
            button.classList.add('active');
        }
        // add an event listener to the button
        button.addEventListener('click', selectIdentifyPageNavigatorButton);
        pageNavigator.appendChild(button);
    }
    pageNavigatorContainer.appendChild(pageNavigator);

    // set the page index to 0
    pageNavigator.setAttribute('data-page-index', page_indices[0]);
}

async function selectIdentifyPageNavigatorButton (event) {
    // get the page index
    const pageNavigator = document.querySelector('#cropInfo > div > div');
    const page_index = parseInt(pageNavigator.getAttribute('data-page-index'));
    // get the current page index
    const current_page_index = parseInt(event.target.getAttribute('data-page-index'));
    // if the current page index is different from the page index
    if (page_index == current_page_index) {
        return;
    }
    // delete all previous croppers
    let img = document.getElementById('cropDetails').querySelector('img');
    let previousCropper = img.cropper;
    if (previousCropper) {
        previousCropper.destroy();
    }

    const previous_button = pageNavigator.querySelector('.active');
    previous_button.classList.remove('active');
    event.target.classList.add('active');
    // change the page index
    pageNavigator.setAttribute('data-page-index', current_page_index);
    // load the image
    const cropDetails = document.getElementById('cropDetails');
    img = cropDetails.querySelector('img');
    const sub_imgs_at_idx = document.querySelectorAll(`.sub-card .carousel-item:nth-child(${current_page_index + 1})`);
    img.src = sub_imgs_at_idx[0].querySelector('img').src;
    img.style.display = 'block';
    // destroy the previous cropper
    previousCropper = img.cropper;
    if (previousCropper) {
        previousCropper.destroy();
    }
    // create a new cropper
    await new Promise(r => setTimeout(r, 200));
    const cropper = await createIdentifyRegionCropper(img);
}

async function createIdentifyRegionCropper (img) {
    const cropper = new Cropper(img, {
        autoCrop: false,
        ready() {
            console.log('ready');
            // crop the image to the crop box
            this.cropper.crop();
            // set the crop box data to top 0, left 0, width 50%, height 50%
            // getData and setData use natural dimensions
            const heightImg = this.cropper.getImageData().naturalHeight;
            const widthImg = this.cropper.getImageData().naturalWidth;
            const defaultCropBoxData = {
                x: 0,
                y: 0,
                width: widthImg / 2,
                height: heightImg / 4,
            };
            // get active page index
            const pageNavigator = document.querySelector('#cropInfo > div > div');
            const page_index = parseInt(pageNavigator.getAttribute('data-page-index'));
            console.log(page_index);
            console.log(cropBoxData);
            if (cropBoxData.has(page_index)) {
                console.log('cropBoxData', cropBoxData.get(page_index));
                console.log('defaultCropBoxData', defaultCropBoxData);
                this.cropper.setData(cropBoxData.get(page_index));
            } else {
                console.log('defaultCropBoxData', defaultCropBoxData);
                this.cropper.setData(defaultCropBoxData);
            }
        },
    });
    return cropper;
}

// handle updateCropBtn
const updateCropBtn = document.getElementById('updateCropBtn');
if(updateCropBtn) {
    updateCropBtn.addEventListener('click', handleUpdateCrop);
}

async function handleUpdateCrop(event) {
    // get the crop box data
    const rounded = true;
    const cropper = document.getElementById('cropDetails').querySelector('img').cropper;
    const newData = cropper.getData(rounded);
    console.log(newData);
    // keep only the top, left, width and height
    // delete newData['rotate'];
    // delete newData['scaleX'];
    // delete newData['scaleY'];
    if (newData['x'] < 0) {
        newData['width'] = newData['width'] + newData['x'];
        newData['x'] = 0;
    }
    if (newData['y'] < 0) {
        newData['height'] = newData['height'] + newData['y'];
        newData['y'] = 0;
    }
    if (newData['x'] + newData['width'] > cropper.getImageData().naturalWidth) {
        newData['width'] = cropper.getImageData().naturalWidth - newData['x'];
    }
    if (newData['y'] + newData['height'] > cropper.getImageData().naturalHeight) {
        newData['height'] = cropper.getImageData().naturalHeight - newData['y'];
    }
    // store also the natural dimensions
    newData['naturalWidth'] = cropper.getImageData().naturalWidth;
    newData['naturalHeight'] = cropper.getImageData().naturalHeight;

    console.log(newData);
    // get the active page index
    const pageNavigator = document.querySelector('#cropInfo > div > div');
    const page_index = parseInt(pageNavigator.getAttribute('data-page-index'));
    console.log(page_index);
    const natural_page_index = page_index + 1;
    try {
        cropBoxData.set(page_index, newData);
        console.log(cropBoxData);
        // create a simple success message as a toast and append it to the toast-container
        const toast = createToastElement(
            `Crop box for page ${natural_page_index} updated successfully!`,
            "success"
        );
        // append the toast to the toast-container
        const toastContainer = document.querySelector('#toast-container');
        toastContainer.appendChild(toast);
        console.log("toast", toast);
        let toastElement = new bootstrap.Toast(toast,
            {delay: 10000, autohide: false});
        toastElement.show();
    } catch (error) {
        console.log(error);
        // create a simple error message as a toast
        const toast = createToastElement(
            `Error updating crop box for page ${natural_page_index}!`,
            "danger"
        );
        // append the toast to the toast-container
        const toastContainer = document.querySelector('#toast-container');
        toastContainer.appendChild(toast);
        console.log("toast", toast);
        let toastElement = new bootstrap.Toast(toast,
            {delay: 10000, autohide: false});
        toastElement.show();
    }

}
