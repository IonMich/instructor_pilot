import axios from "axios"
import { loaderFn } from "./utils"
import { auth } from "./auth"
export interface Section {
  id: number
  url: string
  name: string
  teaching_assistant: string
  meetings: string
  course: Course | number
  class_number: string
  canvas_id: string
  students_count: number
}

export interface Student {
  id: number
  first_name: string
  last_name: string
  email: string
  uni_id: string
  created: string
  updated: string
  canvas_id: string
  avatar?: string
  sections: Section[]
}

export interface Course {
  id: number
  url: string
  name: string
  course_code: string
  term: string
  canvas_id: string
  sections: Section[]
}

export interface CanvasCourse {
  canvas_id: number
  name: string
  course_code: string
  term: {
    name: string
  }
  total_students: number
  teachers: {
    display_name: string
  }[]
  already_exists: boolean
}

export interface CanvasSection {
  canvas_id: number
  name: string
  total_students: number
}

export interface Assignment {
  id: number
  url: string
  name: string
  max_score: number
  position: number
  submission_count: number
  course: Course | number
  max_question_scores: string
  get_average_grade: number
  get_grading_progress: number
  assignment_group_object: AssignmentGroup
}

export interface PaperSubmissionImage {
  id: number
  page: number
  image: string
}

export interface Submission {
  id: string
  url: string
  student?: Student
  grade: number
  version?: {
    id: number
    name: string
  }
  canvas_id: string
  canvas_url: string
  assignment: Assignment
  question_grades: string
  pdf: string
  papersubmission_images: PaperSubmissionImage[]
  submission_comments: SubmissionComment[]
}

export interface SubmissionComment {
  id: number
  text: string
  author: User | Student
  created_at: string
  updated_at: string
}

export interface User {
  id: number
  first_name: string
  last_name: string
  email: string
  created: string
  updated: string
  avatar: string
}

export interface AssignmentGroup {
  id: string
  name: string
  position: number
  group_weight: number
}

const students: Record<number, Student[]> = {}!
const studentsPromise: Record<number, Promise<void>> = {}

const baseAPIUrl = "http://127.0.0.1:8000/api/"

const sectionsOfCourseUrlMapper = (courseId: number) => {
  return `${baseAPIUrl}courses/${courseId}/sections/`
}

const sectionUrlMapper = (sectionId: number) => {
  return `${baseAPIUrl}sections/${sectionId}/`
}

const assignmentsUrlMapper = (courseId: number) => {
  return `${baseAPIUrl}courses/${courseId}/assignments/`
}

const assignmentUrlMapper = (assignmentId: number) => {
  return `${baseAPIUrl}assignments/${assignmentId}/`
}

const studentsInSectionUrlMapper = (sectionId: number) => {
  return `${baseAPIUrl}sections/${sectionId}/students/`
}

const studentsInCourseUrlMapper = (courseId: number) => {
  return `${baseAPIUrl}courses/${courseId}/students/`
}

const submissionsUrlMapper = (assignmentId: number) => {
  return `${baseAPIUrl}assignments/${assignmentId}/submissions/`
}

const submissionUrlMapper = (submissionId: string) => {
  return `${baseAPIUrl}submissions/${submissionId}/`
}

export async function fetchCourseById(courseId: number) {
  console.log("Fetching course by Id", courseId)
  const course = loaderFn(() =>
    Promise.resolve().then(async () => {
      const item = await axios
        .get<Course>(`${baseAPIUrl}courses/${courseId}/`)
        .then((response) => response.data)
        .catch((error) => {
          if (error.response?.status === 404) {
            throw new Error(`Course ${courseId} not found`)
          }
          throw error
        })
      return item
    })
  )
  return course
}

export async function fetchCourses() {
  console.log("Fetching courses")
  const courses = loaderFn(() =>
    Promise.resolve().then(async () => {
      const items = await axios
        .get<Course[]>(`${baseAPIUrl}courses/`)
        .then((response) => response.data)
        .catch((error) => {
          throw error
        })
      return items
    })
  )
  return courses
}

export async function fetchSectionsOfCourse(courseId: number) {
  console.log("Fetching sections of course", courseId)
  const sections = loaderFn(() =>
    Promise.resolve().then(async () => {
      const items = await axios
        .get<Section[]>(sectionsOfCourseUrlMapper(courseId))
        .then((response) => response.data)
        .catch((error) => {
          if (error.response?.status === 404) {
            throw new Error(`Course ${courseId} not found`)
          }
          throw error
        })
      return items
    })
  )
  return sections
}

export async function fetchSectionById(sectionId: number) {
  console.log("Fetching sections by Id", sectionId)
  const section = loaderFn(() =>
    Promise.resolve().then(async () => {
      const item = await axios
        .get<Section>(sectionUrlMapper(sectionId))
        .then((response) => response.data)
        .catch((error) => {
          if (error.response?.status === 404) {
            throw new Error(`Section ${sectionId} not found`)
          }
          throw error
        })
      return item
    })
  )
  return section
}

export async function fetchAssignmentsOfCourse(courseId: number) {
  console.log("Fetching assignments of course", courseId)
  const assignments = loaderFn(() =>
    Promise.resolve().then(async () => {
      const result = await axios
        .get<Assignment[]>(assignmentsUrlMapper(courseId))
        .then((response) => response.data)
        .catch((error) => {
          if (error.response?.status === 404) {
            throw new Error(`Course ${courseId} not found`)
          }
          throw error
        })
      return result
    })
  )
  return assignments
}

export async function fetchAssignmentById(assignmentId: number) {
  console.log("Fetching assignment by Id", assignmentId)
  const assignment = loaderFn(() =>
    Promise.resolve().then(async () => {
      const result = await axios
        .get<Assignment>(assignmentUrlMapper(assignmentId))
        .then((response) => response.data)
        .catch((error) => {
          if (error.response?.status === 404) {
            throw new Error(`Assignment ${assignmentId} not found`)
          }
          throw error
        })
      return result
    })
  )
  return assignment
}

export const ensureStudents = async (sectionId: number) => {
  if (!studentsPromise[sectionId]) {
    studentsPromise[sectionId] = Promise.resolve().then(async () => {
      const { data } = await axios.get(studentsInSectionUrlMapper(sectionId))
      students[sectionId] = data
    })
  }
  await studentsPromise[sectionId]
}

export async function fetchStudents(sectionId: number) {
  return await loaderFn(() =>
    ensureStudents(sectionId).then(() => students[sectionId] ?? [])
  )
}

export async function fetchStudentsOfCourse(courseId: number) {
  console.log("Fetching students of course", courseId)
  const studs = loaderFn(() =>
    Promise.resolve().then(async () => {
      const fetch_result = await axios
        .get<Student[]>(studentsInCourseUrlMapper(courseId))
        .then((response) => response.data)
        .catch((error) => {
          if (error.response?.status === 404) {
            throw new Error(`Course ${courseId} not found`)
          }
          throw error
        })
      return fetch_result
    })
  )
  return studs
}

export async function fetchStudentOfCourseById(courseId: number, id: number) {
  console.log(`Fetching student of course ${courseId} by Id`, id)
  const student = loaderFn(() =>
    Promise.resolve().then(async () => {
      const fetch_result = await axios
        .get<Student>(`${studentsInCourseUrlMapper(courseId)}${id}/`)
        .then((response) => response.data)
        .catch((error) => {
          if (error.response?.status === 404) {
            throw new Error(`Student ${id} not found`)
          }
          throw error
        })
      return fetch_result
    })
  )
  return student
}

export async function fetchSubmissionsOfAssignment(assignmentId: number) {
  console.log("Fetching submissions of assignment", assignmentId)
  const submissions = loaderFn(() =>
    Promise.resolve().then(async () => {
      const subs = await axios
        .get<Submission[]>(submissionsUrlMapper(assignmentId))
        .then((response) => response.data)
        .catch((error) => {
          if (error.response?.status === 404) {
            throw new Error(`Assignment ${assignmentId} not found`)
          }
          throw error
        })
      return subs
    })
  )
  return submissions
}

export async function fetchSubmissionsOfStudentInCourse(
  courseId: number,
  studentId: number
) {
  console.log("Fetching submissions of student in course", courseId, studentId)
  const submissions = loaderFn(() =>
    Promise.resolve().then(async () => {
      const subs = await axios
        .get<Submission[]>(
          `${studentsInCourseUrlMapper(courseId)}${studentId}/submissions/`
        )
        .then((response) => response.data)
        .catch((error) => {
          if (error.response?.status === 404) {
            throw new Error(
              `Student ${studentId} not found in course ${courseId}`
            )
          }
          throw error
        })
      return subs
    })
  )
  return submissions
}

export async function fetchSubmissionById(submissionId: string) {
  console.log("Fetching submissions by Id", submissionId)
  const submission = loaderFn(() =>
    Promise.resolve().then(async () => {
      const sub = await axios
        .get<Submission>(submissionUrlMapper(submissionId))
        .then((response) => response.data)
        .catch((error) => {
          if (error.response?.status === 404) {
            throw new Error(`Submission ${submissionId} not found`)
          }
          throw error
        })
      return sub
    })
  )
  return submission
}

export async function patchSubmission({
  id,
  ...updatedSubmissionFields
}: {
  id: string
  question_grades?: string
  student?: {
    id: number
  }
}) {
  // use auth to get the token
  const token = auth.getToken()
  return loaderFn(() =>
    axios
      .patch(submissionUrlMapper(id), updatedSubmissionFields, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => response.data)
  )
}

export async function createSubmissionsBySplittingPDFs({
  assignmentId,
  pagesPerSubmission,
  filesToSplit,
}: {
  assignmentId: number
  pagesPerSubmission: number
  filesToSplit: FileList
}) {
  // use auth to get the token
  const token = auth.getToken()
  const formData = new FormData()
  Array.from(filesToSplit).forEach((file) => {
    formData.append("submission_PDFs", file)
  })
  formData.append("num_pages_per_submission", pagesPerSubmission.toString())
  return loaderFn(() =>
    axios
      .post(submissionsUrlMapper(assignmentId), formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => response.data)
  )
}

export async function deleteSubmission(submissionId: string) {
  // use auth to get the token
  const token = auth.getToken()
  return await loaderFn(() =>
    axios
      .delete(submissionUrlMapper(submissionId), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        console.log("response: ", response)
        return response.data
      })
  )
}

export async function createCommentOnSubmission({
  submissionId,
  text,
}: {
  submissionId: string
  text: string
}) {
  // use auth to get the token
  const token = auth.getToken()
  return loaderFn(() =>
    axios
      .post(
        `${baseAPIUrl}comments/`,
        { submission_id: submissionId, text: text },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .then((response) => response.data)
  )
}

export async function fetchCanvasCourses() {
  console.log("Fetching Canvas Courses of user")
  const canvas_courses = loaderFn(() =>
    Promise.resolve().then(async () => {
      const items = await axios
        .get<CanvasCourse[]>(`${baseAPIUrl}canvas/courses/`)
        .then((response) => response.data)
        .catch((error) => {
          throw error
        })
      return items
    })
  )
  return canvas_courses
}

// fetchCanvasSectionsOfCourse
export async function fetchCanvasSectionsOfCourse(courseId: number) {
  console.log("Fetching Canvas Sections of course", courseId)
  const canvas_sections = loaderFn(() =>
    Promise.resolve().then(async () => {
      const items = await axios
        .get<CanvasSection[]>(`${baseAPIUrl}canvas/courses/${courseId}/sections/`)
        .then((response) => response.data)
        .catch((error) => {
          throw error
        })
      return items
    })
  )
  return canvas_sections
}

