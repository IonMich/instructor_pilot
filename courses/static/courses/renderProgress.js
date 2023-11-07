export function createAllProgressItems() {
    // sync student sections, class meetings, students, 
    // assignment groups, assignments, and announcements
    // from Canvas to the database
    // create initially a spinner for each item
    // after each item is synced, replace the spinner next to the label
    // with a checkmark
    const spinner = '<i class="spinner-border spinner-border-sm"></i>';
    const progressItems = [
        {label: 'Student Sections', id: 'sections', status: spinner},
        {label: 'Students', id: 'students', status: spinner},
        {label: 'Assignment Groups', id: 'assignment-groups', status: spinner},
        {label: 'Assignments', id: 'assignments', status: spinner},
        {label: 'Announcements', id: 'announcements', status: spinner},
    ];
    const progressList = document.createElement('ul');
    progressList.id = 'progress-list';
    progressList.classList.add('list-group', 'my-3');
    progressItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.id = item.id;
        li.innerHTML = `
            <div class="d-flex justify-content-start gap-3">
                <span class="display-status">
                    ${item.status}
                </span>
                <span>${item.label}</span>
            </div>
        `;
        progressList.appendChild(li);
    });
    return progressList;
}

export function updateProgressItem(postResponseData) {
    console.log(postResponseData);
    // postResponseData contians success: true/false
    // e.g. {category: 'sections', success: true}
    // update the status of the progress item
    const item = postResponseData.category;
    const success = postResponseData.success;
    const checkmark = '<i class="bi bi bi-check-circle-fill text-success"></i>';
    const failed = '<i class="bi bi-x-circle-fill text-danger"></i>';
    const li = document.getElementById(item);
    const liStatus = li.querySelector('.display-status');
    if (success) {
        liStatus.innerHTML = checkmark;
    }
    else {
        liStatus.innerHTML = failed;
    }
}