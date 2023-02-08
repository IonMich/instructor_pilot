from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
# Create your views here.
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from courses.models import Course
from submissions.forms import (StudentClassifyForm, SubmissionFilesUploadForm,
                               SubmissionSearchForm, SyncFromForm, SyncToForm)
from submissions.models import PaperSubmission
from submissions.views import _random1000

from .models import Assignment

# Create your views here.

@login_required
def assignment_detail_view(request,  course_pk, assignment_pk):
    # course = get_object_or_404(Course, pk=course_pk)
    assignment = get_object_or_404(Assignment, pk=assignment_pk)
    qs = PaperSubmission.objects.filter(
        assignment=assignment,
        ).order_by('created')
    search_form = SubmissionSearchForm(assignment=assignment)
    upload_form = SubmissionFilesUploadForm(assignment=assignment)
    classify_form = StudentClassifyForm(no_assignment=True)
    sync_to_form = SyncToForm(no_assignment=True)
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
            upload_form = SubmissionFilesUploadForm(data=request.POST, files=request.FILES)
            if upload_form.is_valid():
                print("form is valid")
                uploaded_submission_pks = upload_form.save(request)
                qs = PaperSubmission.objects.filter(pk__in=uploaded_submission_pks)
                print(len(qs))
                
                if len(qs) > 0:
                    message = f"{len(qs)} files uploaded!"
                    message_type = 'success'
                else:
                    message = "No files uploaded."
                    message_type = 'danger'
                return JsonResponse({
                    "message": message,
                    "message_type": message_type,
                })
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
            # Handle ajax request and return json response with the submissions that were synced
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                print("ajax request")
                sync_from_form = SyncFromForm(no_assignment=False, data=request.POST)
                if sync_from_form.is_valid():
                    print("form is valid")
                    sync_from_form.save()
                    message = 'Sync from canvas successful'
                    message_type = 'success'
                    # return submissions that were synced as json
                    submissions = PaperSubmission.objects.filter(assignment=assignment)
                    submissions = submissions.order_by('created')
                    submissions = submissions.values('pk', 'canvas_id', 'canvas_url')
                    submissions = list(submissions)
                    
                    return JsonResponse({'submissions': submissions})
                else:
                    print(sync_from_form.errors)
                    return JsonResponse({'error': 'form is not valid'})
            else:
                print("not ajax request")
                return JsonResponse({'error': 'not ajax request'})

        elif "submit-sync-to" in request.POST:
            print("request was POST:sync-to")
            sync_to_form = SyncToForm(
                no_assignment=False,
                request_user=request.user, 
                data=request.POST)
            if sync_to_form.is_valid():
                print("form is valid")
                sync_to_form.save()
                message = 'Sync to canvas successful'
                message_type = 'success'
            else:
                print(sync_to_form.errors)
        else:
            print("request was POST but not any of the above")
            print(request.POST)
            return JsonResponse({'error': 'request was POST but not any recognized action'})
    return render(
        request,
        'assignments/detail.html',
        {'assignment': assignment, 
        'qs': qs,
        "search_form": search_form,
        'classify_form': classify_form,
        'upload_form': upload_form,
        'sync_to_form': sync_to_form,
        "random_num": _random1000,
        'message': message,
        'message_type': message_type,
        })
