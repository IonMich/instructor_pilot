from django.urls import path

from .views import (profile_avatar_upload_view, profile_preferences_edit_view,
                    profile_update_view, profiles_detail_view,
                    profiles_list_view)

app_name = 'profiles'

urlpatterns = [
    path('profiles/', profiles_list_view, name='list'),
    path('profile/update/', profile_update_view, name='update'),
    path('profile/avatar/', profile_avatar_upload_view, name='avatar'),
    path('profile/preferences/edit/', profile_preferences_edit_view, name='preferences'),
    path('profiles/<pk>/', profiles_detail_view, name='detail'),

]