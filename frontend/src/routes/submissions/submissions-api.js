import { getStudentsOfCourse } from '../students/students-api.js'


export async function getVersionsOfAssignment(assignmentId) {
    await fakeNetwork(`getVersions_${assignmentId}`)
    let versions = await localforage.getItem(`versions_${assignmentId}`)
    console.log("getVersionsOfAssignment: got localforage",`versions_${assignmentId}`, versions)
    if (!versions) versions = []
    return versions
}

function createInitialVersions (assignmentId) {
    let initVersions = [];
    for (let i = 0; i < 5; i++) {
      const newVersionId = i + 1;
      const newVersion = {
        id: newVersionId.toString(),
        name: `Version ${newVersionId}`,
        assignmentId: assignmentId,
        createdAt: Date.now(),
      };
      initVersions.push(newVersion);
    }
    console.log(initVersions);
    return initVersions;
}

export async function createInitialSubs (maxGrade, assignmentId, courseId) {
    let initSubmissionItems = [];
    const students = await getStudentsOfCourse(courseId);
    const versions = await getVersionsOfAssignment(assignmentId);
    for (let i = 0; i < 20; i++) {
      const newSub = createRandomSubmissionItem(maxGrade, assignmentId, students, versions);
      initSubmissionItems.push(newSub);
    }
    console.log(initSubmissionItems);
    return initSubmissionItems;
}
  
export function createRandomSubmissionItem(maxGrade, assignmentId, students, versions) {
    if (students.length === 0) {
        throw new Error("No students found");
    }
    const randomCanvasId = Math.floor(Math.random() * 10000000).toString();
    const maxGradePerQuestion = maxGrade / 2;
    const randomGradeGenerator = () => Math.min(Math.round(Math.random() * maxGradePerQuestion), maxGradePerQuestion);
    const questionNames = ["Question 1", "Question 2"];
    const grades = [randomGradeGenerator(), randomGradeGenerator()];
    // total grade is the sum of the grades, unless all grades are null or undefined, in which case it's null
    const totalGrade = grades.every((grade) => grade === null || grade === undefined) ? null : grades.reduce((a, b) => a + b, 0);
    let student = students[Math.floor(Math.random() * students.length)];
    // 20% of the time, switch the student to null
    if (Math.random() < 0.2) {
        student = null;
    }
    let version = null;
    if (versions.length > 0) {
      version = versions[Math.floor(Math.random() * versions.length)];
    // 30% of the time, switch the version to null
      if (Math.random() < 0.3) {
          version = null;
      }
    }
    let idx = Math.floor(Math.random() * 10000000).toString();
    return {
        name: `Submission ${idx}`,
        studentId: (student === null ? null : student.id),
        id: idx,
        grades: questionNames.map((questionName, index) => ({
            questionPosition: index,
            questionName: questionName,
            grade: grades[index],
        })),
        totalGrade: totalGrade,
        canvasId: randomCanvasId,
        createdAt: Date.now(),
        assignmentId: assignmentId,
        versionId: (version === null ? null : version.id),
    };
}

import localforage from 'localforage'
import { matchSorter } from 'match-sorter'

const seed = async () => {
    const courseId = 'usupkc1';
    const assignmentId = 'usajkc1'
    const versions = await getVersionsOfAssignment(assignmentId)
    if (versions.length === 0) {
        console.log("versions not found, seeding", versions) 
        await localforage.setItem(`versions_${assignmentId}`, createInitialVersions(assignmentId))
    }

    const initialData = await createInitialSubs(10, assignmentId, courseId)
    console.log('seeding maybe')
    const submissions = await localforage.getItem(`submissions_${assignmentId}`)
    console.log("seeding: got localforage",`submissions_${assignmentId}`, submissions)
    if (!submissions) {
        console.log("submissions not found, seeding", submissions, initialData) 
        await setSubmissionsOfAssignment(initialData, assignmentId)
    } else {
        console.log("submissions found, not seeding", submissions)
    }
}

await seed()

export async function getSubmissionsOfAssignment(assignmentId, query) {
  await fakeNetwork(`getSubmissions_${assignmentId}:${query}`)
  let submissions = await localforage.getItem(`submissions_${assignmentId}`)
  console.log("getSubmissionsOfAssignment: got localforage",`submissions_${assignmentId}`, submissions)
  if (!submissions) submissions = []
  if (query) {
    submissions = matchSorter(submissions, query, { keys: ['createdAt'] })
  }
  console.log("after filtering:", submissions)
  return submissions
}

export async function getSubmissionOfAssignment(id, assignmentId) {
  await fakeNetwork(`submission:${id}`)
  let submissions = await localforage.getItem(`submissions_${assignmentId}`)
  let submission = submissions.find((submission) => submission.id === id)
  return submission ?? null
}

export async function createSubmissionOfAssignment(assignmentId, courseId, maxGrade) {
  const studentsTask = getStudentsOfCourse(courseId)
  const versionsTask = getVersionsOfAssignment(assignmentId)
  const submissionsTask = getSubmissionsOfAssignment(assignmentId)
  

  const { students, versions, submissions } = {
    students: await studentsTask,
    versions: await versionsTask,
    submissions: await submissionsTask,
  }
  
  console.log("submissions found", submissions.length)
  const submission = createRandomSubmissionItem(maxGrade, assignmentId, students, versions)
  console.log("submission created", submission)
  submissions.unshift(submission)
  console.log("submissions after unshift", submissions.length)
  await setSubmissionsOfAssignment(submissions, assignmentId)
  return submission
}

export async function updateSubmissionOfAssignment(id, assignmentId, updates) {
  await fakeNetwork()
  let submissions = await localforage.getItem(`submissions_${assignmentId}`)
  let submission = submissions.find((submission) => submission.id === id)
  console.log("submission found", submission)
  console.log("updates", updates)
  if (!submission) throw new Error('No submission found for', id)
  Object.assign(submission, updates)
  await setSubmissionsOfAssignment(submissions, assignmentId)
  return submission
}

export async function updateSubmissionGradeOfAssignment(position, id, assignmentId, updates) {
  await fakeNetwork()
  let submissions = await localforage.getItem(`submissions_${assignmentId}`)
  let submission = submissions.find((submission) => submission.id === id)
  console.log("submission found", submission)
  
  console.log("updates", updates)
  let grade = submission.grades.find((grade) => grade.questionPosition === position)
  if (!grade) throw new Error('No submission question found for', id, "position", position)
  Object.assign(grade, {...grade, grade: updates})
  submission.totalGrade = submission.grades.reduce((a, b) => a + b.grade, 0)
  console.log("submission after update", submission)
  await setSubmissionsOfAssignment(submissions, assignmentId)
  return submission
}

export async function updateSubmissionStudentOfAssignment(id, assignmentId, updates) {
  console.log("updateSubmissionStudentOfAssignment", id, assignmentId, updates)
  await fakeNetwork()
  let submissions = await localforage.getItem(`submissions_${assignmentId}`)
  let submission = submissions.find((submission) => submission.id === id)
  console.log("updates", updates)
  if (!submission) throw new Error('No submission found for', id)
  Object.assign(submission, {...submission, studentId: updates.studentId})
  await setSubmissionsOfAssignment(submissions, assignmentId)
  return submission
}

export async function deleteSubmissionOfAssignment(id, assignmentId) {
  let submissions = await localforage.getItem(`submissions_${assignmentId}`)
  let index = submissions.findIndex((submission) => submission.id === id)
  if (index > -1) {
    submissions.splice(index, 1)
    await setSubmissionsOfAssignment(submissions, assignmentId)
    return true
  }
  return false
}

export function setSubmissionsOfAssignment(submissions, assignmentId) {
  return localforage.setItem(`submissions_${assignmentId}`, submissions)
}

async function fakeNetwork() {
  return new Promise((res) => {
    setTimeout(res, Math.random() * 800)
  })
}