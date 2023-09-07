var chart = document.getElementById('myChart')

const student_submissions = JSON.parse(
    document.querySelector("#student-submissions").textContent
);

const class_submissions = JSON.parse(
    document.querySelector("#remaining-submissions").textContent
);

function randomValues(count, min, max) {
    const delta = max - min;
    return Array.from({length: count}).map(() => Math.random() * delta + min);
}

function getPlotXLabels(submissions) {
    // unique list of submission.assignment from items with non-null grade
    const assignments = [...new Set(submissions.map(item => 
        item.grade !== null ? item.assignment : null
    ))].filter(item => item !== null);
    return assignments;
}

function getStudentDataset(submissions) {
    submissions = submissions.filter((submission) => {
        return submission.grade !== null;
    });
    submissions = submissions.map((submission) => {
        return {
            ...submission,
            percentage: submission.grade / submission.max_score * 100,
        }
    });
    return {
        label: 'Student',
        type: 'scatter',
        backgroundColor: 'rgba(0,0,255,0.5)',
        borderColor: 'blue',
        borderWidth: 1,
        outlierColor: '#999999',
        padding: 10,
        itemRadius: 0,
        data: submissions,
        parsing: {
            xAxisKey: 'assignment',
            yAxisKey: 'percentage',
        }
    }
}

function getClassDataset(submissions, labels) {
    submissions = submissions.filter((submission) => {
        return labels.includes(submission.assignment);
    });
    submissions = submissions.filter((submission) => {
        return submission.grade !== null;
    });

    submissions = submissions.map((submission) => {
        return {
            ...submission,
            percentage: submission.grade / submission.max_score * 100,
        }
    });
    // aggregate submissions by assignment
    const assignments = [...new Set(submissions.map(item =>
        item.assignment
    ))];
    const assignment_grades = assignments.map((assignment) => {
        const assignment_submissions = submissions.filter((submission) => {
            return submission.assignment === assignment;
        });
        const assignment_percentages = assignment_submissions.map((submission) => {
            return submission.percentage;
        });
        return assignment_percentages
    });

    return {
        label: 'Course',
        backgroundColor: 'rgba(255,0,0,0.5)',
        borderColor: 'red',
        borderWidth: 1,
        outlierColor: '#999999',
        padding: 10,
        itemRadius: 0,
        data: assignment_grades,
    }
}


function generate_chart() {
    
    console.log(student_submissions);
    const labels = getPlotXLabels(student_submissions);
    if (labels.length === 0) {
        chart.style.display = 'none';
        chart.parentElement.innerHTML = '<div class="alert alert-info" role="alert">Student has no graded submissions</div>';
        return;
    }
    
    console.log(labels);
    var ctx = chart.getContext('2d');

    // const maxScorePlot = 100;
    // const all_students_percentages = labels.map((label) => {
    //     min_dist = randomValues(1, 10, 70).pop();
    //     max_dist = randomValues(1, 80, maxScorePlot).pop();
    //     num_submissions = randomValues(1, 60, 80).pop();
    //     return randomValues(num_submissions, min_dist, max_dist);
    // });

    // const boxplotData = {
    //     // define label tree
    //     labels: labels,
    //     datasets: [{
    //       label: 'All students',
    //       backgroundColor: 'rgba(255,0,0,0.5)',
    //       borderColor: 'red',
    //       borderWidth: 1,
    //       outlierColor: '#999999',
    //       padding: 10,
    //       itemRadius: 0,
    //       data: all_students_percentages,
    //     },]
    //   };

    const boxplotData = {
        // define label tree
        labels: labels,
        datasets: [getClassDataset(class_submissions, labels),]
    };
    console.log(boxplotData);


    var myChart = new Chart(ctx, {
        type: 'violin',
        data: boxplotData,
        options: {
            responsive: true,
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Grade distribution',
            },
        },
    });

    // add student's data to the chart
    myChart.data.datasets.push(getStudentDataset(student_submissions)); 
    myChart.update();
}

if (chart) {
    generate_chart();
}