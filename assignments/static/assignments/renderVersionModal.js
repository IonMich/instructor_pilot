import { 
    setSubmissionVersion,
    deleteVersionTextComment,
    deleteVersionFileComment,
} from './api.js';

export function renderVersionTab (version, numElements, isActive) {
    const versionTabElement = document.createElement('li');
    versionTabElement.className = 'nav-item';
    const tabIndex = version ? version['id'] : 'Outliers';
    versionTabElement.id = `pills-home-tab+${tabIndex}`;
    versionTabElement.role = 'presentation';
    // folded corner document icon
    const btnInnerHtml = (version) ? 
        `Version ${version.name}<span class="badge bg-light ms-2 text-dark rounded-pill border border-dark">
            ${numElements}
            <i class="bi bi-file-earmark"></i>
            </span>` :
        `Outliers<span class="badge bg-warning ms-2 text-dark rounded-pill border border-dark">
            ${numElements}
            <i class="bi bi-file-earmark"></i>
            </span>`;
    versionTabElement.innerHTML =
        `<button 
            class="nav-link" 
            id="pills-home-tab${tabIndex}" 
            data-bs-toggle="pill" 
            data-bs-target="#pills-home${tabIndex}" 
            type="button" 
            role="tab" 
            aria-controls="pills-home${tabIndex}" 
            aria-selected="true">
            ${btnInnerHtml}
        </button>`;
    if (isActive) {
        versionTabElement.querySelector('button').classList.add('active');
    }
    return versionTabElement;
}

export function renderVersionContent(version, elements, savedTexts, savedFiles, isActive) {
    const tabIndex = version['id'];
    const newTabContent = document.createElement('div');
    newTabContent.className = 'tab-pane fade';
    newTabContent.id = 'pills-home' + tabIndex;
    newTabContent.setAttribute('role', 'tabpanel');
    newTabContent.setAttribute('aria-labelledby', 'pills-home-tab' + tabIndex);
    // show the first tab content by default
    if (isActive) {
        newTabContent.classList.add('show');
        newTabContent.classList.add('active');
    }
    const versionContentElements = renderVersionElements(tabIndex, elements);
    newTabContent.appendChild(versionContentElements);

    const activeElementId = elements[0].id;
    const activeElementSummary = renderActiveElementSummary(tabIndex, activeElementId, elements);
    newTabContent.appendChild(activeElementSummary);

    const versionContentSavedComments = renderVersionSavedComments(tabIndex, savedTexts, savedFiles);
    if (versionContentSavedComments) {
        newTabContent.appendChild(versionContentSavedComments);
    }

    const versionContentNewCommentsForm = renderVersionNewCommentsForm(tabIndex);
    newTabContent.appendChild(versionContentNewCommentsForm);
    console.log(newTabContent);
    return newTabContent;
}

function renderVersionElements(tabIndex, elements) {
    // create a new container to display all the submissions in this version
    // display as an image with previous and next buttons
    const versionContentElements = document.createElement('div');
    versionContentElements.className = 'container';
    versionContentElements.id = 'versionContentElements' + tabIndex;
    // create a new div to display the carousel
    const carouselDiv = document.createElement('div');
    carouselDiv.innerHTML = `
    <div id="carouselExampleControls${tabIndex}" class="carousel slide" data-bs-config='{"wrap": false, "duration": 100}'>
        <div class="carousel-inner versionContentElements" id="carousel-inner${tabIndex}">
        </div>
        <button class="carousel-control-prev" type="button" data-bs-target="#carouselExampleControls${tabIndex}" data-bs-slide="prev">
            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Previous</span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#carouselExampleControls${tabIndex}" data-bs-slide="next">
            <span class="carousel-control-next-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Next</span>
        </button>
    </div>`;
    versionContentElements.appendChild(carouselDiv);
    const myCarousel = carouselDiv.querySelector('.carousel');
    myCarousel.addEventListener('slid.bs.carousel', event => {
        const activeElement = carouselDiv.querySelector('.carousel-item.active');
        const activeElementIndex = activeElement.dataset.id;
        console.log(`slid from carousel index ${event.from} to ${event.to}`);
        console.log(activeElementIndex);
        checkIfFirstOrLastElement(elements, carouselDiv, activeElementIndex);
        renderActiveElementSummary(tabIndex, activeElementIndex, elements);
        if (tabIndex == 'Outliers') {
            updateManualVersionForm(activeElementIndex);
        }
    })
    
    // add the images to the carousel
    const carouselInner = carouselDiv.querySelector('.carousel-inner');
    const page = 3; 
    for (const element of elements) {
        // create a new div to display the image
        const carouselItem = document.createElement('div');
        // add the class carousel-item to the carousel item
        carouselItem.classList.add('carousel-item');
        carouselItem.dataset.id = element['id'];
        // if the item the first direct child of the carousel inner, add the active class
        if (element === elements[0]) {
            carouselItem.classList.add('active');
        }
        // create a new image element
        const img = document.createElement('img');
        
        img.src = element['images'][page]
        // zoom at the top half of the image
        img.className = 'd-block w-100 mx-auto';
        img.style = `
            object-fit: cover;
            object-position: 50% 20%;
            height: 200px;
        `;
        
        img.alt = `Version ${tabIndex}: Page ${page} of ${element['id']}`;
        // add the image to the carousel item
        carouselItem.appendChild(img);  
        // add the carousel item to the carousel inner
        carouselInner.appendChild(carouselItem);
    }

    checkIfFirstOrLastElement(elements, carouselDiv);
    return versionContentElements;
}

function checkIfFirstOrLastElement(elements, carouselDiv, overrideActiveElementIndex = null) {
    // check if the currently active element is the first/last element
    let activeElementIndex;
    if (overrideActiveElementIndex) {
        console.log('overriding active element index');
        activeElementIndex = overrideActiveElementIndex;
    } else {
        const activeElement = carouselDiv.querySelector('.carousel-item.active');
        activeElementIndex = activeElement.dataset.id;
    }

    if (activeElementIndex == elements[0].id) {
        console.log('first element. Disable prev button');
        disablePrevButton(carouselDiv);
    } else {
        console.log('not first element. Enable prev button');
        enablePrevButton(carouselDiv);
    }
    if (activeElementIndex == elements[elements.length - 1].id) {
        console.log('last element. Disable next button');
        disableNextButton(carouselDiv);
    } else {
        console.log('not last element. Enable next button');
        enableNextButton(carouselDiv);
    }
}

function disablePrevButton(carouselDiv) {
    const carouselPrev = carouselDiv.querySelector('.carousel-control-prev');
    carouselPrev.setAttribute('disabled', '');
}

function enablePrevButton(carouselDiv) {
    const carouselPrev = carouselDiv.querySelector('.carousel-control-prev');
    carouselPrev.removeAttribute('disabled');
}

function disableNextButton(carouselDiv) {
    const carouselNext = carouselDiv.querySelector('.carousel-control-next');
    carouselNext.setAttribute('disabled', '');
}

function enableNextButton(carouselDiv) {
    const carouselNext = carouselDiv.querySelector('.carousel-control-next');
    carouselNext.removeAttribute('disabled');
}

function renderActiveElementSummary(tabIndex, activeElementId, elements) {
    // show `Submission ${activeElement.id}`
    const activeElement = elements.find(element => element.id == activeElementId);
    if (!activeElement) {
        throw new Error(`Could not find element with id ${activeElementId}`);
    }

    let activeElementSummary = document.querySelector('#activeElementSummary' + tabIndex);
    if (!activeElementSummary) {
        activeElementSummary = document.createElement('div');
    } else {
        activeElementSummary.innerHTML = '';
    }
    activeElementSummary.className = 'container mx-3 my-3';
    activeElementSummary.id = 'activeElementSummary' + tabIndex;
    const activeElementSummaryText = document.createElement('p');
    activeElementSummaryText.innerHTML = `Submission ${activeElement.id}`;
    activeElementSummary.appendChild(activeElementSummaryText);
    return activeElementSummary;
}

function updateManualVersionForm(activeElementId) {
    // set the hidden input #submissionId-<tabIndex> to the active element id
    const hiddenInput = document.querySelector(`#submissionIdOutliers`);
    if (!hiddenInput) {
        throw new Error(`Could not find hidden input #submissionIdOutliers`);
    }
    hiddenInput.value = activeElementId;
}


function renderVersionSavedComments(tabIndex, savedTexts, savedFiles) {
    console.log(savedTexts);
    console.log(savedFiles);
    if (savedTexts.length == 0 && savedFiles.length == 0) {
        console.log('no saved comments');
        return;
    }
    const oldFilesContainer = document.createElement('div');
    oldFilesContainer.className = 'form-group oldFiles';
    oldFilesContainer.id = 'oldFilesContainer' + tabIndex;
    // add a label to the old files div
    let oldFilesLabel = document.createElement('label');
    oldFilesLabel.innerHTML = 'Old Version Comments: ';
    oldFilesLabel.className = 'form-label labels';
    oldFilesLabel.for = 'oldFilesContainer' + tabIndex;
    // add the label to the old files div
    oldFilesContainer.appendChild(oldFilesLabel);
    // add a div to display the old files and texts
    const oldFiles = document.createElement('div');
    oldFiles.className = 'form-group';
    oldFiles.id = 'oldFiles' + tabIndex;
    // if there are no old files/texts, add display none to the old files div
    
    for (const versionText of savedTexts) {
        const versionContentSavedComments = renderVersionSavedTextComment(versionText);
        oldFiles.appendChild(versionContentSavedComments);
    }
    // add the old files to the old files div
    for (const versionPdf of savedFiles) {
        const versionContentSavedComments = renderVersionSavedFileComment(versionPdf);
        oldFiles.appendChild(versionContentSavedComments);
    }
    oldFilesContainer.appendChild(oldFiles);
    return oldFilesContainer;
}

function renderVersionSavedTextComment(versionTextComment) {
    // create a new div to display the old files and texts
    let text = document.createElement('div');
    text.className = 'form-group';
    text.id = `savedText_${versionTextComment['id']}`;
    text.innerHTML = versionTextComment['text'];

    // create a new button to delete the old files and texts
    let deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-outline-danger';
    deleteButton.id = `deleteButtonText_${versionTextComment['id']}`;
    deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
    // make its size smaller
    deleteButton.style = 'font-size: 12px; padding: 0px 4px; margin-left: 8px; border-radius: 4px;';
    deleteButton.addEventListener('click', async (event) => {
        const textId = versionTextComment['id'];
        const csrfTokenValue = document.querySelector('[name=csrfmiddlewaretoken]').value;
        const response = await deleteVersionTextComment(csrfTokenValue, textId);
        if (response['success']) {
            const comment = document.querySelector(`#${text.id}`);
            comment.remove();
        }
        else {
            // display an error message
            console.log(response['message']);
        }
    }
    );
    // add the delete button to the text
    text.appendChild(deleteButton);
    // add author
    let authorArea = document.createElement('div');
    let authorName = document.createElement('small');
    authorName.className = 'text-muted';
    authorName.innerHTML = versionTextComment['author'];
    authorArea.appendChild(authorName);

    // add authorArea to text
    text.appendChild(authorArea);

    return text;
}

function renderVersionSavedFileComment(versionFileComment) {
    // create a new div to display the old files and texts
    const fileDiv = document.createElement('div');
    fileDiv.className = 'form-group';
    fileDiv.id = `savedFile_${versionFileComment['id']}`;
    // create a new link to display the old files and texts
    const fileLink = document.createElement('a');
    fileLink.href = versionFileComment['url'];
    fileLink.innerHTML = versionFileComment['name'];
    // create a new button to delete the old files and texts
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-outline-danger';
    deleteButton.id = 'deleteButtonFile_' + versionFileComment['id'];
    deleteButton.innerHTML = '<i class="bi bi-trash"></i>';

    // make its size smaller
    deleteButton.style = 'font-size: 12px; padding: 0px 4px; margin-left: 8px; border-radius: 4px;';
    // add an event listener to the delete button
    deleteButton.addEventListener('click', async (event) => {
        const fileId = versionFileComment['id'];
        const csrfTokenValue = document.querySelector('[name=csrfmiddlewaretoken]').value;
        const response = await deleteVersionFileComment(csrfTokenValue, fileId);

        if (response['success']) {
            const comment = document.querySelector(`#${fileDiv.id}`);
            comment.remove();
        }
        else {
            // display an error message
            console.log(response['message']);
        }
    });

    // add the author name
    const authorArea = document.createElement('div');
    const authorName = document.createElement('small');
    authorName.className = 'text-muted';
    authorName.innerHTML = versionFileComment['author'];
    // add author name to the author area
    authorArea.appendChild(authorName);

    // add the old file to the old files div
    fileDiv.appendChild(fileLink);
    // add the delete button to the file link
    fileDiv.appendChild(deleteButton);
    fileDiv.appendChild(authorArea);

    return fileDiv;
}

function renderVersionNewCommentsForm(tabIndex) {
    // add a form to the tab content
    const newTabContent = document.createElement('div');

    // add a label to the form
    const newLabel = document.createElement('label');
    newLabel.className = 'form-label labels';
    newLabel.for = 'versionText_' + tabIndex;
    newLabel.innerHTML = 'New Version Comment: ';

    // add a text input to the form
    const newTextInput = document.createElement('textarea');
    // newTextInput.type = 'text';
    newTextInput.className = 'form-control mb-2 mr-sm-2';
    newTextInput.id = 'versionText_' + tabIndex;
    newTextInput.placeholder = 'Enter new text comment here';
    newTextInput.name = 'versionText_' + tabIndex;
    newTextInput.setAttribute('form', 'newVersionCommentsForm');
    // add a file input to the form

    const newFileInput = document.createElement('input');
    newFileInput.type = 'file';
    newFileInput.className = 'form-control mb-2 mr-sm-2';
    newFileInput.id = 'versionFile_' + tabIndex;
    newFileInput.placeholder = 'Version File';
    newFileInput.name = 'versionFile_' + tabIndex;
    // set multiple attribute to true
    newFileInput.multiple = true;
    newFileInput.setAttribute('form', 'newVersionCommentsForm');
    
    newTabContent.appendChild(newLabel);
    newTabContent.appendChild(newTextInput);
    newTabContent.appendChild(newFileInput);
    return newTabContent;
}

export function renderOutliersContent(elements, versions, isActive) {
    const tabIndex = 'Outliers';
    const newTabContent = document.createElement('div');
    newTabContent.className = 'tab-pane fade';
    newTabContent.id = `pills-home${tabIndex}`;
    newTabContent.setAttribute('role', 'tabpanel');
    newTabContent.setAttribute('aria-labelledby', 'pills-home-tab' + tabIndex);
    // show the first tab content by default
    if (isActive) {
        newTabContent.classList.add('show');
        newTabContent.classList.add('active');
    }
    const versionContentElements = renderVersionElements(tabIndex, elements);
    newTabContent.appendChild(versionContentElements);

    const activeElementId = elements[0].id;
    const activeOutlierSummary = renderActiveElementSummary(tabIndex, activeElementId, elements)
    newTabContent.appendChild(activeOutlierSummary);

    const outlierManualAssignForm = renderOutliersManualVersionForm(versions, activeElementId);
    newTabContent.appendChild(outlierManualAssignForm);

    console.log(newTabContent);
    return newTabContent;
}

function renderOutliersManualVersionForm(versions, activeElementId) {
    // form that allows user to manually assign the 
    // currently selected outlier to a version
    const form = document.createElement('form');
    form.id = 'outlierForm';
    form.className = 'form-inline';
    const csrfTokenValue = document.querySelector('[name=csrfmiddlewaretoken]').value;
    form.innerHTML = `
    <div class="form-group d-flex flex-row gap-2 my-3 align-items-center">
        <input type="hidden" name="csrfmiddlewaretoken" value="${csrfTokenValue}">
        <input type="hidden" name="submissionId" id="submissionIdOutliers" value="${activeElementId}">
        <label class="form-label labels" for="versionName">Version:</label>
        <select class="form-select mb-2 mr-sm-2" name="versionName" id="versionName">
            <option selected value=""></option>
        </select>
        <button type="button" class="btn btn-primary d-block mb-2 mx-auto" disabled>Corfirm</button>
    </div>
    `;
    const select = form.querySelector('select');
    for (const version of versions) {
        console.log(version);
        const option = document.createElement('option');
        option.value = version['id'];
        option.innerHTML = `Version ${version['name']}`
        select.appendChild(option);
    }

    select.addEventListener('change', (event) => {
        const button = form.querySelector('button');
        if (select.value) {
            button.removeAttribute('disabled');
        } else {
            button.setAttribute('disabled', '');
        }
    });

    form.querySelector('button').addEventListener('click', async () => {
        console.log('Assigning outlier to version');
        const submissionId = form.querySelector('#submissionIdOutliers').value;
        const response = await setSubmissionVersion(submissionId, select.value);
        console.log(response);
        if (response['success']) {
            console.log(response);
            const numOutliers = response['submissions'].filter(sub => !sub['version']);
            console.log(numOutliers);
            const activeTabId = numOutliers.length > 0 ? -1 : 0;
            console.log(activeTabId);
            render_version_modal(response["submissions"], [], [], activeTabId);
        } else {
            // display an error message
            console.log(response['message']);
        }
    });

    return form;
}

export function render_version_modal (submissions, version_texts, version_files, activeTabId=0) {
    const initiateVersioningDiv = document.getElementById('initiateVersioningDiv');

    // hide the initiate clustering div
    initiateVersioningDiv.classList.add('d-none');
    const clusterModalFooter = document.getElementById('clusterModalFooter');
    clusterModalFooter.classList.remove('d-none');

    const versionDetailsDiv = document.getElementById('versionsDetails');
    versionDetailsDiv.classList.add('p-2');

    versionDetailsDiv.innerHTML = '';

    //create a ul element with a class name of "list-group"
    const ul = document.createElement('ul');
    ul.className = 'nav nav-pills mb-3 gap-1';
    ul.id = 'pills-tab';
    ul.role = 'tablist';
    // add this element to the modal
    versionDetailsDiv.appendChild(ul);

    // when versions is not in data, we compute it from the submissions
    const versions = getVersionsFromSubmissions(submissions);
    console.log("versions", versions);

    for (const version of versions) {
        const versionSubs = submissions.filter(sub => sub['version'] ? sub['version'].id == version.id : false);
        const numSubs = versionSubs.length;
        const isActive = activeTabId >= 0 && (version.id == versions[activeTabId].id);
        ul.appendChild(renderVersionTab(version, numSubs, isActive));
    }
    const outlier_subs = submissions.filter(sub => !sub['version']);
    console.log('outlier_subs tab', outlier_subs);
    const numOutliers = outlier_subs.length;
    const isActive = versions.length == 0 || activeTabId == -1;
    if (numOutliers != 0) {
        try {
            ul.appendChild(renderVersionTab(null, numOutliers, isActive));
        } catch (error) {
            console.log(error);
        }
    }

    // create a new div to display the tab contents using a for loop
    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';
    tabContent.id = 'pills-tabContent';
    // create a new div to display the tab contents using a for loop

    for (const version of versions) {
        const versionSubs = submissions.filter(sub => sub['version'] ? sub['version'].id == version.id : false);
        console.log(version_texts);
        console.log(version_files);
        const versionSavedTexts = version_texts[version.id] || [];
        const versionSavedFiles = version_files[version.id] || [];
        console.log(versionSubs);
        const isActive = activeTabId >= 0 && (version.id == versions[activeTabId].id);
        const content = renderVersionContent(version, versionSubs, versionSavedTexts, versionSavedFiles, isActive);
        tabContent.appendChild(content);
    }
    
    if (numOutliers != 0) {
        try {
            const outlier_subs = submissions.filter(sub => !sub['version']);
            console.log('outlier_subs content', outlier_subs);
            const isActive = versions.length == 0 || activeTabId == -1;
            const content = renderOutliersContent(outlier_subs, versions, isActive);
            tabContent.appendChild(content);
        } catch (error) {
            console.log(error);
        }
    }
    versionDetailsDiv.appendChild(tabContent);
}

export function getVersionsFromSubmissions(submissions) {
    const subsWithVersion = submissions.filter(sub => !!sub["version"]);
    const versionsFull = subsWithVersion.map(sub => sub["version"]);
    const versions = [];
    const versionsPks = [];
    for (const version of versionsFull) {
        if (!versionsPks.includes(version.id)) {
            versions.push(version);
            versionsPks.push(version.id);
        }
    }
    return versions;
}