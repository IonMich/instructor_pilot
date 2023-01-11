from django.urls import path

from .views import (
    course_list_view,
    section_list_view,
    detail_view,
    )

app_name = 'students'

urlpatterns = [
    path('courses/<course_pk>/students/', course_list_view, name='home'),
    path('courses/<course_pk>/sections/<section_pk>/students/', section_list_view, name='section_list'),
    path('courses/<course_pk>/students/<student_pk>/', detail_view, name='detail'),  
]