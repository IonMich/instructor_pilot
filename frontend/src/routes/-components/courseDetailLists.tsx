import * as React from "react"
import { Section, Assignment } from "@/utils/fetchData"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Link } from "@tanstack/react-router"
import { LuFile } from "react-icons/lu"
import { Badge } from "@/components/ui/badge"

export function SectionList({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((section) => (
        <Link
          to="/sections/$sectionId"
          params={{ sectionId: section.id }}
          className="flex items-center first:mt-2 hover:bg-muted/50 p-4 rounded-lg duration-200"
          key={section.id}
        >
          <div key={section.id} className="flex items-center gap-4">
            <div className="grid gap-1">
              <p className="text-sm font-medium leading-none">{section.name}</p>
              <p className="text-sm text-muted-foreground">
                {section.students_count} students
              </p>
            </div>
          </div>
          <div className="ml-auto font-medium mr-4 flex flex-col items-center gap-1">
            {section.meetings.map((meeting) => (
              <p className="text-sm font-medium leading-none" key={meeting.id}>
                {meeting.day} {meeting.start_time} - {meeting.end_time}
              </p>
            ))}
          </div>
        </Link>
      ))}
    </>
  )
}

export function AssignmentList({ assignments }: { assignments: Assignment[] }) {
  const userPreferedGroup = "Quizzes"
  const getAssignmentGroupName = (assignment: Assignment) => {
    // if the assignment has no assignment_group_object, return assignment.assignment_group
    // if the assignment has no assignment_group, return "Assignments"
    return (
      assignment.assignment_group_object?.name ??
      assignment.assignment_group ??
      "Assignments"
    )
  }
  const getAssignmentGroupId = (assignment: Assignment) => {
    // if the assignment has no assignment_group_object, return a hash of assignment.assignment_group
    // if the assignment has no assignment_group, return hash of "Assignments"
    return (
      assignment.assignment_group_object?.id ??
      assignment.assignment_group ??
      "Assignments"
    )
  }
  const preferredKey = getAssignmentGroupId(
    assignments.find(
      (assignment) => getAssignmentGroupName(assignment) === userPreferedGroup
    ) ?? assignments[0]
  )
  const [tabValue, setTabValue] = React.useState(preferredKey)
  const assignmentGroups = assignments.reduce(
    (acc, assignment) => {
      if (!acc[getAssignmentGroupId(assignment)]) {
        acc[getAssignmentGroupId(assignment)] = {
          name: getAssignmentGroupName(assignment),
          assignments: [],
        }
      }
      acc[getAssignmentGroupId(assignment)].assignments.push(assignment)
      return acc
    },
    {} as Record<string, { name: string; assignments: Assignment[] }>
  )
  return (
    <Tabs value={tabValue}>
      <TabsList className="grid grid-cols-3 h-100 gap-2 mt-2">
        {Object.entries(assignmentGroups).map(([groupId, group]) => {
          // activate the second tab by default
          return (
            <TabsTrigger
              value={groupId}
              className="text-wrap inline-block"
              key={groupId}
              onClick={() => setTabValue(groupId)}
            >
              <p className="text-sm font-medium leading-none text-center">
                {group.name}
              </p>
            </TabsTrigger>
          )
        })}
      </TabsList>
      {Object.entries(assignmentGroups).map(([groupId, group]) => {
        const fullyGradedAssignments = group.assignments.filter(
          (assignment) => assignment.get_grading_progress === 100.0
        )
        const sumFractionalGrades = fullyGradedAssignments.reduce(
          (acc, assignment) =>
            acc + assignment.get_average_grade / assignment.max_score,
          0
        )
        const naiveGradeAverage =
          sumFractionalGrades / fullyGradedAssignments.length
        const naiveGradeAverageStr =
          (Number.isNaN(naiveGradeAverage)
            ? "- "
            : (naiveGradeAverage * 100).toFixed(1)) + "%"
        return (
          <TabsContent value={groupId} key={groupId} className="mx-6">
            <div className="flex flex-row items-center gap-4">
              <p className="text-sm font-medium leading-none">{group.name}</p>
              <div
                className="ml-auto font-medium"
                title="Naive grade average based on fully graded assignments assuming all assignments have the same weight and the same number of submissions."
              >
                {/* grade average */}
                <span className="whitespace-nowrap">
                  Avg. {naiveGradeAverageStr}
                </span>
              </div>
              <div className="ml-auto font-medium">
                {group.assignments.length} assignments
              </div>
            </div>
            <ScrollArea className="max-h-56 overflow-y-auto">
              {group.assignments.map((assignment) => (
                <AssignmentListElement
                  assignment={assignment}
                  key={assignment.id}
                />
              ))}
            </ScrollArea>
          </TabsContent>
        )
      })}
    </Tabs>
  )
}


function AssignmentListElement({ assignment }: { assignment: Assignment }) {
  return (
    <Link
      to="/assignments/$assignmentId"
      params={{ assignmentId: assignment.id }}
      className="flex items-center first:mt-2 hover:bg-muted/50 p-4 rounded-lg duration-200"
    >
      <div className="grid gap-1">
        <p className="text-sm font-medium leading-none">{assignment.name}</p>
        <p className="text-sm text-muted-foreground">
          {assignment.max_score} point
          {assignment.max_score == 1 ? "" : "s"} (
          {assignment.max_question_scores.split(",").length} question
          {assignment.max_question_scores.split(",").length > 1 ? "s" : ""}
          )
        </p>
      </div>
      <div className="ml-auto font-medium mr-4 flex items-center gap-1">
        {assignment.submission_count > 0 && (
          <>
            <Badge
              color="primary"
              className="hover:bg-primary"
              title="Average grade"
            >
              Avg. {assignment.get_average_grade.toFixed(1)} /{" "}
              {assignment.max_score}
            </Badge>
            <Badge
              color="primary"
              className="hover:bg-primary"
              title="Grading progress"
            >
              {assignment.get_grading_progress.toFixed(1)}%
            </Badge>
          </>
        )}
        <Badge color="primary" className="hover:bg-primary">
          {assignment.submission_count} <LuFile className="h-4 w-4 inline" />
        </Badge>
      </div>
    </Link>
  )
}