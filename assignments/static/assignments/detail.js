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
        // and update its footer by appending or updating the link to the submission on Canvas.

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
            // update the card
            updateCard(card, sub);
        }

        // remove spinner and enable button
        btnFetch.textContent = `Sync`;
        btnFetch.disabled = false;
        // append success message in form
        appendSuccessMsg(form);
    });
};

function appendSuccessMsg(form) {
    // append success message in form
    closeBtn = `<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    successText = `<strong>Success!</strong> Synced all labelled submissions from Canvas.`;
    successMsg = `<div class="alert alert-success alert-dismissible fade show mt-1" role="alert">${successText}${closeBtn}</div>`;
    form.insertAdjacentHTML(
        'beforeend',
        successMsg
    );
}

const btnFetch = document.getElementById('btnFetch');
if (btnFetch) {
    btnFetch.addEventListener('click', syncSubsFromCanvas);
}

// on hover of a submission card, show delete button at top right
// on click of delete button, show confirmation modal
// on click of confirm button in modal, delete submission
// on click of cancel button in modal, hide modal
btnDeleteSub = document.querySelectorAll('.btn-delete-sub');
for (const btn of btnDeleteSub) {
    btn.addEventListener('click', function(event) {
        event.preventDefault();
        const card = this.closest('.card');
        const pk = card.dataset.pk;
        const modal = document.getElementById('deleteSubModal');
        const btnConfirm = modal.querySelector('.btn-confirm');
        btnConfirm.dataset.pk = pk;
        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = `Are you sure you want to delete this submission?`;
        const modalTitle = modal.querySelector('.modal-title');
        modalTitle.innerHTML = `Delete Submission`;
        const modalFooter = modal.querySelector('.modal-footer');
        modalFooter.innerHTML = `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-danger btn-confirm">Delete</button>`;
        const myModal = new bootstrap.Modal(modal);
        myModal.show();
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
    // get the div containing the tools. one of the tools is a link to the submission on Canvas
    const divTools = card.querySelector('.div-card-tools');
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
        btnCanvas.innerHTML = `<i class="fas fa-external-link-alt"></i> Canvas`;
        btnCanvas.innerHTML = `<img src="https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://canvas.instructure.com&size=48" style="width: 16px; height: 16px">`;
        // prepend the button to the div containing the tools
        divTools.prepend(btnCanvas);
    }
    // also change background color of card footer to deep green to indicate that the submission has been synced
    cardFooter.style.background = 'green';
    // and the text color to white
    cardFooter.classList.add('text-white');
}


// add event listener for hover on submission cards
const cards = document.querySelectorAll('.card');
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
    // bsCarousel._items is an array of all the slides in the carousel. Find index of the active slide
    const index = bsCarouselTargeted._items.findIndex(x => x.classList.contains('active'));
    // this is the index of the slide that was clicked. If previous button was clicked, subtract 1 (modulo the length of the array)
    // if next button was clicked, add 1 (modulo the length of the array)
    console.log(event.target);
    const newIndex = event.target.classList.contains('carousel-control-prev-icon') ? (index - 1 + bsCarouselTargeted._items.length) % bsCarouselTargeted._items.length : (index + 1) % bsCarouselTargeted._items.length;
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
const carousels = document.querySelectorAll('.carousel');
// get the corresponding set of bootstrap carousel instances
const bsCarousels = []
for (const carousel of carousels) {
    bsCarousels.push(bootstrap.Carousel.getOrCreateInstance(carousel));
}

const btnCarouselPrev = document.querySelectorAll('.carousel-control-prev');
for (const btn of btnCarouselPrev) {
    btn.addEventListener('click', syncCarouselSlide);
}

const btnCarouselNext = document.querySelectorAll('.carousel-control-next');
for (const btn of btnCarouselNext) {
    btn.addEventListener('click', syncCarouselSlide);
}


// cards display the first image in the submission 
// (obj.submissions_papersubmissionimage_related.first.image.url)
// add event listener for all images to load
// then get the height of the tallest image
// and crop all images to 20% of the height of the tallest image
// and set the width of all images to auto.

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
const imgs = document.querySelectorAll(".sub-img");
// get image urls via map
const imageUrls = Array.from(imgs).map(img => img.src);
// console.log(imageUrls);
for (const imgURL of imageUrls) {
    // for each image, load it
    console.log(imgURL);
}

Promise.all(imageUrls.map(loadImage)).then(images => {
    images.forEach((image, i) => {
        console.log(image, `\nloaded? ${image.complete}`);
    });
    // get the height of the tallest image
    const heights = images.map(img => img.naturalHeight);
    for (const height of heights) {
        console.log(height);
    }
    const maxHeight = Math.max(...heights);
    console.log(maxHeight);
    // we want to keep the top 20% of the original image. We can use clip-path to do this.
    // clip-path: polygon(0 0, 100% 0, 100% 20%, 0 20%);
    // set the height of all images to 20% of the height of the tallest image
    // set the width of all images to auto
    
    // // set parent div height to 20% of the height of the tallest image
    // const divs = document.querySelectorAll(".carousel-item");
    // for (const img of imgs) {
    //     img.style.clipPath = `polygon(0 0, 100% 0, 100% 20%, 0 20%)`;
    // }
});





