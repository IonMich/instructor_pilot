const fileInput = document.getElementById('id_file_field');

if (fileInput) {
    fileInput.addEventListener('change', () => {
        const files = fileInput.files;
        [...files].map(file => {
            if (!file) {
                return;
            }
            const fileName = file.name;
            const fileSize = file.size;

            // url_file1 = URL.createObjectURL(file);
            // // change the src attribute of the HTML element
            // the element looks something like this:
            // <object id="pdfObject" data="" type="application/pdf" width="100%" height="100%">
            //     <p>Alternative text to the PDF</p>
            // </object>
            // document.getElementById('pdfObject').data = url_file1; 
            try {
                const reader = new FileReader();
                reader.readAsBinaryString(file);
                reader.onloadend = function(){
                    const count = reader.result.match(/\/Type[\s]*\/Page[^s]/g).length;
                    // append the count to the page_counts array
                    console.log(fileName, count, fileSize);
                }
            } catch (e) {
                console.log("Error: ", e);
            }
        });
    });
}

