import json
import re

# Create your views here.
from django.apps import apps
#import 404 error page
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render

from courses.utils import get_canvas_object

from .models import Course

from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from courses.serializers import CourseSerializer

class CourseViewSet(viewsets.ModelViewSet):
    """
    This ViewSet automatically provides `list`, `create`, `retrieve`,
    `update` and `destroy` actions.
    """
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly,
                          ]

class ListCanvasCourses(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        canvas = get_canvas_object()
        list_to_include = [
            "course_image",
            "teachers","total_students",
            "sections","course_progress",
            "term","public_description"]
        canvas_courses = []
        try:
            canvas_courses = canvas.get_courses( 
                include=list_to_include)
        except Exception as e:
            print(e)
            return Response(
                data=None,
                status=500,
            )
        canvas_courses_serialized = []
        for canvas_course in canvas_courses:
            retrieved_dict = canvas_course.__dict__
            course_dict = {
                'canvas_id': canvas_course.id,
                'name': retrieved_dict.get('name', ''),
                'course_code': retrieved_dict.get('course_code', ''),
                'term': retrieved_dict.get('term', ''),
                'total_students': retrieved_dict.get('total_students', 0),
                'teachers': retrieved_dict.get('teachers', []),
            }
            try:
                Course.objects.get(canvas_id=canvas_course.id)
                course_dict['already_exists'] = True
            except Course.DoesNotExist:
                course_dict['already_exists'] = False
            canvas_courses_serialized.append(course_dict)
        return Response(canvas_courses_serialized, status=200)


@login_required
def course_detail_view(request, pk):
    if request.method != 'GET':
        return JsonResponse({'message': 'Only GET requests are allowed.'})
    course = get_object_or_404(Course, pk=pk)
    return render(
        request, 
        'courses/detail.html', 
        {'course': course, })

@login_required
def user_list_view(request):
    courses = Course.objects.all()
    return render(
        request, 
        'courses/user_list.html', 
        {'courses': courses, })

@login_required
def api_course_create_no_sync(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Only POST requests are allowed.'})
    data = json.loads(request.body)
    try:
        course, created = Course.objects.update_or_create(
            **data,
        )
        if created:
            message = 'Course created successfully!'
        else:
            message = 'Course updated successfully!'
        response = {
            'message': message,
            'course_id': course.pk,
            'success': True,
        }

        return JsonResponse(response)
    except Exception as e:
        print(e)
        response = {
            'message': 'Error creating course!',
            'success': False,
        }
        return JsonResponse(response)



@login_required
def api_course_create_with_sync(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Only POST requests are allowed.'})

    data = json.loads(request.body)
    course_canvas_id = data.pop('canvas_id')
    print(data)
    course_image_url = data.pop('image_url')
    
    try:
        course, created = Course.objects.update_or_create(
            canvas_id=course_canvas_id,
            defaults={
                **data,
            }
        )
    except Exception as e:
        print("Handling exception: ", e)
        response = {
            'message': 'Error creating course!',
            'success': False,
        }
        return JsonResponse(response)

    try:
        update_course_image(course, course_image_url)
    except Exception as e:
        print("Handling exception: ", e)
        pass

    if created:
        message = 'Course created successfully!'
    else:
        message = 'Course found and updated successfully!'

    response = {
        'message': message,
        'course_id': course.pk,
        'category': "course",
        'created': created,
        'success': True,
    }

    return JsonResponse(response)
    

def update_course_image(course, image_url):
    if image_url in [None,'']:
        print("No image url provided. Not updating.")
        return
    from urllib import request

    from django.core.files import File
    result = request.urlretrieve(image_url)
    from hashlib import md5
    new_avatar_md5 = md5(open(result[0], 'rb').read()).hexdigest()
    try:
        old_avatar_md5 = md5(open(course.image.path, 'rb').read()).hexdigest()
        if new_avatar_md5 == old_avatar_md5:
            print("Course image is the same. Not updating.")
            return
    except Exception as e:
        print("Handling exception: ", e)
        pass
    print("Course image has changed. Updating.")
    course.image.save(
        f"{course.course_code}_{course.term}.png",
        File(open(result[0], 'rb'))
        )

@login_required
def api_course_create(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Only POST requests are allowed.'})
    
    data = json.loads(request.body)
    course_canvas_id = data.get('canvas_id')
    if course_canvas_id:
        return api_course_create_with_sync(request)
    else:
        return api_course_create_no_sync(request)


@login_required
def api_course_sections_create(request, course_pk):
    if request.method != 'POST':
        return JsonResponse({'message': 'Only POST requests are allowed.'})
    
    data = json.loads(request.body)
    course = Course.objects.get(pk=course_pk)
    Section = apps.get_model('sections', 'Section')
    section, created = Section.objects.update_or_create(
        canvas_id=data.get('canvas_id'),
        defaults={
            **data,
            'course': course,
            'teaching_assistant': request.user,
        }
    )

    if created:
        message = 'Section created successfully!'
    else:
        message = 'Section found and updated successfully!'
    print(message)
    response = {
        'message': message,
        'section_id': section.pk,
        'category': "sections",
        'created': created,
        'success': True,
    }

    return JsonResponse(response)

@login_required
def course_patch_image(request, pk):
    if request.method != 'POST':
        return JsonResponse({'message': 'Only POST requests are allowed.'})
    course = Course.objects.get(pk=pk)
    image = request.FILES.get('image')
    if image:
        course.image = image
        course.save()
        response = {
            'message': 'Course image updated successfully!',
            'success': True,
        }
        return JsonResponse(response)
    else:
        response = {
            'message': 'No image found.',
            'success': False,
        }
        return JsonResponse(response)


@login_required
def api_course_assignment_groups_create(request, course_pk):
    if request.method != 'POST':
        return JsonResponse({'message': 'Only POST requests are allowed.'})
    
    data = json.loads(request.body)
    course = Course.objects.get(pk=course_pk)
    AssignmentGroup = apps.get_model('assignments', 'AssignmentGroup')
    assignment_group, created = AssignmentGroup.objects.update_or_create(
        canvas_id=data.get('canvas_id'),
        defaults={
            **data,
            'course': course,
        }
    )

    if created:
        message = 'Assignment Group created successfully!'
    else:
        message = 'Assignment Group found and updated successfully!'

    response = {
        'message': message,
        'assignment_group_id': assignment_group.pk,
        'created': created,
        'category': "assignment_groups",
        'success': True,
    }

    return JsonResponse(response)


@login_required
def api_course_assignments_create(request, course_pk):
    if request.method != 'POST':
        return JsonResponse({'message': 'Only POST requests are allowed.'})
    
    data = json.loads(request.body)
    assignment_group_id = data.pop('assignment_group_object_id')
    AssignmentGroup = apps.get_model('assignments', 'AssignmentGroup')
    assignment_group = AssignmentGroup.objects.get(canvas_id=assignment_group_id)
    course = Course.objects.get(pk=course_pk)
    Assignment = apps.get_model('assignments', 'Assignment')

    
    defaults={
        **data,
        'assignment_group_object': assignment_group,
        'course': course,
    }

    try:
        assignment, created = Assignment.objects.get_or_create(
            canvas_id=data.get('canvas_id'),
            defaults=defaults
        )
        num_subs_with_grader = assignment.get_all_submissions().filter(graded_by__isnull=False).count()
        num_subs_with_question_grades = assignment.get_all_submissions().filter(question_grades__isnull=False).count()
        if (not created) and (num_subs_with_grader > 0 or num_subs_with_question_grades > 0):
            defaults.pop('max_question_scores')
            print("Assignment has graded submissions. Not updating max_question_scores.")
        if (not created):
            print(assignment)
            print("Assignment is updated")
            for key, value in defaults.items():
                setattr(assignment, key, value)
            assignment.save()

    except Exception as e:
        print("Handling exception: ", e)
        return JsonResponse({
            'message': 'Error creating or updating assignment.',
            'success': False,
        })

    if created:
        message = 'Assignment created successfully!'
    else:
        message = 'Assignment found and updated successfully!'

    response = {
        'message': message,
        'assignment_id': assignment.pk,
        'category': "assignments",
        'created': created,
        'success': True,
    }

    return JsonResponse(response)

@login_required
def api_course_announcement_create(request, course_pk):
    if request.method != 'POST':
        return JsonResponse({'message': 'Only POST requests are allowed.'})
    
    data = json.loads(request.body)
    course = Course.objects.get(pk=course_pk)
    Announcement = apps.get_model('courses', 'Announcement')
    announcement, created = Announcement.objects.update_or_create(
        canvas_id=data.get('canvas_id'),
        defaults={
            **data,
            'course': course,
        }
    )

    if created:
        message = 'Announcement created successfully!'
    else:
        message = 'Announcement found and updated successfully!'

    response = {
        'message': message,
        'announcement_id': announcement.pk,
        'category': "announcements",
        'created': created,
        'success': True,
    }

    return JsonResponse(response)


@login_required
def grading_scheme_update_view(request, course_pk):
    """
    The request.body contains e.g.
    'num_questions': '2', 'equal_grades': True, 'max_grades': '5,5', 'apply_to_all': False, 'assignment_id':42

    if equal_grades is True, then take num_questions, divide max_grades by num_questions 
    and create a list of length num_questions with the same value. Finally, convert the list to a comma-separated string

    if equal_grades is False, then take the max_grades directly

    if apply_to_all is True, then apply the grading scheme to all assignments in the same assignment_group
    """
    status = 'success'
    course = get_object_or_404(Course, pk=course_pk)
    if request.method == 'POST':
        data = json.loads(request.body.decode("utf-8"))

        num_questions = int(data.get('num_questions'))
        equal_grades = data.get('equal_grades')
        max_grades = data.get('max_grades')
        apply_to_all = data.get('apply_to_all')
        assignment_id = data.get('assignment_id')

        assignment_of_request = course.assignments.get(pk=assignment_id)
        assignment_group = assignment_of_request.assignment_group_object

        if equal_grades:
            max_grades = [assignment_of_request.max_score / num_questions] * num_questions
            max_grades = ",".join(map(str, max_grades))
        else:
            max_grades = max_grades

        if apply_to_all:
            assignments_to_update = course.assignments.filter(
                assignment_group_object=assignment_group
            )
        else:
            assignments_to_update = [assignment_of_request]


        for assignment in assignments_to_update:
            # check if the assignment has graded submissions
            # if it does, do not update the grading scheme
            num_subs_with_grader = assignment.get_all_submissions().filter(graded_by__isnull=False).count()
            num_subs_with_question_grades = assignment.get_all_submissions().filter(question_grades__isnull=False).count()
            if num_subs_with_grader == 0 and num_subs_with_question_grades == 0:
                print(f"Updating to grading scheme {max_grades} for assignment {assignment.name}")
                assignment.max_question_scores = max_grades
                assignment.save()
            else:
                print(f"Assignment {assignment.name} has (partially or fully) graded submissions. Not updating grading scheme.")
                status = 'warning'

        response = {
            'message': 'Grading scheme updated!',
            'status': status
        }
        return JsonResponse(response)

@login_required
def api_canvas_courses_get_view(request):
    """
    Get all courses from Canvas and return them as a json response
    """
    if request.method != 'GET':
        return JsonResponse(
            {
                'message': 'Only GET requests are allowed.',
                'success': False,
        })
    
    canvas = get_canvas_object()

    list_to_include = [
            "course_image",
            "teachers","total_students",
            "sections","course_progress",
            "term","public_description"]
    canvas_courses = []
    try:
        canvas_courses = canvas.get_courses( 
            include=list_to_include)
    except Exception as e:
        print(e)
        return JsonResponse(
            {
                'message': 'Something went wrong while fetching courses from Canvas.',
                'success': False,
        })
    canvas_courses_serialized = []
    for course in canvas_courses:
        print(course.__dict__)
        course_dict = course.__dict__
        # remove the _requester object
        course_dict.pop('_requester')
        canvas_courses_serialized.append(course_dict)
        # if there is a course with the same canvas_id, add a flag
        try:
            Course.objects.get(canvas_id=course.id)
            course_dict['already_exists'] = True
        except Course.DoesNotExist:
            course_dict['already_exists'] = False

    response = {
        'message': 'Canvas courses fetched successfully!',
        'courses': canvas_courses_serialized,
        'success': True,
    }
    return JsonResponse(response)

@login_required
def api_canvas_course_get_view(request, canvas_id):
    """
    Get a single course from Canvas and return it as a json response
    """
    if request.method != 'GET':
        return JsonResponse(
            {
                'message': 'Only GET requests are allowed.',
                'success': False,
        })
    canvas = get_canvas_object()
    list_to_include = [
            "course_image","observed_users",
            "teachers","total_students",
            "sections","course_progress",
            "term","public_description",
            "course_image", "public_description",
    ]
    canvas_course = None
    try:
        canvas_course = canvas.get_course(
                int(canvas_id), 
                use_sis_id=False,
                include=list_to_include)
    except Exception as e:
        print(e)
        return JsonResponse(
            {
                'message': 'Something went wrong while fetching course from Canvas.',
                'success': False,
        })
    course_dict = canvas_course.__dict__
    # remove the _requester object
    course_dict.pop('_requester')
    response = {
        'message': 'Canvas course fetched successfully!',
        'course': course_dict,
        'success': True,
    }
    return JsonResponse(response)
    

@login_required
def api_canvas_sections_get_view(request, canvas_id):
    """
    Get all courses from Canvas and return them as a json response
    """
    if request.method != 'GET':
        return JsonResponse(
            {
                'message': 'Only GET requests are allowed.',
                'success': False,
        })
    canvas = get_canvas_object()
    list_to_include = [
            "course_image","observed_users",
            "teachers","total_students",
            "sections","course_progress",
            "term","public_description",
            "course_image",
    ]
    canvas_course = None
    try:
        canvas_course = canvas.get_course(
                int(canvas_id), 
                use_sis_id=False,
                include=list_to_include)
    except Exception as e:
        print(e)
        return JsonResponse(
            {
                'message': 'Something went wrong while fetching courses from Canvas.',
                'success': False,
        })
    list_to_include = [
        "enrollments", "total_students", 
        "passback_status", "permissions",
    ]
    canvas_sections = canvas_course.get_sections(
        include=list_to_include)
    canvas_sections_serialized = []
    for section in canvas_sections:
        section_dict = section.__dict__
        # remove the _requester object
        section_dict.pop('_requester')
        canvas_sections_serialized.append(section_dict)
    canvas_sections = canvas_course.sections
    for section in canvas_sections:
        print(section)
        section_dict = section
        # get the canvas_sections_serialized object with the same id
        section_id = section_dict['id']
        corresponding_section = next((item for item in canvas_sections_serialized if item["id"] == section_id), None)
        if corresponding_section:
            corresponding_section.update(section_dict)
    list_to_include = [
        "enrollments", "locked", "bio",
        "sis_user_id", "sis_login_id", "avatar_url"
    ]

    canvas_users = []
    try:
        canvas_users = canvas_course.get_users(
            enrollment_type=['student'],
            include=list_to_include)
    except Exception as e:
        print(e)
    manual_total_students = {}
    for user in canvas_users:
        user_dict = user.__dict__
        # remove the _requester object
        user_dict.pop('_requester')
        student_section_enrollments = user_dict['enrollments']
        for enrollment in student_section_enrollments:
            if enrollment['type'] != 'StudentEnrollment':
                continue
            section_id = enrollment['course_section_id']
            if section_id not in manual_total_students:
                manual_total_students[section_id] = 0
            manual_total_students[section_id] += 1
    for section in canvas_sections_serialized:
        section_id = section['id']
        if section_id in manual_total_students:
            section['manual_total_students'] = manual_total_students[section_id]
        else:
            section['manual_total_students'] = 0

    canvas_students_serialized = []
    for user in canvas_users:
        user_dict = user.__dict__
        canvas_students_serialized.append(user_dict)

    for section in canvas_sections_serialized:
        # add alreadyAdded flag if the section is already added
        # in the database
        section_id = section['id']
        Section = apps.get_model('sections', 'Section')
        try:
            Section.objects.get(canvas_id=section_id)
            section['alreadyAdded'] = True
        except Exception as e:
            print(e)
            section['alreadyAdded'] = False

    from courses.utils import get_course_from_UFSOC_apix
    try:
        ufsoc_json_response = get_course_from_UFSOC_apix(
            term_name=canvas_course.term['name'],
            course_code=canvas_course.course_code,
            instructor_name="",
            program_level_name="Undergraduate",
        )
        print(ufsoc_json_response)
        if len(ufsoc_json_response) == 0:
            ufsoc_json_response = {
                'message': 'No course found in UFSOC API',
                'success': False,
                'error': 'No course found in UFSOC API',
            }
        elif len(ufsoc_json_response) == 1:
            ufsoc_json_response = ufsoc_json_response[0]
            ufsoc_json_response['success'] = True
        else:
            ufsoc_json_response = ufsoc_json_response[0]
            ufsoc_json_response["success"] = True
            ufsoc_json_response["error"] = "Multiple courses found in UFSOC API"
    except Exception as e:
        print(f"Handling: {e}")
        ufsoc_json_response = {
            'message': 'Something went wrong while fetching courses from UFSOC API.',
            'success': False,
            'error': str(e),
        }
    if not ufsoc_json_response['success']:
        response = {
            'message': 'Canvas courses fetched successfully!',
            'sections': canvas_sections_serialized,
            'students': canvas_students_serialized,
            'course_description': "",
            'success': True,
        }
        return JsonResponse(response)
    
    sections = ufsoc_json_response['sections']
    for section in sections:
        # match section by classNumber or by number
        number = section['number']
        class_number = section['classNumber']
        # each canvas_sections_serialized section has name .*\-(\d{4})\((\d{5})\)
        # where the first capture group is the section "number" and the second
        # capture group is the section "classNumber"
        # we need to match either the section number or the classNumber
        regex = r".*\-([0-9a-zA-Z]{4})\((\d{5})\)"
        for canvas_section in canvas_sections_serialized:
            if 'name' not in canvas_section:
                continue
            matches = re.finditer(regex, canvas_section['name'], re.MULTILINE)
            for  match in matches:
                if (match.group(1) == str(number)) or (
                    match.group(2) == str(class_number)):
                    canvas_section.update(section)
                    break

    user_last_name = request.user.last_name
    for section in canvas_sections_serialized:
        if 'instructors' not in section:
            continue

        for instructor in section['instructors']:
            print(instructor)
            if user_last_name.lower() in instructor['name'].lower():
                print("match")
                section['matchesInstructorLastName'] = True
                break

    course_description = ufsoc_json_response['description']
    response = {
        'message': 'Canvas sections fetched successfully!',
        'sections': canvas_sections_serialized,
        'students': canvas_students_serialized,
        'course_description': course_description,
        'success': True,
    }
    return JsonResponse(response)


def api_canvas_assignments_get_view(request, canvas_id):
    if request.method != 'GET':
        return JsonResponse(
            {
                'message': 'Only GET requests are allowed.',
                'success': False,
        })
    canvas = get_canvas_object()
    try:
        canvas_course = canvas.get_course(canvas_id)
        canvas_assignments = canvas_course.get_assignments()
    except Exception as e:
        print(e)
        return JsonResponse(
            {
                'message': 'Error while fetching assignments from Canvas API',
                'success': False,
        })
    canvas_assignments_serialized = []
    for assignment in canvas_assignments:
        assignment_dict = assignment.__dict__
        # remove the _requester object
        assignment_dict.pop('_requester')
        canvas_assignments_serialized.append(assignment_dict)
    response = {
        'message': 'Canvas assignments fetched successfully!',
        'assignments': canvas_assignments_serialized,
        'success': True,
    }
    return JsonResponse(response)

def api_canvas_assignment_groups_get_view(request, canvas_id):
    if request.method != 'GET':
        return JsonResponse(
            {
                'message': 'Only GET requests are allowed.',
                'success': False,
        })
    canvas = get_canvas_object()
    try:
        canvas_course = canvas.get_course(canvas_id)
        canvas_assignment_groups = canvas_course.get_assignment_groups()
    except Exception as e:
        print(e)
        return JsonResponse(
            {
                'message': 'Error while fetching assignment groups from Canvas API',
                'success': False,
        })
    canvas_assignment_groups_serialized = []
    for assignment_group in canvas_assignment_groups:
        assignment_group_dict = assignment_group.__dict__
        # remove the _requester object
        assignment_group_dict.pop('_requester')
        canvas_assignment_groups_serialized.append(assignment_group_dict)
    response = {
        'message': 'Canvas assignment groups fetched successfully!',
        'assignment_groups': canvas_assignment_groups_serialized,
        'success': True,
    }
    return JsonResponse(response)

@login_required
def api_canvas_announcements_get_view(request, canvas_id):
    if request.method != 'GET':
        return JsonResponse(
            {
                'message': 'Only GET requests are allowed.',
                'success': False,
        })
    canvas = get_canvas_object()
    try:
        canvas_course = canvas.get_course(canvas_id)
        canvas_announcements = canvas_course.get_discussion_topics(
            only_announcements=True
        )
    except Exception as e:
        print(e)
        return JsonResponse(
            {
                'message': 'Error while fetching announcements from Canvas API',
                'success': False,
        })
    canvas_announcements_serialized = []
    for announcement in canvas_announcements:
        announcement_dict = announcement.__dict__
        # remove the _requester object
        announcement_dict.pop('_requester')
        canvas_announcements_serialized.append(announcement_dict)
    response = {
        'message': 'Canvas announcements fetched successfully!',
        'announcements': canvas_announcements_serialized,
        'success': True,
    }
    return JsonResponse(response)