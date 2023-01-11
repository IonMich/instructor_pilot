from django.contrib import admin

from .models import Announcement, Course

# Register your models here.


admin.site.register(Course)
admin.site.register(Announcement)