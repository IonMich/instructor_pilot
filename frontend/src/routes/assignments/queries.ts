import { getStudentsOfCourse } from '../students/students-api';

import {
  getAssignmentOfCourse, 
  getVersionsOfAssignment, 
  getQuestionsOfAssignment,
} from './assignments-api';

import { 
  getSubmissionsOfAssignment, 
  // getGradesOfAssignment,
} from '../submissions/submissions-api';

import { getSectionsOfCourse } from '../sections/sections-api';

export const assignmentDetailQuery = (assignmentId: string, courseId: string) => ({
    queryKey: ['assignments', 'detail', assignmentId],
    queryFn: async () => {
      const assignment = await getAssignmentOfCourse(assignmentId, courseId)
      console.log('assignment detail query Fn happened', assignment)
      if (!assignment) {
        throw new Response('', {
          status: 404,
          statusText: 'Not Found',
        })
      }
      return assignment
    },
    placeholderData: () => {
      return {
        id: assignmentId,
        name: "<span style={{ color: 'grey', fontStyle: 'italic' }}>Loading...</span>",
        maxGrade: "??",
      }
    }
  })
  
  export const assignmentSubmissionsListQuery = (assignmentId : string) => ({
    queryKey: ['submissions', 'list', assignmentId],
    queryFn: async () => {
      const submissions = await getSubmissionsOfAssignment(assignmentId)
      console.log('submission list query Fn happened', submissions)
      if (!submissions) {
        throw new Response('', {
          status: 404,
          statusText: 'Submissions not found',
        })
      }
      return submissions
    },
    placeholderData: () => {
      return []
    }
  })
  
  export const assignmentVersionsListQuery = (assignmentId : string) => ({
    queryKey: ['versions', 'list', assignmentId],
    queryFn: async () => {
      const versions = await getVersionsOfAssignment(assignmentId)
      console.log('version list query Fn happened', versions)
      if (!versions) {
        throw new Response('', {
          status: 404,
          statusText: 'Versions not found',
        })
      }
      const questions = await getQuestionsOfAssignment(assignmentId)
      console.log('question list query Fn happened', questions)
      if (!questions) {
        throw new Response('', {
          status: 404,
          statusText: 'Questions not found',
        })
      }
      return versions.map((version) => {
        const questionsOfVersion = questions.filter((question) => question.versionId === version.id)
        return {
          ...version,
          questions: questionsOfVersion,
        }
      })
    },
    placeholderData: () => {
      return []
    }
  })
  
  export const courseSectionsListQuery = (courseId : string) => ({
    queryKey: ['sections', 'list', courseId],
    queryFn: async () => {
      const sections = await getSectionsOfCourse(courseId)
      console.log('section list query Fn happened', sections)
      if (!sections) {
        throw new Response('', {
          status: 404,
          statusText: 'Sections not found',
        })
      }
      return sections
    },
    placeholderData: () => {
      return []
    }
  })
  
  export const courseStudentsListQuery = (courseId : string) => ({
    queryKey: ['students', 'list', courseId],
    queryFn: async () => {
      const students = await getStudentsOfCourse(courseId)
      console.log('student list query Fn happened', students)
      if (!students) {
        throw new Response('', {
          status: 404,
          statusText: 'Students not found',
        })
      }
      return students
    },
})