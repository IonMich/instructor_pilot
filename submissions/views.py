from django.shortcuts import render
# from django.views.generic import ListView, DetailView
from .models import PaperSubmission, CanvasQuizSubmission, ScantronSubmission
from .forms import SubmissionSearchForm, GradingForm
import pandas as pd
from django.shortcuts import get_object_or_404
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
    grading_form = GradingForm(request.POST or None)
    print(grading_form)
    submission = get_object_or_404(PaperSubmission, pk=pk)
    print(submission.assignment)
    if request.method == 'POST':
        if grading_form.is_valid():
            print("form is valid")
            submission.grade = grading_form.cleaned_data.get('grade')
            submission.save()
            return render(request, 'submissions/detail.html', {'submission': submission})
    return render(request, 'submissions/detail.html', {'submission': submission, 'grading_form': grading_form})