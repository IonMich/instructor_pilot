from django.shortcuts import get_object_or_404, render

from courses.models import Course
from sections.models import Section


def get_serialized_students(course_pk, section_pk=None):
    if section_pk:
        section = get_object_or_404(Section, pk=section_pk)
        if course_pk != str(section.course.pk):
            raise ValueError("Course pk does not match section's course pk")
        students = section.students.all()
    else:
        course = get_object_or_404(Course, pk=course_pk)
        students = course.get_students()
    # Serialize the students
    serialized_students = [{
        'id': student.id,
        'name': student.__str__(),
        'email': student.email,
        'uni_id': student.uni_id,
        'bio': student.profile.bio,
        'canvas_id': student.canvas_id,
        'avatar_url': student.profile.avatar.url,
        'created': student.created,
        'updated': student.updated,
    } for student in students]

    return serialized_students


# Create your views here.
def course_list_view(request, course_pk):
    """create a view that returns a seralized list of students in a course
    """
    course = get_object_or_404(Course, pk=course_pk)
    serialized_students = get_serialized_students(course_pk)

    

    # Return the serialized students
    return render(request, 'students/list.html', 
    {
        'students': serialized_students,
        'course': course,
        })

# Create your views here.
def section_list_view(request, course_pk, section_pk):
    """create a view that returns a seralized list of students in a course
    """
    
    section = get_object_or_404(Section, pk=section_pk)
    if course_pk != str(section.course.pk):
        raise ValueError("Course pk does not match section's course pk")
    serialized_students = get_serialized_students(course_pk, section_pk)

    # Return the serialized students
    return render(request, 'students/list.html', 
    {
        'students': serialized_students,
        "course": section.course,
        'section': section,
        })


def detail_view(request, course_pk, student_pk):
    raise NotImplementedError()