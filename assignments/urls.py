from django.urls import path

from .views import (api_savedcomment_detail_view, api_savedcomment_list_view,
                    assignment_detail_view, api_delete_versiontextcomment, api_delete_versionfilecomment, api_versions_get,
                    version_reset, api_version_comments, version_view)

app_name = 'assignments'

urlpatterns = [
    path('courses/<course_pk>/assignments/<assignment_pk>/', assignment_detail_view, name='detail'),
    path('courses/<course_pk>/assignments/<assignment_pk>/version/', version_view, name='version'),
    path('assignments/<assignment_pk>/versioncomments/', api_version_comments, name='version_comments'),
    path('assignments/<assignment_pk>/versionreset/', version_reset, name='version_reset'),
    path('assignments/<assignment_pk>/versions/', api_versions_get, name='versions_get'),
    path('versiontextcomment/<comment_pk>/', api_delete_versiontextcomment, name='delete_versiontextcomment'),
    path('versionfilecomment/<comment_pk>/', api_delete_versionfilecomment, name='delete_versionfilecomment'),
    path('assignments/<assignment_pk>/starcomments/', api_savedcomment_list_view, name='starcomment_list'),
    path('assignments/<assignment_pk>/starcomments/<savedcomment_pk>/', api_savedcomment_detail_view, name='starcomment_detail'),
]