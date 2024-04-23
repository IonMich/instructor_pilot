from rest_framework import serializers
from .models import Course
from profiles.serializers import UserSerializer

class CourseSerializer(serializers.ModelSerializer):
    instructors = UserSerializer(many=True, read_only=True)
    class Meta:
        model = Course
        fields = ('id', 'name', 'description', 'course_code', 'term', 'instructors', 'image', 'canvas_id', 'start_date', 'end_date', 'created', 'updated')
        depth = 1