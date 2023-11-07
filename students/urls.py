from django.urls import path

from .views import course_students_view, detail_view, section_list_view

app_name = 'students'

urlpatterns = [
    path('courses/<course_pk>/students/', course_students_view, name='home'),
    path('courses/<course_pk>/sections/<section_pk>/students/', section_list_view, name='section_list'),
    path('courses/<course_pk>/students/<student_pk>/', detail_view, name='detail'),  
]