from django.shortcuts import render
from .models import Course
from courses.forms import SyncFromCanvasForm
# Create your views here.
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
#import 404 error page
from django.contrib.auth.decorators import login_required

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
        'courses/detail.html', 
        {'course': course, })

@login_required
def user_list_view(request):
    courses = Course.objects.all()
    return render(
        request, 
        'courses/user_list.html', 
        {'courses': courses, })
