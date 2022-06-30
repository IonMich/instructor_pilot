from django.db import models
from assignments.models import Assignment
from students.models import Student
from django.contrib.auth.models import User
from django.utils import timezone
from django.urls import reverse
import uuid
from django.core.exceptions import ValidationError
# Create your models here.

class Submission(models.Model):
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False)
    
    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_related",
        related_query_name="%(app_label)s_%(class)ss", null=True,
        blank=True)
        
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_related",
        related_query_name="%(app_label)s_%(class)ss",
        null=True,
        blank=True)

    attempt = models.IntegerField(default=1)
    
    grade = models.FloatField(
        null=True,
        blank=True)

    graded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_graded_by",
        related_query_name="%(app_label)s_%(class)ss")
    
    graded_at = models.DateTimeField(
        null=True,
        blank=True)

    grader_comments = models.TextField(
        null=True,
        blank=True)

    comment_files = models.FileField(
        null=True,
        blank=True)


    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    def get_absolute_url(self):
        return reverse('submissions:submission_detail', kwargs={'pk': self.id})
    
    def clean(self, *args, **kwargs):
        super().clean(*args, **kwargs)
        if self.assignment is None:
            raise ValidationError("Submission must be associated with an assignment.")
        if self.student is None:
            raise ValidationError("Submission must be associated with a student.")
        if self.attempt is None:
            raise ValidationError("Submission must be associated with an attempt.")
        if self.attempt < 1:
            raise ValidationError("Submission attempt must be greater than 0.")
        if self.grade is not None and self.grade < 0:
            raise ValidationError("Submission grade must be greater than or equal to 0.")
        if self.grade is not None and self.grade > self.assignment.max_score:
            raise ValidationError("Submission grade must be less than or equal to the maximum grade.")
        if self.graded_by is None:
            raise ValidationError("Submission must be associated with a grader.")
        if self.graded_at is None:
            raise ValidationError("Submission must be associated with a graded_at datatime.")
    

    class Meta:
        abstract = True
        ordering = ["-created"]

    def __str__(self):
        if self.assignment is None:
            return f"Submission {self.id}"
        else:
            if self.student is None:
                return f"Submission {self.id} for {self.assignment.name}"
            else:
                return f"Submission {self.id} for {self.assignment.name} by {self.student.first_name} {self.student.last_name}"
    
    def save(self, *args, **kwargs):
        if self.grade is None:
            self.graded_at = None
            self.graded_by = None
        else:
            self.graded_at = timezone.now()
        return super().save(*args, **kwargs)

    
class PaperSubmission(Submission):

    pass
    
    file = models.FileField(upload_to="submissions/")

    def __str__(self):
        return f"Paper "+ super().__str__()

    def get_absolute_url(self):
        return reverse("submissions:detail", kwargs={"pk": self.pk})

    class Meta:
        verbose_name_plural = "Paper Submissions"


class CanvasQuizSubmission(Submission):
    pass


    def __str__(self):
        return f"Canvas Quiz "+ super().__str__()

    def get_absolute_url(self):
        return reverse("submissions:detail", kwargs={"pk": self.pk})

    class Meta:
        verbose_name_plural = "Canvas Quiz Submissions"


class ScantronSubmission(Submission):
    pass

    def __str__(self):
        return f"Scantron "+ super().__str__()

    def get_absolute_url(self):
        title = self.__str__()
        return reverse(
            "submissions:detail", 
            kwargs = {
                "pk": self.pk,
                "title": title
                })

    class Meta:
        verbose_name_plural = "Scantron Submissions"