import * as React from "react"
import { Section, Assignment } from "@/utils/fetchData"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Link } from "@tanstack/react-router"
import { LuFile } from "react-icons/lu"

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
        </Link>
      ))}
    </>
  )
}

export function AssignmentList({ assignments }: { assignments: Assignment[] }) {
  const userPreferedGroup = "Quizzes"
  const preferredKey = assignments.find(
    (assignment) =>
      assignment.assignment_group_object.name === userPreferedGroup
  )?.assignment_group_object.id
  const [tabValue, setTabValue] = React.useState(preferredKey)
  const assignmentGroups = assignments.reduce(
    (acc, assignment) => {
      if (!acc[assignment.assignment_group_object.id]) {
        acc[assignment.assignment_group_object.id] = {
          name: assignment.assignment_group_object.name,
          assignments: [],
        }
      }
      acc[assignment.assignment_group_object.id].assignments.push(assignment)
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
      {Object.entries(assignmentGroups).map(([groupId, group]) => (
        <TabsContent value={groupId} key={groupId} className="mx-6">
          <div className="flex flex-row items-center gap-4">
            <p className="text-sm font-medium leading-none">{group.name}</p>
            <div
              className="ml-auto font-medium"
              title="Naive grade average based on fully graded assignments assuming all assignments have the same weight and the same number of submissions."
            >
              {/* grade average */}
              <span className="whitespace-nowrap">
                Avg.{" "}
                {(
                  (group.assignments.reduce((acc, assignment) => {
                    if (assignment.get_grading_progress !== 100.0) {
                      return acc
                    }
                    return (
                      acc + assignment.get_average_grade / assignment.max_score
                    )
                  }, 0) /
                    group.assignments.filter(
                      (assignment) => assignment.get_grading_progress === 100.0
                    ).length) *
                  100
                ).toFixed(1) || "- "}
                %
              </span>
            </div>
            <div className="ml-auto font-medium">
              {group.assignments.length} assignments
            </div>
          </div>
          <ScrollArea className="max-h-56 overflow-y-auto">
            {group.assignments.map((assignment) => (
              <Link
                to="/assignments/$assignmentId"
                key={assignment.id}
                params={{ assignmentId: assignment.id }}
                className="flex items-center first:mt-2 hover:bg-muted/50 p-4 mx-1 rounded-lg duration-200"
              >
                <div className="grid gap-1">
                  <p className="text-sm font-medium leading-none">
                    {assignment.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {assignment.max_score} points
                  </p>
                </div>
                <div className="ml-auto font-medium mr-4 flex items-center gap-1">
                  {assignment.submission_count}{" "}
                  <LuFile className="h-4 w-4 inline" />
                </div>
              </Link>
            ))}
          </ScrollArea>
        </TabsContent>
      ))}
    </Tabs>
  )
}
