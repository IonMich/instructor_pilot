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


class SubmissionFilesUploadForm(forms.Form):
    def __init__(self,*args,**kwargs):
        from django.forms.widgets import HiddenInput
        no_assignment = kwargs.pop('no_assignment', None)
        super().__init__(*args,**kwargs)
        if no_assignment:
            self.fields['assignment'].widget = HiddenInput()

    file = forms.FileField()
    assignment = forms.ModelChoiceField(
        queryset=Assignment.objects.all(),
        )
    student = forms.ModelChoiceField(
        queryset=Student.objects.all(),
        empty_label="Multiple students",
        required=False,)

    def clean(self):
        cleaned_data = super().clean()
        return cleaned_data

    def save(self):
        assignment = self.cleaned_data['assignment']
        student = self.cleaned_data['student']
        file = self.cleaned_data['file']
        if student:
            raise NotImplementedError("specific student upload is not implemented yet")
            submission = PaperSubmission.objects.create(
                assignment=assignment,
                student=student,
                file=file,
                attempt=1,
                )
        else:
            uploaded_submission_pks = PaperSubmission.add_papersubmissions_to_db(
                assignment_target=assignment,
                uploaded_file=file,
                )
        return uploaded_submission_pks

class StudentClassifyForm(forms.Form):
    def __init__(self,*args,**kwargs):
        from django.forms.widgets import HiddenInput
        no_assignment = kwargs.pop('no_assignment', None)
        super().__init__(*args,**kwargs)
        if no_assignment:
            self.fields['assignment'].widget = HiddenInput()

    assignment = forms.ModelChoiceField(
        queryset=Assignment.objects.all(),
        )

    def clean(self):
        cleaned_data = super().clean()
        return cleaned_data

    def save(self):
    
        assignment = self.cleaned_data['assignment']
        print("assignment: ", assignment)

        classified_submission_pks, not_classified_submission_pks = PaperSubmission.classify(
                assignment,
                )
        return classified_submission_pks, not_classified_submission_pks
