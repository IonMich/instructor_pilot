import axios from "axios"
import { loaderFn } from "./utils"
import { auth } from "./auth"
import { CanvasSection, CanvasStudent } from "./types"
import {
  getCanvasCourseLegacyAPI,
  handleCreateCourseSubmitLegacyAPI,
  getAvailableSectionInfoLegacyAPI,
  handleCreateSectionsSubmitLegacyAPI,
} from "./legacyAPI"
export interface Section {
  id: number
  url: string
  name: string
  teaching_assistant: string
  meetings: Meeting[]
  course: Course | number
  class_number: string
  canvas_id: string
  students_count: number
}

export interface Meeting {
  id: number
  day: string
  start_time: string
  end_time: string
  section: Section
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
  profile: {
    avatar?: URL
  }
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

export interface Assignment {
  id: number
  url: string
  name: string
  max_score: number
  position: number
  submission_count: number
  course: Course
  max_question_scores: string
  get_average_grade: number
  get_grading_progress: number
  assignment_group_object: AssignmentGroup
  assignment_group: string
  max_page_number: number
  saved_comments: AssignmentSavedComment[]
  canvas_id?: string
}

export interface AssignmentSavedComment {
  id: number
  title: string
  text: string
  assignment_id: number
  position: number
}

export interface PaperSubmissionImage {
  id: number
  page: number
  image: string
}

export interface InfoField {
  title: string
  assignment_id: number
  description: string
  pattern?: string
  pages?: number[]
}

export interface ExtractedField {
  info_field: InfoField
  submission_image_id: string
  value: string
}

export interface Submission {
  id: string
  url: string
  student?: Student
  grade: number
  version?: Version
  canvas_id: string
  canvas_url: string
  assignment: Assignment
  question_grades: string
  pdf: string
  papersubmission_images: PaperSubmissionImage[]
  submission_comments: SubmissionComment[]
  extracted_fields?: ExtractedField[]
}

export interface Version {
  id: string
  name: string
  version_image: URL
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
  username: string
  email: string
  created: string
  updated: string
  avatar: string
  profile: {
    avatar?: URL
  }
}

export interface AssignmentGroup {
  id: string
  name: string
  position: number
  group_weight: number
}

export interface Announcement {
  id: number
  canvas_id: number
  course: Course
  title: string
  date: string
}

const students: Record<number, Student[]> = {}!
const studentsPromise: Record<number, Promise<void>> = {}

const baseAPIUrl = "http://127.0.0.1:8000/api/"

const urlMapper = {
  sectionsOfCourse: (courseId: number) => `${baseAPIUrl}courses/${courseId}/sections/`,
  section: (sectionId: number) => `${baseAPIUrl}sections/${sectionId}/`,
  assignments: (courseId: number) => `${baseAPIUrl}courses/${courseId}/assignments/`,
  assignment: (assignmentId: number) => `${baseAPIUrl}assignments/${assignmentId}/`,
  studentsInSection: (sectionId: number) => `${baseAPIUrl}sections/${sectionId}/students/`,
  studentsInCourse: (courseId: number) => `${baseAPIUrl}courses/${courseId}/students/`,
  submissions: (assignmentId: number) => `${baseAPIUrl}assignments/${assignmentId}/submissions/`,
  submission: (submissionId: string) => `${baseAPIUrl}submissions/${submissionId}/`,
  announcementsOfCourse: (courseId: number) => `${baseAPIUrl}courses/${courseId}/announcements/`,
}

async function fetchData<T>(url: string, errorMessage: string): Promise<T> {
  console.log(`Fetching data from ${url}`)
  return loaderFn(() =>
    axios.get<T>(url, {
      headers: {
        Authorization: `Bearer ${auth.getToken()}`,
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      if (error.response?.status === 404) {
        throw new Error(errorMessage)
      }
      throw error
    })
  )
}

export async function fetchRequesterUser() {
  return fetchData<User>(`${baseAPIUrl}requester/`, "Requester user not found")
}

export async function fetchCourseById(courseId: number) {
  return fetchData<Course>(`${baseAPIUrl}courses/${courseId}/`, `Course ${courseId} not found`)
}

export async function fetchCourses() {
  return fetchData<Course[]>(`${baseAPIUrl}courses/`, "Courses not found")
}

export async function fetchSectionsOfCourse(courseId: number) {
  return fetchData<Section[]>(urlMapper.sectionsOfCourse(courseId), `Course ${courseId} not found`)
}

export async function fetchSectionById(sectionId: number) {
  return fetchData<Section>(urlMapper.section(sectionId), `Section ${sectionId} not found`)
}

export async function fetchAssignmentsOfCourse(courseId: number) {
  return fetchData<Assignment[]>(urlMapper.assignments(courseId), `Course ${courseId} not found`)
}

export async function fetchAssignmentById(assignmentId: number) {
  return fetchData<Assignment>(urlMapper.assignment(assignmentId), `Assignment ${assignmentId} not found`)
}

export async function fetchAssignmentScoresById(assignmentId: number) {
  return fetchData<number[]>(`${urlMapper.assignment(assignmentId)}scores/`, `Assignment ${assignmentId} not found`)
}

export const ensureStudents = async (sectionId: number) => {
  if (!studentsPromise[sectionId]) {
    studentsPromise[sectionId] = axios.get(urlMapper.studentsInSection(sectionId))
      .then((response) => {
        students[sectionId] = response.data
      })
  }
  await studentsPromise[sectionId]
}

export async function fetchStudents(sectionId: number) {
  await ensureStudents(sectionId)
  return students[sectionId] ?? []
}

export async function fetchStudentsOfCourse(courseId: number) {
  return fetchData<Student[]>(urlMapper.studentsInCourse(courseId), `Course ${courseId} not found`)
}

export async function fetchStudentOfCourseById(courseId: number, id: number) {
  return fetchData<Student>(`${urlMapper.studentsInCourse(courseId)}${id}/`, `Student ${id} not found`)
}

export async function fetchSubmissionsOfAssignment(assignmentId: number) {
  return fetchData<Submission[]>(urlMapper.submissions(assignmentId), `Assignment ${assignmentId} not found`)
}

export async function fetchSubmissionsOfStudentInCourse(courseId: number, studentId: number) {
  return fetchData<Submission[]>(`${urlMapper.studentsInCourse(courseId)}${studentId}/submissions/`, `Student ${studentId} not found in course ${courseId}`)
}

export async function fetchSubmissionById(submissionId: string) {
  return fetchData<Submission>(urlMapper.submission(submissionId), `Submission ${submissionId} not found`)
}

export async function fetchAnnouncementsOfCourse(courseId: number) {
  return fetchData<Announcement[]>(urlMapper.announcementsOfCourse(courseId), "Announcements not found")
}

export async function fetchCanvasCourses() {
  return fetchData<CanvasCourse[]>(`${baseAPIUrl}canvas/courses/`, "Canvas courses not found")
}

export async function fetchCanvasCourse(canvasId: string) {
  return fetchData<CanvasCourse>(`${baseAPIUrl}canvas/courses/${canvasId}/`, `Canvas course ${canvasId} not found`)
}

export async function fetchCanvasSectionsOfCourse(courseId: number) {
  return fetchData<CanvasSection[]>(`${baseAPIUrl}canvas/courses/${courseId}/sections/`, `Canvas sections for course ${courseId} not found`)
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
  const token = auth.getToken()
  return loaderFn(() =>
    axios
      .patch(urlMapper.submission(id), updatedSubmissionFields, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => response.data)
  )
}

export async function identifySubmissionsWorkflow({
  assignmentId,
  ...data
}: {
  assignmentId: number
  pages_selected: number[]
}) {
  const token = auth.getToken()
  return loaderFn(() =>
    axios
      .patch(
        `${urlMapper.assignment(assignmentId)}identify_submissions/`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .then((response) => response.data)
  )
}

export async function versionSubmissionsWorkflow({
  assignmentId,
  ...data
}: {
  assignmentId: number
  pages_selected: number[]
}) {
  const token = auth.getToken()
  return loaderFn(() =>
    axios
      .patch(`${urlMapper.assignment(assignmentId)}version_submissions/`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => response.data)
  )
}

// extractInfoSubmissionsWorkflow
export async function extractInfoSubmissionsWorkflow({
  assignmentId,
  ...data
}: {
  assignmentId: number
  info_fields: InfoField[]
}) {
  const token = auth.getToken()
  return loaderFn(() =>
    axios
      .patch(`${urlMapper.assignment(assignmentId)}extract_info/`, data, {
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
  const token = auth.getToken()
  const formData = new FormData()
  Array.from(filesToSplit).forEach((file) => {
    formData.append("submission_PDFs", file)
  })
  formData.append("num_pages_per_submission", pagesPerSubmission.toString())
  return loaderFn(() =>
    axios
      .post(urlMapper.submissions(assignmentId), formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => response.data)
  )
}

export async function deleteSubmission(submissionId: string) {
  const token = auth.getToken()
  return await loaderFn(() =>
    axios
      .delete(urlMapper.submission(submissionId), {
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

export async function createCourseWithSectionsCanvas({
  courseCanvasId,
  sectionCanvasIds,
}: {
  courseCanvasId: number
  sectionCanvasIds: number[]
}) {
  const responseCanvasCourse = await getCanvasCourseLegacyAPI(courseCanvasId)

  const courseCreationData =
    await handleCreateCourseSubmitLegacyAPI(responseCanvasCourse)
  const courseId = courseCreationData.course_id
  if (!courseId) {
    throw new Error("Course ID not found.")
  }
  console.log(`courseId: ${courseId}`)

  const response = (await getAvailableSectionInfoLegacyAPI(courseCanvasId)) as {
    sections: CanvasSection[]
    students: CanvasStudent[]
    course_description: string
  }

  const [responseCanvasSections, responseCanvasStudents, responseDescription] =
    [response.sections, response.students, response.course_description]
  if (responseCanvasCourse.id !== courseCanvasId) {
    throw new Error("Canvas course ID does not match.")
  }
  if (responseDescription) {
    console.log(`responseDescription: ${responseDescription}`)
    responseCanvasCourse.description = responseDescription
  }
  if (!responseCanvasStudents || responseCanvasStudents.length === 0) {
    throw new Error("No Canvas sections found.")
  }
  console.log(responseCanvasSections)
  const selectedCanvasSections = responseCanvasSections.filter((section) =>
    sectionCanvasIds.includes(section.canvas_id)
  )
  console.log(selectedCanvasSections)
  const selectedCanvasStudents = responseCanvasStudents.filter((student) =>
    sectionCanvasIds.includes(student.enrollments[0].course_section_id)
  )
  const sectionsCreationData = await handleCreateSectionsSubmitLegacyAPI(
    selectedCanvasSections,
    courseId
  )
  return {
    course: courseCreationData,
    sections: sectionsCreationData,
    students: selectedCanvasStudents,
  }
}
