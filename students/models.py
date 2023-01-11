import re

from django.db import models
from django.db.models import Q

from sections.models import Section
from universities.models import University

# Create your models here.

class Student(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(
        max_length=100, 
        null=True, 
        blank=True, 
        unique=True)
    uni_id = models.CharField(max_length=20,unique=True)
    phone_number = models.CharField(
        max_length=100,
        null=True,
        blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    university = models.ForeignKey(
        University,
        on_delete=models.CASCADE,
        related_name="students")
    sections = models.ManyToManyField(
        Section,
        blank=True,
        related_name="students")

    canvas_id = models.CharField(
        max_length=100,
        null=True,
        blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @classmethod
    def update_from_canvas(
        cls, 
        course, 
        canvas_students,):

        for canvas_student in canvas_students:
            first_name = canvas_student.sortable_name.split(",")[1]
            last_name = canvas_student.sortable_name.split(",")[0]
            try:
                university_identifying_id = canvas_student.sis_user_id
            except Exception as e:
                print(e)
                try:
                    university_identifying_id = "email."+canvas_student.email[:20]
                except Exception as e:
                    print(e)
                    university_identifying_id = "uuid." + canvas_student.uuid[:20]

            try:
                student = cls.objects.filter(
                    Q(uni_id=university_identifying_id)
                    | Q(canvas_id=canvas_student.id)
                    ).first()
            except Exception as e:
                print(e)
                student = None
            
            if student:
                print(f"Found student {canvas_student.name}. Updating ...")
                student.first_name = first_name
                student.last_name = last_name
                student.uni_id = university_identifying_id
                student.canvas_id = canvas_student.id
                student.sections.remove(*course.sections.all())
                
            else:
                print(f"Could not find student {canvas_student.name}. Creating new ...")
                
                student = cls.objects.create(
                    first_name=first_name,
                    last_name=last_name,
                    uni_id=university_identifying_id,
                    university=course.university,
                    canvas_id=canvas_student.id)

            for canvas_enrollment in canvas_student.enrollments:
                if canvas_enrollment["type"]=='StudentEnrollment':
                    section = course.sections.filter(
                        Q(canvas_id=canvas_enrollment["course_section_id"])
                    ).first()
                    if section:
                        print(f"Found section {section}. Adding to the list of sections for student {student} ...")
                        student.sections.add(section)
                    else:
                        print("Section not found")
            
            student.save()
            profile = student.profile
            profile.bio = canvas_student.bio if canvas_student.bio else ""
            avatar_url = canvas_student.avatar_url
            import os
            from urllib import request

            from django.core.files import File
            result = request.urlretrieve(avatar_url)
            profile.avatar.save(
                os.path.basename(avatar_url),
                File(open(result[0], 'rb'))
                )
            profile.save()
