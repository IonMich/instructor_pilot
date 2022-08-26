from django import forms
from assignments.models import Assignment
from students.models import Student
from submissions.models import PaperSubmission, CanvasQuizSubmission, ScantronSubmission
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Submit, Row, Column


# create a class for the form that will be used 
# to search for submissions by student date from and to
# and by submission type and optionally by assignment
class SubmissionSearchForm(forms.Form):
    """Search form for submissions

    In the init method, if assignment is specified,
    the assignment field is disabled.
    """
    assignment = forms.ModelChoiceField(
        queryset=Assignment.objects.all(),
        required=False,
        empty_label="All Assignments",
        )

    # if no student is selected, then show "All Students"
    student = forms.ModelChoiceField(
        queryset=Student.objects.all(),
        required=False,
        empty_label="All Students",
        )

    from_date = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={'type': 'date'}),
        )
    to_date = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={'type': 'date'}),
        )
    # specify submission types to search for from the childrent of the Submission model
    SUBMISSION_TYPES = (
        ('any', 'Any'),
        ('paper', 'Paper'),
        ('canvas_quiz', 'Canvas Quiz'),
        ('scantron', 'Scantron'),
        )
    submission_type = forms.ChoiceField(
        choices=SUBMISSION_TYPES,
        required=False,
        )
    
    def __init__(self, *args, **kwargs):
        from django.forms.widgets import HiddenInput
        print(args, kwargs)
        assignment = kwargs.pop('assignment', None)
        print(assignment)
        super(SubmissionSearchForm, self).__init__(*args, **kwargs)

        self.helper = FormHelper()
        student_col_class = "col-md-6" if assignment is None else "col-md-12"
        if assignment is None:
            assignment_column = Column('assignment', css_class='form-group col-md-6 mb-0')
        else:
            assignment_column = None
        self.helper.layout = Layout(
            Row(
                assignment_column,
                Column('student', css_class=f'form-group {student_col_class} mb-0'),
                css_class='form-row'
                ),
            Row(
                Column('from_date', css_class='form-group col-md-6 mb-0'),
                Column('to_date', css_class='form-group col-md-6 mb-0'),
                css_class='form-row'
                ),
            Row(
                Column('submission_type', css_class='form-group col-md-6 mb-0'),
                css_class='form-row'
                ),
            Submit('submit-search', "Search")
            )
        if assignment:
            self.fields['assignment'].widget = HiddenInput()
            self.fields['assignment'].initial = assignment
            self.data['assignment'] = assignment.pk

    def search(self):
        """Search for submissions based on the form data

        Returns:
            queryset: A queryset of submissions
        """
        from django.db.models.query_utils import Q
        assignment = self.cleaned_data['assignment']
        course = assignment.course if assignment else None
        print("printing assignment: ", assignment)
        student = self.cleaned_data['student']
        # start_date is optional so check if it exists
        start_date = self.cleaned_data['from_date']
        end_date = self.cleaned_data['to_date']
        submission_type = self.cleaned_data['submission_type']
        # get the queryset for the submissions
        print(f"{self.cleaned_data}")
        if submission_type == 'paper':
            submission_class = PaperSubmission
        elif submission_type == 'canvas_quiz':
            submission_class = CanvasQuizSubmission
        elif submission_type == 'scantron':
            submission_class = ScantronSubmission
        elif submission_type == 'any':
            submission_class = None
        else:
            raise Exception("Invalid submission type")
        if assignment:
            filter_by = {'assignment': assignment}
        else:
            filter_by = {'assignment__course': course}
        if submission_class:
            qs = submission_class.objects.filter(**filter_by)
        else:
            qs1 = PaperSubmission.objects.filter(**filter_by)
            qs2 = CanvasQuizSubmission.objects.filter(**filter_by)
            qs3 = ScantronSubmission.objects.filter(**filter_by)
        if submission_class:
            if student:
                qs = qs.filter(student=student)
            if start_date:
                qs = qs.filter(created__gte=start_date)
            if end_date:
                qs = qs.filter(created__lte=end_date)
        else:
            query = Q()
            query_terms = {
                'student': student,
                'created__gte': start_date,
                'created__lte': end_date,
            }
            for key, value in query_terms.items():
                if value:
                    query &= Q(**{key: value})
            from itertools import chain
            qs = list(chain(
                qs1.filter(query), 
                qs2.filter(query),
                qs3.filter(query)
            ))
        return qs
            
        
class GradingForm(forms.ModelForm):
    
    class Meta:
        model = PaperSubmission
        fields = ['student', 'question_grades', 'comment_files']        

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.new_comment = forms.Textarea()

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

    pages_per_submission = forms.IntegerField(
        required=True,
        initial=2,
        )
    image_dpi = forms.IntegerField(
        required=True,
        initial=150,
        )
    def clean(self):
        cleaned_data = super().clean()
        return cleaned_data

    def save(self):
        assignment = self.cleaned_data['assignment']
        student = self.cleaned_data['student']
        file = self.cleaned_data['file']
        num_pages_per_submission = self.cleaned_data['pages_per_submission']
        image_dpi = self.cleaned_data['image_dpi']
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
                num_pages_per_submission=num_pages_per_submission,
                dpi=image_dpi,
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

class SyncFromForm(forms.Form):
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

        assignment.sync_labeled_submissions_from_canvas()

class SyncToForm(forms.Form):
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

        assignment.upload_graded_submissions_to_canvas()