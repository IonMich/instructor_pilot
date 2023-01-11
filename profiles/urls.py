from django.urls import path

from .views import (profile_preferences_edit_view, profiles_detail_view,
                    profiles_list_view)

app_name = 'profiles'

urlpatterns = [
    path('profiles/', profiles_list_view, name='list'),
    path('profiles/<pk>/', profiles_detail_view, name='detail'),
    path('profile/preferences/edit/', profile_preferences_edit_view, name='preferences'),
]