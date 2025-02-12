import { queryOptions, useMutation } from "@tanstack/react-query"

import { queryClient } from "../app"

import { CanvasStudent, Submission, InfoField } from "./types"

import {
  fetchRequesterUser,
  fetchCourseById,
  fetchCourses,
  fetchSectionsOfCourse,
  fetchSectionById,
  fetchAssignmentsOfCourse,
  fetchAssignmentById,
  fetchAssignmentScoresById,
  fetchStudents,
  fetchStudentsOfCourse,
  fetchStudentOfCourseById,
  fetchSubmissionsOfAssignment,
  fetchSubmissionsOfStudentInCourse,
  fetchSubmissionById,
  fetchAnnouncementsOfCourse,
  createSubmissionsBySplittingPDFs,
  createCommentOnSubmission,
  patchSubmission,
  deleteSubmission,
  identifySubmissionsWorkflow,
  versionSubmissionsWorkflow,
  extractInfoSubmissionsWorkflow,
  fetchCanvasCourses,
  fetchCanvasSectionsOfCourse,
  createCourseWithSectionsCanvas,
  fetchCanvasCourse,
  exportSubmissionsPDFs,
} from "./fetchData"

import {
  populateStudentsCanvas,
  createAssignmentGroupsCanvas,
  createAssignmentsCanvas,
  createAnnouncementsCanvas,
} from "./legacyAPI"

const subKeys = {
  all: "all" as const,
  lists: () => [...subKeys.all, "list"] as const,
  list: (filters: string) => [...subKeys.lists(), filters] as const,
  details: () => [...subKeys.all, "detail"] as const,
  detail: (id: Submission["id"]) => [...subKeys.details(), id] as const,
}

export const userQueryOptions = () => {
  return queryOptions({
    queryKey: ["user"],
    queryFn: () => fetchRequesterUser(),
  })
}

export const coursesQueryOptions = () => {
  return queryOptions({
    queryKey: ["courses"],
    queryFn: () => fetchCourses(),
  })
}

export const courseQueryOptions = (courseId: number) => {
  return queryOptions({
    queryKey: ["courses", courseId],
    queryFn: () => fetchCourseById(courseId),
  })
}

export const sectionsQueryOptions = (courseId: number) => {
  return queryOptions({
    queryKey: ["sections", "list", `courseId=${courseId}`],
    queryFn: () => fetchSectionsOfCourse(courseId),
  })
}

export const sectionQueryOptions = (sectionId: number) => {
  return queryOptions({
    queryKey: ["section", sectionId],
    queryFn: () => fetchSectionById(sectionId),
  })
}

export const assignmentsQueryOptions = (courseId: number) => {
  return queryOptions({
    queryKey: ["assignments", "list", `courseId=${courseId}`],
    queryFn: () => fetchAssignmentsOfCourse(courseId),
    enabled: !!courseId,
  })
}

export const assignmentQueryOptions = (assignmentId: number) => {
  return queryOptions({
    queryKey: ["assignment", assignmentId],
    queryFn: () => fetchAssignmentById(assignmentId),
    enabled: !!assignmentId,
  })
}

export const assignmentScoresQueryOptions = (assignmentId: number) => {
  return queryOptions({
    queryKey: ["assignment", assignmentId, "scores"],
    queryFn: () => fetchAssignmentScoresById(assignmentId),
    enabled: !!assignmentId,
  })
}

export const studentsOfSectionQueryOptions = (sectionId: number) => {
  return queryOptions({
    queryKey: ["section", sectionId, "students"],
    queryFn: () => fetchStudents(sectionId),
  })
}

export const studentsInCourseQueryOptions = (courseId: number) => {
  return queryOptions({
    queryKey: ["students", "list", `courseId=${courseId}`],
    queryFn: () => fetchStudentsOfCourse(courseId),
    enabled: !!courseId,
  })
}

export const studentInCourseQueryOptions = (
  courseId: number,
  studentId: number
) => {
  return queryOptions({
    queryKey: ["student", studentId],
    queryFn: () => fetchStudentOfCourseById(courseId, studentId),
  })
}

export const submissionsQueryOptions = (assignmentId: number) => {
  return queryOptions({
    queryKey: subKeys.list(`assignmentId=${assignmentId}`),
    queryFn: () => fetchSubmissionsOfAssignment(assignmentId),
  })
}

export const submissionsOfStudentInCourseQueryOptions = (
  courseId: number,
  studentId: number
) => {
  return queryOptions({
    queryKey: subKeys.list(`courseId=${courseId}&studentId=${studentId}`),
    queryFn: () => fetchSubmissionsOfStudentInCourse(courseId, studentId),
  })
}

export const submissionQueryOptions = (submissionId: string) => {
  return queryOptions({
    queryKey: subKeys.detail(submissionId),
    queryFn: () => fetchSubmissionById(submissionId),
  })
}

export const announcementsQueryOptions = (courseId: number) => {
  return queryOptions({
    queryKey: ["announcements", "list", `courseId=${courseId}`],
    queryFn: () => fetchAnnouncementsOfCourse(courseId),
  })
}

export const useExportSubmissionsPDFsQueryOptions = (assignmentId: number) => {
  return queryOptions({
    queryKey: ["submissions", "pdf-export", `assignmentId=${assignmentId}`],
    queryFn: () => exportSubmissionsPDFs(assignmentId),
  })
}

export const useUpdateSubmissionMutation = (submissionId: string) => {
  return useMutation({
    mutationKey: ["submissions", "update", submissionId],
    mutationFn: patchSubmission,
    onSuccess: () => queryClient.invalidateQueries(),
    gcTime: 1000 * 10,
  })
}

export const useDeleteSubmissionMutation = () => {
  return useMutation({
    mutationKey: ["submissions", "delete"],
    mutationFn: async (submissionId: string) => {
      await deleteSubmission(submissionId)
    },
    onSuccess: () => queryClient.invalidateQueries(),
    gcTime: 1000 * 10,
  })
}

export const useDeleteAllSubmissionsMutation = () => {
  return useMutation({
    mutationKey: ["submissions", "deleteAll"],
    mutationFn: async (assignmentId: number) => {
      const submissions = await fetchSubmissionsOfAssignment(assignmentId)
      return await Promise.all(
        submissions.map((submission) => deleteSubmission(submission.id))
      )
    },
    onSuccess: () => queryClient.invalidateQueries(),
    gcTime: 1000 * 10,
  })
}

export const useCreateSubmissionsInAssignmentMutation = (
  assignmentId: number
) => {
  return useMutation({
    mutationKey: ["submissions", "create"],
    mutationFn: async ({
      pagesPerSubmission,
      filesToSplit,
    }: {
      pagesPerSubmission: number
      filesToSplit: FileList
    }) => {
      console.log("Creating submissions for assignment", assignmentId)
      console.log("Pages per submission", pagesPerSubmission)
      console.log("Files to split", filesToSplit)
      return await createSubmissionsBySplittingPDFs({
        assignmentId,
        pagesPerSubmission,
        filesToSplit,
      })
    },
    onSuccess: () => queryClient.invalidateQueries(),
    gcTime: 1000 * 10,
  })
}

export const useIdentifySubmissionMutation = () => {
  return useMutation({
    mutationKey: ["submissions", "identify"],
    mutationFn: async (submissionId: string) => {
      // wait for 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000))
      console.log("Identifying submission", submissionId)
    },
    onSuccess: () => queryClient.invalidateQueries(),
    gcTime: 1000 * 10,
  })
}
export const useIdentifyAutomationWorkflowMutation = (assignmentId: number) => {
  return useMutation({
    mutationKey: ["submissions", "identify", `assignmentId=${assignmentId}`],
    mutationFn: async (pages_selected: number[]) => {
      console.log("Automation workflow -Identify- for assignment", assignmentId)
      return await identifySubmissionsWorkflow({
        assignmentId,
        pages_selected,
      })
    },
    onSuccess: () => queryClient.invalidateQueries(),
    gcTime: 1000 * 10,
  })
}

export const useVersionAutomationWorkflowMutation = (assignmentId: number) => {
  return useMutation({
    mutationKey: ["submissions", "version", `assignmentId=${assignmentId}`],
    mutationFn: async (pages_selected: number[]) => {
      console.log("Automation workflow -Version- for assignment", assignmentId)
      return await versionSubmissionsWorkflow({
        assignmentId,
        pages_selected,
      })
    },
    onSuccess: () => queryClient.invalidateQueries(),
    gcTime: 1000 * 10,
  })
}

export const useExtractInfoAutomationWorkflowMutation = (assignmentId: number) => {
  return useMutation({
    mutationKey: ["submissions", "extract", `assignmentId=${assignmentId}`],
    mutationFn: async (info_fields: InfoField[]) => {
      console.log("Automation workflow -Extract- for assignment", assignmentId)
      return await extractInfoSubmissionsWorkflow({
        assignmentId,
        info_fields,
      })
    },
    onSuccess: () => queryClient.invalidateQueries(),
    gcTime: 1000 * 10,
  })
}

export const useCreateCommentMutation = (submissionId: string) => {
  return useMutation({
    mutationKey: ["comments", "create"],
    mutationFn: async (comment: string) => {
      await createCommentOnSubmission({ submissionId, text: comment })
    },
    onSuccess: () => queryClient.invalidateQueries(),
    gcTime: 1000 * 10,
  })
}

export const canvasCoursesQueryOptions = () => {
  return queryOptions({
    queryKey: ["canvas", "courses"],
    queryFn: fetchCanvasCourses,
  })
}

export const canvasCourseQueryOptions = (canvasCourseId: string) => {
  return queryOptions({
    queryKey: ["canvas", "course", canvasCourseId],
    queryFn: () => fetchCanvasCourse(canvasCourseId),
  })
}

export const canvasCourseSectionsQueryOptions = (courseId: number) => {
  return queryOptions({
    queryKey: ["canvas", "sections", "list", `courseId=${courseId}`],
    queryFn: () => fetchCanvasSectionsOfCourse(courseId),
  })
}

export const useCreateCourseWithCanvasSectionsMutation = () => {
  return useMutation({
    mutationKey: ["canvas", "createCourse"],
    mutationFn: async ({
      courseCanvasId,
      sectionCanvasIds,
    }: {
      courseCanvasId: number
      sectionCanvasIds: number[]
    }) => {
      console.log(
        "Creating course with sections",
        courseCanvasId,
        sectionCanvasIds
      )
      const data = await createCourseWithSectionsCanvas({
        courseCanvasId,
        sectionCanvasIds,
      })
      return data
    },
    gcTime: 1000 * 10,
  })
}

export const usePopulateStudentsCanvasMutation = () => {
  return useMutation({
    mutationKey: ["canvas", "populateStudents"],
    mutationFn: async ({
      selectedCanvasStudents,
      courseId,
    }: {
      selectedCanvasStudents: CanvasStudent[]
      courseId: number
    }) => {
      await populateStudentsCanvas({
        selectedCanvasStudents,
        courseId,
      })

      console.log("Populating students for course", courseId)
    },
    gcTime: 1000 * 10,
  })
}

export const useCreateAssignmentsCanvasMutation = () => {
  return useMutation({
    mutationKey: ["canvas", "createAssignments"],
    mutationFn: async ({
      courseCanvasId,
      courseId,
    }: {
      courseCanvasId: number
      courseId: number
    }) => {
      await createAssignmentGroupsCanvas({ courseCanvasId, courseId })
      await createAssignmentsCanvas({ courseCanvasId, courseId })
      console.log(
        "Creating assignment groups and assignments for course",
        courseId
      )
    },
    gcTime: 1000 * 10,
  })
}

export const useCreateAnnouncementsCanvasMutation = () => {
  return useMutation({
    mutationKey: ["canvas", "createAnnouncements"],
    mutationFn: async ({
      courseCanvasId,
      courseId,
    }: {
      courseCanvasId: number
      courseId: number
    }) => {
      await createAnnouncementsCanvas({ courseCanvasId, courseId })
      console.log("Creating announcements for course", courseId)
    },
    gcTime: 1000 * 10,
  })
}
