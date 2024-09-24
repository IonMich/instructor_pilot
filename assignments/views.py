import json
import os

import numpy as np
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.core import serializers
from django.core.files.base import ContentFile
from django.db.models import Max, Q
from django.forms.models import model_to_dict
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from courses.models import Course
from courses.utils import get_canvas_course
from submissions.cluster import (images_to_text,
                                 perform_dbscan_clustering,
                                 plot_clusters_dbscan, vectorize_texts)
from submissions.forms import (StudentClassifyForm, SubmissionFilesUploadForm,
                               SubmissionSearchForm, SyncFromForm, SyncToForm)
from submissions.models import (PaperSubmission, PaperSubmissionImage,
                                SubmissionComment)
from submissions.views import _random1000

from .models import Assignment, SavedComment, Version, VersionFile, VersionText
from .utils import delete_versions

from rest_framework import viewsets
from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from assignments.serializers import AssignmentSerializer
# Create your views here.

class AssignmentViewSet(viewsets.ModelViewSet):
    """
    This ViewSet automatically provides `list`, `create`, `retrieve`,
    `update` and `destroy` actions.
    """
    queryset = Assignment.objects.all()
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly,]
class AssignmentInCourseViewSet(viewsets.ModelViewSet):
    """
    This ViewSet automatically provides `list`, `create`, `retrieve`,
    `update` and `destroy` actions.
    """
    queryset = Assignment.objects.all()
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly,]

    def get_queryset(self):
        course_id = self.kwargs['course_pk']
        return Assignment.objects.filter(course_id=course_id)

class ListAssignmentScoresViewSet(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly,]

    def get(self, request, assignment_id):
        assignment = get_object_or_404(Assignment, pk=assignment_id)
        scores = assignment.get_all_grades()
        return Response(scores)
    
class AssignmentIdentifySubmissions(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def patch(self, request, assignment_id):
        assignment = get_object_or_404(Assignment, pk=assignment_id)
        pages_selected = request.data.get("pages_selected")
        max_page_num = PaperSubmissionImage.get_max_page_number(assignment)
        print(f"pages_selected: {pages_selected}")
        pages_to_skip = tuple(
            i for i in range(max_page_num) if i + 1 not in pages_selected
        )
        print(f"pages_to_skip: {pages_to_skip}")
        classified_submission_pks, not_classified_submission_pks = (
            PaperSubmission.classify(
                assignment,
                skip_pages=pages_to_skip,
            )
        )
        return Response(
            {
                "classified_submission_pks": classified_submission_pks,
                "not_classified_submission_pks": not_classified_submission_pks,
            }
        )
    
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
                try:
                    classified_submission_pks, not_classified_submission_pks = classify_form.save()
                    qs_classified = PaperSubmission.objects.filter(pk__in=classified_submission_pks)
                    qs_not = PaperSubmission.objects.filter(pk__in=not_classified_submission_pks)
                    message = "Classified {} submissions and {} submissions were not classified".format(len(qs_classified), len(qs_not))
                    print(message)
                    if len(qs_classified) == 0:
                        message_type = 'danger'
                    elif len(qs_not) > 0:
                        message_type = 'warning'
                    else:
                        message_type = 'success'
                    
                except Exception as e:
                    print("An error occured while classifying submissions")
                    import traceback
                    print(traceback.format_exc())
                    message = "An error occured while classifying submissions"
                    message_type = 'danger'
                return JsonResponse({
                        "message": message,
                        "message_type": message_type,
                    })
                
        elif "submit-sync-from" in request.POST:
            # Handle ajax request and return json response with the submissions that were synced
            if request.headers.get('x-requested-with') != 'XMLHttpRequest':
                print("not ajax request")
                return JsonResponse({'error': 'not ajax request'})
            
            print("ajax request")
            sync_from_form = SyncFromForm(no_assignment=False, data=request.POST)
            if not sync_from_form.is_valid():
                print(sync_from_form.errors)
                return JsonResponse({'error': 'form is not valid'})
            
            print("form is valid")
            sync_from_form.save()
            message = 'Sync from canvas successful'
            message_type = 'success'
            # return submissions that were synced as json
            submissions = (PaperSubmission.objects.filter(assignment=assignment)
                           .order_by('created')
                           .values('pk', 'canvas_id', 'canvas_url'))
            submissions = list(submissions)
            
            return JsonResponse({'submissions': submissions})
        
        elif "submit-sync-to" in request.POST:
            print("request was POST:sync-to")
            sync_to_form = SyncToForm(
                no_assignment=False,
                request_user=request.user, 
                data=request.POST)
            if sync_to_form.is_valid():
                print("form is valid")
                try:
                    sync_to_form.save()
                    message = 'Upload to canvas completed gracefully. Details in the terminal.'
                    message_type = 'info'
                except Exception as e:
                    print(f"An error occured while syncing submissions to canvas: {e}")
                    import traceback
                    print(traceback.format_exc())
                    message = "An error occured while syncing submissions to canvas"
                    message_type = 'danger'

                
            else:
                print(sync_to_form.errors)
                message = 'Sync to canvas failed'
                message_type = 'danger'
            return JsonResponse({
                "message": message,
                "message_type": message_type,
            })
        else:
            print("request was POST but not a recognized action")
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
        'course_pk': course_pk,
        'assignment_pk': assignment_pk,
        })



@login_required
def version_view(request, course_pk, assignment_pk):
    # if the request is POST, then cluster the submissions
    if request.method != 'POST':
        # send the user to the assignment detail page
        return redirect('assignments:detail', course_pk=course_pk, assignment_pk=assignment_pk)
    # pages = [3,4]
    import json
    data = json.loads(request.body)
    pages = data.get('pages')
    print(pages)
    if len(pages) == 0:
        return JsonResponse(
            {'message': 'No pages selected',
            'success': False,
             }
        )

    assignment = get_object_or_404(Assignment, pk=assignment_pk)
    # select submissions to cluster from model submissions.PaperSubmission
    # get the submissions from the database
    submissions = PaperSubmission.objects.filter(assignment=assignment)
    # submissions_image = PaperSubmissionImage.objects.filter(submission__in=submissions, page=3)
    # get the items in the field
    images = []
    sub_pks = []
    for submission in submissions:
        submission_images = PaperSubmissionImage.objects.filter(
            Q(submission=submission) & Q(page__in=pages))
        for image in submission_images:
            images.append(image.image.path)
            sub_pks.append(submission.pk)
        
    texts = images_to_text(images, sub_pks)
    print(len(texts))

    # vectorize the text
    print("vectorizing texts")
    X = vectorize_texts(texts)
    # cluster the text
    print("clustering images")
    dbscan, cluster_labels = perform_dbscan_clustering(X)

    # delete the versions if already exist
    delete_versions(assignment)

    outlier_label = -1
    cluster_types = set(cluster_labels) - {outlier_label,}
    len_cluster_types = len(set(cluster_types))
    # create the versions
    
    for label in cluster_types:
        Version.objects.create(
            name = label + 1,
            assignment=assignment
        )
    
    cluster_images = [""] * len_cluster_types
    # add the cluster labels to the database
    for i, submission in enumerate(submissions):
        # get the version with the corresponding cluster label
        if cluster_labels[i] not in cluster_types:
            continue
        version = Version.objects.get(assignment=assignment, name=cluster_labels[i] + 1)
        submission.version = version
        # check if version already has an image
        if version.version_image == "":
            submission_image = PaperSubmissionImage.objects.filter(
                submission=submission, 
                page=pages[0])
            cluster_images[int(version.name)-1] = submission_image[0].image.url
            # url.replace("/media", "")
            version.version_image = cluster_images[int(version.name)-1].replace("/media", "")
            version.save()
            
        submission.save()
    # renew the submissions_image queryset after the above changes
    submissions = PaperSubmission.objects.filter(assignment=assignment)
    # submissions_image = PaperSubmissionImage.objects.filter(submission__in=submissions, page=page)

    # count number of 0 in cluster_labels
    outliers = np.count_nonzero(cluster_labels == outlier_label)

    # set the versioned to True
    assignment.versioned = True
    assignment.save()
    
    # Serialize the data
    assignment = model_to_dict(assignment)
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
    # context
    context = {
        'assignment': assignment,
        'cluster_types' : len_cluster_types,
        'outliers': outliers,
        'submissions': submissions_serialized, 
        # 'cluster_labels': cluster_labels, 
        'cluster_images': cluster_images,
        # 'course_pk': course_pk, 'assignment_pk': assignment_pk
        'message': 'success',
        'new_version': 'true',
        'success': True,
    }

    # send a JsonResponse to the frontend with the context
    return JsonResponse(context, safe=False)

@login_required
def api_version_comments(request, assignment_pk):
    if request.method != 'POST':
        return JsonResponse(
            {'message': 'Only POST requests are allowed',
            'success': False,
             })
    # get all the data from the POST request
    # Get the data from the formdata
    data = request.POST
    for key, value in data.items():
        print(f"{key}: {value}")
    files = request.FILES
    print(files)

    # extract the pk from versionText_{pk}
    for key, value in data.items():
        if not key.startswith('versionText'):
            continue
        version_pk = key.split('_')[1]
        try:
            version = Version.objects.get(pk=version_pk)
        except Version.DoesNotExist:
            return JsonResponse(
                {'message': 'Version does not exist',
                'success': False,
                 })
        # create a new version comment
        new_version_text = VersionText(version=version, text=value, author=request.user)
        new_version_text.save()
        print(f"new version text: {new_version_text}")
        
    # get the files for this version
    for key, value in dict(files).items():
        if not key.startswith('versionFile'):
            print(f"key {key} does not start with versionFiles")
            continue
        version_pk = key.split('_')[1]

        try:
            version = Version.objects.get(pk=version_pk)
        except Version.DoesNotExist:
            return JsonResponse(
                {'message': 'Version does not exist',
                'success': False,
                 })
        for file in value:
            # create a new version file
            new_version_file = VersionFile(version=version, version_file=file, author=request.user)
            new_version_file.save()
            print(f"new version file: {new_version_file}")
    return JsonResponse(
        {'message': 'success',
        'success': True,
         })

@login_required
def api_canvas_info_get(request, course_pk, assignment_pk):
    if request.method != 'GET':
        return JsonResponse(
            {'message': 'Only POST requests are allowed',
            'success': False,
             })
    # get the assignment
    course = get_object_or_404(Course, pk=course_pk)
    course_canvas_id = course.canvas_id
    assignment = get_object_or_404(Assignment, pk=assignment_pk)
    assignment_canvas_id = assignment.canvas_id
    assignment_submissions = PaperSubmission.objects.filter(assignment=assignment)
    assignment_graded_submissions = assignment_submissions.filter(graded_by__isnull=False)
    
    canvas_course = get_canvas_course(canvas_id=course_canvas_id)
    canvas_assignment = canvas_course.get_assignment(
        assignment_canvas_id,)
    canvas_assignment_serialized = canvas_assignment.__dict__.copy()
    canvas_assignment_serialized.pop('_requester')
    print(canvas_assignment_serialized)
    canvas_gradeable_students = canvas_assignment.get_gradeable_students()
    gradeable_students_serialized = []
    test_entries = []
    for item in canvas_gradeable_students:
        if item.__dict__.get('fake_student'):
            test_entries.append(item.__dict__.get('id'))
            continue
        gradeable_students_serialized.append(
            {'id': item.id,
            'display_name': item.display_name,
            })
    print(len(gradeable_students_serialized))
    canvas_submissions = canvas_assignment.get_submissions()
    graded_submissions_serialized = []
    ungraded_submissions_serialized = []
    for submission in canvas_submissions:
        if submission.__dict__.get('user_id') in test_entries:
            continue
        sub_dict = submission.__dict__.copy()
        sub_dict.pop('_requester')
        if submission.__dict__.get('workflow_state') == 'graded':
            graded_submissions_serialized.append(sub_dict)
        else:
            print(submission.__dict__)
            ungraded_submissions_serialized.append(sub_dict)
    print(len(graded_submissions_serialized))
    print(len(ungraded_submissions_serialized))

    context = {
        'canvas_assignment': canvas_assignment_serialized,
        'canvas_gradeable_students': gradeable_students_serialized,
        'canvas_graded_subs': graded_submissions_serialized,
        'canvas_ungraded_subs': ungraded_submissions_serialized,
        'db_assignment_name': assignment.name,
        'db_assignment_max_points': assignment.max_score,
        'db_course_student_count': len(course.get_students()),
        'db_subs': assignment_submissions.count(),
        'db_graded_subs': assignment_graded_submissions.count(),
        'message': 'success',
        'success': True,
    }
    return JsonResponse(context, safe=False)

@login_required
def version_reset(request, assignment_pk):
    # if the request is POST
    if request.method != 'POST':
        return JsonResponse(
            {'message': 'Only POST requests are allowed',
            'success': False,
             })
    try:
        # get the assignment
        assignment = get_object_or_404(Assignment, pk=assignment_pk)
        # get all the versions for this assignment and delete them
        delete_versions(assignment)
        # send a JsonResponse to the frontend with the context

        return JsonResponse(
            {'message': 'Successfully reset versions',
            'success': True,
            })
    except Exception as e:
        print(e)
        return JsonResponse(
            {'message': 'Error while resetting versions',
            'success': False,
             })

@login_required
def api_versions_get(request, assignment_pk):
    if request.method != 'GET':
        return JsonResponse(
            {'message': 'error',
            'success': False,
             }
        )
    
    assignment = get_object_or_404(Assignment, pk=assignment_pk)
    submissions = PaperSubmission.objects.filter(assignment=assignment)
    versions = Version.objects.filter(assignment=assignment)
    
    from collections import defaultdict
    version_texts = defaultdict(list)
    for version in versions:
        version_text_query = version.versiontext_set.all()
        # add text from each query
        for version_text in version_text_query:
            version_texts[str(version.pk)].append(
                {'text': version_text.text, 
                 'author': version_text.author.first_name, 
                 'date': version_text.created_at,
                 'id': version_text.id
                 })
    # serialize the version_texts
    # print(version_texts)
    # get the version_pdfs for each version
    version_files = defaultdict(list)
    for version in versions:
        version_file_query = version.versionfile_set.all()
        # add text from each query
        for version_file in version_file_query:
            version_files[str(version.pk)].append(
                {'name': version_file.get_filename(),
                 'url': version_file.version_file.url,
                'author': version_file.author.first_name, 
                'date': version_file.created_at,
                'size': version_file.get_filesize(),
                'id': version_file.id
                })
        
    assignment = model_to_dict(assignment)

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

    context = {'assignment': assignment,
        'submissions': submissions_serialized,
        'message': 'success',
        'success': True,
        'version_texts': version_texts,
        'version_pdfs': version_files
    }

    # send a JsonResponse to the frontend with the context
    return JsonResponse(context, safe=False)



@login_required
def api_delete_versiontextcomment(request, comment_pk):
    if request.method != 'DELETE':
        return JsonResponse(
            {'message': 'error',
            'success': False,
             }
        )
    try:
        comment = VersionText.objects.get(pk=comment_pk)
    except VersionText.DoesNotExist:
        return JsonResponse(
            {'message': 'VersionText does not exist',
            'success': False,
             }
        )
    comment.delete()
    return JsonResponse(
        {'message': 'success',
        'success': True,
         })

@login_required
def api_delete_versionfilecomment(request, comment_pk):
    if request.method != 'DELETE':
        return JsonResponse(
            {'message': 'error',
            'success': False,
             }
        )
    try:
        comment = VersionFile.objects.get(pk=comment_pk)
        comment.delete()
    except VersionFile.DoesNotExist:
        return JsonResponse(
            {'message': 'VersionFile does not exist',
            'success': False,
             }
        )
    except Exception as e:
        print(e)
        return JsonResponse(
            {'message': 'Error while deleting VersionFile',
            'success': False,
             }
        )
    
    return JsonResponse(
        {'message': 'success',
        'success': True,
         })

@login_required
def api_savedcomment_list_view(request, assignment_pk):
    if request.method == 'POST':
        import json

        # from the body of the request
        data = json.loads(request.body)
        print(data)
        # if modified-text is in the request data, then the user is trying to modify the text comment
    
        saved_title = data.get('title')
        saved_token = data.get('token')
        text = data.get('text')

        # get the assignment
        assignment = get_object_or_404(Assignment, pk=assignment_pk)
        # create the saved/starred comment
        max_position = SavedComment.objects.filter(assignment=assignment).aggregate(Max('position'))['position__max']
        if max_position is None:
            position = 0
        else:
            position = max_position + 1
        saved_comment = SavedComment.objects.create(
            title=saved_title,
            token=saved_token,
            assignment=assignment,
            text=text,
            position=position,
            author=request.user)
        
        saved_comment.save()

        # get the saved comments for this assignment
        saved_comments = assignment.get_all_saved_comments(requester=request.user)
        # serialize the saved comments
        saved_comments = serializers.serialize('json', saved_comments)
        # send the saved comments to the frontend
        return JsonResponse(saved_comments, safe=False)

    elif request.method == 'GET':
        # get the assignment
        assignment = get_object_or_404(Assignment, pk=assignment_pk)
        # get all the saved comments for this assignment
        saved_comments = assignment.get_all_saved_comments(requester=request.user)
        # serialize the saved comments
        saved_comments = serializers.serialize('json', saved_comments, fields=('title', 'token', 'text', 'position', 'version'))
        # send the saved comments to the frontend
        return JsonResponse(saved_comments, safe=False, status=200)
    else:
        return JsonResponse({'message': 'failure'})

@login_required
def api_savedcomment_detail_view(request, assignment_pk, savedcomment_pk):
    if request.method == 'GET':
        # get the saved comment
        saved_comment = get_object_or_404(SavedComment, pk=savedcomment_pk)
        # serialize the saved comment
        saved_comment = serializers.serialize('json', [saved_comment])
        # send the saved comment to the frontend
        return JsonResponse(saved_comment, safe=False, status=200)
    elif request.method == 'PUT':
        # get the saved comment
        saved_comment = get_object_or_404(SavedComment, pk=savedcomment_pk)
        # get the data from the request
        data = json.loads(request.body)
        # update the saved comment
        saved_comment.title = data.get('title')
        saved_comment.text = data.get('text')
        saved_comment.token = data.get('token')
        saved_comment.save()
        # serialize the saved comment
        saved_comment = serializers.serialize('json', [saved_comment])
        # send the saved comment to the frontend
        return JsonResponse(saved_comment, safe=False, status=200)
    elif request.method == 'PATCH':
        # get the saved comment
        saved_comment = get_object_or_404(SavedComment, pk=savedcomment_pk)
        # get the data from the request
        data = json.loads(request.body)
        # update the saved comment
        saved_comment.position = int(data.get('position'))
        saved_comment.save()
        # serialize the saved comment
        saved_comment = serializers.serialize('json', [saved_comment])
        # send the saved comment to the frontend
        return JsonResponse(saved_comment, safe=False, status=200)
    elif request.method == 'DELETE':
        # get the saved comment
        saved_comment = get_object_or_404(SavedComment, pk=savedcomment_pk)
        # delete the saved comment
        saved_comment.delete()
        # send a success message
        return JsonResponse({'message': 'success'}, status=200)
    else:
        return JsonResponse({'message': 'failure'})