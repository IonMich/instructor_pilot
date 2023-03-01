from django.db import models
from django_countries.fields import CountryField


class University(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(
        max_length=500,
        blank=True,
        )
    university_code = models.CharField(
        max_length=100,
        default="ufl")
    country = CountryField(
        blank_label='(select country)',
        default='US',
        blank=True,
        )
    city = models.CharField(
        max_length=100,
        blank=True,
        )
    state = models.CharField(
        max_length=100,
        blank=True,
        )
    zip_code = models.CharField(
        max_length=100,
        blank=True,
        )
    address = models.CharField(
        max_length=100,
        blank=True,
        )
    phone_number = models.CharField(
        max_length=100,
        blank=True,
        )
    canvas_api_url = models.CharField(
        max_length=100,
        blank=True,
        default="https://ufl.instructure.com/"
        )
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name}"

    class Meta:
        verbose_name_plural = "Universities"