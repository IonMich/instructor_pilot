import json

from django.apps import apps
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render


def get_serialized_students(course_pk, section_pk=None):
    """returns a list of serialized students in a course or section
    """
    Course = apps.get_model('courses', 'Course')
    Section = apps.get_model('sections', 'Section')
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
        submissions = submissions.filter(assignment__assignment_group_object=assignment_group)
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

@login_required
def api_course_enrollments_create(request, course_pk):
    """create a view that creates a student in a course
    """
    Course = apps.get_model('courses', 'Course')
    if request.method != 'POST':
        return JsonResponse({'message': 'Only POST requests are allowed.'})
    
    data = json.loads(request.body)
    students_data_str = data.get('students')
    students_data = json.loads(students_data_str)
    course = Course.objects.get(pk=course_pk)
    Student = apps.get_model('students', 'Student')
    Section = apps.get_model('sections', 'Section')

    profiles = []
    print(f'lenght of students_data: {len(students_data)}')
    created_list = []
    for student_data in students_data:
        section_id = student_data.pop('section_id')
        try:
            new_course_section = Section.objects.get(canvas_id=section_id)
        except Section.DoesNotExist:
            print(f'Section with canvas_id {section_id} does not exist')
            response = {
                'message': f'Section with canvas_id {section_id} does not exist',
                'success': False,
            }
            return JsonResponse(response)
        except Section.MultipleObjectsReturned:
            print(f'Multiple sections with canvas_id {section_id} exist')
            response = {
                'message': f'Multiple sections with canvas_id {section_id} exist',
                'success': False,
            }
            return JsonResponse(response)
        except Exception as e:
            print(e)
            response = {
                'message': 'Something went wrong!',
                'success': False,
            }
            return JsonResponse(response)
        bio = student_data.pop('bio')
        avatar_url = student_data.pop('avatar_url')
        defaults = {
            **student_data,
        }
        student, created = Student.objects.get_or_create(
            canvas_id=student_data.get('canvas_id'),
            defaults=defaults
        )
        # if student exists and uni_id is numeric, update uni_id only if defaults['uni_id'] is also numeric
        if (not created) and (student.uni_id) and (student.uni_id.isnumeric()):
            data_uni_id = student_data.get('uni_id', '')
            if data_uni_id and (not data_uni_id.isnumeric()):
                print(f'uni_id {data_uni_id} is not numeric, not overridding existing numeric id {student.uni_id}')
                defaults.pop('uni_id')
        if (not created):
            for key, value in defaults.items():
                print(f'setting {key} from {getattr(student, key)} to {value}')
                setattr(student, key, value)
            student.save()

        created_list.append(created)

        student_course_sections = student.sections.filter(course=course)
        student.sections.remove(*student_course_sections)
        student.sections.add(new_course_section)

        profiles.append({
            'profile': student.profile,
            'bio': bio,
            'new_avatar_url': avatar_url,
        })

    print("Updating avatars from canvas ...")
    Student.update_profiles_from_canvas(profiles)
    print("Done updating avatars from canvas ...")

    response = {
        'message': 'All students enrolled successfully!',
        'created': created_list,
        'success': True,
    }
    return JsonResponse(response)

@login_required
def course_students_view(request, course_pk):
    if request.method == 'GET':
        return course_list_view(request, course_pk)
    elif request.method == 'POST':
        return api_course_enrollments_create(request, course_pk)
    else:
        return JsonResponse({'message': 'Only GET and POST requests are allowed.'})

# Create your views here.
@login_required
def section_list_view(request, course_pk, section_pk):
    """create a view that returns a serialized list of students in a course
    """
    Section = apps.get_model('sections', 'Section')
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