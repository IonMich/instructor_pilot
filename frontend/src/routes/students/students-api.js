import localforage from 'localforage'
import { matchSorter } from 'match-sorter'

import { getSectionsOfCourse } from '../sections/sections-api.js'

const firstNameChoices = [
    "John", "Jane", "Joe", "Jill", "Jack", 
    "Keegan", "Katie", "Karl", "Kathy", "Kurt",
    "Lucy", "Liam", "Lily", "Linda", "Lance",
    "Molly", "Mike", "Mia", "Mason", "Megan",
    "Nancy", "Nick", "Natalie", "Nathan", "Nina",
]
const lastNameChoices = [
    "Smith", "Johnson", "Williams", "Jones", "Brown",
    "Davis", "Miller", "Wilson", "Moore", "Taylor",
    "Anderson", "Thomas", "Jackson", "White", "Harris",
    "Martin", "Thompson", "Garcia", "Martinez", "Robinson",
]

const seed = async () => {
    const courseId = 'usupkc1'
    const sections = await getSectionsOfCourse(courseId)
    const students = await localforage.getItem(`students_${courseId}`)
    if (!students) {
        const seedLength = 100
        const initialData = []
        for (let i = 0; i < seedLength; i++) {
            initialData.push(
                createRandomStudent(courseId, sections)
            )
        }
        set(initialData, courseId)
    }
}

await seed()

export async function getStudentsOfCourse(courseId, query) {
  await fakeNetwork(`students:${courseId}`)
  let students = await localforage.getItem(`students_${courseId}`)
  if (!students) students = []
  if (query) {
    students = matchSorter(students, query, { keys: ['lastName', 'firstName'] })
  }
  return students
}

function createRandomStudent(courseId, sections) {
    const id = Math.random().toString(36).substring(2, 9)
    const firstName = firstNameChoices[Math.floor(Math.random() * firstNameChoices.length)]
    const lastName = lastNameChoices[Math.floor(Math.random() * lastNameChoices.length)]
    const name = firstName + ' ' + lastName
    const uniId = Math.floor(Math.random() * (100000000 - 10000000) + 10000000)
    const section = sections[Math.floor(Math.random() * sections.length)]
    const student = { id, createdAt: Date.now(), name, firstName, lastName, uniId, section: section }
  return student
}

export async function createStudent(courseId) {
    await fakeNetwork()
    const sections = await getSectionsOfCourse(courseId)
    const student = createRandomStudent(courseId, sections)
    const students = await getStudentsOfCourse(courseId)
    students.unshift(student)
    await set(students, courseId)
    return student
}


export async function getStudent(id, courseId) {
  await fakeNetwork(`student:${id}`)
  let students = await localforage.getItem(`students_${courseId}`)
  let student = students.find((student) => student.id === id)
  return student ?? null
}

export async function updateStudent(id, courseId, updates) {
  await fakeNetwork()
  let students = await localforage.getItem(`students_${courseId}`)
  let student = students.find((student) => student.id === id)
  if (!student) throw new Error('No student found for', id)
  Object.assign(student, updates)
  await set(students, courseId)
  return student
}

export async function deleteStudent(id, courseId) {
  let students = await localforage.getItem(`students_${courseId}`)
  let index = students.findIndex((student) => student.id === id)
  if (index > -1) {
    students.splice(index, 1)
    await set(students, courseId)
    return true
  }
  return false
}

function set(students, courseId) {
  return localforage.setItem(`students_${courseId}`, students)
}

async function fakeNetwork() {
  return new Promise((res) => {
    setTimeout(res, Math.random() * 800)
  })
}