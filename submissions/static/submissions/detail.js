function navigatorHandler (event) {
    let areaIsFocused = (document.activeElement === text_area);
    if (areaIsFocused && text_area.value !== "") {
        return
    }
    switch(event.key) {
        case "ArrowLeft":
            if (pk === firstPk) {
                return
            }
            handleChangesAndNavigate(prev_url);
            break;
        case "ArrowRight":
            if (pk === lastPk) {
                return
            }
            handleChangesAndNavigate(next_url);
            break;
    }
};

function checkIfChanges() {
    let unsavedChanges = false;
    // check if the grades have changed
    const grade_inputs = document.querySelectorAll(".grade-input");
    for (const [index, input] of grade_inputs.entries()) {
        // if input value is empty string, set it to null
        if (input.value === "") {
            inputValue = null;
        } else {
            inputValue = input.value;
        }
        if (inputValue !== initial_grades[index][0]) {
            unsavedChanges = true;
            console.log("changes");
            break;
        }
    };
    // check if the comment area has changed
    if (text_area.value !== "") {
        unsavedChanges = true;
    }
    return unsavedChanges
}

function handleChangesAndNavigate(url) {
    unsavedChanges = checkIfChanges();
    if (unsavedChanges) {
        withConfirm = confirm("You are navigating out of the page. Do you want to save the changes?");
        if (withConfirm) {
            saveChanges();
            navigate(url)
        }
    }
    else {
        navigate(url);
    }
}

function navigate(url) {
    window.location.replace(url)
}

function handleScroll () {
    const imgdiv = document.querySelector("#div-imgs");
    const imgEl = document.querySelector("#img-1");

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
    const imgs = imgdiv.querySelectorAll("img");
    // get image urls via map
    const imageUrls = Array.from(imgs).map(img => img.src);

    Promise.all(imageUrls.map(loadImage)).then(images => {
        images.forEach((image, i) => {
            console.log(image, `\nloaded? ${image.complete}`);
        });
        let page_height = imgEl.height;
        let margin = 10;

        console.log(page_height);
        // get all grade input elements
        const grade_inputs = document.querySelectorAll(".grade-input");
        // for each grade input element add event listener on focus
        grade_inputs.forEach((input, i) => {
            input.addEventListener("focus", () => {
                console.log("focus");
                input.select();
                imgdiv.scrollTo({
                    top:(page_height+margin)*(i+2), 
                    left:0, 
                    behavior: "smooth"
                });
            });
        $('#id_grade_question_1').focus();
        });
    });
};


const text_area = document.getElementById("newComment");
const prevBtn = document.getElementById("btnPrev");
const nextBtn = document.getElementById("btnNext");
const url = new URL(window.location.href);
// add previous to the end of the url
const prev_url = url.href + "previous/";
// add next to the end of the url
const next_url = url.href + "next/";

const initial_grades = JSON.parse(document.getElementById("grades-initial").textContent);
const pk = JSON.parse(document.getElementById("sub-pk").textContent);
const firstPk = JSON.parse(document.getElementById("first-sub-pk").textContent);
const lastPk = JSON.parse(document.getElementById("last-sub-pk").textContent);
console.log(pk, firstPk, lastPk);
if (pk === lastPk) {
    nextBtn.disabled = true;
}
else {
    prevBtn.addEventListener("click", () => {
        handleChangesAndNavigate(prev_url);
    });
}

if (pk === firstPk) {
    prevBtn.disabled = true;
}
else {
    nextBtn.addEventListener("click", () => {
        handleChangesAndNavigate(next_url);
    });
}

console.log(initial_grades);

handleScroll();
document.addEventListener('keydown', navigatorHandler);


