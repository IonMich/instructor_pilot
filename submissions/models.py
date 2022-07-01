from django.db import models
from assignments.models import Assignment
from students.models import Student
from django.contrib.auth.models import User
from django.utils import timezone
from django.urls import reverse
import uuid
from django.core.exceptions import ValidationError
from submissions.utils import CommaSeparatedFloatField
from abc import ABCMeta, abstractmethod
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

    grade = models.FloatField(null=True, blank=True)

    question_grades = CommaSeparatedFloatField(
        max_length=200,
        null=True,
        blank=True)

    def get_question_grades(self):
        if self.question_grades is None:
            return []
        return self.question_grades.split(",")

    def set_question_grades(self, grades):
        print(grades)
        self.question_grades = ",".join(grades)
        print(self.question_grades)
        self.save()

    def summarize_question_grades(self):
        "return a list of strings summarizing the question grades"
        q_grades = self.get_question_grades()
        q_grades = [float(g) for g in q_grades]
        q_grades = [f"{g}/{max_g}" for g, max_g in zip(q_grades, self.assignment.max_question_scores)]

        return q_grades
        
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
 
        if self.question_grades is not None:
            q_grades = self.get_question_grades()
            q_grades = [float(g) for g in q_grades]
            q_max_grades = self.assignment.get_max_question_scores()
            q_max_grades = [float(g) for g in q_max_grades]
            for q_grade, q_max_grade in zip(q_grades, q_max_grades):
                if q_grade < 0 or q_grade > q_max_grade:
                    raise ValidationError("Question grades must be between 0 and the maximum question grade.")
            if len(q_grades) != self.assignment.number_of_questions:
                raise ValidationError("Question grades must be the same length as the number of questions in the assignment.")        
            # if the sum of the question grades is not close to the submission grade,
            # raise a validation error

    

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
        s_grades = self.get_question_grades()
        self.grade = sum(map(float, s_grades))
        if self.grade is None:
            self.graded_at = None
            self.graded_by = None
        else:
            self.graded_at = timezone.now()
        return super().save(*args, **kwargs)

    
class PaperSubmission(Submission):    
    pdf = models.FileField(
        upload_to="submissions/pdf/",
        null=True,
        blank=True)

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


class PaperSubmissionImage(models.Model): 
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False)

    image = models.FileField(upload_to="submissions/images/")
    submission = models.ForeignKey(
        PaperSubmission,
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_related",
        related_query_name="%(app_label)s_%(class)ss",
        null=True,
        blank=True)

    page = models.IntegerField(
        null=True,
        blank=True)

    def __str__(self):
        return f"Paper Submission Image {self.pk}"

    class Meta:
        verbose_name_plural = "Paper Submission Images"