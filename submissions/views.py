import random
from itertools import zip_longest

import pandas as pd
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db.models.query_utils import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.generic.edit import DeleteView

from assignments.models import Assignment, SavedComment
from courses.models import Course

from .forms import GradingForm, StudentClassifyForm, SubmissionSearchForm
# from django.views.generic import ListView, DetailView
from .models import (CanvasQuizSubmission, PaperSubmission, ScantronSubmission,
                     Submission, SubmissionComment)


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
def submission_classify_view(request):
    message = "Use this form to to classify submission by student name and university ID using ML"
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
        # if the submission student is not the same as the request.POST['student'],
        # then the student was changed manually at this stage,
        # so we need to update the classification type to 'M' for manual
        # and remove the canvas_id from the submission
        if (not submission.student) or str(submission.student.id) != request.POST['student']:
            submission.classification_type = 'M'
            submission.canvas_id = ''
            submission.canvas_url = ''
            
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
        print(f"file: {request.FILES.get('comment_files')}")

        grading_form = GradingForm(
            request.POST,
            request.FILES,
            instance=submission)

            
        if grading_form.is_valid():
            print("form is valid")
            print(grading_form.cleaned_data)
            
            # add new comment from request.POST to a new SubmissionComment instance
            # assigned to the submission and authored by the request.user
            
            submission.save()

            if request.POST.get('new_comment').strip():
                comment = SubmissionComment(
                    paper_submission=submission,
                    author=request.user,
                    text=request.POST.get('new_comment'))
                comment.save()
            print("comment saved")
            # add new file from request.FILES to a new SubmissionFile instance
            # assigned to the submission and authored by the request.user
            if request.FILES.get('comment_files'):
                # use the class method add_commentfile_to_db of SubmissionComment
                # to add the file to the database
                print("adding file(s)")
                SubmissionComment.add_commentfiles_to_db(
                    submission_target=submission,
                    uploaded_files=request.FILES.getlist('comment_files'),
                    author=request.user)

            print("question grades", submission.question_grades)
            grades_zipped = list(zip_longest(
                submission.get_question_grades(), 
                submission.assignment.get_max_question_scores())
            )
            return render(
                request, 
                'submissions/detail.html', 
                {'submission': submission,
                'grading_form': grading_form,
                'grades_zipped': grades_zipped,})
        else:
            print("form is not valid")
    else:
        grading_form = GradingForm(None)

    return render(
        request, 
        'submissions/detail.html', 
        {'submission': submission,
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

        # from the body of the request
        data = json.loads(request.body)
        print(data)
        # if modified-text is in the request data, then the user is trying to modify the text comment
        if data.get('comment_action') == "edit_comment":
            comment.text = data.get('text')
            comment.save()
            return JsonResponse({'message': 'success'})
        else:
            return JsonResponse({'message': 'failure'}, status=400)
    else:
        return JsonResponse({'message': 'failure'})
