import { createFileRoute } from "@tanstack/react-router"
import {
  sectionQueryOptions,
  studentsOfSectionQueryOptions,
} from "@/utils/queryOptions"
import { StudentDeck } from "@/routes/-components/sectionDetailLists"
import { Course, Section } from "@/utils/fetchData"

function getBreadcrumbItems(course: Course, section: Section) {
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
  ]
}

export const Route = createFileRoute("/_authenticated/sections/$sectionId")({
  parseParams: (params) => ({
    sectionId: parseInt(params.sectionId),
  }),
  stringifyParams: (params) => ({
    sectionId: params.sectionId.toString(),
  }),
  loader: async (opts) => {
    const sectionId = opts.params.sectionId
    const sectionPromise = opts.context.queryClient.ensureQueryData(
      sectionQueryOptions(sectionId)
    )
    const studentsPromise = opts.context.queryClient.ensureQueryData(
      studentsOfSectionQueryOptions(sectionId)
    )
    const [section, students] = await Promise.all([
      sectionPromise,
      studentsPromise,
    ])
    const course = section.course
    return {
      section: section,
      course: course,
      students: students,
      title: `Section ${sectionId}`,
      breadcrumbItems: getBreadcrumbItems(course, section),
    }
  },
  component: StudentDeck,
})
