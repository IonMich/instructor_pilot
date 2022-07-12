from django.db import models
from django_countries.fields import CountryField

# Create your models here.


class University(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(max_length=500)
    university_code = models.CharField(
        max_length=100,
        default="ufl")
    country = CountryField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=100)
    address = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=100)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name}"

    class Meta:
        verbose_name_plural = "Universities"