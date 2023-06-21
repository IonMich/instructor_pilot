import localforage from 'localforage'
import { matchSorter } from 'match-sorter'

const seed = async () => {
  const initialData = [
    {
      imageUrl: 'https://avatars.githubusercontent.com/u/5580297?v=4',
      createdAt: 1660978713047,
      favorite: false,
      name: 'PHY2048 - Physics 1',
      id: 'usupkc1',
      code: 'PHY2048',
      term: 'Fall 2021',
      description: 'Created React Query',
    },
    {
      imageUrl: 'https://avatars.githubusercontent.com/u/1021430',
      createdAt: 1660979124264,
      favorite: false,
      name: 'PHY2054 - Physics 2',
      id: 'kvvztl7',
      code: 'PHY2054',
      term: 'Summer 2023',
      description: 'Maintains React Query',
    },
  ]
  const courses = await localforage.getItem('courses')
  if (!courses) {
    set(initialData)
  }
}

seed()

export async function getCourses(query) {
  await fakeNetwork(`getCourses:${query}`)
  let courses = await localforage.getItem('courses')
  if (!courses) courses = []
  if (query) {
    courses = matchSorter(courses, query, { keys: ['name', 'code'] })
  }
  return courses
}

export async function createCourse() {
  await fakeNetwork()
  const id = Math.random().toString(36).substring(2, 9)
  const course = { id, createdAt: Date.now() }
  const courses = await getCourses()
  courses.unshift(course)
  await set(courses)
  return course
}

export async function getCourse(id) {
  await fakeNetwork(`course:${id}`)
  let courses = await localforage.getItem('courses')
  let course = courses.find((course) => course.id === id)
  return course ?? null
}

export async function updateCourse(id, updates) {
  await fakeNetwork()
  let courses = await localforage.getItem('courses')
  let course = courses.find((course) => course.id === id)
  if (!course) throw new Error('No course found for', id)
  Object.assign(course, updates)
  await set(courses)
  return course
}

export async function deleteCourse(id) {
  let courses = await localforage.getItem('courses')
  let index = courses.findIndex((course) => course.id === id)
  if (index > -1) {
    courses.splice(index, 1)
    await set(courses)
    return true
  }
  return false
}

function set(courses) {
  return localforage.setItem('courses', courses)
}

async function fakeNetwork() {
  return new Promise((res) => {
    setTimeout(res, Math.random() * 800)
  })
}