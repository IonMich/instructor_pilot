from django.shortcuts import render
from .models import Assignment
from courses.models import Course
# Create your views here.
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from submissions.models import PaperSubmission
from submissions.views import _random1000
from submissions.forms import (
    SubmissionSearchForm,
    SubmissionFilesUploadForm, 
    StudentClassifyForm, 
    SyncFromForm,
    SyncToForm,
)
# Create your views here.

def assignment_detail_view(request,  course_pk, assignment_pk):
    # course = get_object_or_404(Course, pk=course_pk)
    assignment = get_object_or_404(Assignment, pk=assignment_pk)
    qs = PaperSubmission.objects.filter(
        assignment=assignment,
        ).order_by('created')
    search_form = SubmissionSearchForm(assignment=assignment)
    upload_form = SubmissionFilesUploadForm(no_assignment=True)
    classify_form = StudentClassifyForm(no_assignment=True)
    message = ''
    message_type = 'info'
    if request.method == 'POST':
        print(request.POST)
        _mutable = request.POST._mutable
        # set to mutable
        request.POST._mutable = True
        # сhange the values you want
        request.POST['assignment'] = assignment_pk
        # set mutable flag back
        request.POST._mutable = _mutable
        if 'submit-search' in request.POST:
            print("searching")
            if assignment_pk:
                search_form = SubmissionSearchForm(request.POST.copy(), assignment=assignment)
            else:
                search_form = SubmissionSearchForm(request.POST)
            # add assignment to the form
            if search_form.is_valid():
                qs = search_form.search()
            print(len(qs))
            if len(qs) == 0:
                message = "No submissions found"
                message_type = 'warning'
            else:
                plural_s = 's' if len(qs) > 1 else ''
                message = f"{len(qs)} submission{plural_s} found"
                message_type = 'info'

        if 'submit-upload' in request.POST:            
            upload_form = SubmissionFilesUploadForm(no_assignment=False, data=request.POST, files=request.FILES)
            if upload_form.is_valid():
                print("form is valid")
                uploaded_submission_pks = upload_form.save()
                qs = PaperSubmission.objects.filter(pk__in=uploaded_submission_pks)
                print(len(qs))
                
                if len(qs) > 0:
                    message = f"{len(qs)} files uploaded!"
                    message_type = 'success'
                else:
                    message = "No files uploaded."
                    message_type = 'danger'
        elif 'submit-classify' in request.POST:
            print("request was POST:classify")
            classify_form = StudentClassifyForm(no_assignment=False, data=request.POST)
            if classify_form.is_valid():
                print("form is valid")
                classified_submission_pks, not_classified_submission_pks = classify_form.save()
                qs_classified = PaperSubmission.objects.filter(pk__in=classified_submission_pks)
                qs_not = PaperSubmission.objects.filter(pk__in=not_classified_submission_pks)
                message = "Classified {} submissions and {} submissions were not classified".format(len(qs_classified), len(qs_not))
                if len(qs_not) > 0:
                    message_type = 'warning'
                else:
                    message_type = 'success'
        elif "submit-sync-from" in request.POST:
            print("request was POST:sync-from")
            sync_from_form = SyncFromForm(no_assignment=False, data=request.POST)
            if sync_from_form.is_valid():
                print("form is valid")
                sync_from_form.save()
                message = 'Sync from canvas successful'
                message_type = 'success'
        elif "submit-sync-to" in request.POST:
            print("request was POST:sync-to")
            sync_to_form = SyncToForm(no_assignment=False, data=request.POST)
            if sync_to_form.is_valid():
                print("form is valid")
                sync_to_form.save()
                message = 'Sync to canvas successful'
                message_type = 'success'
    return render(
        request,
        'assignments/detail.html',
        {'assignment': assignment, 
        'qs': qs,
        "search_form": search_form,
        'classify_form': classify_form,
        'upload_form': upload_form,
        "random_num": _random1000,
        'message': message,
        'message_type': message_type,
        })
