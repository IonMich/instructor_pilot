from django.db import models
from django.contrib.auth.models import User
from courses.models import Course
from universities.models import University

# Create your models here.

class Section(models.Model):
    name = models.CharField(max_length=255)
    course = models.ForeignKey(
        Course, 
        on_delete=models.SET_NULL,
        null=True,
        related_name="sections")
    teaching_assistant = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sections')
    def __str__(self):
        return self.name

    @classmethod
    def create_default_course_section(cls, course):
        return cls.objects.create(name="Unassigned",course=course)
