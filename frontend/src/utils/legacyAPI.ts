import axios from "axios"
import { CanvasSection, CanvasStudent } from "./types"
import { loaderFn } from "./utils"
import { auth } from "./auth"
const legacyBaseAPIUrl = "http://127.0.0.1:8000/"

export async function getCanvasCourseLegacyAPI(courseCanvasId: number) {
  // FIXED: Should move to fetchData.ts after updating the urls
  console.log("Fetching Canvas Course with ID", courseCanvasId)
  const canvas_course = loaderFn(() =>
    Promise.resolve().then(async () => {
      const item = await axios
        .get(`${legacyBaseAPIUrl}api/canvas/courses/${courseCanvasId}/`)
        .then((response) => response.data)
        .catch((error) => {
          throw error
        })
      console.log(item)
      return item
    })
  )
  return canvas_course
}

export async function getAvailableSectionInfoLegacyAPI(courseCanvasId: number) {
  const token = auth.getToken()
  console.log("Fetching Canvas Course Sections with ID", courseCanvasId)
  // TODO: add token to all GET requests that should be authenticated!
  const data = loaderFn(() =>
    Promise.resolve().then(async () => {
      const items = await axios
        .get(
          `${legacyBaseAPIUrl}legacy/canvas/courses/${courseCanvasId}/sections/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        .then((response) => response.data)
        .catch((error) => {
          throw error
        })
      return items
    })
  )
  return data
}

export async function getAssignmentGroupsCanvasLegacyAPI(
  courseCanvasId: number
) {
  const token = auth.getToken()
  console.log(
    "Fetching Canvas Assignment Groups of Course with ID",
    courseCanvasId
  )
  const data = loaderFn(() =>
    Promise.resolve().then(async () => {
      const items = await axios
        .get(
          `${legacyBaseAPIUrl}legacy/canvas/courses/${courseCanvasId}/assignment_groups/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        .then((response) => response.data)
        .catch((error) => {
          throw error
        })
      return items
    })
  )
  return data
}

export async function getAssignmentsCanvasLegacyAPI(courseCanvasId: number) {
  const token = auth.getToken()
  console.log("Fetching Canvas Assignments of Course with ID", courseCanvasId)
  const data = loaderFn(() =>
    Promise.resolve().then(async () => {
      const items = await axios
        .get(
          `${legacyBaseAPIUrl}legacy/canvas/courses/${courseCanvasId}/assignments/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        .then((response) => response.data)
        .catch((error) => {
          throw error
        })
      return items
    })
  )
  return data
}

export async function getAnnouncementsCanvasLegacyAPI(courseCanvasId: number) {
  const token = auth.getToken()
  console.log("Fetching Canvas Announcements of Course with ID", courseCanvasId)
  const data = loaderFn(() =>
    Promise.resolve().then(async () => {
      const items = await axios
        .get(
          `${legacyBaseAPIUrl}legacy/canvas/courses/${courseCanvasId}/announcements/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        .then((response) => response.data)
        .catch((error) => {
          throw error
        })
      return items
    })
  )
  return data
}

export async function handleCreateCourseSubmitLegacyAPI(selectedCourse) {
  const token = auth.getToken()
  const url = `${legacyBaseAPIUrl}legacy/courses/create/`
  const csrfTokenElem = document.querySelector(
    "[name=csrfmiddlewaretoken]"
  ) as HTMLInputElement
  const csrfToken = csrfTokenElem ? csrfTokenElem.value : ""

  const formData = new FormData()
  formData.append("canvas_id", selectedCourse.id)
  formData.append("name", selectedCourse.name)
  if (selectedCourse.term) {
    formData.append("term", selectedCourse.term.name)
  }
  if (selectedCourse.start_at_date) {
    const date = selectedCourse.start_at_date.split("T")[0]
    formData.append("start_date", date)
  }
  if (selectedCourse.end_at_date) {
    const date = selectedCourse.end_at_date.split("T")[0]
    formData.append("end_date", date)
  }
  formData.append(
    "description",
    selectedCourse.public_description || selectedCourse.description || ""
  )
  formData.append("course_code", selectedCourse.course_code || "")
  formData.append("image_url", selectedCourse.image_download_url || "")
  console.log(...formData)
  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-CSRFToken": csrfToken,
    },
    // stringify the formData object
    body: JSON.stringify(Object.fromEntries(formData)),
  }
  let data
  try {
    const response = await fetch(url, options)
    data = await response.json()
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error("Unauthorized. Please log in and try again.")
    }
    console.log(error)
    throw new Error("Error creating course")
  }
  return Promise.resolve(data)
}

export async function handleCreateSectionsSubmitLegacyAPI(
  selectedCanvasSections: CanvasSection[],
  courseId: number
) {
  const token = auth.getToken()
  console.log(selectedCanvasSections)
  const url = `${legacyBaseAPIUrl}legacy/courses/${courseId}/sections/create/`
  const csrfTokenElem = document.querySelector(
    "[name=csrfmiddlewaretoken]"
  ) as HTMLInputElement
  const csrfToken = csrfTokenElem ? csrfTokenElem.value : ""
  const sectionCreationData = []
  for (const section of selectedCanvasSections) {
    console.log(section)
    const formData = new FormData()
    formData.append("canvas_id", section.id)
    formData.append("name", section.name)
    formData.append("class_number", section.classNumber || "")
    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-CSRFToken": csrfToken,
      },
      // stringify the formData object
      body: JSON.stringify(Object.fromEntries(formData)),
    }
    try {
      const response = await fetch(url, options)
      const data = await response.json()
      sectionCreationData.push(data)
      const meetResponseData = await createMeetingsLegacyAPI(
        data.section_id,
        section.meetTimes
      )
      meetResponseData.section = data
      sectionCreationData.push(meetResponseData)
    } catch (error) {
      console.log(error)
      if (error.response?.status === 401) {
        throw new Error("Unauthorized. Please log in and try again.")
      }
      throw new Error("Error creating sections")
    }
  }
  return {
    message: "Successfully created sections",
    success: true,
    sectionCreationData,
    category: "sections",
  }
}

export async function createMeetingsLegacyAPI(sectionId: number, meetTimes) {
  const token = auth.getToken()
  const url = `${legacyBaseAPIUrl}legacy/sections/${sectionId}/meetings/`
  const csrfTokenElem = document.querySelector(
    "[name=csrfmiddlewaretoken]"
  ) as HTMLInputElement
  const csrfToken = csrfTokenElem ? csrfTokenElem.value : ""

  const optionsDelete = {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      "X-CSRFToken": csrfToken,
    },
  }
  let data
  try {
    const response = await fetch(url, optionsDelete)
    data = await response.json()
    console.log(data)
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error("Unauthorized. Please log in and try again.")
    }
    console.log(error)
    throw new Error("Error deleting meetings")
  }

  if (!meetTimes) {
    return data
  }
  const canvasAPItimeNames = ["meetTimeBegin", "meetTimeEnd"]
  const dbTimeNames = ["start_time", "end_time"]
  for (const meetTime of meetTimes) {
    const formData = new FormData()
    formData.append("day", meetTime.meetDays.join(""))
    for (let i = 0; i < canvasAPItimeNames.length; i++) {
      const time = meetTime[canvasAPItimeNames[i]]
      const dbTimeName = dbTimeNames[i]
      const timeAsDate = new Date(`1/1/2021 ${time}`)
      console.log(timeAsDate)
      const timeAs24Hour = timeAsDate.getHours() + ":" + timeAsDate.getMinutes()
      console.log(timeAs24Hour)
      formData.append(dbTimeName, timeAs24Hour)
    }
    formData.append(
      "location",
      meetTime.meetBuilding
        ? `${meetTime.meetBuilding} ${meetTime.meetRoom}`
        : ""
    )
    const options = {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        "X-CSRFToken": csrfToken,
      },
      // stringify the formData object
      body: JSON.stringify(Object.fromEntries(formData)),
    }
    let dataMeet
    try {
      const response = await fetch(url, options)
      dataMeet = await response.json()
      console.log(`Meeting created for ${sectionId}`)
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error("Unauthorized. Please log in and try again.")
      }
      console.log(error)
      throw new Error("Error creating meetings")
    }

    return dataMeet
  }
}

export async function populateStudentsCanvas({
  selectedCanvasStudents,
  courseId,
}: {
  selectedCanvasStudents: CanvasStudent[]
  courseId: number
}) {
  const token = auth.getToken()
  const url = `${legacyBaseAPIUrl}legacy/courses/${courseId}/enrollments/create/`
  const csrfTokenElem = document.querySelector(
    "[name=csrfmiddlewaretoken]"
  ) as HTMLInputElement
  const csrfToken = csrfTokenElem ? csrfTokenElem.value : ""
  const all_data = []
  const formData = new FormData()
  formData.append("course_id", courseId.toString())
  const studentsData = []

  for (const student of selectedCanvasStudents) {
    console.log(`Adding ${student.sortable_name} to the course`)
    const studentData = {
      canvas_id: student.canvas_id,
      last_name: student.sortable_name.split(",")[0].trim(),
      first_name: student.sortable_name.split(",")[1].trim(),
      uni_id:
        student.sis_user_id ||
        student.sis_login_id ||
        student.uuid ||
        `canvas:${student.canvas_id}`,
      email: student.sis_login_id || null,
      section_id: student.enrollments[0].course_section_id,
      bio: student.bio || "",
      avatar_url: student.avatar_url || "",
    }
    console.log(studentData)
    studentsData.push(studentData)
  }
  formData.append("students", JSON.stringify(studentsData))

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify(Object.fromEntries(formData)),
  }
  let data
  try {
    const response = await fetch(url, options)
    data = await response.json()
    console.log(data)
    all_data.push(data)
  } catch (error) {
    console.log(error)
    all_data.push(error)
    return {
      success: false,
      message: "Could not add students to course",
    }
  }

  return {
    success: true,
    data: all_data,
    message: "Successfully added students to course",
    category: "students",
  }
}

export async function createAssignmentGroupsCanvas({
  courseCanvasId,
  courseId,
}: {
  courseCanvasId: number
  courseId: number
}) {
  const token = auth.getToken()
  const url = `${legacyBaseAPIUrl}legacy/courses/${courseId}/assignmentgroups/create/`
  const csrfTokenElem = document.querySelector(
    "[name=csrfmiddlewaretoken]"
  ) as HTMLInputElement
  const csrfToken = csrfTokenElem ? csrfTokenElem.value : ""
  console.log(csrfToken)
  const canvasAssignmentGroupsData =
    await getAssignmentGroupsCanvasLegacyAPI(courseCanvasId)
  if (!canvasAssignmentGroupsData) {
    console.log("Empty assignment groups data")
    return {
      success: false,
      message: "Could not get assignment groups from Canvas",
    }
  }
  console.log(canvasAssignmentGroupsData)
  const assignmentGroupCreationData = []
  for (const assignmentGroup of canvasAssignmentGroupsData) {
    const formData = new FormData()
    formData.append("canvas_id", assignmentGroup.id)
    formData.append("name", assignmentGroup.name)
    formData.append("position", assignmentGroup.position || 0)
    formData.append("group_weight", assignmentGroup.group_weight || "0")

    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        "X-CSRFToken": csrfToken,
      },
      // stringify the formData object
      body: JSON.stringify(Object.fromEntries(formData)),
    }

    let data
    try {
      const response = await fetch(url, options)
      data = await response.json()
      console.log(data)
      assignmentGroupCreationData.push(data)
    } catch (error) {
      console.log(error)
    }
  }
  return {
    success: true,
    message: "Assignment groups created",
    category: "assignment-groups",
    assignmentGroupCreationData,
  }
}

export async function createAssignmentsCanvas({
  courseCanvasId,
  courseId,
}: {
  courseCanvasId: number
  courseId: number
}) {
  const token = auth.getToken()
  const url = `${legacyBaseAPIUrl}legacy/courses/${courseId}/assignments/create/`
  const csrfTokenElem = document.querySelector(
    "[name=csrfmiddlewaretoken]"
  ) as HTMLInputElement
  const csrfToken = csrfTokenElem ? csrfTokenElem.value : ""
  const canvasAssignmentsData =
    await getAssignmentsCanvasLegacyAPI(courseCanvasId)
  if (!canvasAssignmentsData) {
    console.log("Empty assignments data")
    return {
      success: false,
      message: "Could not get assignments from Canvas",
    }
  }
  console.log(canvasAssignmentsData)
  const assignmentCreationData = []
  for (const assignment of canvasAssignmentsData) {
    const formData = new FormData()
    formData.append("canvas_id", assignment.id)
    formData.append("name", assignment.name)
    formData.append("description", assignment.description || "")
    formData.append("max_question_scores", assignment.points_possible || "0")
    formData.append("position", assignment.position || "0")
    formData.append(
      "assignment_group_object_id",
      assignment.assignment_group_id || ""
    )

    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        "X-CSRFToken": csrfToken,
      },
      // stringify the formData object
      body: JSON.stringify(Object.fromEntries(formData)),
    }

    let data
    try {
      const response = await fetch(url, options)
      data = await response.json()
      console.log(data)
      assignmentCreationData.push(data)
    } catch (error) {
      console.log(error)
    }
  }
  return {
    success: true,
    message: "Assignments created",
    category: "assignments",
    assignmentCreationData,
  }
}

export async function createAnnouncementsCanvas({
  courseCanvasId,
  courseId,
}: {
  courseCanvasId: number
  courseId: number
}) {
  const token = auth.getToken()
  const url = `${legacyBaseAPIUrl}legacy/courses/${courseId}/announcements/create/`
  const csrfTokenElem = document.querySelector(
    "[name=csrfmiddlewaretoken]"
  ) as HTMLInputElement
  const csrfToken = csrfTokenElem ? csrfTokenElem.value : ""
  const canvasAnnouncementsData =
    await getAnnouncementsCanvasLegacyAPI(courseCanvasId)
  if (!canvasAnnouncementsData) {
    console.log("Empty announcements data")
    return {
      success: false,
      message: "Could not get announcements from Canvas",
    }
  }
  console.log(canvasAnnouncementsData)
  const announcementCreationData = []
  for (const announcement of canvasAnnouncementsData) {
    const formData = new FormData()
    if (!announcement.posted_at) {
      continue
    }
    formData.append("canvas_id", announcement.id)
    formData.append("title", announcement.title)
    formData.append("body", announcement.message)
    formData.append("author", announcement.author.display_name || "")
    formData.append("date", announcement.posted_at)

    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        "X-CSRFToken": csrfToken,
      },
      // stringify the formData object
      body: JSON.stringify(Object.fromEntries(formData)),
    }

    let data
    try {
      const response = await fetch(url, options)
      data = await response.json()
      console.log(data)
      announcementCreationData.push(data)
    } catch (error) {
      console.log(error)
    }
  }
  return {
    success: true,
    message: "Announcements created",
    category: "announcements",
    announcementCreationData,
  }
}
