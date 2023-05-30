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
                // show the success message as a toast
                const toast = document.getElementById('liveToastSync');
                // remove bg-primary class and add bg-success class
                toast.classList.remove('bg-primary');
                toast.classList.remove('bg-danger');
                toast.classList.remove('bg-warning');
                toast.classList.remove('bg-info');
                toast.classList.add('bg-success');
                const toastBody = toast.querySelector('.toast-body');
                const reloadPrompt = '<a href="/courses/' + courseId + '/" style="color: #fff; text-decoration: underline;">Reload</a> to see the changes.';
                toastBody.innerHTML = data.message + ' ' + reloadPrompt;

                var bootstrapToast = new bootstrap.Toast(toast,
                    {
                        animation: true,
                        autohide: false,
                    }
                );

                bootstrapToast.show()
            }
            else {
                // show the error message
                console.log("error");
                // show the error message as a toast
                const toast = document.getElementById('liveToastSync');
                // remove bg-primary class and add bg-danger class
                toast.classList.remove('bg-primary');
                toast.classList.remove('bg-success');
                toast.classList.remove('bg-warning');
                toast.classList.remove('bg-info');
                toast.classList.add('bg-danger');
                const toastBody = toast.querySelector('.toast-body');
                toastBody.innerHTML = data.message;

                var bootstrapToast = new bootstrap.Toast(toast,
                    {
                        animation: true,
                        autohide: false,
                    }
                );

                bootstrapToast.show()
        }
        })
        .catch((error) => {
            console.log('There has been a problem with your fetch operation:', error);
            // enable the add course button
            syncCourseButton.innerHTML = buttonText;
            syncCourseButton.disabled = false;
            // show the error message
            const toast = document.getElementById('liveToastSync');
            // remove bg-primary class and add bg-danger class
            toast.classList.remove('bg-primary');
            toast.classList.remove('bg-success');
            toast.classList.remove('bg-warning');
            toast.classList.remove('bg-info');
            toast.classList.add('bg-danger');
            const toastBody = toast.querySelector('.toast-body');
            toastBody.innerHTML = error;

            var bootstrapToast = new bootstrap.Toast(toast,
                {
                    animation: true,
                    autohide: false,
                }
            );

            bootstrapToast.show()

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




