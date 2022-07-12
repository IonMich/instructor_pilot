from django.shortcuts import render
from .models import Assignment
from courses.models import Course
# Create your views here.
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from submissions.models import PaperSubmission
from submissions.views import _random1000
from submissions.forms import SubmissionFilesUploadForm, StudentClassifyForm
# Create your views here.

def assignment_detail_view(request,  course_pk, assignment_pk):
    # course = get_object_or_404(Course, pk=course_pk)
    assignment = get_object_or_404(Assignment, pk=assignment_pk)
    qs = PaperSubmission.objects.filter(
        assignment=assignment,
        ).order_by('created')
    upload_form = SubmissionFilesUploadForm(no_assignment=True)
    classify_form = StudentClassifyForm(no_assignment=True)

    if request.method == 'POST':
        _mutable = request.POST._mutable
        # set to mutable
        request.POST._mutable = True
        # сhange the values you want
        request.POST['assignment'] = assignment_pk
        # set mutable flag back
        request.POST._mutable = _mutable

        if 'submit-upload' in request.POST:
            print("request was POST:upload")
            
            
            upload_form = SubmissionFilesUploadForm(no_assignment=False, data=request.POST, files=request.FILES)
            
            if upload_form.is_valid():
                print("form is valid")
                uploaded_submission_pks = upload_form.save()
                qs = PaperSubmission.objects.filter(pk__in=uploaded_submission_pks)
                print(len(qs))
                return render(
                    request, 
                    'assignments/detail.html',
                    {'assignment': assignment,
                    "upload_form": upload_form,
                    "classify_form": classify_form,
                    "random_num": _random1000, 
                    "qs":qs, 
                    'message': 'Files uploaded successfully'})
        elif 'submit-classify' in request.POST:
            print("request was POST:classify")
            classify_form = StudentClassifyForm(no_assignment=False, data=request.POST)
            if classify_form.is_valid():
                print("form is valid")
                classified_submission_pks, not_classified_submission_pks = classify_form.save()
                qs_classified = PaperSubmission.objects.filter(pk__in=classified_submission_pks)
                qs_not = PaperSubmission.objects.filter(pk__in=not_classified_submission_pks)
            
                return render(
                    request, 
                    'assignments/detail.html',
                    {'assignment': assignment,
                    "upload_form": upload_form,
                    "classify_form": classify_form,
                    "random_num": _random1000, 
                    "qs_classified": qs_classified,
                    "qs_not": qs_not,
                    'message': 'Classification submitted successfully'})
    return render(
        request,
        'assignments/detail.html',
        {'assignment': assignment, 
        'qs': qs,
        'classify_form': classify_form,
        'upload_form': upload_form,
        "random_num": _random1000,
        })