import json

#import 404 error page
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
# Create your views here.
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from courses.forms import SyncFromCanvasForm
from universities.models import University

from .models import Course, semesters


@login_required
def course_detail_view(request, pk):
    course = get_object_or_404(Course, pk=pk)
    if request.method == 'POST' and request.POST.get('sync_from_canvas'):
        form = SyncFromCanvasForm(request.POST, instance=course)
        if form.is_valid():
            course = form.sync_from_canvas(pk, request.user)
            return redirect('courses:detail', pk=course.pk)
    # print(canvas_course.name)
    # df_TAs, df_teachers, df_students, df_sections = canvas_users_df(canvas_course)
    # print(canvas_course.__dict__)
    # print(df_TAs)
    # print(df_teachers)
    # print(df_students)
    # print(df_sections)
    return render(
        request, 
        'courses/detail copy.html', 
        {'course': course, })

@login_required
def user_list_view(request):
    courses = Course.objects.all()
    return render(
        request, 
        'courses/user_list.html', 
        {'courses': courses, })

@login_required
def course_create_view(request):
    # handle the ajax POST request by creating a new course
    if request.method == 'POST':
        
        import json
        data = json.loads(request.body)
        print(data)

        
        course_code =  data.get('course_code')
        course_term = data.get('term')
        # if the course already exists, return the course
        try:
            course = Course.objects.get(
                course_code=course_code, 
                term=course_term)
            print("Course already exists! Stopping here.")
            # return a json response with an alert message
            
            response = {
                'message': 'Course already exists!',
                'course_id': course.pk,
                'status': 'already-exists'
            }
            return JsonResponse(response)
        except Course.DoesNotExist:
            course = Course(
                course_code=course_code,
                term=course_term,
            )
        # split the term into semester type and year. Year is an integer
        # e.g. "Summer C 2020" -> "Summer C" and 2020
        # e.g. "Fall 2021" -> "Fall" and 2021
        
        if course.term == "Development Term":
            course.semester_type = "D"
            import datetime
            course.year = datetime.datetime.now().year
        else:
            term_splitted = course.term.split(" ")
            for item in semesters:
                print(item, " ".join(term_splitted[:-1]))
                if item[1] == " ".join(term_splitted[:-1]):
                    course.semester_type = item[0]
                    course.year = term_splitted[-1]
                    break
            else:
                raise Exception(f"Term {course.term} is not valid.")
        sync_with_canvas = data.get('sync_with_canvas')

        if sync_with_canvas:
            # check if the course exists in Canvas
            # if it does, sync with Canvas
            # if it doesn't raise a warning to the request.user
            # but still create the course in the database
            course.start_date = timezone.now()
            course.university = University.objects.first()
            course.save()
            course.update_from_canvas(request.user)
        else:
            course.description = data.get('description')
            course.image = data.get('image')

        course.save()

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
        assignment_group = assignment_of_request.assignment_group

        if equal_grades:
            max_grades = [assignment_of_request.max_score / num_questions] * num_questions
            max_grades = ",".join(map(str, max_grades))
        else:
            max_grades = max_grades

        if apply_to_all:
            assignments_to_update = course.assignments.filter(
                assignment_group=assignment_group
            )
        else:
            assignments_to_update = [assignment_of_request]


        for assignment in assignments_to_update:
            # check if the assignment has graded submissions
            # if it does, do not update the grading scheme
            if assignment.get_all_submissions().filter(graded_by__isnull=False).count() == 0:
                print(f"Updating to grading scheme {max_grades} for assignment {assignment.name}")
                assignment.max_question_scores = max_grades
                assignment.save()
            else:
                print("Assignment has graded submissions. Not updating grading scheme.")
                status = 'warning'

        response = {
            'message': 'Grading scheme updated!',
            'status': status
        }
        return JsonResponse(response)





        
        
        
