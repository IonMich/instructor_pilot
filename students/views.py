from django.shortcuts import get_object_or_404, render
from django.contrib.auth.decorators import login_required
from django.apps import apps
from django.db.models import Q

from sections.models import Section

def get_serialized_students(course_pk, section_pk=None):
    """returns a list of serialized students in a course or section
    """
    Course = apps.get_model('courses', 'Course')
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

def get_serialized_submissions(student_pk, course_pk, assignment_group=None):
    """returns a list of serialized submissions for a student in a course
    """
    Student = apps.get_model('students', 'Student')
    Course = apps.get_model('courses', 'Course')
    PaperSubmission = apps.get_model('submissions', 'PaperSubmission')
    student = get_object_or_404(Student, pk=student_pk)
    course = get_object_or_404(Course, pk=course_pk)
    
    submissions = PaperSubmission.objects.filter(
        Q(assignment__course=course)
    )
    if assignment_group:
        submissions = submissions.filter(assignment__assignment_group=assignment_group)
    student_submissions = submissions.filter(student=student)
    # Serialize the submissions
    student_submissions = [{
        'pk': submission.pk,
        'student_pk': submission.student.pk,
        'url': submission.get_absolute_url(),
        'assignment': submission.assignment.__str__(),
        'classification_type': submission.classification_type,
        'front_page': submission.submissions_papersubmissionimage_related.filter(page=1).first().image.url,
        'question_grades': submission.get_question_grades(),
        'grade': submission.grade,
        'max_score': submission.assignment.max_score,
        'version': submission.version.__str__(),
        'created': submission.created,
        'updated': submission.updated,
    } for submission in student_submissions]

    remaining_submissions = submissions.exclude(student=student)

    remaining_submissions = [{
        'assignment': submission.assignment.__str__(),
        'grade': submission.grade,
        'max_score': submission.assignment.max_score,
    } for submission in remaining_submissions]


    return student_submissions, remaining_submissions


# Create your views here.
@login_required
def course_list_view(request, course_pk):
    """create a view that returns a serialized list of students in a course
    """
    print(request.user)
    Course = apps.get_model('courses', 'Course')
    course = get_object_or_404(Course, pk=course_pk)
    serialized_students = get_serialized_students(course_pk)

    

    # Return the serialized students
    return render(request, 'students/list.html', 
    {
        'students': serialized_students,
        'course': course,
        })

# Create your views here.
@login_required
def section_list_view(request, course_pk, section_pk):
    """create a view that returns a serialized list of students in a course
    """
    print(request.user)
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

@login_required
def detail_view(request, course_pk, student_pk):
    """create a view that returns information about a student
    """
    print(request.user)
    Student = apps.get_model('students', 'Student')
    Course = apps.get_model('courses', 'Course')
    student = get_object_or_404(Student, pk=student_pk)
    course = get_object_or_404(Course, pk=course_pk)
    section = student.sections.filter(course=course).first()
    student_submissions, remaining_submissions = get_serialized_submissions(student_pk, course_pk)
    print(student_submissions)
    

    return render(request, 'students/detail.html', 
    {
        'student': student,
        "course": course,
        'section': section,
        'student_submissions': student_submissions,
        'remaining_submissions': remaining_submissions,
    })