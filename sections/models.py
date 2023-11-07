import re
from datetime import datetime

from django.contrib.auth.models import User
from django.db import models
from django.db.models import Q
from django.urls import reverse

from courses.models import Course


# Create your models here.
class Meeting(models.Model):
    day = models.CharField(
        max_length=10,
        )
    meeting_type = models.CharField(
        max_length=50,
        choices=[
            ('L', 'Lab'),
            ('T', 'Lecture'),
            ('P', 'Recitation'),
            ('W', 'Workshop'),
            ('O', 'Other'),
            ],
            blank=True,
        )

    start_time = models.TimeField()
    end_time = models.TimeField()
    location = models.CharField(
        max_length=255,
        blank=True,
        null=True)

    class Meta:
        ordering = ['day', 'start_time']

    def __str__(self):
        if self.location:
            return f"{self.day} {self.start_time} - {self.end_time} ({self.location})"
        else:
            return f"{self.day} {self.start_time} - {self.end_time}"


class Section(models.Model):
    name = models.CharField(
        max_length=255
        )
    course = models.ForeignKey(
        Course, 
        on_delete=models.SET_NULL,
        null=True,
        related_name="sections")
    teaching_assistant = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sections')

    meetings = models.ManyToManyField(
        Meeting,
        related_name='sections')

    class_number = models.CharField(
        max_length=100,
        null=True,
        blank=True)

    canvas_id = models.CharField(
        max_length=100,
        null=True,
        blank=True)
    def __str__(self):
        return self.name

    @classmethod
    def create_default_course_section(cls, course):
        return cls.objects.create(name="Unassigned",course=course)

    def get_absolute_url(self):
        return reverse('sections:detail', kwargs={'pk': self.pk})

