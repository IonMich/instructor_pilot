from django.db import models
from django.contrib.auth.models import User
from courses.models import Course
from universities.models import University
from django.urls import reverse
from django.db.models import Q
import re

# Create your models here.

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

    @classmethod
    def update_from_canvas(cls, requester, course, canvas_sections):
        user = User.objects.get(username=requester)
        for canvas_section in canvas_sections:
            section = cls.objects.filter(
                Q(canvas_id=canvas_section['id'])
                | Q(name=canvas_section['name'])
                | Q(name=re.match(".*\((\d{5})\).*",canvas_section['name']).group(1))
                ).first()

            if section:
                print(f"Found section {canvas_section['name']}. Updating ...")
                section.name = canvas_section['name']
                section.course = course
                section.canvas_id = canvas_section['id']
            else:
                print(f"Could not find section {canvas_section['name']}. Creating new ...")
                section = cls.objects.create(
                    name=canvas_section['name'],
                    canvas_id=canvas_section['id'],
                    course=course)
            if canvas_section['enrollment_role']=='TaEnrollment':
                section.teaching_assistant = user
            section.save()

            
        return cls.objects.filter(course=course)