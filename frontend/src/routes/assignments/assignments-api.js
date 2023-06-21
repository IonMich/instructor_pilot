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
    console.log('seeding assignments')
    const assignments = await localforage.getItem(`assignments_${courseId}`)
    if (!assignments) {
        setAssignmentsOfCourse(initialData, courseId)
    }
}

seed()

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
  let assignment = assignments.find((assignment) => assignment.id === id)
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

function setAssignmentsOfCourse(assignments, courseId) {
  return localforage.setItem(`assignments_${courseId}`, assignments)
}

async function fakeNetwork() {
  return new Promise((res) => {
    setTimeout(res, Math.random() * 800)
  })
}