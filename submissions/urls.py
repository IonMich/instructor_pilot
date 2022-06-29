from django.urls import path
from .views import (
    home_view,
    submission_list_view,
    submission_detail_view,
    )

app_name = 'submissions'

urlpatterns = [
    path('', home_view, name='home'),
    path('submissions/', submission_list_view, name='list'),
    path('submissions/<pk>/', submission_detail_view, name='detail'),
]