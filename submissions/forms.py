from crispy_forms.helper import FormHelper
from crispy_forms.layout import Column, Layout, Row, Submit
from django import forms

from assignments.models import Assignment
from students.models import Student
from submissions.models import (CanvasQuizSubmission, PaperSubmission,
                                PaperSubmissionImage, ScantronSubmission)


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
        fields = ['student', 'question_grades']        

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.new_comment = forms.Textarea()
        self.comment_file = forms.FileField()

class SubmissionFilesUploadForm(forms.Form):
    def __init__(self,*args,**kwargs):
        from django.forms.widgets import HiddenInput
        assignment_targeted = kwargs.pop('assignment', None)
        super().__init__(*args,**kwargs)
        if assignment_targeted is not None:
            self.fields['assignment'].widget = HiddenInput()
            self.fields['assignment'].initial = assignment_targeted
            self.fields['student'].queryset = Student.objects.filter(
                sections__in=assignment_targeted.course.sections.all()
            )

    file_field = forms.FileField(
        widget=forms.ClearableFileInput(attrs={'multiple': True})
        )

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

    def clean(self):
        cleaned_data = super().clean()
        return cleaned_data

    def save(self, request):
        assignment = self.cleaned_data['assignment']
        student = self.cleaned_data['student']
        files = request.FILES.getlist('file_field')
        num_pages_per_submission = self.cleaned_data['pages_per_submission']
        image_dpi = 150
        print(student, type(student))
        print(len(files))
        print(type(files[0]))
        uploaded_submission_pks = PaperSubmission.add_papersubmissions_to_db(
            assignment_target=assignment,
            uploaded_files=files,
            num_pages_per_submission=num_pages_per_submission,
            dpi=image_dpi,
            student=student,
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
    # save the page numbers to use for the classification in a list
    pages_selected = forms.JSONField(
        required=False,
        )

    def clean(self):
        cleaned_data = super().clean()
        return cleaned_data

    def save(self):
        assignment = self.cleaned_data['assignment']
        # print("1-indexed pages_selected: ", self.cleaned_data['pages_selected'])
        do_not_skip = self.cleaned_data['pages_selected']
        # convert to ints. If empty, set to empty tuple
        try:
            do_not_skip = tuple(int(i) for i in do_not_skip)
        except:
            do_not_skip = ()
        max_page_num = PaperSubmissionImage.get_max_page_number(assignment)
        # now convert from 1-indexed do_not_skip to 0-indexed pages_to_skip
        pages_to_skip = tuple(i for i in range(max_page_num) if i+1 not in do_not_skip)
        print("0-indexed pages_to_skip: ", pages_to_skip)
        

        classified_submission_pks, not_classified_submission_pks = PaperSubmission.classify(
                assignment,
                skip_pages=pages_to_skip,
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
        # also get the request user
        self.request_user = kwargs.pop('request_user', None)
        super().__init__(*args,**kwargs)
        if no_assignment:
            self.fields['assignment'].widget = HiddenInput()

    assignment = forms.ModelChoiceField(
        queryset=Assignment.objects.all(),
        )

    submission_sync_option = forms.ChoiceField(
        choices=(
            ('all', 'Upload all locally graded submissions'),
            ('grade_not_on_canvas', 'Upload only locally graded submissions that are not graded on canvas'),
            ('specific', 'Upload a specific selection of submissions'),
            ),
        )
    # Now fot the submissions determined by submission_sync_option,
    # we also specify the comment_sync_option: 
    comment_sync_option = forms.ChoiceField(
        choices=(
            ('all', 'Upload all locally saved comments as new comments on canvas'),
            ('delete_previous', 'Upload all locally saved comments as new comments on canvas, but delete all previously uploaded comments on the canvas submission posted by the current user'),
            ('comment_not_on_canvas', 'Upload only comments that are not on canvas'),
            ),
        )

    # If submission_sync_option is 'specific', we need a multiple select
    # form field to select the specific paper submissions of the assignment
    specific_submissions = forms.ModelMultipleChoiceField(
        queryset=PaperSubmission.objects.all(),
        required=False,
        )
    
    def clean(self):
        cleaned_data = super().clean()
        return cleaned_data

    def save(self):
        
        assignment = self.cleaned_data['assignment']
        # get the submission_sync_option and comment_sync_option
        # from the cleaned_data
        submission_sync_option = self.cleaned_data['submission_sync_option']
        comment_sync_option = self.cleaned_data['comment_sync_option']
        # if submission_sync_option is 'specific', get the specific
        # paper submissions from the cleaned_data
        if submission_sync_option == 'specific':
            specific_submissions = self.cleaned_data['specific_submissions']
        else:
            specific_submissions = None
        print("assignment: ", assignment)
        print("submission_sync_option: ", submission_sync_option)
        print("comment_sync_option: ", comment_sync_option)
        print("specific_submissions: ", specific_submissions)

        assignment.upload_graded_submissions_to_canvas(
            submission_sync_option=submission_sync_option,
            comment_sync_option=comment_sync_option,
            request_user=self.request_user,
            specific_submissions=specific_submissions,
        )
            