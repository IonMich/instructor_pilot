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


