from django import forms
from assignments.models import Assignment
from students.models import Student
from submissions.models import PaperSubmission


class SubmissionSearchForm(forms.Form):

    date_from = forms.DateField(
        widget=forms.DateInput(attrs={'type': 'date'})
        )
    date_to = forms.DateField(
        widget=forms.DateInput(attrs={'type': 'date'})
        )
    submission_type = forms.ChoiceField(
        choices = (
            ("P", "Paper"),
            ("CQ", "Canvas Quiz"),
            ("S", "Scantron"),)
        )

    assignment = forms.ModelChoiceField(
        queryset=Assignment.objects.all(),
        empty_label="All Assignments",)
    student = forms.ModelChoiceField(
        queryset=Student.objects.all(),
        empty_label="All Students",)

    # assignment_group = forms.ModelChoiceField(
    #     queryset=AssignmentGroup.objects.all(),
    #     empty_label="All Assignment Groups",)
    
    # assignment = forms.ChoiceField(choices=CHOICES)
    include_makeups = forms.BooleanField(initial=True, required=False)

class GradingForm(forms.ModelForm):
    class Meta:
        model = PaperSubmission
        fields = ['student', 'question_grades', 'grader_comments', 'comment_files']
        # widgets = {
        #     'grade': forms.TextInput(attrs={'type': 'number', 'step': '1'}),
        #     'grader_comments': forms.Textarea(attrs={'rows': '3'}),
        #     'comment_files': forms.FileInput(),
        # }
        