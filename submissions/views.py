from django.shortcuts import render
# from django.views.generic import ListView, DetailView
from .models import PaperSubmission, CanvasQuizSubmission, ScantronSubmission
from .forms import SubmissionSearchForm, GradingForm
import pandas as pd
from django.shortcuts import get_object_or_404
from django.utils import timezone
from itertools import zip_longest
import random

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


def submission_list_view(request):
    
    # qs stands for queryset
    qs = PaperSubmission.objects.all()
    context = {
        "object_list": qs , 
        "random_num": _random1000,
        }
    return render(request, 'submissions/main.html', context)


def submission_detail_view(request, pk):
    submission = get_object_or_404(PaperSubmission, pk=pk)
    n_q = submission.assignment.number_of_questions
    grades_zipped = zip_longest(
        submission.get_question_grades(), 
        submission.assignment.get_max_question_scores())
    print(submission.assignment)
    print("request.user: ", request.user)
    if request.method == 'POST':
        submission.graded_at = timezone.now()
        submission.graded_by = request.user
        q_grades = [ str(request.POST.get(f"grade_{i+1}",0)) 
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

        # get all data from request.POST
        # print(request.FILES)
        for key, value in request.POST.items():
            print(key, value)
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