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
    grade = forms.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False
        )
    comment = forms.CharField(
        max_length=1000,
        required=False,
        )

    file = forms.FileField(
        required=False,
        )

    class Meta:
        model = PaperSubmission
        fields = ['grade', 'comment', 'file']
        widgets = {
            'grade': forms.TextInput(attrs={'type': 'number', 'step': '1'}),
            'comment': forms.Textarea(attrs={'rows': '3'}),
            'file': forms.FileInput(),
        }
        
    
