import localforage from 'localforage'
import { matchSorter } from 'match-sorter'

const seed = async () => {
    const courseId = 'usupkc1'
    const initialData = [
        {
        createdAt: 1640978713047,
        name: 'Quiz 1',
        id: 'usajkc1',
        description: 'The first quiz of the semester',
        courseId: courseId,
        maxGrade: 10,
        lenSubmissions: 125,
        },
        {
        createdAt: 1640979124264,
        name: 'Quiz 2',
        id: 'kvvajl7',
        description: 'Second quiz of the semester',
        courseId: courseId,
        maxGrade: 20,
        lenSubmissions: 120,
        },
    ]
    console.log('maybe seeding assignments')
    let assignments = await localforage.getItem(`assignments_${courseId}`)
    if (!assignments) {
        console.log("assignments not found, seeding", assignments, initialData) 
        await setAssignmentsOfCourse(initialData, courseId)
        assignments = await localforage.getItem(`assignments_${courseId}`)
    } else {
      console.log("assignments found, not seeding", assignments)
    }
    if (!assignments) return
    for (const assignment of assignments) {
        let versions = await getVersionsOfAssignment(assignment.id)
        if (versions.length === 0) {
            console.log("versions not found, seeding", versions)
            versions = createInitialVersions(assignment.id)
            await setVersionsOfAssignment(versions, assignment.id)

        } else {
            console.log("versions found, not seeding", versions)
        }
        let questions = await getQuestionsOfAssignment(assignment.id)
        if (questions.length === 0) {
            console.log("questions not found, seeding", questions)
            questions = await createInitialQuestions(versions, courseId)
            await setQuestionsOfAssignment(questions, assignment.id)
        }
      }
}

await seed()

export async function getVersionsOfAssignment(assignmentId) {
  await fakeNetwork(`getVersions_${assignmentId}`)
  let versions = await localforage.getItem(`versions_${assignmentId}`)
  console.log("getVersionsOfAssignment: got localforage",`versions_${assignmentId}`, versions)
  if (!versions) versions = []
  return versions
}



function createInitialVersions(assignmentId) {
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

export async function getQuestionsOfAssignment(assignmentId) {
  await fakeNetwork(`getQuestions_${assignmentId}`)
  let exitingQuestions = await localforage.getItem(`questions_${assignmentId}`)
  console.log("getQuestionsOfAssignment: got localforage",`questions_${assignmentId}`, exitingQuestions)
  if (!exitingQuestions) exitingQuestions = []
  return exitingQuestions
}

async function createInitialQuestions (versions, courseId) {
  let initQuestions = [];
  let questionMaxGrades = [];
  const numQuestions = 2;
  // first check if there are other versions in the assignment
  const assignmentId = versions[0].assignmentId;
  const existingQuestions = await getQuestionsOfAssignment(assignmentId);
  console.log("creating questions for versions:", versions)
  console.log("when creating questions, get the following questions:", existingQuestions)

  if (existingQuestions.length > 0) {
    // if there are other versions, get the max grade
    console.log("there are other questions, getting max grade from existing questions")
    for (const question of existingQuestions) {
      questionMaxGrades.push(question.maxGrade);
    }
  } else {
    console.log("there are no other questions, getting max grade from assignment")
    console.log("assignmentId:", assignmentId)

    // get the max grade from the assignment properties
    const assignment = await getAssignmentOfCourse(assignmentId, courseId);
    const maxGrade = assignment?.maxGrade ?? null;
    for (let i = 0; i < numQuestions; i++) {
      questionMaxGrades.push(maxGrade / numQuestions);
    }
  }

  console.log(questionMaxGrades);

  for (const version of versions) {

    for (let j = 0; j < numQuestions; j++) {
      // random question id
      const newQuestionId = Math.floor(Math.random() * 10000000);
      const questionName = `Question ${j + 1}`;
      const newQuestion = {
        id: newQuestionId.toString(),
        name: questionName,
        versionId: version.id,
        position: j,
        createdAt: Date.now(),
        maxGrade: questionMaxGrades[j],
      };
      initQuestions.push(newQuestion);
    }
  }
  console.log(initQuestions);
  return initQuestions;
}

export async function getAssignmentsOfCourse(courseId, query) {
  await fakeNetwork(`getAssignments_${courseId}:${query}`)
  let assignments = await localforage.getItem(`assignments_${courseId}`)
  if (!assignments) assignments = []
  if (query) {
    assignments = matchSorter(assignments, query, { keys: ['name'] })
  }
  return assignments
}

export async function getAssignmentOfCourse(id, courseId) {
  await fakeNetwork(`assignment:${id}`)
  let assignments = await localforage.getItem(`assignments_${courseId}`)
  let assignment = assignments?.find((assignment) => assignment.id === id)
  return assignment ?? null
}

export async function createAssignmentOfCourse(courseId) {
  await fakeNetwork()
  const id = Math.random().toString(36).substring(2, 9)
  const assignment = { id, createdAt: Date.now() }
  const assignments = await getAssignmentsOfCourse(courseId)
  assignments.unshift(assignment)
  await setAssignmentsOfCourse(assignments, courseId)
  return assignment
}

export async function updateAssignmentOfCourse(id, updates, courseId) {
  await fakeNetwork()
  let assignments = await localforage.getItem(`assignments_${courseId}`)
  let assignment = assignments.find((assignment) => assignment.id === id)
  if (!assignment) throw new Error('No assignment found for', id)
  Object.assign(assignment, updates)
  await setAssignmentsOfCourse(assignments, courseId)
  return assignment
}

export async function deleteAssignmentOfCourse(id, courseId) {
  let assignments = await localforage.getItem(`assignments_${courseId}`)
  let index = assignments.findIndex((assignment) => assignment.id === id)
  if (index > -1) {
    assignments.splice(index, 1)
    await setAssignmentsOfCourse(assignments, courseId)
    return true
  }
  return false
}

async function setAssignmentsOfCourse(assignments, courseId) {
  return await localforage.setItem(`assignments_${courseId}`, assignments)
}

async function setVersionsOfAssignment(versions, assignmentId) {
  return await localforage.setItem(`versions_${assignmentId}`, versions)
}

async function setQuestionsOfAssignment(questions, assignmentId) {
  return await localforage.setItem(`questions_${assignmentId}`, questions)
}

async function fakeNetwork() {
  return new Promise((res) => {
    setTimeout(res, Math.random() * 800)
  })
}