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

// when the add course button inside the modal is clicked
// a fetch request is made to the server to add the course 
// to the database and then the course is added to the
// course list of the requesting user
const addCourseModal = document.querySelector("#addCourseModal");
const addCourseForm = document.querySelector("#addCourseForm");
const addCourseButton = addCourseForm.querySelector("button[type='submit']");

addCourseForm.addEventListener("submit", (event) => {
    console.log("prevent default");
    event.preventDefault();

    // if was-validated os in the class list of the form, it means that the form is valid
    // and we can send the fetch request

    console.log(addCourseForm)
    if (!addCourseForm.checkValidity()) {
        return;
    }

    //  form inputs: course code, term, description and image, sync with canvas
    const courseCode = addCourseForm.querySelector('input[name="course_code"]').value;
    const term = addCourseForm.querySelector('input[name="term"]').value;
    const description = addCourseForm.querySelector('textarea[name="description"]').value;
    const image = addCourseForm.querySelector('input[name="image"]').value;
    const syncWithCanvas = addCourseForm.querySelector('input[name="sync_with_canvas"]').checked;

    const csrfToken = addCourseForm.querySelector('input[name=csrfmiddlewaretoken]').value;

    // REST API endpoint for adding a course
    const url = '/courses/';
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
            'course_code': courseCode,
            'term': term,
            'description': description,
            'image': image,
            'sync_with_canvas': syncWithCanvas,
        }),
    };

    // fetch request to add the course to the database
    fetch(url, options)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            console.log(data);
            console.log(data.status);
            // if the course was added successfully, add it to the dom
            if (data.status === 'success') {
                // TODO: add the course to the dom

                // close the modal
                $('#addCourseModal').modal('hide');
            } else if (data.status === 'already-exists') {
                // if this combination of course code and term already exists, show an error message
                const courseCodeInput = addCourseForm.querySelector('input[name="course_code"]');
                const termInput = addCourseForm.querySelector('input[name="term"]');
                const errorDiv = addCourseForm.querySelector('.invalid-feedback');

                errorDiv.innerHTML = 'This course already exists in the database';
                courseCodeInput.classList.add('is-invalid');
                termInput.classList.add('is-invalid');
                // remove was-validated class from the form
                addCourseForm.classList.remove('was-validated');




            }

        })
        .catch((error) => {
            console.log(error);
        });
});

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

const courseCards = document.querySelectorAll('.course-card');

courseCards.forEach( (courseCard) => {
    const courseImage = courseCard.querySelector('.card-img-top');
    if (!courseImage.src) {
        backgroundString = createGradient();
        // get the max height of the course card images
        const maxHeight = Math.max(...Array.from(courseCards).map((card) => {
            return card.querySelector('.card-img-top').clientHeight;
        }));
        console.log(maxHeight);
        courseImage.style.height = `${maxHeight}px`;
        courseImage.style.background = backgroundString[0];
        courseImage.style.backgroundSize = '400% 400%';
        courseImage.style.animation = backgroundString[1];


    }
});




    

