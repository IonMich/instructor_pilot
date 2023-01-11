import uuid

from django.db import models
from django.shortcuts import reverse
from django.utils import timezone

# Create your models here.

class Document(models.Model):
    title = models.CharField(max_length=100)
    # quiz_number = models.IntegerField(null=True, blank=True)
    doc_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pdf = models.FileField(upload_to='pdfs/',null=True, blank=True)
    # author = models.Student(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    updated = models.DateTimeField(auto_now=True)

    # def save(self, *args, **kwargs):
    #     if not
    #         self.created = timezone.now()
    #     self.updated = timezone.now()
    #     super(Document, self).save(*args, **kwargs)
    def get_absolute_url(self):
        return reverse("documents:detail", kwargs={"pk": self.pk})
    
    def __str__(self):
        return f"Document {self.title}"

class QuizSubmissionDocument(Document):
    quiz_number = models.IntegerField(null=True, blank=True)
    is_graded = models.BooleanField(default=False)
    def __str__(self):
        return f"Quiz {self.quiz_number}"

class DocumentCollection(models.Model):
    submissions = models.ManyToManyField(Document)
    quiz_number = models.PositiveSmallIntegerField(null=True, blank=True)