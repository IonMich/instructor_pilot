from rest_framework import serializers
from profiles.serializers import UserSerializer
from students.serializers import StudentSerializer
from students.models import Student
from .models import PaperSubmission, PaperSubmissionImage, SubmissionComment

class PaperSubmissionImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaperSubmissionImage
        fields = ('id', 'image', 'page')
        depth = 1

class SubmissionCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubmissionComment
        author = UserSerializer(read_only=True)
        fields = ('id', 'text', 'author', 'is_grade_summary', 'canvas_id', 'created_at', 'updated_at')
        depth = 1

class PaperSubmissionSerializer(serializers.ModelSerializer):
    papersubmission_images = PaperSubmissionImageSerializer(source='submissions_papersubmissionimage_related', many=True, read_only=True)
    submission_comments = SubmissionCommentSerializer(source='submissions_submissioncomment_related', many=True, read_only=True)
    class Meta:
        model = PaperSubmission
        fields = ('id', 'student', 'canvas_id', 'canvas_url', 'question_grades', 'grade', 'version', 'assignment', 'pdf', 'papersubmission_images', 'submission_comments')
        depth = 1


    def update(self, instance, validated_data):
        print("validated_data: ", validated_data)
        # if student id is in validated_data, update student
        if 'student' in validated_data:
            student = validated_data.pop('student')
            instance.student = student
        
        return super(PaperSubmissionSerializer, self).update(instance, validated_data)