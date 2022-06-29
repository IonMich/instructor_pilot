from django.urls import path
from .views import *
app_name = 'profiles'

urlpatterns = [
    path('', None, name='home'),
    path('profiles/', None, name='list'),
    path('profiles/<pk>/', None, name='detail'),
]