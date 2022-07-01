from django.db import models
from courses.models import Course
from django.contrib.auth.models import User
from submissions.utils import CommaSeparatedFloatField

# Create your models here.

class Assignment(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    start_date = models.DateField()
    due_date = models.DateField()
    ready_by = models.DateField()
    max_score = models.FloatField(null=True, blank=True)
    number_of_questions = models.IntegerField(null=True, blank=True)
    max_question_scores = CommaSeparatedFloatField(
        max_length=200,
        null=True,
        blank=True)
    course = models.ForeignKey(
        Course, 
        on_delete=models.CASCADE,
        related_name="assignments")
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def get_max_question_scores(self):
        return self.max_question_scores.split(",")

    def get_graders(self):
        return self.course.instructors.all()

    def __str__(self):
        return f"{self.name}"

    def save(self, *args, **kwargs):
        q_max_grades = self.get_max_question_scores()
        self.number_of_questions = len(q_max_grades)
        self.max_score = sum(float(g) for g in q_max_grades)
        return super().save(*args, **kwargs)

    
