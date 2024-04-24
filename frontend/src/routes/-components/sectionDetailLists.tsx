import { Course, Student } from "@/utils/fetchData"
import { Card, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Link, getRouteApi } from "@tanstack/react-router"
import { useSuspenseQueries } from "@tanstack/react-query"
import {
  sectionQueryOptions,
  studentsOfSectionQueryOptions,
} from "@/utils/queryOptions"

export function StudentCard({
  student,
  course,
}: {
  student: Student
  course: Course
}) {
  return (
    <Link
      to={"/courses/$courseId/students/$studentId"}
      params={{ courseId: course.id, studentId: student.id }}
    >
      <Card className="flex flex-col items-center">
        <Avatar className="my-4 h-24 w-24">
          <AvatarImage src={student.avatar} alt="Avatar" />
          <AvatarFallback>
            {student.first_name[0]}
            {student.last_name[0]}
          </AvatarFallback>
        </Avatar>
        <CardHeader>
          <div className="grid gap-1">
            <p className="text-sm font-medium leading-none">
              {student.first_name} {student.last_name}
            </p>
            <p className="text-sm text-muted-foreground">{student.uni_id}</p>
          </div>
        </CardHeader>
      </Card>
    </Link>
  )
}

const route = getRouteApi("/_authenticated/sections/$sectionId")

export function StudentDeck() {
  const sectionId = route.useParams().sectionId
  const [{ data: section }, { data: students }] = useSuspenseQueries({
    queries: [
      sectionQueryOptions(sectionId),
      studentsOfSectionQueryOptions(sectionId),
    ],
  })
  const course = section.course
  return (
    <div className="container mx-auto">
      <p className="text-lg font-medium my-5 text-center">
        Section {section.name}
        <span className="text-muted-foreground">
          {" "}
          ({students.length} students)
        </span>
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 m-4">
        {students.map((student) => (
          <StudentCard key={student.id} student={student} course={course} />
        ))}
      </div>
    </div>
  )
}
