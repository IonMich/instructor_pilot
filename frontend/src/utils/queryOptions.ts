import { queryOptions, useMutation } from "@tanstack/react-query"

import { queryClient } from "../app"

import {
  fetchCourses,
  fetchSectionsOfCourse,
  fetchSectionById,
  fetchAssignmentsOfCourse,
  fetchAssignmentById,
  fetchStudents,
  fetchStudentsOfCourse,
  fetchStudentById,
  fetchSubmissionsOfAssignment,
  fetchSubmissionById,
  patchSubmission,
  deleteSubmission,
  Submission,
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

export const studentQueryOptions = (studentId: number) => {
  return queryOptions({
    queryKey: ["student", studentId],
    queryFn: () => fetchStudentById(studentId),
  })
}

export const submissionsQueryOptions = (assignmentId: number) => {
  return queryOptions({
    queryKey: subKeys.list(`assignmentId=${assignmentId}`),
    queryFn: () => fetchSubmissionsOfAssignment(assignmentId),
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
