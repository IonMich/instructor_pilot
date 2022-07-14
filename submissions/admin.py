from django.contrib import admin
from .models import (
    PaperSubmission, 
    CanvasQuizSubmission, 
    ScantronSubmission,
    PaperSubmissionImage,
    SubmissionComment,
    )
# # Register your models here.

admin.site.register(PaperSubmission)
admin.site.register(CanvasQuizSubmission)
admin.site.register(ScantronSubmission)
admin.site.register(PaperSubmissionImage)
admin.site.register(SubmissionComment)