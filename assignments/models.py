from django.db import models
from courses.models import Course
from django.contrib.auth.models import User

# Create your models here.

class Assignment(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    start_date = models.DateField()
    due_date = models.DateField()
    ready_by = models.DateField()
    max_score = models.IntegerField(default=4)
    number_of_questions = models.IntegerField(default=2)
    course = models.ForeignKey(
        Course, 
        on_delete=models.CASCADE,
        related_name="assignments")
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def get_graders(self):
        return self.course.instructors.all()

    def __str__(self):
        return f"{self.name}"

    
