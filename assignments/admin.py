from django.contrib import admin
from .models import Assignment
# Register your models here.

class AssignmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_long_name', 'assignment_group', "max_score", "max_question_scores", "get_grading_progress", "get_average_grade"]
    list_filter = ['course', 'assignment_group', "course__course_code", "course__term"]
    search_fields = [
        'name',
        'course__name',
        'assignment_group',
    ]

admin.site.register(Assignment, AssignmentAdmin)