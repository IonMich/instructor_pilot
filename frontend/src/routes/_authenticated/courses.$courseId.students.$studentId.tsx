import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Course, Section, Student } from "@/utils/types"
import {
  sectionsQueryOptions,
  studentInCourseQueryOptions,
  submissionsOfStudentInCourseQueryOptions,
} from "@/utils/queryOptions"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { columns } from "@/routes/-components/columns"
import { DataTable } from "@/routes/-components/submissions-data-table"
import { TBreadcrumbItem } from "../-components/breadcrumbs"

function getBreadcrumbItems(
  course: Course,
  section: Section,
  student: Student
): TBreadcrumbItem[] {
  return [
    {
      title: "Home",
      to: "/",
      params: {},
    },
    {
      title: course.course_code,
      to: "/courses/$courseId",
      params: { courseId: course.id },
    },
    {
      title: `${section.name ?? `Section ${section.id}` ?? "Section"}`,
      to: "/sections/$sectionId",
      params: { sectionId: section.id },
    },
    {
      title:
        student.first_name && student.last_name
          ? `${student.first_name} ${student.last_name}`
          : `Student ${student.id}`,
      to: `/courses/$courseId/students/$studentId`,
      params: { courseId: course.id, studentId: student.id },
    },
  ]
}

export const Route = createFileRoute(
  "/_authenticated/courses/$courseId/students/$studentId"
)({
  staticData: {
    title: "Student",
  },
  parseParams: (params) => ({
    courseId: parseInt(params.courseId),
    studentId: parseInt(params.studentId),
  }),
  stringifyParams: (params) => ({
    courseId: params.courseId.toString(),
    studentId: params.studentId.toString(),
  }),
  loader: async (opts) => {
    const studentId = opts.params.studentId
    const courseId = opts.params.courseId
    const studentPromise = opts.context.queryClient.ensureQueryData(
      studentInCourseQueryOptions(courseId, studentId)
    )
    const sectionsPromise = opts.context.queryClient.ensureQueryData(
      sectionsQueryOptions(courseId)
    )
    const [student, sections] = await Promise.all([
      studentPromise,
      sectionsPromise,
    ])
    console.log("student", student)
    const sectionOfStudent = student.sections.find((s) => s.course === courseId)
    if (!sectionOfStudent) {
      throw new Error("Student not found in course")
    }
    const sectionId = sectionOfStudent.id
    const section = sections.find((s) => s.id === sectionId)
    if (!section) {
      throw new Error("Section not found")
    }
    const course = section.course as Course
    return {
      student: student,
      section: section,
      course: course,
      title: `Student ${student.id}`,
      breadcrumbItems: getBreadcrumbItems(course, section, student),
    }
  },
  component: StudentDetail,
})

function StudentDetail() {
  const { courseId, studentId } = Route.useParams()
  const { data: student } = useSuspenseQuery(
    studentInCourseQueryOptions(courseId, studentId)
  )
  const section = student.sections.find((s) => s.course === courseId)
  if (!section) {
    throw new Error("Student not found in course")
  }
  const { data: submissions } = useSuspenseQuery(
    submissionsOfStudentInCourseQueryOptions(courseId, studentId)
  )
  const columnsOfStudent = columns.filter(
    (c) => c.id !== "student" && c.id !== "uni_id" && c.id !== "section"
  )
  return (
    <div className="container mx-auto">
      <p className="text-lg font-medium my-5 text-center">
        {student.first_name} {student.last_name}
        <span className="text-muted-foreground"> ({section.name})</span>
      </p>
      <Avatar className="my-4 h-24 w-24 mx-auto">
        <AvatarImage src={student.profile.avatar?.toString()} alt="Avatar" />
        <AvatarFallback>
          {student.first_name[0]}
          {student.last_name[0]}
        </AvatarFallback>
      </Avatar>
      <DataTable
        columns={columnsOfStudent}
        data={submissions}
        searchby={["assignment"]}
      />
    </div>
  )
}
