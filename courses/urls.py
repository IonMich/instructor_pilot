from django.urls import path

from .views import course_create_view, course_detail_view, user_list_view

app_name = 'courses'

urlpatterns = [
    path('', user_list_view, name='home'),
    path('courses/<pk>/', course_detail_view, name='detail'),
    path('courses/', course_create_view, name='create'),
]