from django.shortcuts import render
# from django.views.generic import ListView, DetailView
from .models import PaperSubmission, CanvasQuizSubmission, ScantronSubmission
from .forms import SubmissionSearchForm, GradingForm, SubmissionFilesUploadForm, StudentClassifyForm
from assignments.models import Assignment
from courses.models import Course
import pandas as pd
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from itertools import zip_longest
import random
from django.urls import reverse



def _random1000():
    yield random.randint(0, 100)

def home_view(request):
    form = SubmissionSearchForm(request.POST or None)
    sub_df = None
    qs = None
    if request.method == 'POST':
        date_from = request.POST.get('date_from')
        date_to = request.POST.get('date_to')
        assignment = request.POST.get('assignment')
        student = request.POST.get('student')
        submission_type = request.POST.get('submission_type')
        # assignment_group = request.POST.get('assignment_group')
        print(date_from, date_to, assignment, student, submission_type)
        if submission_type == 'P':
            qs = PaperSubmission.objects.filter(
                created__range=(date_from, date_to))
        elif submission_type == 'CQ':
            qs = CanvasQuizSubmission.objects.filter(
                created__range=(date_from, date_to))
        elif submission_type == 'S':
            qs = ScantronSubmission.objects.filter(
                created__range=(date_from, date_to))



        if len(qs) > 0:
            sub_df = pd.DataFrame(qs.values())
            print(sub_df)
            sub_df = sub_df.to_html(
                justify='center',
                classes=["table table-bordered table-striped table-hover"]
                )
        else:
            print("no submissions found")
    title = "Results"
    message = 'Hello from the view!'
    context = {
        "title": title,
        "message": message, 
        'form': form, 
        "qs": qs , 
        'sub_df': sub_df,
        "random_num": _random1000,
        }
    return render(request, 'submissions/home.html', context)


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
            uploaded_submission_pks = form.save()
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


def submission_list_view(request):
    
    # qs stands for queryset
    qs = PaperSubmission.objects.all()
    context = {
        "object_list": qs , 
        "random_num": _random1000,
        }
    return render(request, 'submissions/main.html', context)


def submission_detail_view(request, course_pk, assignment_pk, submission_pk):
    submission = get_object_or_404(PaperSubmission, pk=submission_pk)
    n_q = submission.assignment.number_of_questions
    grades_zipped = zip_longest(
        submission.get_question_grades(), 
        submission.assignment.get_max_question_scores())
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

        grading_form = GradingForm(
            request.POST,
            request.FILES,
            instance=submission)

            
        if grading_form.is_valid():
            print("form is valid")
            print(grading_form.cleaned_data)
            submission.grader_comments = grading_form.cleaned_data.get('grader_comments')
            submission.comment_files = grading_form.cleaned_data.get('comment_files')
            submission.save()
            print("question grades", submission.question_grades)
            grades_zipped = zip_longest(
                submission.get_question_grades(), 
                submission.assignment.get_max_question_scores())
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
    return render(
        request, 
        'submissions/detail.html', 
        {'submission': submission, 
        'grading_form': grading_form, 
        'grades_zipped': grades_zipped})


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
    


