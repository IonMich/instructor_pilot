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
