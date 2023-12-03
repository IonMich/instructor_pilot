from django.urls import path

from .views import (home_view, redirect_to_next, redirect_to_previous,
                    submission_classify_view, submission_comment_delete_view,
                    submission_comment_modify_view, submission_delete_all_view,
                    submission_delete_view, submission_detail_view,
                    api_grade_update_view,
                    api_submission_patch_view,
                    api_submission_manual_version_view,
                    api_submissions_list_view,
                    )

app_name = 'submissions'

urlpatterns = [
    path('courses/<course_pk>/submissions/', home_view, name='home'),
    path('courses/<course_pk>/assignments/<assignment_pk>/submissions/', home_view, name='home'),
    path('courses/<course_pk>/submissions/classify/', submission_classify_view, name='classify'),
    path('courses/<course_pk>/assignments/<assignment_pk>/submissions/delete-all/', submission_delete_all_view, name='delete-all-submissions'),
    path('courses/<course_pk>/assignments/<assignment_pk>/submissions/<submission_pk>/', submission_detail_view, name='detail'),
    path('courses/<course_pk>/assignments/<assignment_pk>/submissions/<uuid:submission_pk>/previous/', redirect_to_previous, name='detail_previous'),
    path('courses/<course_pk>/assignments/<assignment_pk>/submissions/<uuid:submission_pk>/next/', redirect_to_next, name='detail_next'),
    path('courses/<course_pk>/assignments/<assignment_pk>/submissions/<submission_pk>/delete/', submission_delete_view, name='delete-submission'),
    path('assignments/<assignment_pk>/submissions/<submission_pk>/', api_submission_patch_view, name='api-submission-patch'),
    path('courses/<course_pk>/assignments/<assignment_pk>/submissions/<submission_pk>/comments/<comment_pk>/delete/', submission_comment_delete_view, name='delete-comment'),
    path('courses/<course_pk>/assignments/<assignment_pk>/submissions/<submission_pk>/comments/<comment_pk>/modify/', submission_comment_modify_view, name='modify-comment'),
    path('submissions/<submission_pk>/version/', api_submission_manual_version_view, name='manual-version'),
    path('submissions/<submission_pk>/grade/', api_grade_update_view, name='api-grade-update'),
    path('assignments/<assignment_pk>/submissions/', api_submissions_list_view, name='api-submissions-list'),
]