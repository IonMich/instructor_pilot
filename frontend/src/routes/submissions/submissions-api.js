export function createInitialSubs (maxGrade, assignmentId) {
    let initSubmissionItems = [];
    for (let i = 0; i < 20; i++) {
      initSubmissionItems.push(createRandomSubmissionItem(maxGrade, assignmentId));
    }
    console.log(initSubmissionItems);
    return initSubmissionItems;
}
  
export function createRandomSubmissionItem(maxGrade, assignmentId) {
    const randomCanvasId = Math.floor(Math.random() * 10000000).toString();
    const randomGrade = Math.min(Math.round(Math.random() * maxGrade), maxGrade);
    // name is 20% likely to be null, rest of the time it's a random string of length 5
    const randomName = Math.random() < 0.2 ? null : Math.random().toString(36).substring(2, 7);
    return {
        id: Math.floor(Math.random() * 10000000),
        studentName: randomName,
        grade: randomGrade,
        canvasId: randomCanvasId,
        createdAt: Date.now(),
        assignmentId: assignmentId,
    };
}

import localforage from 'localforage'
import { matchSorter } from 'match-sorter'

const seed = async () => {
    const assignmentId = 'usajkc1'
    const initialData = createInitialSubs(10, assignmentId)
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

seed()

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

export async function createSubmissionOfAssignment(assignmentId, maxGrade) {
  await fakeNetwork()
  const submission = createRandomSubmissionItem(maxGrade, assignmentId)
  const submissions = await getSubmissionsOfAssignment(assignmentId)
  submissions.unshift(submission)
  await setSubmissionsOfAssignment(submissions, assignmentId)
  return submission
}

export async function updateSubmissionOfAssignment(id, updates, assignmentId) {
  await fakeNetwork()
  let submissions = await localforage.getItem(`submissions_${assignmentId}`)
  let submission = submissions.find((submission) => submission.id === id)
  if (!submission) throw new Error('No submission found for', id)
  Object.assign(submission, updates)
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