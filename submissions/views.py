from django.shortcuts import render
# from django.views.generic import ListView, DetailView
from .models import Submission, PaperSubmission, CanvasQuizSubmission, ScantronSubmission, SubmissionComment
from .forms import SubmissionSearchForm, GradingForm, SubmissionFilesUploadForm, StudentClassifyForm
from assignments.models import Assignment
from courses.models import Course
from django.db.models.query_utils import Q
import pandas as pd
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from itertools import zip_longest
import random
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.generic.edit import DeleteView


def _random1000():
    yield random.randint(0, 100)

@login_required
def home_view(request, course_pk, assignment_pk=None):
    """
    Home page for the submissions app

    Has a list of all submissions for the course 
    (or assignment if specified) 
    It also has a form to search for submissions
    with search terms:
    - student
    - date range
    - submission type (paper, scantron, canvas quiz)
    """
    # get the course object
    course = get_object_or_404(Course, pk=course_pk)
    # get the assignment object
    print(f"{assignment_pk=}")
    if assignment_pk:
        assignment = get_object_or_404(Assignment, pk=assignment_pk)
        message = f"Submissions for {assignment.name}"
    else:
        assignment = None
        message = f"Submissions"
    print(f"{assignment=}")

    qs=None
    if request.method == 'GET':
        # get the form for the search
        form = SubmissionSearchForm(assignment=assignment)
    
    if request.method == 'POST':
        print(request.POST)
        # if assignment_pk is not None, then we are searching for submissions for a specific assignment
        if assignment_pk:
            form = SubmissionSearchForm(request.POST.copy(), assignment=assignment)
        else:
            form = SubmissionSearchForm(request.POST)
        # add assignment to the form
        if form.is_valid():
            qs = form.search()
    if qs:
        print(len(qs))
    # render the page
    context = {
        "message": message,
        "object_list": qs,
        "form": form,
        "embed_results": True,
        "random_num": _random1000,
        "assignment": assignment,
        "course": course,
    }
    return render(request, "submissions/home.html", context)


@login_required
def upload_files_view(request, assignment_pk=None):
    """
    Upload files to the server
    """
    message = "Use this form to upload submission files to server"
    form = SubmissionFilesUploadForm(assignment_pk)
    if request.method == 'POST':
        form = SubmissionFilesUploadForm(request.POST, request.FILES)
        print("request was POST")
        print("request.FILES: ", request.FILES)
        if form.is_valid():
            print("form is valid")
            uploaded_submission_pks = form.save(request)
            qs = PaperSubmission.objects.filter(pk__in=uploaded_submission_pks)
            return render(
                request, 
                'submissions/upload_files.html',
                {'form': form,
                "random_num": _random1000, 
                "qs":qs, 
                'message': 'Files uploaded successfully'})
        else:
            message = 'Form is not valid'
            print("form is not valid")
        
    return render(
        request, 
        'submissions/upload_files.html', 
        {'form': form, 
        'message': message})

@login_required
def submission_classify_view(request):
    message = "Use this form to to classify submission by student name and university ID using Deep Learning methods"
    form = StudentClassifyForm()
    if request.method == 'POST':
        form = StudentClassifyForm(request.POST)
        print("request was POST")
        if form.is_valid():
            print("form is valid")
            classified_submission_pks, not_classified_submission_pks = form.save()
            qs = PaperSubmission.objects.filter(pk__in=classified_submission_pks)
            qs2 = PaperSubmission.objects.filter(pk__in=not_classified_submission_pks)
            message = f"Classified {len(qs)} submissions and not classified {len(qs2)} submissions"
            render(
                request, 
                'submissions/classify.html', 
                {'form': form,
                "qs_classified": qs,
                 "qs_not_classified": qs2,
                 "random_num": _random1000,
                'message': message})
        else:
            message = 'Form is not valid'
            print("form is not valid")
    return render(
        request, 
        'submissions/classify.html', 
        {'form': form, 
        'message': message})


@login_required
def submission_list_view(request):
    
    # qs stands for queryset
    qs = PaperSubmission.objects.all()
    context = {
        "object_list": qs , 
        "random_num": _random1000,
        }
    return render(request, 'submissions/main.html', context)


@login_required
def submission_detail_view(request, course_pk, assignment_pk, submission_pk):
    submission = get_object_or_404(PaperSubmission, pk=submission_pk)
    n_q = submission.assignment.number_of_questions
    grades_zipped = list(zip_longest(
        submission.get_question_grades(), 
        submission.assignment.get_max_question_scores())
    )
    print(submission.assignment)
    print("request.user: ", request.user)
    if request.method == 'POST':
        submission.graded_at = timezone.now()
        submission.graded_by = request.user
        q_grades = [ str(request.POST.get(f"grade_{i+1}")) 
            for i in range(n_q)]
        print(q_grades)
        if q_grades:
            _mutable = request.POST._mutable
            # set to mutable
            request.POST._mutable = True
            # сhange the values you want
            request.POST['question_grades'] = ",".join(q_grades)
            # set mutable flag back
            request.POST._mutable = _mutable

        print(f"text: {request.POST.get('new_comment')}")

        grading_form = GradingForm(
            request.POST,
            request.FILES,
            instance=submission)

            
        if grading_form.is_valid():
            print("form is valid")
            print(grading_form.cleaned_data)
            # submission.grader_comments = grading_form.cleaned_data.get('grader_comments')
            # add new comment from cleaned data to a new SubmissionComment instance
            # assigned to the submission and authored by the request.user
            
            submission.comment_files = grading_form.cleaned_data.get('comment_files')
            submission.save()

            if request.POST.get('new_comment').strip():
                comment = SubmissionComment(
                    paper_submission=submission,
                    author=request.user,
                    text=request.POST.get('new_comment'))
                comment.save()
            print("question grades", submission.question_grades)
            grades_zipped = list(zip_longest(
                submission.get_question_grades(), 
                submission.assignment.get_max_question_scores())
            )
            return render(
                request, 
                'submissions/detail.html', 
                {'submission': submission , 
                'grading_form': grading_form,
                'grades_zipped': grades_zipped,})
        else:
            print("form is not valid")
    else:
        grading_form = GradingForm(None)
    print(submission.assignment.get_all_saved_comments(requester=request.user))
    return render(
        request, 
        'submissions/detail.html', 
        {'submission': submission, 
        'saved_comments': submission.assignment.get_all_saved_comments(requester=request.user),
        'grading_form': grading_form, 
        'grades_zipped': grades_zipped})

@login_required
def redirect_to_previous(request, course_pk, assignment_pk, submission_pk):
    
    # first find the object corresponding to the pk
    submission = get_object_or_404(PaperSubmission, pk=submission_pk)
    # then find the previous object
    qs = PaperSubmission.objects.filter(
        assignment=submission.assignment,
        created__lt=submission.created).order_by('-created')
    if len(qs) > 0:
        print("found previous")
        return redirect(
            reverse('submissions:detail', 
        kwargs={'course_pk': course_pk,
        'assignment_pk': assignment_pk,
        'submission_pk': qs[0].pk}))
    else:
        return redirect(
            reverse('submissions:detail', 
        kwargs={'course_pk': course_pk,
        'assignment_pk': assignment_pk,
        'submission_pk': submission_pk}))


@login_required
def redirect_to_next(request, course_pk, assignment_pk, submission_pk):
    from django.shortcuts import redirect
    # first find the object corresponding to the pk
    submission = get_object_or_404(PaperSubmission, pk=submission_pk)
    # then find the next object
    qs = PaperSubmission.objects.filter(
        created__gt=submission.created, 
        assignment=submission.assignment
        ).order_by('created')
    if len(qs) > 0:
        print("found next")
        return redirect(
            reverse('submissions:detail', 
        kwargs={'course_pk': course_pk,
        'assignment_pk': assignment_pk,
        'submission_pk': qs[0].pk}))
    else:
        return redirect(
            reverse('submissions:detail', 
        kwargs={'course_pk': submission.assignment.course.pk,
        'assignment_pk': submission.assignment.pk,
        'submission_pk': submission.pk}))
    
# The delete view deletes the submission and returns a JsonResponse
# with a message (success or failure)
@login_required
def submission_delete_view(request, course_pk, assignment_pk, submission_pk):
    submission = get_object_or_404(PaperSubmission, pk=submission_pk)
    if request.method == 'POST':
        submission.delete()
        return JsonResponse({'message': 'success'})
    else:
        return JsonResponse({'message': 'failure'})

@login_required
def submission_delete_all_view(request, course_pk, assignment_pk):
    # get all submissions for the assignment
    assignment = get_object_or_404(
        Assignment, pk=assignment_pk)
    if request.method == 'POST':
        print("deleting all submissions")
        PaperSubmission.objects.filter(assignment=assignment).delete()
        return JsonResponse({'message': 'success'})
    else:
        return JsonResponse({'message': 'failure'})
    
@login_required
def submission_comment_delete_view(request, course_pk, assignment_pk, submission_pk, comment_pk):
    comment = get_object_or_404(SubmissionComment, pk=comment_pk)
    if request.method == 'POST':
        comment.delete()
        return JsonResponse({'message': 'success'})
    else:
        return JsonResponse({'message': 'failure'})

@login_required
def submission_comment_modify_view(request, course_pk, assignment_pk, submission_pk, comment_pk):
    comment = get_object_or_404(SubmissionComment, pk=comment_pk)
    if request.method == 'POST':
        import json
        # get the data 
        #     "text"
        #     "saved_title"
        #     "saved_token"
        #     "is_saved"
        # from the body of the request
        data = json.loads(request.body)
        print(data)
        
        if data.get('comment_action') == "star_comment":
            comment.saved_title = data.get('saved_title')
            comment.saved_token = data.get('saved_token')
            comment.is_saved = data.get('is_saved')
            comment.text = data.get('text')
            comment.save()
        # if modified-text is in the request data, then the user is trying to modify the text comment
        if 'modified-text' in request.POST:
            comment.text = request.POST.get('modified-text')
            comment.save()
        return JsonResponse({'message': 'success'})
    else:
        return JsonResponse({'message': 'failure'})





