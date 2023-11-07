from django.urls import path

from .views import (api_canvas_announcements_get_view,
                    api_canvas_assignment_groups_get_view,
                    api_canvas_assignments_get_view,
                    api_canvas_course_get_view, api_canvas_courses_get_view,
                    api_canvas_sections_get_view,
                    api_course_announcement_create,
                    api_course_assignment_groups_create,
                    api_course_assignments_create, api_course_create,
                    api_course_sections_create, course_detail_view,
                    course_patch_image, grading_scheme_update_view,
                    user_list_view)

app_name = 'courses'

urlpatterns = [
    path('', user_list_view, name='home'),
    path('courses/<pk>/', course_detail_view, name='detail'),
    path('courses/<pk>/image/', course_patch_image, name='course_patch_image'),
    path('courses/', api_course_create, name='create'),
    path('courses/<course_pk>/sections/', api_course_sections_create, name='sections_create'),
    path('courses/<course_pk>/assignment_groups/', api_course_assignment_groups_create, name='assignment_groups_create'),
    path('courses/<course_pk>/assignments/', api_course_assignments_create, name='assignments_create'),
    path('courses/<course_pk>/announcements/', api_course_announcement_create, name='announcement_create'),
    path('canvas_courses/', api_canvas_courses_get_view, name='canvas_courses'),
    path('canvas_courses/<canvas_id>/', api_canvas_course_get_view, name='canvas_course'),
    path('canvas_courses/<canvas_id>/sections/', api_canvas_sections_get_view, name='canvas_sections'),
    path('canvas_courses/<canvas_id>/assignments/', api_canvas_assignments_get_view, name='canvas_assignments'),
    path('canvas_courses/<canvas_id>/assignment_groups/', api_canvas_assignment_groups_get_view, name='canvas_assignment_groups'),
    path('canvas_courses/<canvas_id>/announcements/', api_canvas_announcements_get_view, name='canvas_announcements'),
    path('course/<course_pk>/grading_scheme/update/', grading_scheme_update_view, name='grading_scheme_update'),
]