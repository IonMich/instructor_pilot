from rest_framework import serializers
from .models import Assignment, SavedComment


class SavedCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedComment
        fields = (
            'id',
            'title',
            'text',
            'assignment',
            'position',
        )

class AssignmentSerializer(serializers.ModelSerializer):
    submission_count = serializers.IntegerField(source='submissions_papersubmission_related.count', read_only=True)
    max_page_number = serializers.IntegerField(source='get_max_page_number', read_only=True)
    saved_comments = SavedCommentSerializer(source='savedcomment_set', many=True, read_only=True)
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
            'max_page_number',
            'saved_comments',
            'canvas_id',
        )
        depth = 1