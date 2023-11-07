from django.urls import path

from .views import api_section_meetings

app_name = 'sections'

urlpatterns = [
    path('sections/<pk>/meetings/', api_section_meetings, name='meetings'),
]