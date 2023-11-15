import json
import os

import numpy as np
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.core import serializers
from django.core.files.base import ContentFile
from django.db.models import Max
from django.forms.models import model_to_dict
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from courses.models import Course
from submissions.cluster import (crop_and_ocr, crop_images_to_text,
                                 perform_dbscan_clustering,
                                 plot_clusters_dbscan, vectorize_texts)
from submissions.forms import (StudentClassifyForm, SubmissionFilesUploadForm,
                               SubmissionSearchForm, SyncFromForm, SyncToForm)
from submissions.models import (PaperSubmission, PaperSubmissionImage,
                                SubmissionComment)
from submissions.views import _random1000

from .models import Assignment, SavedComment, Version, VersionFile, VersionText
from .utils import delete_versions

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
                    print("An error occured while syncing submissions to canvas")
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
    if request.method == 'POST':
        page = 3
        assignment = get_object_or_404(Assignment, pk=assignment_pk)
        # select submissions to cluster from model submissions.PaperSubmission
        # get the submissions from the database
        submissions = PaperSubmission.objects.filter(assignment=assignment)
        # submissions_image = PaperSubmissionImage.objects.filter(submission__in=submissions, page=3)
        # get the items in the field
        images = []
        for submission in submissions:
            submission_image = PaperSubmissionImage.objects.filter(submission=submission, page=page)
            images.append(submission_image[0].image.path)

        # use the crop_images_to_text function to get the text from the images
        texts = crop_images_to_text(images)

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
                submission_image = PaperSubmissionImage.objects.filter(submission=submission, page=page)
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
        submissions = serializers.serialize('json', submissions)
        # context
        context = {'assignment': assignment,
        'cluster_types' : len_cluster_types,
        'outliers': outliers,
        'submissions': submissions, 
        # 'cluster_labels': cluster_labels, 
        'cluster_images': cluster_images, 
        # 'course_pk': course_pk, 'assignment_pk': assignment_pk
        'message': 'success',
        'new_version': 'true'
        }

        # send a JsonResponse to the frontend with the context
        return JsonResponse(context, safe=False)
    
    # send the user to the assignment detail page
    return redirect('assignments:detail', course_pk=course_pk, assignment_pk=assignment_pk)


@login_required
def version_submission(request, course_pk, assignment_pk):
    print("version_submission called")
    # if the request is POST
    if request.method == 'POST':
        print("request was POST")
        # get the assignment
        assignment = get_object_or_404(Assignment, pk=assignment_pk)
        # get all the data from the POST request
        # Get the data from the form
        version_texts = request.POST.getlist('versionTexts')
        
    

        # find all the versions for this assignment
        versions = Version.objects.filter(assignment=assignment)
        # for each version, put the text and files into the version
        for version in versions:
            # get the text for this version
            text = version_texts[int(version.name) - 1].strip()
            if text != "":
                # create a new version comment
                new_version_text = VersionText(version=version, text=text, author=request.user)
                new_version_text.save()
            # get the files for this version
            if request.FILES.get('versionFiles' + str(version.name)):
                # add this as comment file for this submission
                files = request.FILES.getlist('versionFiles' + str(version.name))
                for file in files:
                    file_bytes = file.read()
                    file_name = file.name
                    django_file = ContentFile(file_bytes, name=file_name)
                    new_version_file = VersionFile.objects.create(
                        version=version,
                        version_file=django_file,
                        author=request.user,
                        )
                    print(f"File {new_version_file} added to media for version {version}")
                    
                
        
    return JsonResponse({'message': 'success'})

@login_required
def version_reset(request, course_pk, assignment_pk):
    # if the request is POST
    if request.method == 'POST':
        # get the assignment
        assignment = get_object_or_404(Assignment, pk=assignment_pk)
        # get all the versions for this assignment and delete them
        delete_versions(assignment)
        # send a JsonResponse to the frontend with the context

        return JsonResponse({'message': 'success'})
    # send the user to the assignment detail page
    return redirect('assignments:detail', course_pk=course_pk, assignment_pk=assignment_pk)


@login_required
def version_change(request, course_pk, assignment_pk):
    # if the request is POST
    if request.method == 'POST':
        # get the assignment
        assignment = get_object_or_404(Assignment, pk=assignment_pk)
        # get the submissions for this assignment
        submissions = PaperSubmission.objects.filter(assignment=assignment)
        # get all the versions for this assignment
        versions = Version.objects.filter(assignment=assignment)
        # get the cluster_images
        cluster_images = []
        for version in versions:
            cluster_images.append(version.version_image.url)
        # get the cluster_types
        cluster_types = len(versions)
        # get the outliers by getting the submissions with their version set to 0
        outliers = PaperSubmission.objects.filter(assignment=assignment, version=None)
        outliers = len(outliers)
        # get the version_texts for each version
        from collections import defaultdict
        version_texts = defaultdict(list)
        for version in versions:
            version_text_query = version.versiontext_set.all()
            # add text from each query
            for version_text in version_text_query:
                version_texts[version.name].append({'text': version_text.text, 
                                                    'author': version_text.author.first_name, 'date': version_text.created_at,
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
                version_files[version.name].append({'name': version_file.get_filename(),'url': version_file.version_file.url,
                                                    'author': version_file.author.first_name, 'date': version_file.created_at,
                                                    'size': version_file.get_filesize(),
                                                    'id': version_file.id
                                                    })
            


        assignment = model_to_dict(assignment)

        submissions = serializers.serialize('json', submissions)

        context = {'assignment': assignment,
        'cluster_types' : cluster_types,
        'outliers': outliers,
        'submissions': submissions,  
        'cluster_images': list(cluster_images), 
        'message': 'success',
        'new_version': 'false',
        'version_texts': version_texts,
        'version_pdfs': version_files
        }

        # send a JsonResponse to the frontend with the context
        return JsonResponse(context, safe=False)
    # send the user to the assignment detail page
    return redirect('assignments:detail', course_pk=course_pk, assignment_pk=assignment_pk)


@login_required
def delete_comment(request, course_pk, assignment_pk):
    if request.method == 'POST':
        # get all the data from the request
        data = json.loads(request.body)
        # get the type of comment
        comment_type = data['comment_type']

        # get the comment id
        comment_id = data['comment_id']
        # get the comment
        if comment_type == 'text':
            comment = get_object_or_404(VersionText, pk=comment_id)
            # delete the comment from the database
            comment.delete()
        elif comment_type == 'pdf':
            comment = get_object_or_404(VersionFile, pk=comment_id)
            # delete the associated file
            os.remove(os.path.join(settings.MEDIA_ROOT, comment.version_file.name))
            # delete the comment
            comment.delete()
        
        return JsonResponse({'message': 'success'})
    return JsonResponse({'message': 'error'})

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