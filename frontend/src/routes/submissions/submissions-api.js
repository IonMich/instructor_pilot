import { getStudentsOfCourse } from '../students/students-api.js'
import { 
  getVersionsOfAssignment,
  getQuestionsOfAssignment, 
} from '../assignments/assignments-api.js'

const randomAnswersGenerator = (maxGradesPerQuestion) => (
  maxGradesPerQuestion.map((maxGrade) => {
      const grade = Math.min(Math.round(Math.random() * maxGrade.maxGrade), maxGrade.maxGrade)
      return {
          position: maxGrade.position,
          grade: grade,
      }
  })
);

export async function getAnswersOfAssignment(assignmentId) {
  await fakeNetwork(`getAnswers_${assignmentId}`)
  let answers = await localforage.getItem(`answers_${assignmentId}`)
  console.log("getAnswersOfAssignment: got localforage",`answers_${assignmentId}`, answers)
  if (!answers) answers = []
  return answers
}

export async function createInitialSubs (assignmentId, courseId) {
    let initialSubs = [];
    let initialAnswers = [];
    const students = await getStudentsOfCourse(courseId);
    const versions = await getVersionsOfAssignment(assignmentId);
    const questions = await getQuestionsOfAssignment(assignmentId);
    for (let i = 0; i < 20; i++) {
      const {newSub, newAnswers} = createRandomSubmissionItem(assignmentId, students, versions, questions);
      initialSubs.push(newSub);
      initialAnswers.push(...newAnswers);
    }
    console.log(
      "INITIAL SUBMISSION ITEMS AND ANSWERS",
      initialSubs, initialAnswers);
    
    return {initialSubs, initialAnswers}
}
  
export function createRandomSubmissionItem(assignmentId, students, versions, questions) {
    if (students.length === 0) {
        throw new Error("No students found");
    }
    const randomCanvasId = Math.floor(Math.random() * 10000000).toString();

    let version = null;
    if (versions.length > 0) {
      version = versions[Math.floor(Math.random() * versions.length)];
    // 30% of the time, switch the version to null
      if (Math.random() < 0.3) {
          version = null;
      }
    }
    const questionsOfVersion = questions.filter((question) => {
      if (version === null) {
        return question.versionId === null;
      } else {
        return question.versionId === version.id;
      }
    });
    // return position, maxGrade
    const maxGradesPerQuestion = questionsOfVersion.map((question) => 
      { return {
        position: question.position, 
        maxGrade: question.maxGrade}
      }
    );

    console.log("MAX GRADES PER QUESTION", maxGradesPerQuestion);
        
    const grades = randomAnswersGenerator(maxGradesPerQuestion);


    
    let student = students[Math.floor(Math.random() * students.length)];
    // 20% of the time, switch the student to null
    if (Math.random() < 0.2) {
        student = null;
    }
    
    let idx = Math.floor(Math.random() * 10000000).toString();
    const newSub = {
        name: `Submission ${idx}`,
        studentId: (student === null ? null : student.id),
        id: idx,
        canvasId: randomCanvasId,
        createdAt: Date.now(),
        assignmentId: assignmentId,
        versionId: (version === null ? null : version.id),
    };

    const newAnswers = questionsOfVersion.map((question) => ({
        position: question.position,
        submissionId: newSub.id,
        gradedAt: Date.now(),
        grade: grades.find((grade) => grade.position === question.position).grade,
    }));

    console.log("newSub", newSub);
    console.log("newAnswers", newAnswers);

    return {newSub, newAnswers};
}

import localforage from 'localforage'
import { matchSorter } from 'match-sorter'

const seed = async () => {
    const courseId = 'usupkc1';
    const assignmentId = 'usajkc1';

    const {initialSubs, initialAnswers} = await createInitialSubs(assignmentId, courseId)
    console.log('seeding maybe')
    console.log("initialData", initialSubs)
    console.log("initialAnswers", initialAnswers)
    const submissions = await localforage.getItem(`submissions_${assignmentId}`)
    console.log("seeding: got localforage",`submissions_${assignmentId}`, submissions)
    if (!submissions) {
        console.log("submissions not found, seeding", submissions, initialSubs) 
        await setSubmissionsOfAssignment(initialSubs, assignmentId)
        await setAnswersOfAssignment(initialAnswers, assignmentId)
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

export async function createSubmissionOfAssignment(assignmentId, courseId) {
  const studentsTask = getStudentsOfCourse(courseId)
  const versionsTask = getVersionsOfAssignment(assignmentId)
  const submissionsTask = getSubmissionsOfAssignment(assignmentId)
  const questionsTask = getQuestionsOfAssignment(assignmentId)
  const answersTask = getAnswersOfAssignment(assignmentId)

  const { students, versions, submissions, questions, answers } = {
    students: await studentsTask,
    versions: await versionsTask,
    submissions: await submissionsTask,
    questions: await questionsTask,
    answers: await answersTask,
  }
  
  console.log("submissions found", submissions.length)
  const {newSub, newAnswers} = createRandomSubmissionItem(assignmentId, students, versions, questions)
  console.log("submission created", newSub)
  // add to the end of the list
  // submissions.push(newSub)
  // console.log("submissions after push", submissions.length)

  // // add answers
  // answers.push(...newAnswers)
  // console.log("answers after push", answers.length)
  
  // const updateAnswersTask =  setAnswersOfAssignment(answers, assignmentId)
  // const updateSubsTask = setSubmissionsOfAssignment(submissions, assignmentId)

  // const {updateAnswers, updateSubs} = {
  //   updateAnswers: await updateAnswersTask,
  //   updateSubs: await updateSubsTask,
  // }

  return {newSub, newAnswers}
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
  let answers = await localforage.getItem(`answers_${assignmentId}`)
  let index = submissions.findIndex((submission) => submission.id === id)
  if (index > -1) {
    submissions.splice(index, 1)
    await setSubmissionsOfAssignment(submissions, assignmentId)
    answers = answers.filter((answer) => answer.submissionId !== id)
    await setAnswersOfAssignment(answers, assignmentId)
    return true
  }

  return false
}

export async function setSubmissionsOfAssignment(submissions, assignmentId) {
  await localforage.setItem(`submissions_${assignmentId}`, submissions)
  console.log("setSubmissionsOfAssignment: set localforage",`submissions_${assignmentId}`, submissions)
  return submissions
}

export async function setAnswersOfAssignment(answers, assignmentId) {
  await localforage.setItem(`answers_${assignmentId}`, answers)
  console.log("setAnswersOfAssignment: set localforage",`answers_${assignmentId}`, answers)
  return answers
}

async function fakeNetwork() {
  return new Promise((res) => {
    setTimeout(res, Math.random() * 800)
  })
}