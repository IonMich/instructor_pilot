import { createFileRoute } from "@tanstack/react-router"
import { LuFiles, LuMail, LuMegaphone, LuUsers } from "react-icons/lu"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  SectionList,
  AssignmentList,
} from "@/routes/-components/courseDetailLists"
import {
  sectionsQueryOptions,
  assignmentsQueryOptions,
  courseQueryOptions,
} from "@/utils/queryOptions"
import { seo } from "@/utils/utils"
import { Course } from "@/utils/fetchData"
import { useSuspenseQueries } from "@tanstack/react-query"
import { TBreadcrumbItem } from "../-components/breadcrumbs"

export const Route = createFileRoute("/_authenticated/courses/$courseId/")({
  parseParams: (params) => ({
    courseId: parseInt(params.courseId),
  }),
  stringifyParams: (params) => ({
    courseId: params.courseId.toString(),
  }),
  loader: async (opts) => {
    const courseId = opts.params.courseId
    const coursePromise = opts.context.queryClient.ensureQueryData(
      courseQueryOptions(courseId)
    )
    const sectionsPromise = opts.context.queryClient.ensureQueryData(
      sectionsQueryOptions(courseId)
    )
    const assignmentsPromise = opts.context.queryClient.ensureQueryData(
      assignmentsQueryOptions(courseId)
    )

    // parallelize the two queries
    const [course, sections, assignments] = await Promise.all([
      coursePromise,
      sectionsPromise,
      assignmentsPromise,
    ])
    console.log("course", course)
    console.log("sections", sections)
    console.log("assignments", assignments)
    return {
      course: course,
      sections: sections,
      assignments: assignments,
      title: course.course_code ?? course.name ?? "Course",
      breadcrumbItems: getBreadcrumbItems(course),
    }
  },
  meta: ({ loaderData }) =>
    seo({
      title: loaderData?.title,
    }),
  component: CourseDashboard,
})

function getBreadcrumbItems(course: Course): TBreadcrumbItem[] {
  return [
    {
      title: "Home",
      to: "/",
      params: {},
    },
    {
      title: course.course_code ?? course.name ?? "Course",
      to: "/courses/$courseId",
      params: { courseId: course.id },
    },
  ]
}

function CourseDashboard() {
  const courseId = Route.useParams().courseId
  const [{ data: course }] = useSuspenseQueries({
    queries: [courseQueryOptions(courseId)],
  })
  const [{ data: sections }, { data: assignments }] = useSuspenseQueries({
    queries: [
      sectionsQueryOptions(courseId),
      assignmentsQueryOptions(courseId),
    ],
  })
  const total_sub_count = assignments.reduce(
    (acc, assignment) => acc + assignment.submission_count,
    0
  )
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-5xl font-bold">
          {course?.name ?? "Course with ID" + course?.canvas_id}
        </h1>
        <p className="text-2xl text-muted-foreground">
          {course?.course_code} {course?.term ? `(${course?.term})` : ""}
        </p>
      </div>
      <div className="grid gap-4 grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <LuUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sections.reduce(
                (acc, section) => acc + section.students_count,
                0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              99 active enrollments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <LuFiles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total_sub_count}</div>
            <p className="text-xs text-muted-foreground">99 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <LuMail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">999</div>
            <p className="text-xs text-muted-foreground">99 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Announcements</CardTitle>
            <LuMegaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">999</div>
            <p className="text-xs text-muted-foreground">99 this week</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2 lg:order-last">
          {/* <CardHeader>
              <CardTitle>Assignments</CardTitle>
            </CardHeader> */}
          <CardContent className="grid gap-0 px-0">
            <AssignmentList assignments={assignments} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Sections</CardTitle>
              <CardDescription></CardDescription>
            </div>
            {/* <Button asChild size="sm" className="ml-auto gap-1">
                <Link href="#">
                  View All
                  <LuArrowUpRight className="h-4 w-4" />
                </Link>
              </Button> */}
          </CardHeader>
          <CardContent className="grid gap-4">
            <SectionList sections={sections} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
