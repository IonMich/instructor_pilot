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
        // loop over submissions
        for (const sub of data.submissions) {
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

function updateCard(card, sub) {
    // get the footer of the card
    const footer = card.querySelector('.card-footer');
    // check if the card already has a link to the submission on Canvas
    const link = footer.querySelector('a');
    if (link) {
        // if it does, update the href
        console.log("updating link", link);
        link.href = sub.canvas_url;
    } else {
        // if it doesn't, create a new link and append it to the footer
        const newLink = document.createElement('a');
        newLink.href = sub.canvas_url;
        newLink.classList.add('btn', 'btn-sm', 'btn-outline-primary');
        newLink.style = "z-index: 2;position: relative;";
        newLink.innerHTML = `<img src="https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://canvas.instructure.com&size=48" style="width: 16px; height: 16px">`;
        footer.appendChild(newLink);
    }
}

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

btnFetch.addEventListener('click', syncSubsFromCanvas);


