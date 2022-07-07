from django.db import models
from universities.models import University
from django.contrib.auth.models import User

# Create your models here.

semesters=(
        ("F","Fall"), 
        ("SP","Spring"),
        ("SU","Summer"))

class Course(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(max_length=500)
    
    semester = models.CharField(
        max_length=100, 
        choices=semesters)
        
    university = models.ForeignKey(
        University,
        on_delete=models.CASCADE,
        related_name="courses")
    instructors = models.ManyToManyField(
        User,
        related_name="courses")
        
    start_date = models.DateField()
    end_date = models.DateField()
    year = models.IntegerField()
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({dict(semesters).get(self.semester)} {self.year})"

    def get_students(self):
        students = []
        for section in self.sections.all():
            for student in section.students.all():
                students.append(student)
        return students