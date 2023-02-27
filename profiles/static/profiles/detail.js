const dropArea = document.getElementById('image-drop');
const inputEl = document.getElementById('image-drop-input');
// const img = document.getElementById('avatarPreview');
const form = document.getElementById('avatarUploadForm');
console.log(dropArea);

dropArea.addEventListener('dragover', (event) => {
    event.stopPropagation();
    event.preventDefault();
    // Style the drag-and-drop as a "copy file" operation.
    event.dataTransfer.dropEffect = 'copy';
    dropArea.classList.add('encourage-drop');
    return false;
});

// dropArea.addEventListener('dragenter', (event) => {
    
// });

dropArea.addEventListener('dragleave', (event) => {
    dropArea.classList.remove('encourage-drop');
});

dropArea.addEventListener('drop', (event) => {
    event.stopPropagation();
    event.preventDefault();
    dropArea.classList.remove('encourage-drop');
    const fileList = event.dataTransfer.files;
    // add the file to the form
    inputEl.files = fileList;
    // fire the change event
    inputEl.dispatchEvent(new Event('change'));
});

const browseButton = document.getElementById("avatarUploadBtn");
browseButton.addEventListener('click', (event) => {
    inputEl.click();
});


inputEl.addEventListener('change', (event) => {
    console.log("input event fired", event);
    const fileList = event.target.files;
    console.log(fileList);
    // preview the image
    // change the image display from none to block
    // img.hidden = false;
    // if (fileList.length === 0) {
    //     img.hidden = true;
    //     return;
    // }
    // img.src = URL.createObjectURL(fileList[0]);

    // upload the image
    
    const formData = new FormData(form);
    console.log(formData);
    fetch('/profile/avatar/', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        // update the avatar image
        const avatar = document.querySelector('.avatar img');
        avatar.src = data.avatar_url;
    }
    )
    .catch((error) => {
        console.error('Error:', error);
    }
    );
});

const profileFieldsForm = document.getElementById('profileFieldsForm');

profileFieldsForm.addEventListener('submit', (event) => {
    event.preventDefault();
    // show a spinner in the submit button
    const submitButton = document.querySelector('#profileFieldsForm button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';

    const formData = new FormData(profileFieldsForm);
    fetch('/profile/update/', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        // add a toast message that the profile was updated successfully
        const toastContainer = document.getElementById('toast-container');
        const toast = createToastElement(data.message, data.message_type);
        toastContainer.appendChild(toast);
        const toastEl = new bootstrap.Toast(toast);
        toastEl.show();
        // hide the spinner in the submit button
        submitButton.disabled = false;
        submitButton.innerHTML = 'Save';
    }
    )
    .catch((error) => {
        console.error('Error:', error);
    }
    );
}
);

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