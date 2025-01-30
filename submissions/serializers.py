from rest_framework import serializers
from profiles.serializers import UserSerializer
from students.models import Student
from students.serializers import StudentSerializer
from .models import (
    PaperSubmission,
    PaperSubmissionImage,
    SubmissionComment,
    AssignmentInfoField,
    ExtractedInfoField,
)


class PaperSubmissionImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaperSubmissionImage
        fields = ("id", "image", "page")
        depth = 1


class SubmissionCommentSerializer(serializers.ModelSerializer):
    submission_id = serializers.PrimaryKeyRelatedField(
        source="paper_submission", queryset=PaperSubmission.objects.all()
    )

    class Meta:
        model = SubmissionComment
        author = UserSerializer(read_only=True)
        fields = (
            "id",
            "text",
            "author",
            "is_grade_summary",
            "canvas_id",
            "created_at",
            "updated_at",
            "submission_id",
        )
        depth = 1


class AssignmentInfoFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssignmentInfoField
        fields = ("id", "title", "description", "pages", "assignment_id")
        depth = 1


class ExtractedFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExtractedInfoField
        fields = ("id", "info_field", "paper_submission_image_id", "value")
        depth = 1


class PaperSubmissionSerializer(serializers.ModelSerializer):
    papersubmission_images = PaperSubmissionImageSerializer(
        source="submissions_papersubmissionimage_related", many=True, read_only=True
    )
    submission_comments = SubmissionCommentSerializer(
        source="submissions_submissioncomment_related", many=True, read_only=True
    )
    student_id = serializers.PrimaryKeyRelatedField(
        source="student", queryset=Student.objects.all()
    )
    student = StudentSerializer(read_only=True)
    extracted_fields = serializers.SerializerMethodField()

    def get_extracted_fields(self, obj):
        extracted_fields = obj.get_extracted_fields()
        return ExtractedFieldSerializer(extracted_fields, many=True).data

    class Meta:
        model = PaperSubmission
        fields = (
            "id",
            "student",
            "student_id",
            "canvas_id",
            "canvas_url",
            "question_grades",
            "grade",
            "version",
            "assignment",
            "pdf",
            "papersubmission_images",
            "submission_comments",
            "extracted_fields",
        )
        depth = 2
