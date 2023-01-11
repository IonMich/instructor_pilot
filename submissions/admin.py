from django.contrib import admin
from .models import (
    PaperSubmission, 
    CanvasQuizSubmission, 
    ScantronSubmission,
    PaperSubmissionImage,
    SubmissionComment,
    )
# # Register your models here.

# admin.site.register(PaperSubmission)
admin.site.register(CanvasQuizSubmission)
admin.site.register(ScantronSubmission)

# currently the admin list page for PaperSubmissions is not user friendly
# because it is displaying only the names of the PaperSubmission objects.
# To organize the list page, we need to create a class that inherits from
# ModelAdmin and then register the class with the admin site. Then we can
# customize the list page by adding fields to the list_display attribute.
# the most useful fields are id, assignment, student, attempt
# there are probably too many students, so don't filter by student
class PaperSubmissionAdmin(admin.ModelAdmin):
    list_display = ['id', 'assignment', "student", 'attempt', 'grade']
    list_filter = ['assignment', 'attempt', 'assignment__course']
    search_fields = [
        'assignment__name', 
        'assignment__course__name',
        'student__first_name', 
        'student__last_name',
    ]

admin.site.register(PaperSubmission, PaperSubmissionAdmin)

# similarly, we can customize the list page for PaperSubmissionImages
class PaperSubmissionImageAdmin(admin.ModelAdmin):
    list_display = ['__str__','page', 'get_assignment']
    list_filter = ['submission__assignment', 'page']
    search_fields = [
        'submission__assignment__name', 
        'submission__assignment__course__name',
        'submission__student__first_name', 
        'submission__student__last_name',
    ]

admin.site.register(PaperSubmissionImage, PaperSubmissionImageAdmin)

# similarly, we can customize the list page for SubmissionComments
# author, is_saved, submission, submission__assignment, submission__student
class SubmissionCommentAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'author', 'text', 'get_assignment', 'is_saved', 'saved_title']
    list_filter = ['author', 'is_saved', 'paper_submission__assignment__course__name', "paper_submission__assignment__assignment_group", "paper_submission__assignment__name"]
    search_fields = [
        'paper_submission__assignment__name', 
        'paper_submission__assignment__course__name',
        'paper_submission__student__first_name', 
        'paper_submission__student__last_name',
    ]

admin.site.register(SubmissionComment, SubmissionCommentAdmin)