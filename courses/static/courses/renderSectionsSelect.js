function renderCanvasSection (section) {
    // render the checkbox input for each section
    const sectionDiv = document.createElement('div');
    sectionDiv.classList.add('mt-3');
    sectionDiv.classList.add('form-check');
    // each meetTime has meetBuilding, meetRoom, meetDays, meetTimeBegin, meetTimeEnd
    const sectionMeetTimes = section.meetTimes ? section.meetTimes.map( (meetTime) => {
        return `${meetTime.meetDays} ${meetTime.meetPeriodBegin} ${meetTime.meetBuilding}${meetTime.meetRoom}`
    }) : [];
    const sectionMeetTimesSpans = sectionMeetTimes.map( (meetTime) => {
        return `<span class="badge bg-secondary rounded-pill" title="Meeting Time">${meetTime}</span>`
    });


    sectionDiv.innerHTML = `
        <input class="form-check-input" name="canvas_sections" id="canvas_section_${section.id}" type="checkbox" value="${section.id}">
        <label class="form-check-label" for="canvas_section_${section.id}">
            <span title="${section.name}">
                ${section.name.length > 50 ? section.name.substring(0, 50) + '...' : section.name}
            </span>
            <span class="badge bg-primary rounded-pill" title="Total Available Students">
            <i class="bi bi-person">
            </i>
            ${section.manual_total_students}
            </span>
            ${section.enrollment_role === 'TaEnrollment' ? '<span class="badge bg-success rounded-pill" title="Canvas TA Enrollment">TA</span>' : ''}
            ${section.enrollment_role === 'TeacherEnrollment' ? '<span class="badge bg-success rounded-pill" title="Canvas Teacher Enrollment">Teacher</span>' : ''}
            ${section.matchesInstructorLastName ? '<span class="badge bg-info rounded-pill" title="UF Schedule of Courses Instructor">SOC</span>' : ''}
            ${section.alreadyAdded ? '<span class="badge bg-warning rounded-pill" title="Already Added from Canvas">Added</span>' : ''}
            <div class="mt-1 d-flex flex-wrap gap-1">
                ${sectionMeetTimesSpans.join('')}
            </div>
        </label>
    `;
    
    // if manual_total_students is 0, disable the checkbox
    if (section.manual_total_students === 0) {
        sectionDiv.querySelector('input[type="checkbox"]').disabled = true;
    }
    return sectionDiv;
}

function renderCanvasSections(canvasSections) {
    const sectionsBlockDiv = document.createElement('div');
    for (const section of canvasSections) {
        const sectionDiv = renderCanvasSection(section);
        sectionsBlockDiv.appendChild(sectionDiv);
    }
    const numChecked = checkCanvasSections(canvasSections, sectionsBlockDiv);
    console.log(`Number of checked sections: ${numChecked}`);
    return sectionsBlockDiv;
}

function checkCanvasSections (canvasSections, sectionsBlockDiv) {
    // if ANY section has alreadyAdded set to true, focus only on the alreadyAdded sections
    // otherwise, focus on the sections with manual_total_students > 0
    let numChecked = 0;
    const alreadyAddedSections = canvasSections.filter( (section) => {
        return section.alreadyAdded;
    });
    if (alreadyAddedSections.length > 0) {
        for (const section of alreadyAddedSections) {
            if (section.manual_total_students > 0) {
                const sectionInput = sectionsBlockDiv.querySelector(`#canvas_section_${section.id}`);
                sectionInput.checked = true;
                sectionInput.disabled = true;
                numChecked++;
            }
        }
        return numChecked;
    }
    for (const section of canvasSections) {
        if ((section.enrollment_role === 'TaEnrollment') 
            || (section.enrollment_role === 'TeacherEnrollment') 
            || (section.matchesInstructorLastName)
            ) {
            if (section.manual_total_students > 0) {
                const sectionInput = sectionsBlockDiv.querySelector(`#canvas_section_${section.id}`);
                console.log(sectionInput, section);
                sectionInput.checked = true;
                numChecked++;
            }
        }
    }
    return numChecked;
}

export function renderCanvasSectionsDivBody (canvasSections, canvasSectionsDiv) {
    const canvasSectionsWithStudents = canvasSections.filter( (section) => {
        return section.manual_total_students > 0;
    });
    const canvasSectionsWithoutStudents = canvasSections.filter( (section) => {
        return section.manual_total_students === 0;
    });
    
    const sectionsWithStudentsDiv =  renderCanvasSections(canvasSectionsWithStudents);
    const sectionsWithoutStudentsDiv = renderCanvasSections(canvasSectionsWithoutStudents);
    
    canvasSectionsDiv.appendChild(sectionsWithStudentsDiv);
    canvasSectionsDiv.appendChild(sectionsWithoutStudentsDiv);
    // add d-none by default to the sections without students
    sectionsWithoutStudentsDiv.classList.add('d-none');
    const showAllButtonDiv = document.createElement('div');
    showAllButtonDiv.classList.add('d-flex', 'justify-content-center', 'mt-3');
    showAllButtonDiv.innerHTML = `
        <button type="button" class="btn btn-outline-primary" id="showAllButton">Show all</button>
    `;
    const showAllButton = showAllButtonDiv.querySelector('#showAllButton');
    showAllButton.addEventListener('click', () => {
        console.log('showing all sections');
        sectionsWithoutStudentsDiv.classList.remove('d-none');
        // delete the show all button
        showAllButtonDiv.remove();
    });
    canvasSectionsDiv.appendChild(showAllButtonDiv);
    renderCanvasSectionsDivFooter(canvasSectionsDiv);
}

function renderCanvasSectionsDivFooter (canvasSectionsDiv) {
    const submitButtonDiv = document.createElement('div');
    submitButtonDiv.classList.add('d-flex', 'justify-content-center', 'mt-4', 'mb-3');
    submitButtonDiv.innerHTML = `
        <button type="button" class="btn btn-success" id="submitButton">Submit</button>
    `;
    canvasSectionsDiv.appendChild(submitButtonDiv);
    const submitButton = document.querySelector('#submitButton');
    updateSubmitBtnState(canvasSectionsDiv, submitButton);
    for (const input of canvasSectionsDiv.querySelectorAll('input[type="checkbox"][name="canvas_sections"]')) {
        input.addEventListener('change', () => {
            updateSubmitBtnState(canvasSectionsDiv, submitButton);
        });
    }
}

function updateSubmitBtnState (canvasSectionsDiv, submitButton) {
    if (!submitButton) {
        return;
    }
    const canvasSectionsInputs = canvasSectionsDiv.querySelectorAll('input[type="checkbox"][name="canvas_sections"]');
    const checkedSectionsInputs = Array.from(canvasSectionsInputs).filter( (input) => {
        return input.checked;
    });
    if (checkedSectionsInputs.length === 0) {
        console.log("no inputs checked, disabling submit button");
        submitButton.disabled = true;
    } else {
        console.log("at least one input checked, enabling submit button");
        submitButton.disabled = false;
    }
}