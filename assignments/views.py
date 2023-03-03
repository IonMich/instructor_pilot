from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
# Create your views here.
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from courses.models import Course
from submissions.forms import (StudentClassifyForm, SubmissionFilesUploadForm,
                               SubmissionSearchForm, SyncFromForm, SyncToForm)
from submissions.models import PaperSubmission, PaperSubmissionImage, SubmissionComment
from submissions.views import _random1000

from .models import Assignment, Version, VersionFile, VersionText

from submissions.cluster import (crop_and_ocr, crop_images_to_text, vectorize_texts, perform_dbscan_clustering, plot_clusters_dbscan)

from django.core.files.storage import FileSystemStorage
import os
from django.conf import settings
from django.forms.models import model_to_dict
from django.core import serializers
import numpy as np
import json
from django.core.files.uploadedfile import InMemoryUploadedFile
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
        'course_pk': course_pk,
        'assignment_pk': assignment_pk,
        })


@login_required
def cluster_view(request, course_pk, assignment_pk):
    # if the request is POST, then cluster the submissions
    if request.method == 'POST':
        assignment = get_object_or_404(Assignment, pk=assignment_pk)
        # select submissions to cluster from model submissions.PaperSubmission
        # get the submissions from the database
        submissions = PaperSubmission.objects.filter(assignment=assignment)
        # submissions_image = PaperSubmissionImage.objects.filter(submission__in=submissions, page=3)
        # get the items in the field
        images = []
        for submission in submissions:
            submission_image = PaperSubmissionImage.objects.filter(submission=submission, page=3)
            images.append(submission_image[0].image.url)

        # use the crop_images_to_text function to get the text from the images
        texts = crop_images_to_text(images)

        # vectorize the text
        print("vectorizing texts")
        X = vectorize_texts(texts)
        # cluster the text
        print("clustering images")
        dbscan, cluster_labels = perform_dbscan_clustering(X)
        # add the cluster labels to the database
        for i, submission in enumerate(submissions):
            cluster_labels[i] += 1
            submission.version = cluster_labels[i]
            submission.save()

        # renew the submissions_image queryset after the above changes
        submissions = PaperSubmission.objects.filter(assignment=assignment)
        # submissions_image = PaperSubmissionImage.objects.filter(submission__in=submissions, page=3)

        # get the images for each cluster
        cluster_types = len(set(cluster_labels))
        # separate out the outliers
        if 0 in cluster_labels:
            cluster_types -= 1
        cluster_images = [0]*cluster_types
        for submission in submissions:
            for i in range(cluster_types):
                if int(submission.version) == (i+1) and cluster_images[i] == 0:
                    # get the image url from the submission's associated PaperSubmissionImage with page=3
                    paperSubmission = PaperSubmissionImage.objects.filter(submission=submission, page=3)
                    cluster_images[i] = paperSubmission[0].image.url
                    break
        # context
        context = {'assignment': assignment, 'submissions': submissions, 
        'cluster_labels': cluster_labels, 
        'cluster_images': cluster_images, 'course_pk': course_pk, 'assignment_pk': assignment_pk}
        
        return render(request, 'assignments/cluster.html', context)
    
    # send the user to the assignment detail page
    return redirect('assignments:detail', course_pk=course_pk, assignment_pk=assignment_pk)


@login_required
def cluster_submission(request, course_pk, assignment_pk):
    # if the request is POST
    if request.method == 'POST':
        print("request was POST")
        # get the assignment
        assignment = get_object_or_404(Assignment, pk=assignment_pk)
        # get all the data from the POST request
        data = request.POST
        # convert this queryDict data to a dictionary
        data = data.dict()
        # keep track of uploaded comment files
        loaded_files = []
        
        # get the submissions from the database
        submissions = PaperSubmission.objects.filter(assignment=assignment)
        # submissions_image = PaperSubmissionImage.objects.filter(submission__in=submissions, page=3)
        # get the each of the submissions
        for submission in submissions:
            # get the cluster label for this submission
            version = submission.version
            if int(version) != 0:
                # get the text for this cluster
                text = data['clusterText1-'+str(version)].strip()
                if text != "":
                    # create a new submission comment
                    submission_comment = SubmissionComment(paper_submission=submission, text=text, author=request.user)
                    submission_comment.save()
                
                # get files for this version
                if request.FILES.get('clusterFile-'+str(version)):
                    # set up the file system storage
                    new_comment_file_dir_in_media = os.path.join("submissions", 
                    f"course_{submission.assignment.course.pk}", 
                    f"assignment_{submission.assignment.pk}",
                    "comment")
                    new_comment_file_dir = os.path.join(
                        settings.MEDIA_ROOT, 
                        new_comment_file_dir_in_media)

                    if not os.path.exists(new_comment_file_dir):
                        os.makedirs(new_comment_file_dir)
                    # add this as comment file for this submission
                    files = request.FILES.getlist('clusterFile-'+str(version))
                    for file in files:
                        if file.name not in loaded_files:
                            loaded_files.append(file.name)
                            FileSystemStorage(location=new_comment_file_dir).save(file.name, file)
                            # copy file to new location, while keeping the original name
                        new_file_path_in_media = os.path.join(
                            new_comment_file_dir_in_media,
                            file.name,
                        )
                            
                        # add this to the database
                        new_comment_file = SubmissionComment.objects.create(
                            paper_submission=submission,
                            comment_file=new_file_path_in_media,
                            author=request.user,
                            )
                        new_comment_file.save()
                        
                    # SubmissionComment.add_commentfiles_to_db(
                    # submission_target=submission,
                    # uploaded_files=files,
                    # author=request.user)

        
    return redirect('assignments:detail', course_pk=course_pk, assignment_pk=assignment_pk)

@login_required
def version_view(request, course_pk, assignment_pk):
    # if the request is POST, then cluster the submissions
    if request.method == 'POST':
        assignment = get_object_or_404(Assignment, pk=assignment_pk)
        # select submissions to cluster from model submissions.PaperSubmission
        # get the submissions from the database
        submissions = PaperSubmission.objects.filter(assignment=assignment)
        # submissions_image = PaperSubmissionImage.objects.filter(submission__in=submissions, page=3)
        # get the items in the field
        images = []
        for submission in submissions:
            submission_image = PaperSubmissionImage.objects.filter(submission=submission, page=3)
            images.append(submission_image[0].image.url)

        # use the crop_images_to_text function to get the text from the images
        texts = crop_images_to_text(images)

        # vectorize the text
        print("vectorizing texts")
        X = vectorize_texts(texts)
        # cluster the text
        print("clustering images")
        dbscan, cluster_labels = perform_dbscan_clustering(X)
        # add the cluster labels to the database
        for i, submission in enumerate(submissions):
            cluster_labels[i] += 1
            submission.version = cluster_labels[i]
            submission.save()

        # renew the submissions_image queryset after the above changes
        submissions = PaperSubmission.objects.filter(assignment=assignment)
        # submissions_image = PaperSubmissionImage.objects.filter(submission__in=submissions, page=3)

        # get the images for each cluster
        cluster_types = len(set(cluster_labels))
        # separate out the outliers
        if 0 in cluster_labels:
            cluster_types -= 1
        cluster_images = [0]*cluster_types
        for submission in submissions:
            for i in range(cluster_types):
                if int(submission.version) == (i+1) and cluster_images[i] == 0:
                    # get the image url from the submission's associated PaperSubmissionImage with page=3
                    paperSubmission = PaperSubmissionImage.objects.filter(submission=submission, page=3)
                    cluster_images[i] = paperSubmission[0].image.url
                    break

        # make the corresponding assignment versions
        for i in range(1, cluster_types + 1):
            # create a new version
            # retrieve the image url from the cluster_images list and remove the first meida/ from the string
            path_to_image = cluster_images[i-1].replace("/media", "")
            new_version = Version(assignment=assignment, name=str(i), versions=str(cluster_types), versionImage=path_to_image)
            new_version.save()
        # set the assignment versioned field to true
        assignment.versioned = True
        assignment.save()

        # count number of 0 in cluster_labels
        outliers = np.count_nonzero(cluster_labels == 0)
        assignment = model_to_dict(assignment)

        submissions = serializers.serialize('json', submissions)
        # context
        context = {'assignment': assignment,
        'cluster_types' : cluster_types,
        'outliers': outliers,
        'submissions': submissions, 
        # 'cluster_labels': cluster_labels, 
        'cluster_images': list(cluster_images), 
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
        
        # keep track of uploaded comment files
        loaded_files = []

        """
        
        # get the submissions from the database
        submissions = PaperSubmission.objects.filter(assignment=assignment)
        # submissions_image = PaperSubmissionImage.objects.filter(submission__in=submissions, page=3)
        # get the each of the submissions
        for submission in submissions:
            # get the cluster label for this submission
            version = submission.version
            if int(version) != 0:
                # get the text for this cluster
                # text = data['versionText'+str(version)].strip()
                text = version_texts[int(version) - 1].strip()
                if text != "":
                    # create a new submission comment
                    submission_comment = SubmissionComment(paper_submission=submission, text=text, author=request.user)
                    submission_comment.save()
                
                if request.FILES.get('versionFiles' + str(version)):
                    # set up the file system storage
                    new_comment_file_dir_in_media = os.path.join("submissions", 
                    f"course_{submission.assignment.course.pk}", 
                    f"assignment_{submission.assignment.pk}",
                    "comment")
                    new_comment_file_dir = os.path.join(
                        settings.MEDIA_ROOT, 
                        new_comment_file_dir_in_media)

                    if not os.path.exists(new_comment_file_dir):
                        os.makedirs(new_comment_file_dir)
                    # add this as comment file for this submission
                    files = request.FILES.getlist('versionFiles' + str(version))
                    for file in files:
                        if isinstance(file, InMemoryUploadedFile):
                            if file.name not in loaded_files: 
                                loaded_files.append(file.name)
                                FileSystemStorage(location=new_comment_file_dir).save(file.name, file)
                                # copy file to new location, while keeping the original name
                            new_file_path_in_media = os.path.join(
                                new_comment_file_dir_in_media,
                                file.name,
                            )
                                
                            # add this to the database
                            new_comment_file = SubmissionComment.objects.create(
                                paper_submission=submission,
                                comment_file=new_file_path_in_media,
                                author=request.user,
                                )
                            new_comment_file.save()
                        else:
                            return JsonResponse({'message': 'error'})
                            """
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
                # set up the file system storage
                new_comment_file_dir_in_media = os.path.join("submissions", 
                f"course_{version.assignment.course.pk}", 
                f"assignment_{version.assignment.pk}",
                "comment")
                new_comment_file_dir = os.path.join(
                    settings.MEDIA_ROOT, 
                    new_comment_file_dir_in_media)

                if not os.path.exists(new_comment_file_dir):
                    os.makedirs(new_comment_file_dir)
                # add this as comment file for this submission
                files = request.FILES.getlist('versionFiles' + str(version.name))
                for file in files:
                    if isinstance(file, InMemoryUploadedFile):
                        if file.name not in loaded_files: 
                            print(file.name)
                            loaded_files.append(file.name)
                            FileSystemStorage(location=new_comment_file_dir).save(file.name, file)
                            # copy file to new location, while keeping the original name
                        new_file_path_in_media = os.path.join(
                            new_comment_file_dir_in_media,
                            file.name,
                        )
                            
                        # add this to the database
                        new_version_file = VersionFile.objects.create(
                            version=version,
                            pdf=new_file_path_in_media,
                            author=request.user,
                            )
                        new_version_file.save()
                    else:
                        print("file was not an InMemoryUploadedFile")
                
        
    return JsonResponse({'message': 'success'})

@login_required
def version_reset(request, course_pk, assignment_pk):
    # if the request is POST
    if request.method == 'POST':
        # get the assignment
        assignment = get_object_or_404(Assignment, pk=assignment_pk)
        # get all the submissions for this assignment
        submissions = PaperSubmission.objects.filter(assignment=assignment)
        # for each submission, set the version to 0
        for submission in submissions:
            submission.version = None
            submission.save()
        # set the assignment versioned field to false
        assignment.versioned = False
        assignment.save()
        # delete all the versions for this assignment
        versions = Version.objects.filter(assignment=assignment)
        # delete all the version texts for this assignment
        version_texts = VersionText.objects.filter(version__in=versions)
        version_texts.delete()
        # delete all the version pdfs for this assignment
        version_pdfs = VersionFile.objects.filter(version__in=versions)
        # delete all the associated files
        for version_pdf in version_pdfs:
            os.remove(os.path.join(settings.MEDIA_ROOT, version_pdf.pdf.name))
        version_pdfs.delete()
        # delete all the versions for this assignment
        versions.delete()
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
            cluster_images.append(version.versionImage.url)
        # get the cluster_types
        cluster_types = len(versions)
        # get the outliers by getting the submissions with their version set to 0
        outliers = PaperSubmission.objects.filter(assignment=assignment, version=0)
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
        version_pdfs = defaultdict(list)
        for version in versions:
            version_pdf_query = version.versionpdf_set.all()
            # add text from each query
            for version_pdf in version_pdf_query:
                version_pdfs[version.name].append({'name': version_pdf.get_filename(),'url': version_pdf.pdf.url,
                                                    'author': version_pdf.author.first_name, 'date': version_pdf.created_at,
                                                    'size': version_pdf.get_filesize(),
                                                    'id': version_pdf.id
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
        'version_pdfs': version_pdfs
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
            os.remove(os.path.join(settings.MEDIA_ROOT, comment.pdf.name))
            # delete the comment
            comment.delete()
        
        return JsonResponse({'message': 'success'})
    return JsonResponse({'message': 'error'})