from django.urls import path
from .views import (
    home_view,
    course_detail_view
    )

app_name = 'courses'

urlpatterns = [
    path('', home_view, name='home'),
    path('courses/<pk>/', course_detail_view, name='detail'),
]