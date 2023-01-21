from django.urls import path

from .views import assignment_detail_view, cluster_view, cluster_submission

app_name = 'assignments'

urlpatterns = [
    path('courses/<course_pk>/assignments/<assignment_pk>/', assignment_detail_view, name='detail'),
    path('courses/<course_pk>/assignments/<assignment_pk>/cluster/', cluster_view, name='cluster'),
    path('courses/<course_pk>/assignments/<assignment_pk>/clustersubmission/', cluster_submission, name='cluster_submission'),
]