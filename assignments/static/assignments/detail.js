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
            // get the counts:
            var syncedCount = data.submissions.filter(sub => sub.canvas_url).length;
            var notSyncedCount = data.submissions.length - syncedCount;
            updateCard(card, sub);
        }

        // remove spinner and enable button
        btnFetch.textContent = `Sync`;
        btnFetch.disabled = false;
        // append success message in form
        appendSuccessMsg(form, syncedCount, notSyncedCount);
    });
};

function appendSuccessMsg(form, syncedCount, notSyncedCount) {

    closeBtn = `<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    if (notSyncedCount === 0) {
        msg = `All ${syncedCount} submissions have been synced from Canvas!`;
    } else {
        msg = `${syncedCount} submissions are now synced from Canvas. ${notSyncedCount} submissions were not synced from Canvas.`;
    }
    alertHtml = `<div class="alert alert-success alert-dismissible fade show mt-1" role="alert">
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
btnDeleteSub = document.querySelectorAll('.btn-delete-sub');
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


var chart = document.getElementById('myChart')
if (chart) {
    var ctx = chart.getContext('2d');

    const all_grades = JSON.parse(document.getElementById('all_grades').textContent);
    // find the min and max of the grades from all_grades
    const values = Object.values(all_grades);
    // get the min and max of the grades
    const minm = Math.min(...values);
    const maxm = Math.max(...values);
    var histGenerator = d3.bin()
    .domain([minm,maxm])    // TODO: get the min and max of the grades
    .thresholds(39);  // number of thresholds; this will create 19+1 bins

    var bins = histGenerator(all_grades);
    console.log(bins);
    x_axis = []
    y_axis = []
    for (var i = 0; i < bins.length; i++) {
        x_axis.push(bins[i].x0)
        y_axis.push(bins[i].length)
    }
    data = {
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
            borderWidth: 1
        }]
    };

    var myChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 10
                    }
                },
                x: {
                    beginAtZero: true,
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 8
                    }
                }
            },
            
        }
    });
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
        const assignmentId = document.getElementById('assignment_id').value;
        
        courseId = JSON.parse(document.getElementById('course_id').textContent);

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

        options = {
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
const versionButton = document.getElementById('btnCluster');
let numVersions;
if(versionButton) {
    versionButton.addEventListener('click', function(event) {
        // change the button text to a spinner
        versionButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Versioning...';
        // disable the button
        versionButton.disabled = true;
        
        // get the assignment id
        const assignmentId = document.getElementById('assignment_num').value;
        // courseId = JSON.parse(document.getElementById('course_id').textContent);
        // get the course id
        const courseId = document.getElementById('course_num').value;
        

        const url = '/courses/' + courseId + '/assignments/' + assignmentId + '/version/';
        const data = {
            assignment_id: assignmentId
        };

        const versionForm = document.getElementById('versionForm');
        const csrfToken = versionForm.querySelector("input[name='csrfmiddlewaretoken']").value;

        options = {
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
            // call the function to display the message
            version_modal(data);
            // // change the button text back to "Cluster"
            // versionButton.innerHTML = `Update Versions <i class="bi bi-box-arrow-up-right"></i>`;
            // // enable the button
            // versionButton.disabled = false; 
            // remove the button and replace it with another button with id "btnClusterV"
            let btnCluster = document.getElementById('btnCluster');
            // make another button with id "btnClusterV"
            const btnClusterV = document.createElement('button');
            btnClusterV.className = 'btn btn-primary';
            btnClusterV.id = 'btnClusterV';
            btnClusterV.innerHTML = 'Update Versions <i class="bi bi-box-arrow-up-right"></i>';
            // replace btnCluster with btnClusterV
            btnCluster.replaceWith(btnClusterV);
            // add event listener to the new button
            btnClusterV.addEventListener('click', function(event) {
                // do not reload the page
                event.preventDefault();
                version_modal(data);
            });
            
        }
        
        );
    });
}

// add a function to build a modal for the versioning
function version_modal (data) {
    let modal = document.getElementById('clusterModal');
    $(modal).modal('show');
    // get the modal body
    let clusterInfo = document.getElementById('clusterInfo');
    // change the modal body to display the data from response
    if (data['message'] == 'success') {
        // get the number of versions and make it global
        numVersions = data['cluster_types'];

        const outliers = data['outliers'];
        if (outliers == 0) {
            clusterInfo.className = 'alert alert-success';
            clusterInfo.innerHTML = numVersions + ' different Versions found.';
        }
        else {
            clusterInfo.className = 'alert alert-warning';
            clusterInfo.innerHTML = numVersions + ' different Versions and ' + outliers + ' Outliers found.';
        }

        // display the content of the versions
        let versionNameElement = document.getElementById('versionDetails');
        // remove the previous content
        versionNameElement.innerHTML = '';
        //create a ul element with a class name of "list-group"
        let ul = document.createElement('ul');
        ul.className = 'nav nav-pills mb-3';
        ul.id = 'pills-tab';
        ul.role = 'tablist';
        // add this element to the modal
        versionNameElement.appendChild(ul);
        // create a new element to display the version name inside the modal using a for loop
        for (let i = 1; i <= numVersions; i++) {
            let newVersionNameElement = document.createElement('li');
            newVersionNameElement.className = 'nav-item';
            newVersionNameElement.id = 'pills-home-tab+' + i;
            newVersionNameElement.role = 'presentation';
            // create a button element to display the version name
            let newVersionNameButton = document.createElement('button');
            newVersionNameButton.className = 'nav-link';
            newVersionNameButton.id = 'pills-home-tab' + i;
            newVersionNameButton.setAttribute('data-bs-toggle', 'pill');
            newVersionNameButton.setAttribute('data-bs-target', '#pills-home' + i);
            newVersionNameButton.setAttribute('role', 'tab');
            newVersionNameButton.setAttribute('aria-controls', 'pills-home' + i);
            newVersionNameButton.setAttribute('aria-selected', 'true');
            newVersionNameButton.innerHTML = 'Version ' + i;
            // add a class to the first button
            if (i == 1) {
                newVersionNameButton.classList.add('active');
            }
            // add the button to the new element
            newVersionNameElement.appendChild(newVersionNameButton);

            // add this element to the modal
            ul.appendChild(newVersionNameElement);
        }
        // create a new div to display the tab contents using a for loop
        let tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        tabContent.id = 'pills-tabContent';
        // create a new div to display the tab contents using a for loop
        for (let i = 1; i <= numVersions; i++) {
            let newTabContent = document.createElement('div');
            newTabContent.className = 'tab-pane fade';
            newTabContent.id = 'pills-home' + i;
            newTabContent.setAttribute('role', 'tabpanel');
            newTabContent.setAttribute('role', 'tabpanel');
            newTabContent.setAttribute('aria-labelledby', 'pills-home-tab' + i);
            // show the first tab content by default
            if (i == 1) {
                newTabContent.classList.add('show');
                newTabContent.classList.add('active');
            }
            // add a field to display an image
            let newImage = document.createElement('img');
            newImage.className = 'img-fluid';
            newImage.src = data['cluster_images'][i-1];
            newImage.alt = 'Version ' + i + ' image';
            // add some style to the newImage
            newImage.style = 'width: 460px; height: 250px; object-fit: cover; object-position: top; border: 3px solid #ddd; border-radius: 16px; margin: 16px;';
            // add the image to the tab content
            newTabContent.appendChild(newImage);
            
            // add a form to the tab content
            let newForm = document.createElement('form');
            // make this form a multipart form
            newForm.enctype = 'multipart/form-data';
            newForm.id = 'versionForm' + i;
            newForm.className = 'form-inline';
            // add a text input to the form
            let newTextInput = document.createElement('textarea');
            // newTextInput.type = 'text';
            newTextInput.className = 'form-control mb-2 mr-sm-2';
            newTextInput.id = 'versionName' + i;
            newTextInput.placeholder = 'Version Solution';
            newTextInput.name = 'versionText' + i;
            // add a file input to the form
            let newFileInput = document.createElement('input');
            newFileInput.type = 'file';
            newFileInput.className = 'form-control mb-2 mr-sm-2';
            newFileInput.id = 'versionFile' + i;
            newFileInput.placeholder = 'Version File';
            newFileInput.name = 'versionFile' + i;
            // set multiple attribute to true
            newFileInput.multiple = true;
            
            // append the text and file inputs to the form
            newForm.appendChild(newTextInput);
            newForm.appendChild(newFileInput);
            // append the form to the tab content
            newTabContent.appendChild(newForm);

            // add this element to the modal
            tabContent.appendChild(newTabContent);
        }
        // add this element to the modal
        versionNameElement.appendChild(tabContent);

    } else {
        clusterInfo.className = 'alert alert-danger';
        clusterInfo.innerHTML = 'Versions updated unsuccessfully';
    }
}

const updateVersion = document.getElementById('updateClusterBtn');
if(updateVersion) {
    updateVersion.addEventListener('click', function(event) {
        // close the modal
        let modal = document.getElementById('clusterModal');
        $(modal).modal('hide');
        console.log('update version button clicked')
        // get the number of versions


        // get the assignment id
        const assignmentId = document.getElementById('assignment_num').value;
        // courseId = JSON.parse(document.getElementById('course_id').textContent);
        // get the course id
        const courseId = document.getElementById('course_num').value;     

        const url = '/courses/' + courseId + '/assignments/' + assignmentId + '/versionsubmission/';

        const formData = new FormData();
        formData.append('assignment_id', assignmentId);
        formData.append('course_id', courseId);
        for (let i = 0; i < numVersions; i++) {
            formData.append('versionTexts', document.getElementById('versionName' + (i+1)).value);
            // add a formdata object to the formdata object with name versionFiles1, versionFiles2, etc.
            // formData.append('versionFiles' + (i+1), document.getElementById('versionFile' + (i+1)).files[0]);
            //NOTE: Supports only one file per version
            // add multiple files to the formdata object
            for (let j = 0; j < document.getElementById('versionFile' + (i+1)).files.length; j++) {
                 formData.append('versionFiles' + (i+1), document.getElementById('versionFile' + (i+1)).files[j]);
             }

        }

        const versionForm = document.getElementById('versionForm');
        const csrfToken = versionForm.querySelector("input[name='csrfmiddlewaretoken']").value;

        options = {
            method: 'POST',
            headers: {
                // 'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
                
            },
            // body: JSON.stringify(data)
            body: formData
        };

        fetch(url, options)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            // if the message is success
            if (data['message'] == 'success') {
                // display the success message in the div with id clusterMessage
                let clusterMessage = document.getElementById('clusterMessage');
                clusterMessage.className = 'alert alert-success';
                clusterMessage.innerHTML = 'Solutions for versions uploaded successfully.';

            }
            // if the message is failure
            else {
                // display the failure message in the div with id clusterMessage
                let clusterMessage = document.getElementById('clusterMessage');
                clusterMessage.className = 'alert alert-danger';
                clusterMessage.innerHTML = 'Solutions for versions uploaded unsuccessfully.';
            }
        });

    });
}

// add an event listener to update version button
const btnClusterV = document.getElementById('btnClusterV');
if(btnClusterV) {
        btnClusterV.addEventListener('click', function(event) {
            // stop the default action of the button
            event.preventDefault();
            // get the modal
            let modal = document.getElementById('clusterModal');
            // show the modal
            $(modal).modal('show');
    });

}

const resetClusterBtn = document.getElementById('resetClusterBtn');
if(resetClusterBtn) {
    resetClusterBtn.addEventListener('click', function(event) {
        // close the modal
        let modal = document.getElementById('clusterModal');
        $(modal).modal('hide');
        console.log('reset cluster button clicked')
        // get the assignment id
        const assignmentId = document.getElementById('assignment_num').value;
        // courseId = JSON.parse(document.getElementById('course_id').textContent);
        // get the course id
        const courseId = document.getElementById('course_num').value;     

        const url = '/courses/' + courseId + '/assignments/' + assignmentId + '/versionreset/';

        const data = {
            'assignment_id': assignmentId,
            'course_id': courseId
        };

        const versionForm = document.getElementById('versionForm');
        const csrfToken = versionForm.querySelector("input[name='csrfmiddlewaretoken']").value;

        options = {
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
            // if the message is success
            if (data['message'] == 'success') {
                // display the success message in the div with id clusterMessage
                let clusterMessage = document.getElementById('clusterMessage');
                clusterMessage.className = 'alert alert-success';
                clusterMessage.innerHTML = 'Cluster reset successfully.';
                // reload the entire page
                location.reload();

            }
            // if the message is failure
            else {
                // display the failure message in the div with id clusterMessage
                let clusterMessage = document.getElementById('clusterMessage');
                clusterMessage.className = 'alert alert-danger';
                clusterMessage.innerHTML = 'Cluster reset unsuccessfully.';
            }
        });

    });
}