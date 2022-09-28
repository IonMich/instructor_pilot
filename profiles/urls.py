from django.urls import path
from .views import (
    profiles_detail_view,
    profiles_list_view,
    )
app_name = 'profiles'

urlpatterns = [
    path('profiles/', profiles_list_view, name='list'),
    path('profiles/<pk>/', profiles_detail_view, name='detail'),
]