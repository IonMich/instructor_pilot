import { Card } from "@/components/ui/card"
import { Link, createFileRoute, useLoaderData } from "@tanstack/react-router"
import { coursesQueryOptions } from "@/utils/queryOptions"
import { Course } from "@/utils/fetchData"
import { auth } from "@/utils/auth"

function getBreadcrumbItems() {
  return []
}

export const Route = createFileRoute("/_authenticated/")({
  loader: async (opts) => {
    const coursesPromise = opts.context.queryClient.ensureQueryData(
      coursesQueryOptions()
    )
    const courses = await coursesPromise
    return {
      courses: courses,
      title: "Instructor Pilot",
      breadcrumbItems: getBreadcrumbItems(),
    }
  },
  component: Index,
})

function Index() {
  const user = auth.getUsername()
  const { courses } = useLoaderData({ from: "/_authenticated/" })
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-2xl font-bold my-4">Hello, {user}!</p>
      <CoursesDeck courses={courses} />
    </div>
  )
}

function CoursesDeck({ courses }: { courses: Course[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <Link
          key={course.id}
          to={"/courses/$courseId"}
          params={{ courseId: course.id }}
        >
          <Card className="flex flex-col items-center justify-center h-40 p-4">
            <p className="text-xl font-bold">{course.course_code}</p>
            <p>
              {course.name.length > 40
                ? course.name.slice(0, 40) + "..."
                : course.name}
            </p>
          </Card>
        </Link>
      ))}
    </div>
  )
}
