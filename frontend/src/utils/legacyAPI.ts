import axios from "axios"
import { loaderFn } from "./utils"
const legacyBaseAPIUrl = "http://127.0.0.1:8000/"

// TODOs:
// fix syntax for getAvailableSectionInfoLegacyAPI here, be careful about returned array
// fix syntax for getAvailableSectionInfoLegacyAPI in the backend
// add types to both.
// fix course post request to backend


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
  console.log("Fetching Canvas Course Sections with ID", courseCanvasId)
  const data = loaderFn(() =>
    Promise.resolve().then(async () => {
      const items = await axios
        .get(`${legacyBaseAPIUrl}legacy/canvas/courses/${courseCanvasId}/sections/`)
        .then((response) => response.data)
        .catch((error) => {
          throw error
        })
      return items
    })
  )
  return data
}

// export async function getAvailableSectionInfoLegacyAPI(courseCanvasId: number) {
//   const url = `${legacyBaseAPIUrl}legacy/canvas/courses/${courseCanvasId}/sections/`

//   const options = {
//     method: "GET",
//     headers: {
//       "Content-Type": "application/json",
//     },
//   }
//   try {
//     const response = await fetch(url, options)
//     if (response.ok) {
//       const data = await response.json()
//       return [data.sections, data.students, data.course_description]
//     }
//     throw new Error("Network response was not ok.")
//   } catch (error) {
//     console.log(error)
//     return []
//   }
// }

export async function handleCreateCourseSubmitLegacyAPI(selectedCourse) {
  const url = `${legacyBaseAPIUrl}courses/`
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
      "Content-Type": "application/json",
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
  } catch (error) {
    console.log(error)
  }
  return data
}

export async function handleCreateSectionsSubmitLegacyAPI(
  selectedCanvasSections,
  courseId
) {
  console.log(selectedCanvasSections)
  const url = `${legacyBaseAPIUrl}courses/${courseId}/sections/`
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
        "Content-Type": "application/json",
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
      return {
        message: "Error creating section",
        success: false,
      }
    }
  }
  return {
    message: "Successfully created sections",
    success: true,
    sectionCreationData,
    category: "sections",
  }
}

export async function createMeetingsLegacyAPI(sectionId, meetTimes) {
  const url = `${legacyBaseAPIUrl}sections/${sectionId}/meetings/`
  const csrfTokenElem = document.querySelector(
    "[name=csrfmiddlewaretoken]"
  ) as HTMLInputElement
  const csrfToken = csrfTokenElem ? csrfTokenElem.value : ""

  const optionsDelete = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
  }
  let data
  try {
    const response = await fetch(url, optionsDelete)
    data = await response.json()
    console.log(data)
  } catch (error) {
    console.log(error)
    return {}
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
        "Content-Type": "application/json",
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
      console.log(error)
      return {}
    }

    return dataMeet
  }
}
