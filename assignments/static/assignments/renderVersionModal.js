export function renderVersionTab (tabIndex, numVersions, numElements) {
    let versionTabElement = document.createElement('li');
    versionTabElement.className = 'nav-item';
    versionTabElement.id = 'pills-home-tab+' + tabIndex;
    versionTabElement.role = 'presentation';
    // folded corner document icon
    let btnInnerHtml = (tabIndex != numVersions+1) ? 
        `Version ${tabIndex}<span class="badge bg-light ms-2 text-dark rounded-pill border border-dark">
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
        if (tabIndex == 1) {
            versionTabElement.querySelector('button').classList.add('active');
        }
    return versionTabElement;
}

export function renderVersionContent(tabIndex, elements) {
    const newTabContent = document.createElement('div');
    newTabContent.className = 'tab-pane fade';
    newTabContent.id = 'pills-home' + tabIndex;
    newTabContent.setAttribute('role', 'tabpanel');
    newTabContent.setAttribute('aria-labelledby', 'pills-home-tab' + tabIndex);
    // show the first tab content by default
    if (tabIndex == 1) {
        newTabContent.classList.add('show');
        newTabContent.classList.add('active');
    }
    const versionContentElements = renderVersionElements(tabIndex, elements);
    const versionContentSavedComments = renderVersionSavedComments(tabIndex, elements);
    const versionContentNewCommentsForm = renderVersionNewCommentsForm(tabIndex, elements);
    newTabContent.appendChild(versionContentElements);
    newTabContent.appendChild(versionContentSavedComments);
    newTabContent.appendChild(versionContentNewCommentsForm);
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
    <div id="carouselExampleControls${tabIndex}" class="carousel slide" data-bs-ride="carousel">
        <div class="carousel-inner" id="carousel-inner${tabIndex}">
        </div>
        <button class="carousel-control-prev" type="button" data-bs-target="#carouselExampleControls${tabIndex}" data-bs-slide="prev">
            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            <span class="visually-hidden"></span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#carouselExampleControls${tabIndex}" data-bs-slide="next">
            <span class="carousel-control-next-icon" aria-hidden="true"></span>
            <span class="visually-hidden"></span>
        </button>
    </div>`;
    // add the carousel to the versionContentElements
    versionContentElements.appendChild(carouselDiv);
    // add the images to the carousel
    const carouselInner = carouselDiv.querySelector('.carousel-inner');
    for (const element of elements) {
        // create a new div to display the image
        const carouselItem = document.createElement('div');
        // add the class carousel-item to the carousel item
        carouselItem.classList.add('carousel-item');
        // if the item the first direct child of the carousel inner, add the active class
        if (element === elements[0]) {
            carouselItem.classList.add('active');
        }
        // create a new image element
        const img = document.createElement('img');
        img.src = element['image'];
        img.className = 'd-block w-100';
        img.alt = 'Version ' + tabIndex + ' image';
        // add the image to the carousel item
        carouselItem.appendChild(img);  
        // add the carousel item to the carousel inner
        carouselInner.appendChild(carouselItem);
    }
    return versionContentElements;
}

function renderVersionSavedComments(tabIndex, elements) {
    throw new Error('Not implemented');
}

function renderVersionNewCommentsForm(tabIndex, elements) {
    throw new Error('Not implemented');
}