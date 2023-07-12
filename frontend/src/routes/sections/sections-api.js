import localforage from 'localforage'
import { matchSorter } from 'match-sorter'

const seed = async () => {
    const courseId = 'usupkc1'
    const sections = await localforage.getItem(`sections_${courseId}`)
    if (!sections) {
        const seedLength = 5
        const initialData = []
        for (let i = 0; i < seedLength; i++) {
            initialData.push(
                createRandomSection(courseId)
            )
        }
        set(initialData, courseId)
    }
}

await seed()

export async function getSectionsOfCourse(courseId, query) {
    await fakeNetwork(`sections:${courseId}`)
  let sections = await localforage.getItem(`sections_${courseId}`)
  if (!sections) sections = []
  if (query) {
    sections = matchSorter(sections, query, { keys: ['id',] })
  }
  return sections
}

// eventually, we will replace this with a call to the backend
function createRandomSection(courseId) {
    const id = Math.random().toString(36).substring(2, 9)
    // 5-digit class number, first digit cannot be 0
    const classNumber = Math.floor(Math.random() * (100000 - 10000) + 10000)
    const section = { 
        id: id, 
        createdAt: Date.now(), 
        classNumber: classNumber,
        courseId: courseId,
        name: 'Section ' + classNumber,
    }

  return section
}

export async function createSection(courseId) {
    await fakeNetwork()
    const section = createRandomSection(courseId)
    const sections = await getSectionsOfCourse(courseId)
    sections.unshift(section)
    await set(sections, courseId)
    return section
}


export async function getSection(id, courseId) {
  await fakeNetwork(`section:${id}`)
  let sections = await localforage.getItem(`sections_${courseId}`)
  let section = sections.find((section) => section.id === id)
  return section ?? null
}

export async function updateSection(id, courseId, updates) {
  await fakeNetwork()
  let sections = await localforage.getItem(`sections_${courseId}`)
  let section = sections.find((section) => section.id === id)
  if (!section) throw new Error('No section found for', id)
  Object.assign(section, updates)
  await set(sections, courseId)
  return section
}

export async function deleteSection(id, courseId) {
  let sections = await localforage.getItem(`sections_${courseId}`)
  let index = sections.findIndex((section) => section.id === id)
  if (index > -1) {
    sections.splice(index, 1)
    await set(sections, courseId)
    return true
  }
  return false
}

function set(sections, courseId) {
  return localforage.setItem(`sections_${courseId}`, sections)
}

async function fakeNetwork() {
  return new Promise((res) => {
    setTimeout(res, Math.random() * 800)
  })
}