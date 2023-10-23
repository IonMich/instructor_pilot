const fileInput = document.getElementById('id_file_field');
const filePreviewDiv = document.getElementById('file-preview');
const pagesPerSubmissionInput = document.getElementById('id_pages_per_submission');

pagesPerSubmissionInput.addEventListener('change', () => {
    validatePageCounts(pageCounts);
});

let pageCounts = [];
let isPdfArray = [];

if (fileInput) {
    fileInput.addEventListener('change',async () => {
        // wait for all files to load
        const fileInfo =  await waitAllFileLoads();
        console.log(fileInfo);

        const fileNames = fileInfo.map(file => file.fileName);
        pageCounts = fileInfo.map(file => file.count);
        isPdfArray = fileInfo.map(file => file.isPdf);
        
        filePreviewDiv.appendChild(createFilePreviewDiv(fileNames, pageCounts, isPdfArray));
    });
}

async function waitAllFileLoads (resolve, reject) {
    const files = fileInput.files;
    const promises = [...files].map( file => {
        if (!file) {
            return;
        }
        return getNumPagesOnLoad(file);
    });
    const results = await Promise.all(promises);
    return results;
}

async function getNumPagesOnLoad (file) {
    // count = reader.result?.match(/\/Type[\s]*\/Page[^s]/g)?.length;
    const fileName = file.name;
    const fileSize = file.size;
    try {
        const reader = new FileReader();
        reader.readAsBinaryString(file);
        const result = await new Promise((resolve, reject) => {
            try {
                reader.onload = (e) => {
                    const count = e.target.result?.match(/\/Type[\s]*\/Page[^s]/g)?.length;
                    resolve(count);
                }
            } catch (e) {
                console.log("Error: ", e);
                reject(0);
            }
        });
        return {fileName, count: result, fileSize, isPdf: result > 0};
    } catch (e) {
        console.log("Error: ", e);
        return {fileName, count: 0, fileSize, isPdf: false};
    }
}

function createFilePreviewDiv(fileNames, pageCounts, isPdfArray) {
    // delete previous div
    while (filePreviewDiv.firstChild) {
        filePreviewDiv.removeChild(filePreviewDiv.firstChild);
    }
    const div = document.createElement('div');
    div.className = 'file-preview-div';
    const ul = document.createElement('ul');
    ul.className = 'file-preview-list';
    fileNames.map((fileName, index) => {
        const li = document.createElement('li');
        li.className = 'file-preview-list-item';
        const span = document.createElement('span');
        span.className = 'file-preview-list-item-span';
        span.innerHTML = `<i class="bi bi-file-earmark-${isPdfArray[index] ? 'pdf' : 'text'}"></i> ${fileName} (${pageCounts[index]?.toString() || '0'} pages)`;
        li.appendChild(span);
        ul.appendChild(li);
    });
    div.appendChild(ul);
    validatePageCounts(pageCounts);
    
    return div;
}



function getDivisors (n) {
    const divisors = [];
    for (let i = 1; i <= n; i++) {
        if (n % i === 0) {
            divisors.push(i);
        }
    }
    return divisors;
}

function getCommonDivisors (arr) {
    let divisors = getDivisors(arr[0]);
    for (let i = 1; i < arr.length; i++) {
        divisors = divisors.filter(divisor => arr[i] % divisor === 0);
    }
    return divisors;
}

function validatePageCounts (pageCounts) {
    const divisors = getCommonDivisors(pageCounts);
    if (fileInput.files.length === 0) {
        pagesPerSubmissionInput.setCustomValidity('');
        return;
    }
    // validate pages per submission input field
    // if not in divisors, show validation error
    if (!divisors.includes(parseInt(pagesPerSubmissionInput.value))) {
        console.log('Invalid number of pages per submission');
        // add bootstrap validation error
        pagesPerSubmissionInput.setCustomValidity('Invalid number of pages per submission');
        pagesPerSubmissionInput.reportValidity();
        // disable submit button
        document.querySelector('button[name="submit-upload"]').disabled = true;

    } else {
        pagesPerSubmissionInput.setCustomValidity('');
        console.log('Valid number of pages per submission');
        // enable submit button
        document.querySelector('button[name="submit-upload"]').disabled = false;
    }
}