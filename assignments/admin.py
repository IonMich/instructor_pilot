from django.contrib import admin

from .models import Assignment, SavedComment, Version, VersionFile, VersionText

# Register your models here.

class AssignmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_long_name', 'assignment_group', "max_score", "max_question_scores", "get_grading_progress", "get_average_grade"]
    list_filter = ['course', 'assignment_group', "course__course_code", "course__term"]
    search_fields = [
        'name',
        'course__name',
        'assignment_group',
    ]

class SavedCommentAdmin(admin.ModelAdmin):
    list_display = ['id', '__str__', 'author', 'assignment', 'position', 'version', 'question_number', 'created_at']
    list_filter = ['author', 'assignment__course', 'assignment']

admin.site.register(Assignment, AssignmentAdmin)

admin.site.register(Version)
admin.site.register(VersionFile)
admin.site.register(VersionText)
admin.site.register(SavedComment, SavedCommentAdmin)
