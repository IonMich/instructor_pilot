from django.contrib import admin
from .models import (
    PaperSubmission, 
    CanvasQuizSubmission, 
    ScantronSubmission,
    PaperSubmissionImage,
    )
# # Register your models here.

admin.site.register(PaperSubmission)
admin.site.register(CanvasQuizSubmission)
admin.site.register(ScantronSubmission)
admin.site.register(PaperSubmissionImage)