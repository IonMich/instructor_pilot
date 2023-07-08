import './AssignmentSummaryStats.css'
import { useMemo } from 'react';
// import chartJS Bar
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
  } from 'chart.js'
import { Chart } from 'react-chartjs-2'
  
  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
  )

  function getSubmissionGrades(subs) {
    if (!subs) {
        return [];
    }
    return subs.map((sub) => sub.totalGrade);
}

// for some reason this is running twice.
function createChartData(subs, filteredSubmissions, filters, maxGrade) {
    // bin the grades into 10 bins
    const numBins = 10;
    const minGrade = 0;
    const logRange = Math.ceil(Math.log10(maxGrade));
    const showDecimal = Math.max(0, 2 - logRange);
    const binSize = (maxGrade - minGrade) / numBins;
    const bins = [];
    
    for (let i = 0; i < numBins; i++) {
        bins.push(((i * binSize) + minGrade).toFixed(showDecimal));
    }
    // console.log("calculating chart data");
    const binLabels = bins.map((bin, i) => {
        // bin labels should be (lower, upper], except for the first bin which should be [lower, upper]
        const nextBin = (i === numBins - 1) ? maxGrade : bins[i + 1];
        let label = `${bin} - ${nextBin}]`;
        return (i === 0) ? `[${label}` : `(${label}`
    });
    // console.log("bin lower bound: ", bins);
    // count the number of submissions in each bin
    const submissionGrades = getSubmissionGrades(subs);

    const filteredSubmissionGrades = getSubmissionGrades(filteredSubmissions);

    const populateCounts = (grades) => {
        const counts = new Array(numBins).fill(0);
        grades.forEach((totalGrade) => {
        // do an approximate binary search to find the bin
        let left = 0;
        let right = numBins - 1;
        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            if (totalGrade > bins[mid]) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        // console.log("grade: ", grade, "left: ", left, "bins[left]: ", bins[left]);
        // console.log(grade === bins[left], grade < bins[left], grade > bins[left], grade <= bins[left], grade >= bins[left]);
        if (totalGrade <= bins[left]) {
            if (left > 0) {
                left--;
            }
        }
        counts[left]++;
    });

    
    return counts;
    }
    const allCounts = populateCounts(submissionGrades);
    const filterCounts = populateCounts(filteredSubmissionGrades);

    const datasets = [];
    datasets.push({
        label: 'All Submissions',
        data: allCounts,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgb(255, 99, 132)',
        borderWidth: 1,
    });
    if (filters.length > 0) {
        const labelName = filters.map((filter) => filter.label).join(', ');
        datasets.push({
            label: `Filtered (${labelName})`,
            data: filterCounts,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 1,
        });
    }
    return {
        labels: binLabels,
        datasets: datasets,
    };
}

const AssignmentSummaryStats = ({subs, filteredSubmissions, filters, maxGrade}) => {
    

  return (
    <div>
        <h2>Summary Statistics</h2>
        <Chart 
            className="bar-chart" 
            type="bar" 
            data={
                useMemo(() => createChartData(subs,filteredSubmissions, filters, maxGrade), [subs, filteredSubmissions, filters, maxGrade])
            }
        />

    </div>
    )
}

export default AssignmentSummaryStats