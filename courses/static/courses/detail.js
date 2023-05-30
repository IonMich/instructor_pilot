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

syncCourseForm.addEventListener("submit", (event) => {
    console.log("prevent default");
    event.preventDefault();
    event.stopPropagation();

    const syncCourseButton = document.querySelector('button[name="sync_from_canvas"]');
    const buttonText = syncCourseButton.innerHTML;
    const courseId = syncCourseForm.querySelector('input[name="course_id"]').value;
    const csrfToken = syncCourseForm.querySelector('input[name=csrfmiddlewaretoken]').value;

    // disable the add course button
    syncCourseButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Syncing...';
    syncCourseButton.disabled = true;

    const reloadPrompt = '<a href="/courses/' + courseId + '/" style="color: #fff; text-decoration: underline;">Reload</a> to see the changes.';

    if (!syncCourseForm.checkValidity()) {
        console.log("form is not valid");
        // enable the add course button
        syncCourseButton.innerHTML = buttonText;
        syncCourseButton.disabled = false;
        return;
    }
    
    // REST API endpoint for adding a course
    const url = '/courses/update/';
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
            course_id: courseId,
            sync_from_canvas: true,
        }),
    };

    fetch(url, options)
        .then((response) => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Network response was not ok.');
        }
        )
        .then((data) => {
            console.log(data);
            // enable the add course button
            syncCourseButton.innerHTML = buttonText;
            syncCourseButton.disabled = false;
            // show the success or error message
            if (data.success) {
                // show the success message
                console.log("success");
                const full_message = data.message + ' ' + reloadPrompt;
                const toast = createToastElement (full_message, "success")
                const toastContainer = document.querySelector('#toast-container');
                toastContainer.appendChild(toast);
                console.log("toast", toast);
                var toastElement = new bootstrap.Toast(toast,
                    {delay: 10000, autohide: false});
                toastElement.show();
            }
            else {
                // show the error message
                console.log("error");
                const full_message = data.message + ' ' + reloadPrompt;
                const toast = createToastElement (full_message, "danger")
                const toastContainer = document.querySelector('#toast-container');
                toastContainer.appendChild(toast);
                console.log("toast", toast);
                var toastElement = new bootstrap.Toast(toast,
                    {delay: 10000, autohide: false});
                toastElement.show();
        }
        })
        .catch((error) => {
            syncCourseButton.innerHTML = buttonText;
            syncCourseButton.disabled = false;
            const error_message = 'There has been a problem with your fetch operation: ' + error;
            console.log(error_message);
            // show the error message
            const full_message = error_message + ' ' + reloadPrompt;
            const toast = createToastElement (full_message, "danger")
            const toastContainer = document.querySelector('#toast-container');
            toastContainer.appendChild(toast);
            console.log("toast", toast);
            var toastElement = new bootstrap.Toast(toast,
                {delay: 10000, autohide: false});
            toastElement.show();
        }
        );
});

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
