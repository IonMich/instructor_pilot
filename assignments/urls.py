from django.urls import path

from .views import (api_savedcomment_detail_view, api_savedcomment_list_view,
                    assignment_detail_view, delete_comment, version_change,
                    version_reset, version_submission, version_view)

app_name = 'assignments'

urlpatterns = [
    path('courses/<course_pk>/assignments/<assignment_pk>/', assignment_detail_view, name='detail'),
    path('courses/<course_pk>/assignments/<assignment_pk>/version/', version_view, name='version'),
    path('courses/<course_pk>/assignments/<assignment_pk>/versionsubmission/', version_submission, name='version_submision'),
    path('courses/<course_pk>/assignments/<assignment_pk>/versionreset/', version_reset, name='version_reset'),
    path('courses/<course_pk>/assignments/<assignment_pk>/versionchange/', version_change, name='version_change'),
    path('courses/<course_pk>/assignments/<assignment_pk>/deletecomment/', delete_comment, name='delete_comment'),
    path('assignments/<assignment_pk>/starcomments/', api_savedcomment_list_view, name='starcomment_list'),
    path('assignments/<assignment_pk>/starcomments/<savedcomment_pk>/', api_savedcomment_detail_view, name='starcomment_detail'),


]