import { createFileRoute } from "@tanstack/react-router"
import {
  sectionQueryOptions,
  studentsOfSectionQueryOptions,
} from "@/utils/queryOptions"
import { StudentDeck } from "@/routes/-components/sectionDetailLists"
import { Course, Section } from "@/utils/fetchData"
import { TBreadcrumbItem } from "../-components/breadcrumbs"

function getBreadcrumbItems(
  course: Course,
  section: Section
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
      title: section.name ?? `Section ${section.id}` ?? "Section",
      to: "/sections/$sectionId",
      params: { sectionId: section.id },
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
    const course = section.course as Course
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
