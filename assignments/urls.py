from django.urls import path
from .views import (
    assignment_detail_view,
    )

app_name = 'assignments'

urlpatterns = [
    path('courses/<course_pk>/assignments/<assignment_pk>/', assignment_detail_view, name='detail'),
]