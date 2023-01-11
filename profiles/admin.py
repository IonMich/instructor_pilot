from django.contrib import admin

from .models import StudentProfile, UserProfile

# Register your models here.

admin.site.register(UserProfile)
admin.site.register(StudentProfile)