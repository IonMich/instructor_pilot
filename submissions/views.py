import random
from itertools import zip_longest

import pandas as pd
from django.apps import apps
from django.contrib.auth.decorators import login_required
from django.db.models.query_utils import Q
from django.contrib.auth.models import User
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone

from assignments.models import Assignment
from courses.models import Course

from .forms import GradingForm, StudentClassifyForm, SubmissionSearchForm
from .models import (PaperSubmission,
                     SubmissionComment)

from rest_framework.response import Response
from rest_framework import viewsets
from rest_framework import permissions
from submissions.serializers import PaperSubmissionSerializer, SubmissionCommentSerializer
from rest_framework.views import APIView
import zipfile
from io import BytesIO
from django.http import HttpResponse

class AuthenticatedHttpRequest(HttpRequest):
    user: User
# Create your views here.
class PaperSubmissionInAssignmentViewSet(viewsets.ModelViewSet):
    """
    This ViewSet automatically provides `list`, `create`, `retrieve`,
    `update` and `destroy` actions.
    """
    queryset = PaperSubmission.objects.all()
    serializer_class = PaperSubmissionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly,]

    def get_queryset(self):
        assignment_id = self.kwargs['assignment_pk']
        return PaperSubmission.objects.filter(assignment=assignment_id)
    
    def create(self, request, *args, **kwargs):
        """
        Create a new PaperSubmissions by splitting
        the PDFs into multiple submissions
        """
        num_pages_per_submission = int(request.data.get("num_pages_per_submission"))
        assignment_pk = self.kwargs.get("assignment_pk")
        assignment = Assignment.objects.get(pk=assignment_pk)
        uploaded_files = request.data.getlist("submission_PDFs")
        sub_ids = PaperSubmission.add_papersubmissions_to_db(
            assignment_target=assignment,
            num_pages_per_submission=num_pages_per_submission,
            uploaded_files=uploaded_files,
        )
        return Response(status=200, data={"submission_ids": sub_ids})
    
class PaperSubmissionOfStudentInCourseViewSet(viewsets.ModelViewSet):
    """
    This ViewSet automatically provides `list`, `create`, `retrieve`,
    `update` and `destroy` actions.
    """
    queryset = PaperSubmission.objects.all()
    serializer_class = PaperSubmissionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly,]

    def get_queryset(self):
        course_id = self.kwargs['course_pk']
        student_id = self.kwargs['student_pk']
        return PaperSubmission.objects.filter(assignment__course=course_id, student=student_id)
    
class PaperSubmissionViewSet(viewsets.ModelViewSet):
    """
    This ViewSet automatically provides `create`, `retrieve`,
    `update` and `destroy` actions.
    """
    queryset = PaperSubmission.objects.all()
    serializer_class = PaperSubmissionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly,]

class CommentViewSet(viewsets.ModelViewSet):
    """
    This ViewSet automatically provides `create`, `retrieve`,
    `update` and `destroy` actions.
    """
    queryset = SubmissionComment.objects.all()
    serializer_class = SubmissionCommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly,]

    def get_queryset(self):
        submission_id = self.kwargs['submission_pk']
        return SubmissionComment.objects.filter(paper_submission=submission_id)

    def create(self, request, *args, **kwargs):
        """
        Create a new Comment with the text and the files
        """
        submission_pk = request.data.get("submission_id")
        submission = PaperSubmission.objects.get(pk=submission_pk)
        text = request.data.get("text")
        comment = SubmissionComment(
            paper_submission=submission,
            author=request.user,
            text=text,
        )
        comment.save()
        return Response(status=200, data={"comment_id": comment.pk})

class ExportSubmissionPDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, submission_id):
        # Retrieve the assignment
        submission = get_object_or_404(PaperSubmission, pk=submission_id)
        
        # Create in-memory ZIP archive
        buffer = BytesIO()
        num_files = 0
        with zipfile.ZipFile(buffer, "w") as zip_file:
            if hasattr(submission, "pdf") and submission.pdf:
                num_files += 1
                # Write the file into the zip archive with a simple name
                zip_file.write(submission.pdf.path, arcname=f"submission_{submission.pk}.pdf")
        buffer.seek(0)
        print(f"num_files: {num_files}")
        if num_files == 0:
            return Response(
                {"message": "No PDF files found for submissions"},
                status=400,
            )
        response = HttpResponse(buffer, content_type="application/zip")
        response["Content-Disposition"] = f'attachment; filename="submissions_{submission_id}.zip"'
        return response

class ExportSubmissionImagesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, submission_id):
        # Retrieve the assignment
        submission = get_object_or_404(PaperSubmission, pk=submission_id)
        
        # Create in-memory ZIP archive
        buffer = BytesIO()
        num_files = 0
        with zipfile.ZipFile(buffer, "w") as zip_file:
            for image in submission.submissions_papersubmissionimage_related.all():
                num_files += 1
                # Write the file into the zip archive with a simple name
                zip_file.write(image.image.path, arcname=f"submission_{submission.pk}_page_{image.page}.png")
        buffer.seek(0)
        print(f"num_files: {num_files}")
        if num_files == 0:
            return Response(
                {"message": "No image files found for submissions"},
                status=400,
            )
        response = HttpResponse(buffer, content_type="application/zip")
        response["Content-Disposition"] = f'attachment; filename="submissions_{submission_id}_images.zip"'
        return response

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
        message = "Submissions"
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
    if not submission.assignment:
        return JsonResponse({
            'message': 'Submission has no assignment',
            'success': False,
            'submission': submission_pk,
        })
    grades_zipped = list(zip_longest(
        submission.get_question_grades(), 
        submission.assignment.get_max_question_scores())
    )
    # get the section filter from the request GET parameters
    print(request.GET)
    section_filter = request.GET.get('section_filter')
    version_filter = request.GET.get('version_filter')
    question_focus = request.GET.get('question_focus')
    # allow only submissions whose student is enrolled in the section
    # to be displayed
    collection = PaperSubmission.objects.filter(
        assignment=submission.assignment
        )
    filtered_collection = collection
    filter_pks = []
    query_params_dict = {}
    if section_filter:
        filtered_collection = collection.filter(
            Q(student__sections__id=section_filter)
        )
        filter_pks = filtered_collection.values_list('pk', flat=True)
        filter_pks = list(filter_pks)
        query_params_dict['section_filter'] = section_filter
    if version_filter:
        filtered_collection = filtered_collection.filter(
            Q(version__id=version_filter)
        )
        filter_pks = filtered_collection.values_list('pk', flat=True)
        filter_pks = list(filter_pks)
        query_params_dict['version_filter'] = version_filter
    has_previous = filtered_collection.filter(
        created__lt=submission.created).exists()
    has_next = filtered_collection.filter(
        created__gt=submission.created).exists()
    print(has_previous, has_next)
    if question_focus:
        query_params_dict['question_focus'] = question_focus
    print(query_params_dict)
    collection_pks = collection.values_list('pk', flat=True)
    collection_pks = list(collection_pks)
    print(submission.assignment)
    print("request.user: ", request.user)
    
    grading_form = GradingForm(None)

    return render(
        request, 
        'submissions/detail.html', 
        {'submission': submission,
        'grading_form': grading_form, 
        'grades_zipped': grades_zipped,
        'collection_pks': collection_pks,
        'filter_pks': filter_pks,
        'has_previous': has_previous,
        'has_next': has_next,
        'query_params': query_params_dict,
        })

@login_required
def api_grade_update_view(request: AuthenticatedHttpRequest, submission_pk: str):
    """
    This view updates the grade of a submission
    """
    if request.method != 'POST':
        return JsonResponse({
            'message': 'This view only accepts POST requests',
            'success': False,
            'submission': submission_pk,
        })
    try:
        submission = PaperSubmission.objects.get(pk=submission_pk)
    except PaperSubmission.DoesNotExist:
        return JsonResponse({
            'message': 'Submission does not exist',
            'success': False,
            'submission': submission_pk,
        })
    if not submission.assignment:
        return JsonResponse({
            'message': 'Submission has no assignment',
            'success': False,
            'submission': submission_pk,
        })
    num_questions = submission.assignment.number_of_questions
    if not num_questions:
        return JsonResponse({
            'message': 'Assignment has no number_of_questions specified',
            'success': False,
            'submission': submission_pk,
        })
    submission.graded_at = timezone.now()
    submission.graded_by = request.user
    if (not submission.student) or str(submission.student.pk) != request.POST['student']:
        submission.classification_type = 'M'
        submission.canvas_id = ''
        submission.canvas_url = ''
    q_grades = [ str(request.POST.get(f"grade_{i+1}"))
            for i in range(num_questions)]
    print(q_grades)
    if q_grades:
        _mutable = request.POST._mutable
        request.POST._mutable = True
        if all([q_grade == '' for q_grade in q_grades]):
            request.POST['question_grades'] = ''
        else:
            request.POST['question_grades'] = ",".join(q_grades)
        request.POST._mutable = _mutable
    print(request.POST['question_grades'].__repr__())
    print(f"text: {request.POST.get('new_comment')}")
    print(f"file: {request.FILES.getlist('comment_files')}")
    for key in request.FILES.keys():
        print(key)


    form = GradingForm(
        request.POST,
        request.FILES,
        instance=submission)
    if form.is_valid():
        print("form is valid")
        print(form.cleaned_data)
        
        # save the form
        form.save()
        new_comment_text = request.POST.get('new_comment')
        if new_comment_text and new_comment_text.strip():
            author = request.user
            comment = SubmissionComment(
                paper_submission=submission,
                author=author,
                text=request.POST.get('new_comment'))
            comment.save()

            # parse date as e.g. Dec. 31, 2020, 11:59 p.m. at the local timezone
            created = (comment.created_at.astimezone()
                       .strftime("%b. %d, %Y, %I:%M %p")
                       .replace("AM", "a.m.")
                       .replace("PM", "p.m.")
                          ) 
            # remove leading zeros from %d and %I
            created = created.replace(" 0", " ")

            print("comment saved")

            serialized_comment = {
                'pk': str(comment.pk),
                'text': comment.text,
                'created': created,
                'author': {
                    'first_name': author.first_name,
                },
            }
            serialized_comments = [serialized_comment]
        else:
            serialized_comments = []
        
        # get comment files with names comment_files_0, comment_files_1, etc.
        # add new file from to a new SubmissionFile instance
        # assigned to the submission and authored by the request.user
        if request.FILES.getlist('comment_files'):
            print("adding file(s)")
            author = request.user
            created_comment_pks = SubmissionComment.add_commentfiles_to_db(
                submission_target=submission,
                uploaded_files=request.FILES.getlist('comment_files'),
                author=author)
            # print("comment files saved: ", created_comment_pks)
            for comment_pk in created_comment_pks:
                comment = SubmissionComment.objects.get(pk=comment_pk)
                created = (comment.created_at.astimezone()
                       .strftime("%b. %d, %Y, %I:%M %p")
                       .replace("AM", "a.m.")
                       .replace("PM", "p.m.")
                          )
                # remove leading zeros from %d and %I
                created = created.replace(" 0", " ")
                serialized_comment = {
                    'pk': str(comment.pk),
                    'text': comment.text,
                    'created': created,
                    'file_name': comment.get_filename(),
                    'file_url': comment.comment_file.url,
                    'file_size': comment.get_filesize(),
                    'author': {
                        'first_name': author.first_name,
                    },
                }
                print("comment saved: ", serialized_comment)
                serialized_comments.append(serialized_comment)

        import json
        serialized_comments = json.dumps(serialized_comments)
        return JsonResponse({
            'message': 'Grade updated',
            'success': True,
            'submission': submission_pk,
            'total_grade': submission.grade,
            'question_grades': submission.question_grades,
            'new_comments': serialized_comments,
        })
    else:
        print("form is not valid")
        return JsonResponse({
            'message': 'Form is not valid',
            'success': False,
            'submission': submission_pk,
            'total_grade': submission.grade,
            'question_grades': submission.question_grades,
            'new_comments': [],
        })

@login_required
def api_submission_patch_view(request, assignment_pk, submission_pk):
    import json
    submission = get_object_or_404(PaperSubmission, pk=submission_pk)
    if request.method == 'PATCH':
        print("request was PATCH")
        print(request.body)
        data = json.loads(request.body)
        print(data)
        # get the student model from the database
        from django.apps import apps
        Student = apps.get_model('students', 'Student')
        if data.get('student'):
            try:
                student_pk = data.get('student')
                # check if the student belongs to the course
                student = get_object_or_404(Student, pk=student_pk)
                assignment = get_object_or_404(Assignment, pk=assignment_pk)
                if student not in assignment.course.get_students():
                    return JsonResponse({"message": "error"})
                else:
                    submission.student = student
            except Exception as e:
                print(e)
                return JsonResponse({"message": "error"})
        if data.get('classification_type'):
            submission.classification_type = data.get('classification_type')
        else:
            submission.classification_type = 'M'
        if data.get('canvas_id'):
            submission.canvas_id = data.get('canvas_id')
        if data.get('canvas_url'):
            submission.canvas_url = data.get('canvas_url')
        submission.save()
        return JsonResponse({"message": "success", "student": student.pk})
    else:
        return JsonResponse({"message": "error"})

@login_required
def redirect_to_previous(request, course_pk, assignment_pk, submission_pk):
    section_filter = request.GET.get('section_filter')
    version_filter = request.GET.get('version_filter')
    question_focus = request.GET.get('question_focus')
    extra_params = []
    if section_filter and section_filter != 'None':
        extra_params.append(f'section_filter={section_filter}')
    if version_filter and version_filter != 'None':
        extra_params.append(f'version_filter={version_filter}')
    if question_focus and question_focus != 'None':
        extra_params.append(f'question_focus={question_focus}')
    if len(extra_params) > 0:
        extra_params = '?' + '&'.join(extra_params)
    else:
        extra_params = ''

    # first find the object corresponding to the pk
    submission = get_object_or_404(PaperSubmission, pk=submission_pk)
    # then find the previous object
    qs = PaperSubmission.objects.filter(
        assignment=submission.assignment,
        created__lt=submission.created).order_by('-created')
    if version_filter:
        qs = qs.filter(version__id=version_filter)
    if section_filter:
        qs = qs.filter(student__sections__id=section_filter)
    if len(qs) > 0:
        print("found previous")
        new_url = reverse(
            'submissions:detail', 
            kwargs={'course_pk': course_pk,
            'assignment_pk': assignment_pk,
            'submission_pk': qs[0].pk})
        return redirect(new_url + extra_params)
    else:
        new_url = reverse(
            'submissions:detail', 
            kwargs={'course_pk': submission.assignment.course.pk if submission.assignment else course_pk,
            'assignment_pk': submission.assignment.pk if submission.assignment else assignment_pk,
            'submission_pk': submission.pk})
        return redirect(new_url + extra_params)


@login_required
def redirect_to_next(request, course_pk, assignment_pk, submission_pk):
    section_filter = request.GET.get('section_filter')
    version_filter = request.GET.get('version_filter')
    question_focus = request.GET.get('question_focus')
    extra_params = []
    if section_filter:
        extra_params.append(f'section_filter={section_filter}')
    if version_filter:
        extra_params.append(f'version_filter={version_filter}')
    if question_focus:
        extra_params.append(f'question_focus={question_focus}')
    if len(extra_params) > 0:
        extra_params = '?' + '&'.join(extra_params)
    else:
        extra_params = ''

    # first find the object corresponding to the pk
    submission = get_object_or_404(PaperSubmission, pk=submission_pk)
    # then find the next object
    qs = PaperSubmission.objects.filter(
        created__gt=submission.created, 
        assignment=submission.assignment
        ).order_by('created')
    if version_filter:
        qs = qs.filter(version__id=version_filter)
    if section_filter:
        qs = qs.filter(student__sections__id=section_filter)
    if len(qs) > 0:
        print("found next")
        new_url = reverse(
            'submissions:detail', 
            kwargs={'course_pk': course_pk,
            'assignment_pk': assignment_pk,
            'submission_pk': qs[0].pk})
        return redirect(new_url + extra_params)
    else: 
        new_url = reverse(
            'submissions:detail', 
            kwargs={'course_pk': submission.assignment.course.pk if submission.assignment else course_pk,
            'assignment_pk': submission.assignment.pk if submission.assignment else assignment_pk,
            'submission_pk': submission.pk})
        return redirect(new_url + extra_params)

@login_required
def api_grades_list_view(request, assignment_pk):
    """
    This view returns the grades for an assignment
    """
    assignment = get_object_or_404(Assignment, pk=assignment_pk)
    submissions = PaperSubmission.objects.filter(assignment=assignment)
    
    # create a pandas dataframe
    data = []
    for submission in submissions:
        question_grades = submission.get_question_grades()
        question_grades_dict = dict()
        for i, qg in enumerate(question_grades):
            question_grades_dict[f'question_{i+1}_grade'] = qg
        section = None
        if submission.student:
            section = submission.student.sections.filter(
                course=assignment.course
            ).first()
        row = {
            'submission_id': submission.pk,
            'version': submission.version.name if submission.version else '',
            'grade': submission.grade,
            'section_id': section.pk if section else '',
            'section_name': section.name if section else 'Unassigned',
            **question_grades_dict,
        }
        data.append(row)
    df = pd.DataFrame(data)
    # replace NaN with empty string
    df = df.fillna('')
    grades = df.to_dict(orient='records')
    return JsonResponse({
        'message': 'success',
        'grades': grades,
    })

@login_required
def export_gradebook_canvas_csv_view(request):
    """
    This view exports the grades for an assignment to a CSV file
    """
    if request.method != 'POST':
        return JsonResponse({
            'message': 'This view only accepts POST requests',
            'success': False,
        })
    
    # the sub pks are in the JSON stringified list
    submission_pks = request.POST.get('submission_pks')
    import json
    submission_pks = json.loads(submission_pks)

    # get the submissions
    print(submission_pks)
    submissions = PaperSubmission.objects.filter(pk__in=submission_pks)
    
    # create a pandas dataframe
    if not submissions[0].assignment:
        return JsonResponse({
            'message': 'No assignment found for submission',
            'success': False,
        })
    assignment_column = f"{submissions[0].assignment.name} ({submissions[0].assignment.canvas_id})"
    data = []
    for submission in submissions:
        student_cell = f"{submission.student.last_name}, {submission.student.first_name}" if submission.student else ""
        canvas_id_cell = submission.student.canvas_id if submission.student else ""
        uni_id_cell = submission.student.uni_id if submission.student else ""
        if not submission.student or not submission.assignment or not submission.student.get_section_in_course(submission.assignment.course):
            section_cell = ""
        else:
            section_cell = submission.student.get_section_in_course(submission.assignment.course).name if submission.student else ""
        row = {
            'Student': student_cell,
            'ID': canvas_id_cell,
            'SIS User ID': uni_id_cell,
            'SIS Login ID': "",
            'Section': section_cell,
            assignment_column: submission.grade,
        }
        data.append(row)
    df = pd.DataFrame(data)
    # create the response
    from django.http import HttpResponse
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{assignment_column}_grades.csv"'
    df.to_csv(response, index=False)
    return response

@login_required
def submission_export_grades_csv_view(request):
    """
    This view exports the grades for an assignment to a CSV file
    """
    if request.method != 'POST':
        return JsonResponse({
            'message': 'This view only accepts POST requests',
            'success': False,
        })
    
    # the sub pks are in the JSON stringified list
    submission_pks = request.POST.get('submission_pks')
    import json
    submission_pks = json.loads(submission_pks)

    # get the submissions
    print(submission_pks)
    submissions = PaperSubmission.objects.filter(pk__in=submission_pks)
    
    # create a pandas dataframe
    data = []
    for submission in submissions:
        question_grades = submission.get_question_grades()
        question_grades_dict = dict()
        for i, qg in enumerate(question_grades):
            question_grades_dict[f'question_{i+1}_grade'] = qg
        row = {
            'submission_id': submission.pk,
            'submission_canvas_id': submission.canvas_id,
            'student_last_name': submission.student.last_name if submission.student else '',
            'student_first_name': submission.student.first_name if submission.student else '',
            'student_canvas_id': submission.canvas_id,
            'student_uni_id': submission.student.uni_id if submission.student else '',
            'version': submission.version.name if submission.version else '',
            'grade': submission.grade,
            **question_grades_dict,
        }
        data.append(row)
    df = pd.DataFrame(data)
    # create the response
    from django.http import HttpResponse
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="grades.csv"'
    df.to_csv(response, index=False)
    return response

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
    
@login_required
def api_submission_manual_version_view(request, submission_pk):
    if request.method != 'POST':
        return JsonResponse({
            'message': 'This view only accepts POST requests',
            'success': False,
            'submission': submission_pk,
            'version': None,
        })
    Version = apps.get_model('assignments', 'Version')
    # get form data in request.body as json
    import json
    data = json.loads(request.body)
    version_pk = data.get('version_id')
    print(data)
    try:
        submission = PaperSubmission.objects.get(pk=submission_pk)
    except PaperSubmission.DoesNotExist:
        return JsonResponse({
            'message': 'Submission does not exist',
            'success': False,
            'submission': submission_pk,
            'version': None,
        })
    try:
        version = Version.objects.get(
            assignment=submission.assignment,
            pk=version_pk,
        )
    except Version.DoesNotExist:
        return JsonResponse({
            'message': 'Version does not exist',
            'success': False,
            'submission': submission_pk,
            'version': None,
        })

    # set the version of the submission
    submission.version = version
    submission.save()
    # send a success message
    assignment = submission.assignment
    submissions = PaperSubmission.objects.filter(assignment=assignment)
    submissions_serialized = []
    for submission in submissions:
        images_urls = submission.submissions_papersubmissionimage_related.all()
        # .map(lambda x: (x.page, x.image.url))
        images_urls = {image.page: image.image.url for image in images_urls}
        submission_serialized = dict()
        submission_serialized['id'] = submission.pk
        submission_serialized['images'] = images_urls
        if submission.version:
            submission_serialized['version'] = dict()
            submission_serialized['version']['id'] = submission.version.pk
            submission_serialized['version']['name'] = submission.version.name
        else:
            submission_serialized['version'] = None
        submissions_serialized.append(submission_serialized)
    response = {
        'message': 'Submission version updated',
        'submissions': submissions_serialized,
        'version': version.pk,
        'success': True,
    }
    return JsonResponse(response)

@login_required
def api_submissions_list_view(request, assignment_pk):
    """
    This view returns a list of submissions for an assignment
    """
    # get the assignment object
    assignment = get_object_or_404(Assignment, pk=assignment_pk)
    # get the submissions for the assignment
    submissions = PaperSubmission.objects.filter(assignment=assignment)
    submissions_serialized = []
    for submission in submissions:
        images_urls = submission.submissions_papersubmissionimage_related.all()
        # .map(lambda x: (x.page, x.image.url))
        images_urls = {image.page: image.image.url for image in images_urls}
        submission_serialized = dict()
        submission_serialized['id'] = submission.pk
        submission_serialized['images'] = images_urls
        if submission.version:
            submission_serialized['version'] = dict()
            submission_serialized['version']['id'] = submission.version.pk
            submission_serialized['version']['name'] = submission.version.name
        else:
            submission_serialized['version'] = None
        submissions_serialized.append(submission_serialized)
    return JsonResponse({
        'message': 'success',
        'submissions': submissions_serialized,
    })

def submission_pdf_view(request, submission_pk):
    """
    Load the submission.pdf.url in an iframe
    using pdf.js in submissions/viewer.html
    """
    submission = get_object_or_404(PaperSubmission, pk=submission_pk)
    return render(request, 'submissions/viewer.html', {'submission': submission})
