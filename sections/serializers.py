from rest_framework import serializers
from .models import Section
from profiles.serializers import UserSerializer

class SectionSerializer(serializers.ModelSerializer):
    # the teaching assistant field is a foreign key to the User model
    # use the UserSerializer to serialize the teaching assistant field
    teaching_assistant = UserSerializer(read_only=True)
    students_count = serializers.IntegerField(source='students.count', read_only=True)
    
    class Meta:
        model = Section
        fields = ('id', 'url', 'name', 'course', 'teaching_assistant', 'meetings', 'class_number', 'canvas_id', 'students_count')
        depth = 1