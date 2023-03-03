from django.urls import path

from .views import (assignment_detail_view,
                       version_view, version_submission, version_reset, version_change, delete_comment)

app_name = 'assignments'

urlpatterns = [
    path('courses/<course_pk>/assignments/<assignment_pk>/', assignment_detail_view, name='detail'),
    path('courses/<course_pk>/assignments/<assignment_pk>/version/', version_view, name='version'),
    path('courses/<course_pk>/assignments/<assignment_pk>/versionsubmission/', version_submission, name='version_submision'),
    path('courses/<course_pk>/assignments/<assignment_pk>/versionreset/', version_reset, name='version_reset'),
    path('courses/<course_pk>/assignments/<assignment_pk>/versionchange/', version_change, name='version_change'),
    path('courses/<course_pk>/assignments/<assignment_pk>/deletecomment/', delete_comment, name='delete_comment'),


]