import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Course, Section, Student } from "@/utils/fetchData"
import {
  sectionsQueryOptions,
  studentsOfSectionQueryOptions,
} from "@/utils/queryOptions"
import { seo } from "@/utils/utils"
import { createFileRoute, useLoaderData } from "@tanstack/react-router"

function getBreadcrumbItems(
  course: Course,
  section: Section,
  student: Student
) {
  return [
    {
      title: "Home",
      path: "/",
    },
    {
      title: course.course_code,
      path: `/courses/${course.id}`,
    },
    {
      title: `${section.name}` ?? `Section ${section.id}` ?? "Section",
      path: `/sections/${section.id}`,
    },
    {
      title:
        student.first_name && student.last_name
          ? `${student.first_name} ${student.last_name}`
          : `Student ${student.id}`,
      path: `/courses/${course.id}/students/${student.id}`,
    },
  ]
}

export const Route = createFileRoute(
  "/_authenticated/courses/$courseId/students/$studentId"
)({
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
    const sectionsPromise = opts.context.queryClient.ensureQueryData(
      sectionsQueryOptions(courseId)
    )
    const [sections] = await Promise.all([sectionsPromise])
    const studentsPromise = sections.map((section) => {
      return opts.context.queryClient.ensureQueryData(
        studentsOfSectionQueryOptions(section.id)
      )
    })
    const studentsOfSections = await Promise.all(studentsPromise)
    for (const students of studentsOfSections) {
      console.log("students: ", students)
      for (const student of students) {
        if (student.id === studentId) {
          for (const sectionOfStudent of student.sections) {
            const section = sections.find((s) => s.id === sectionOfStudent.id)
            if (!section) {
              throw new Error("Section not found")
            }
            return {
              student: student,
              section: section,
              course: section.course,
              title: `Student ${student.id}`,
              breadcrumbItems: getBreadcrumbItems(
                section.course,
                section,
                student
              ),
            }
          }
        }
      }
    }
    throw new Error("Student not found")
  },
  meta: ({ loaderData }) => [
    ...seo({
      title: loaderData?.title,
    }),
  ],
  component: StudentDetail,
})

function StudentDetail() {
  const data = useLoaderData({
    from: "/_authenticated/courses/$courseId/students/$studentId",
  })
  const { student, course, section } = data
  console.log("StudentDetail: ", student, course, section)
  return (
    <div className="container mx-auto">
      <p className="text-lg font-medium my-5 text-center">
        {student.first_name} {student.last_name}
        <span className="text-muted-foreground"> ({section.name})</span>
      </p>
      <Avatar className="my-4 h-24 w-24 mx-auto">
        <AvatarImage src={student.avatar} alt="Avatar" />
        <AvatarFallback>
          {student.first_name[0]}
          {student.last_name[0]}
        </AvatarFallback>
      </Avatar>
    </div>
  )
}
