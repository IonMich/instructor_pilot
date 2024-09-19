from rest_framework import serializers
from .models import Assignment

class AssignmentSerializer(serializers.ModelSerializer):
    submission_count = serializers.IntegerField(source='submissions_papersubmission_related.count', read_only=True)
    class Meta:
        model = Assignment
        fields = (
            'id', 
            'name', 
            'description', 
            'max_score', 
            'assignment_group_object', 
            'assignment_group', 
            'position', 
            'submission_count', 
            'course', 
            'max_question_scores',
            'get_average_grade',
            'get_grading_progress',
        )
        depth = 1