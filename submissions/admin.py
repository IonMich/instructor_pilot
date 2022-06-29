from django.contrib import admin
from .models import Submission, PaperSubmission, CanvasQuizSubmission, ScantronSubmission
# # Register your models here.

admin.site.register(PaperSubmission)
admin.site.register(CanvasQuizSubmission)
admin.site.register(ScantronSubmission)