from django.db import models
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
    phone_number = models.CharField(max_length=100)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    university = models.ForeignKey(
        University,
        on_delete=models.CASCADE,
        related_name="students")
    section = models.ManyToManyField(
        Section,
        blank=True,
        related_name="students")

    def __str__(self):
        return f"{self.first_name} {self.last_name}"