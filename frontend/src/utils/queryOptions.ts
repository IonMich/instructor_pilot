import { queryOptions, useMutation } from "@tanstack/react-query"

import { queryClient } from "../app"

import {
  fetchCourseById,
  fetchCourses,
  fetchSectionsOfCourse,
  fetchSectionById,
  fetchAssignmentsOfCourse,
  fetchAssignmentById,
  fetchStudents,
  fetchStudentsOfCourse,
  fetchStudentOfCourseById,
  fetchSubmissionsOfAssignment,
  fetchSubmissionsOfStudentInCourse,
  fetchSubmissionById,
  createSubmissionsBySplittingPDFs,
  createCommentOnSubmission,
  patchSubmission,
  deleteSubmission,
  Submission,
  fetchCanvasCourses,
  fetchCanvasSectionsOfCourse,
} from "./fetchData"

const subKeys = {
  all: "all" as const,
  lists: () => [...subKeys.all, "list"] as const,
  list: (filters: string) => [...subKeys.lists(), filters] as const,
  details: () => [...subKeys.all, "detail"] as const,
  detail: (id: Submission["id"]) => [...subKeys.details(), id] as const,
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
      await Promise.all(
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
      await createSubmissionsBySplittingPDFs({
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
      courseId,
      sectionIds,
    }: {
      courseId: number
      sectionIds: number[]
    }) => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      console.log("Creating course with sections", courseId, sectionIds)
    },
    // onSuccess: () => {
    //   console.log("Course created")
    //   queryClient.invalidateQueries()
    // },
    gcTime: 1000 * 10,
  })
}

export const usePopulateStudentsCanvasMutation = () => {
  return useMutation({
    mutationKey: ["canvas", "populateStudents"],
    mutationFn: async ({
      courseId,
      sectionIds,
    }: {
      courseId: number
      sectionIds: number[]
    }) => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      console.log("Populating students for course", courseId, "section", sectionIds)
    },
    gcTime: 1000 * 10,
  })
}

export const useCreateAssignmentsCanvasMutation = () => {
  return useMutation({
    mutationKey: ["canvas", "createAssignments"],
    mutationFn: async ({
      courseId,
      sectionIds,
    }: {
      courseId: number
      sectionIds: number[]
    }) => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      console.log("Creating assignments for course", courseId, "section", sectionIds)
    },
    gcTime: 1000 * 10,
  })
}

export const useCreateAnnouncementsCanvasMutation = () => {
  return useMutation({
    mutationKey: ["canvas", "createAnnouncements"],
    mutationFn: async ({
      courseId,
      sectionIds,
    }: {
      courseId: number
      sectionIds: number[]
    }) => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      console.log("Creating announcements for course", courseId, "section", sectionIds)
    },
    gcTime: 1000 * 10,
  })
}