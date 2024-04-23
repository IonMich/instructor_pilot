from rest_framework import serializers
from .models import Student

class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ('id', 'first_name', 'last_name', 'email', 'uni_id', 'created', 'updated', 'canvas_id', 'sections')
        depth = 1