from django.contrib import admin

from .models import Meeting, Section

# Register your models here.

admin.site.register(Section)
admin.site.register(Meeting)