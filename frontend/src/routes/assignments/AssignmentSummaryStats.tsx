import './AssignmentSummaryStats.css'
import { useMemo, useState } from 'react';
// import chartJS Bar
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Colors,
  } from 'chart.js'
import { Chart } from 'react-chartjs-2'
  
  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Colors,
  )

function getSubmissionGrades(subs, answers, position=null) {
    if (!answers) {
        return [];
    }
    if (position !== null) {
        return subs.map((sub) => {
            const answer = answers.find((answer) => answer.submissionId === sub.id && answer.position === position);
            if (!answer) {
                return 0;
            }
            return answer.grade;
        })
    } else {
        return subs.map((sub) => {
            const answersOfSub = answers.filter((answer) => answer.submissionId === sub.id);
            if (answersOfSub.length === 0) {
                return null;
            } else {
                return answersOfSub.reduce((a, b) => a + b.grade, 0);
            }
        })
    }
}

const populateCounts = (grades, bins) => {
    const numBins = bins.length;
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
        
        if (totalGrade <= bins[left]) {
            if (left > 0) {
                left--;
            }
        }
    counts[left]++;
    });

    return counts;
}

// for some reason this is running twice.
function createChartData(subs, filteredSubmissions, answers, filters, maxPossibleGrade, versions, questionPositionFocus, groupByVersions) {
    // bin the grades into 10 bins
    console.log("creating CHART data");
    const numBins = 10;
    const minGrade = 0;
    const logRange = Math.ceil(Math.log10(maxPossibleGrade));
    const showDecimal = Math.max(0, 2 - logRange);
    const binSize = (maxPossibleGrade - minGrade) / numBins;
    const bins = [];
    
    for (let i = 0; i < numBins; i++) {
        bins.push(((i * binSize) + minGrade).toFixed(showDecimal));
    }
    // console.log("calculating chart data");
    const binLabels = bins.map((bin, i) => {
        // bin labels should be (lower, upper], except for the first bin which should be [lower, upper]
        const nextBin = (i === numBins - 1) ? maxPossibleGrade : bins[i + 1];
        let label = `${bin} - ${nextBin}]`;
        return (i === 0) ? `[${label}` : `(${label}`
    });
    // console.log("bin lower bound: ", bins);
    // count the number of submissions in each bin
    const datasets = [];
    if (!groupByVersions) {
        const submissionGrades = getSubmissionGrades(subs, answers, questionPositionFocus);
        const fullCounts = populateCounts(submissionGrades, bins);
        datasets.push({
            label: 'All Graded Submissions',
            data: fullCounts,
            // backgroundColor: 'rgba(255, 99, 132, 0.2)',
            // borderColor: 'rgb(255, 99, 132)',
            borderWidth: 1,
        });
    } else {
        versions.forEach((version) => {
            // get the submission grades for this version
            const submissionGrades = getSubmissionGrades(
                subs.filter((sub) => sub.versionId === version.id),
                answers,
                questionPositionFocus,
            );
            const versionCounts = populateCounts(submissionGrades, bins);
            datasets.push({
                label: version.name,
                data: versionCounts,
                // backgroundColor: 'rgba(255, 99, 132, 0.2)',
                // borderColor: 'rgb(255, 99, 132)',
                borderWidth: 1,
            });
        });
    }


    // add a dataset for explicitly filtered data
    const filteredSubmissionGrades = getSubmissionGrades(
        filteredSubmissions,
        answers,
        questionPositionFocus,
    );
    const filterCounts = populateCounts(filteredSubmissionGrades, bins);
    if (filters.length > 0) {
        const labelName = filters.map((filter) => filter.label).join(', ');
        datasets.push({
            label: `Filtered (${labelName})`,
            data: filterCounts,
            // purple
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgb(153, 102, 255)',
            borderWidth: 1,
        });
    }

    return {
        labels: binLabels,
        datasets: datasets,
    };
}

const AssignmentSummaryStats = ({subs, filteredSubmissions, answers, filters, questions, versions }) => {
    const [questionPositionFocus, setQuestionPositionFocus] = useState(null);
    const [groupByVersions, setGroupByVersions] = useState(false);
    // get the max possible grades of each question position of each version
    // If all max possible grades are the same, then we can display individual question grades across versions
    const hasSoftVersioning = useMemo(() => {
        if (!questions) {
            return false;
        }
        // if versions have different number of questions, then not soft versioning
        const hasAllSameNumQs = versions?.every((version) => version.questions.length === versions[0].questions.length)

        if (!hasAllSameNumQs) {
            return false;
        }

        for (const position of Array.from(Array(versions[0].questions.length).keys())) {
            const questionsInPostion = questions.filter((question) => question.position === position);
            const maxGrades = questionsInPostion.map((question) => question.maxGrade);
            if (maxGrades.length === 0) {
                return false;
            }
            const maxGrade = maxGrades[0];
            if (!maxGrades.every((grade) => grade === maxGrade)) {
                return false;
            }
        }

        console.log("hasAllSameNumQs: ", hasAllSameNumQs);
        return true;
    }, [questions, versions]);

    const maxPossibleGrade = useMemo(() => {
        if (!questions) {
            return 0;
        }

        if (!hasSoftVersioning && questionPositionFocus !== null) {
            throw new Error("Hard Versioning. Max grade is not well defined for individual questions.");
        }

        if (versions.length === 0) {
            return questions
                .filter((question) => question.versionId === null)
                .filter((question) => questionPositionFocus === null || question.position === questionPositionFocus)
                .map((question) => question.maxGrade)
                .reduce((a, b) => a + b, 0);
        }
        console.log("questionPositionFocus: ", questionPositionFocus);
        const maxGrade = questions
            .filter((question) => question.versionId === versions[0].id)
            .filter((question) => questionPositionFocus === null || question.position === questionPositionFocus)
            .map((question) => question.maxGrade)
            .reduce((a, b) => a + b, 0);
        console.log("maxGrade: ", maxGrade);
        return maxGrade;
    }, [questions, versions, hasSoftVersioning, questionPositionFocus]);

  return (
    <div>
        <h2>Summary Statistics</h2>

        {/* NOTE: question-position should be visible only if hasSoftVersioning is true */}
        <form>
            <label htmlFor="question-position">Question Position</label>
            <select
                id="question-position"
                name="question-position"
                value={questionPositionFocus === null ? "" : questionPositionFocus}
                onChange={(e) => setQuestionPositionFocus(e.target.value === "" ? null : parseInt(e.target.value))}
            >
                <option value="">All Questions</option>
                {Array.from(Array(versions[0]?.questions.length).keys()).map((position) => (
                    <option key={position} value={position}>Question {position}</option>
                ))}
            </select>
        </form>

        <form>
            <label htmlFor="group-by-versions">Group By Versions</label>
            <input
                id="group-by-versions"
                name="group-by-versions"
                type="checkbox"
                checked={groupByVersions}
                onChange={(e) => setGroupByVersions(e.target.checked)}
            />
        </form>

        <Chart 
            className="bar-chart" 
            type="bar" 
            // title: "Question Grades"

            options={{
                plugins: {
                    title: {
                        display: questionPositionFocus !== null,
                        text: `Position ${questionPositionFocus} Grades`,
                        font: {
                            size: 20,
                        },
                    },
                    legend: {
                        position: 'bottom',
                    },
                },
            }}
            data={
                useMemo(() => createChartData(
                    subs,
                    filteredSubmissions, 
                    answers,
                    filters, 
                    maxPossibleGrade, 
                    versions,
                    questionPositionFocus,
                    groupByVersions
                    ), [subs, filteredSubmissions, answers, filters, maxPossibleGrade, versions, questionPositionFocus, groupByVersions])
            }
        />

    </div>
    )
}

export default AssignmentSummaryStats