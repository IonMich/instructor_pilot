export interface CanvasSection {
  canvas_id: number
  name: string
  total_students: number
}

export interface CanvasStudent {
  canvas_id: number
  name: string
  sortable_name: string
  avatar_url: URL
  bio: string
  enrollments: {
    course_section_id: number
  }[]
}

export interface Section {
  id: number
  url: string
  name: string
  teaching_assistant: string
  meetings: Meeting[]
  course: Course | number
  class_number: string
  canvas_id: string
  students_count: number
}

export interface Meeting {
  id: number
  day: string
  start_time: string
  end_time: string
  section: Section
}

export interface Student {
  id: number
  first_name: string
  last_name: string
  email: string
  uni_id: string
  created: string
  updated: string
  canvas_id: string
  avatar?: string
  profile: {
    avatar?: URL
  }
  sections: Section[]
}

export interface Course {
  id: number
  url: string
  name: string
  course_code: string
  term: string
  canvas_id: string
  sections: Section[]
}

export interface CanvasCourse {
  canvas_id: number
  name: string
  course_code: string
  term: {
    name: string
  }
  total_students: number
  teachers: {
    display_name: string
  }[]
  already_exists: boolean
}

export interface Assignment {
  id: number
  url: string
  name: string
  max_score: number
  position: number
  submission_count: number
  course: Course
  max_question_scores: string
  get_average_grade: number
  get_grading_progress: number
  assignment_group_object: AssignmentGroup
  assignment_group: string
  max_page_number: number
  saved_comments: AssignmentSavedComment[]
  canvas_id?: string
}

export interface AssignmentSavedComment {
  id: number
  title: string
  text: string
  assignment_id: number
  position: number
}

export interface PaperSubmissionImage {
  id: number
  page: number
  image: string
}

export interface InfoField {
  title: string
  assignment_id: number
  description: string
  pattern?: string
  pages?: number[]
}

export interface ExtractedField {
  info_field: InfoField
  submission_image_id: string
  value: string
}

export interface Submission {
  id: string
  url: string
  student?: Student
  grade: number
  version?: Version
  canvas_id: string
  canvas_url: string
  assignment: Assignment
  question_grades: string
  pdf: string
  papersubmission_images: PaperSubmissionImage[]
  submission_comments: SubmissionComment[]
  extracted_fields?: ExtractedField[]
}

export interface Version {
  id: string
  name: string
  version_image: URL
}

export interface SubmissionComment {
  id: number
  text: string
  author: User | Student
  created_at: string
  updated_at: string
}

export interface User {
  id: number
  first_name: string
  last_name: string
  username: string
  email: string
  created: string
  updated: string
  avatar: string
  profile: {
    avatar?: URL
  }
}

export interface AssignmentGroup {
  id: string
  name: string
  position: number
  group_weight: number
}

export interface Announcement {
  id: number
  canvas_id: number
  course: Course
  title: string
  date: string
}
