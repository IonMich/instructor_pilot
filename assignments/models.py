import os
import shutil
import tempfile
import uuid

from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.urls import reverse

from courses.models import Course
from courses.utils import get_canvas_course, get_canvas_object
from courses.views import course_detail_view
from submissions.utils import CommaSeparatedFloatField

# Create your models here.

class Assignment(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    start_date = models.DateField(
        null=True,
        blank=True)
    due_date = models.DateField(
        null=True,
        blank=True)
        
    ready_by = models.DateField(
        null=True,
        blank=True)
    max_score = models.FloatField(null=True, blank=True)
    number_of_questions = models.IntegerField(null=True, blank=True)
    max_question_scores = CommaSeparatedFloatField(
        max_length=200,
        null=True,
        blank=True)
    assignment_group = models.CharField(
        max_length=100,
        null=True,
        blank=True)
    course = models.ForeignKey(
        Course, 
        on_delete=models.CASCADE,
        related_name="assignments")
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    canvas_id = models.CharField(
        max_length=100,
        null=True,
        blank=True)
    
    # define a field to store whether versioning has been done or not
    versioned = models.BooleanField(default=False, null=True, blank=True)

    def get_long_name(self):
        """Returns the name of the assignment with the name of the course."""
        return f"{self.course.course_code} {self.course.term} - {self.name}"

    def get_max_question_scores(self):
        return self.max_question_scores.split(",")

    def get_graders(self):
        return self.course.instructors.all()

    def has_equal_question_scores(self):
        return len(set(self.get_max_question_scores())) == 1

    def __str__(self):
        return f"{self.name}"

    def get_absolute_url(self):
        return reverse(
            "assignments:detail",
            kwargs={
                "course_pk": self.course.pk,
                "assignment_pk": self.pk})

    def save(self, *args, **kwargs):
        q_max_grades = self.get_max_question_scores()
        self.number_of_questions = len(q_max_grades)
        self.max_score = sum(float(g) for g in q_max_grades)
        return super().save(*args, **kwargs)

    def get_all_submissions(self):
        return self.submissions_papersubmission_related.all()

    def count_submissions_no_students(self):
        return self.get_all_submissions().filter(student__isnull=True).count()

    def count_submissions_no_sync(self):
        return self.get_all_submissions().filter(canvas_id__isnull=True).count()

    def get_all_saved_comments(self, requester):
        from submissions.models import SubmissionComment
        return SubmissionComment.objects.filter(
            paper_submission__assignment=self,
            is_saved=True,
            author=requester)

    def get_grading_progress(self):
        """Returns the grading progress of the assignment as a percentage."""
        submissions = self.get_all_submissions()
        graded_submissions_count = submissions.filter(
            graded_by__isnull=False).count()
        if submissions.count() == 0:
            return 0
        return round(100 * graded_submissions_count / submissions.count(), 2)

    def get_average_grade(self, section=None):
        """Returns the average grade of the assignment."""
        submissions = self.get_all_submissions()
        if section is not None:
            submissions = submissions.filter(student__section=section)
        """Returns the average grade of the assignment based only 
        on the grades of the submissions that have been graded.
        """
        submissions = self.get_all_submissions()
        graded_submissions = submissions.filter(graded_by__isnull=False)
        if graded_submissions.count() == 0:
            return 0
        grades = [s.grade for s in graded_submissions]
        return round(sum(grades) / len(grades), 2)

    def get_all_grades(self):
        """Returns the grades of all submissions of the assignment."""
        return [s.grade for s in self.get_all_submissions().filter(graded_by__isnull=False)]

    @classmethod
    def update_from_canvas(
        cls, 
        course, canvas_course,
        ):
        # I should probably rename to bulk_update_from_canvas 
        course_assignments = course.assignments.all()
        canvas_assignment_groups = canvas_course.get_assignment_groups(
            include=["assignments", "submission", "score_statistics", "overrides"]
            )
        
        for canvas_assignment_group in canvas_assignment_groups:
            for canvas_assignment in canvas_assignment_group.assignments:
                print(canvas_assignment["name"])
                print(canvas_assignment["points_possible"], type(canvas_assignment["points_possible"]))
                if canvas_assignment["points_possible"] in [None, "", 0]:
                    max_question_scores = "0"
                else:
                    max_question_scores = str(canvas_assignment["points_possible"])
                    
                
                if str(canvas_assignment["id"]) in [a.canvas_id for a in course_assignments]:
                    assignment = course_assignments.get(canvas_id=str(canvas_assignment["id"]))
                    assignment.name = canvas_assignment["name"]
                    assignment.description = canvas_assignment["description"]
                    assignment.assignment_group = canvas_assignment_group.name    
                    if assignment.max_question_scores is None or assignment.max_question_scores == "":
                        assignment.max_question_scores = max_question_scores
                    elif assignment.max_question_scores != max_question_scores:
                        # The max grades per question have been changed manually
                        # In order to avoid losing the grades of the submissions,
                        # check if any submission has been graded. If so, do not update the grades per question.
                        if assignment.get_all_submissions().filter(graded_by__isnull=False).count() == 0:
                            assignment.max_question_scores = max_question_scores
                            print("The grades per question have changed, because there are no graded submissions.")
                        else:
                            print("The grades per question have changed, but there are submissions that have been graded. The grades per question will not be updated.")
                else:
                    assignment = cls.objects.create(
                        name=canvas_assignment["name"],
                        description=canvas_assignment["description"],
                        assignment_group=canvas_assignment_group.name,
                        course=course,
                        canvas_id=str(canvas_assignment["id"]),
                        max_question_scores=max_question_scores,
                        )

                assignment.save()

        return course_assignments

    def sync_labeled_submissions_from_canvas(self):
        """Adds the canvas_id of the corresponding canvas 
        submission to the submission object, based on the 
        student's canvas_id and the assignment's canvas_id.
        """
        canvas_course = get_canvas_course(canvas_id=self.course.canvas_id)
        canvas_assignment = canvas_course.get_assignment(
            self.canvas_id)
        canvas_submissions = canvas_assignment.get_submissions(
                include=["submission_comments", "user"]
                )
        for canvas_submission in canvas_submissions:
            if canvas_submission.user["sis_user_id"] is None:
                continue
            try:
                submission = self.submissions_papersubmission_related.get(
                    student__canvas_id=canvas_submission.user["id"])
                print(f"Found submission in database for student with canvas_id: {canvas_submission.user['name']}")
            except self.submissions_papersubmission_related.model.DoesNotExist:
                print(f"No submission found in database for student with canvas_id: {canvas_submission.user['name']}")
                continue
            submission.canvas_id = canvas_submission.id
            submission.canvas_url = canvas_submission.preview_url
            submission.save()


    def upload_graded_submissions_to_canvas(self, 
            submission_sync_option,
            comment_sync_option,
            request_user,
            specific_submissions=None,
    ):
        """Uploads the grades and comments of the submissions to canvas.

        Options to in the SyncToForm:
        A select form field to choose the set of submissions to sync:
        - upload all locally graded submissions or, 
        - only graded locally submissions that are not graded on canvas.
        - a specific selection of submissions. This would require a
          multiple select form field.

        A select form field to choose the comment syncing behavior:
        - upload all locally saved comments as new comments on canvas, or
        - upload all locally saved comments as new comments on canvas, 
          but delete all previously uploaded comments on the canvas 
          submission posted by the current user, or
        - upload only comments that are not on canvas. This requires
          a check for each comment if it is already on canvas which
          means that we need to get the canvas_id of the comment when
          we upload it to canvas. This is not implemented yet.

        for these two form fields, we use as parameters here:
        - submission_sync_option
        - comment_sync_option

        submission_sync_option = forms.ChoiceField(
        choices=(
            ('all', 'Upload all locally graded submissions'),
            ('grade_not_on_canvas', 'Upload only locally graded submissions that are not graded on canvas'),
            ('specific', 'Upload a specific selection of submissions'),
            ),
        )
        # Now fot the submissions determined by submission_sync_option,
        # we also specify the comment_sync_option: 
        comment_sync_option = forms.ChoiceField(
            choices=(
                ('all', 'Upload all locally saved comments as new comments on canvas'),
                ('delete_previous', 'Upload all locally saved comments as new comments on canvas, but delete all previously uploaded comments on the canvas submission posted by the current user'),
                ('comment_not_on_canvas', 'Upload only comments that are not on canvas'),
                ),
            )
        """
        # raise ValueError("This error is raised as a final safety measure to prevent accidental uploads of grades to canvas. Comment out this line from assignments.models.upload_graded_submissions_to_canvas to enable the upload.")
        canvas_course = get_canvas_course(canvas_id=self.course.canvas_id)
        canvas_assignment = canvas_course.get_assignment(
            self.canvas_id)
        canvas_submissions = canvas_assignment.get_submissions(
                include=["submission_comments", "user"]
                )
        for canvas_submission in canvas_submissions:
            if canvas_submission.user["sis_user_id"] is None:
                continue
            try:
                submission = self.submissions_papersubmission_related.get(
                    canvas_id=canvas_submission.id)
                print(f"Found submission in database for {canvas_submission.user['name']}")
            except self.submissions_papersubmission_related.model.DoesNotExist:
                print(f"No submission found in database for {canvas_submission.user['name']}")
                continue
            if submission.grade is None:
                print(f"Will not upload submission without grade for {canvas_submission.user['name']}")
                continue
            if submission_sync_option == "grade_not_on_canvas" and canvas_submission.score is not None:
                print(f"Will not upload grade for {canvas_submission.user['name']} because it is already on canvas.")
                continue
            if submission_sync_option == "specific" and submission not in specific_submissions:
                print(f"Will not upload grade for {canvas_submission.user['name']} because it is not in the specific selection.")
                continue
            
            for comment in submission.submissions_submissioncomment_related.all():
                print(f'Comment: {comment.text}')

            # upload the grade and a comment with the question grades to canvas
            score = submission.grade
            new_question_grades_comment = ""
            for idx, question_grade in enumerate(submission.get_question_grades()):
                new_question_grades_comment += f"Question {idx+1} Grade: {question_grade}\n"
            print(f'Student grade: {score}')
            print(f'Question grades comment: {new_question_grades_comment}')

            # get or create the grade comment for this submission
            grade_comment = submission.submissions_submissioncomment_related.filter(
                is_grade_summary=True,
                author=request_user,
                ).first()
            if grade_comment is None:
                grade_comment = submission.submissions_submissioncomment_related.create(
                    is_grade_summary=True,
                    author=request_user,
                    text=new_question_grades_comment,
                    )
            else:
                grade_comment.text = new_question_grades_comment
                grade_comment.save()

            uploaded_canvas_submission = canvas_submission.edit(submission={
                'posted_grade': score},
                comment= 
                    {"text_comment":new_question_grades_comment,
                    },
                )

            # find the canvas_comment_id from the newly edited submission
            canvas_comment_id = uploaded_canvas_submission.submission_comments[-1]['id']
            grade_comment.canvas_id = canvas_comment_id
            grade_comment.save()

            print(f"Uploaded grade and grade comment for {canvas_submission.user['name']}")

            for comment in submission.submissions_submissioncomment_related.all():
                if comment.is_grade_summary:
                    continue
                # if the comment contains a file, we upload the file to canvas
                # if the comment does not contain a file, we upload the comment text to canvas

                # if the comment's author is not the current user, we skip it
                # because we only want to upload comments that were created by the current user
                if comment.author != request_user:
                    print(f"Will not upload the following comment by {comment.author} because "
                            f"it was not created by the current user:\n"
                            f"{comment.text}")
                    continue

                if not comment.comment_file:
                    print(f'Comment: {comment.text}')
                    canvas_submission.edit(comment={
                            "text_comment": comment.text,
                        },
                    )
                else:
                    print(f'Comment file: {comment.comment_file}')
                    new_file_name = comment.get_filename()
                    tmp_folder_path = os.path.join(settings.BASE_DIR, "tmp")
                    if not os.path.exists(tmp_folder_path):
                        os.makedirs(tmp_folder_path)
                    with tempfile.TemporaryDirectory(dir=tmp_folder_path) as tmp_dir:
                        tmp_file_path = os.path.join(tmp_dir, new_file_name)
                        shutil.copyfile(comment.comment_file.path, tmp_file_path)

                        uploaded = canvas_submission.upload_comment(
                            file=tmp_file_path,
                        )
                        if uploaded:
                            print(f"Uploaded file comment to canvas for {canvas_submission.user['name']}")

            print(f'Submission comment file url: {submission.pdf}')
            
            new_file_name = f"submission_{submission.student.first_name}_{submission.student.last_name}.pdf"
            tmp_folder_path = os.path.join(settings.BASE_DIR, "tmp")
            if not os.path.exists(tmp_folder_path):
                os.makedirs(tmp_folder_path)
            with tempfile.TemporaryDirectory(dir=tmp_folder_path) as tmp_dir:
                tmp_file_path = os.path.join(tmp_dir, new_file_name)
                shutil.copyfile(submission.pdf.path, tmp_file_path)

                uploaded = canvas_submission.upload_comment(
                    file=tmp_file_path,
                )
                if uploaded:
                    print(f"Uploaded file comment to canvas for {canvas_submission.user['name']}")

            # get the version comments for this submission
            # if something goes wrong, we continue to the next submission
                
            submission_version = submission.version
            if not submission_version:
                print(f"Coud not find submission version for {canvas_submission.user['name']}")
                continue
    
                
            version_text_comments = submission_version.versiontext_set.filter(
                author=request_user,
            )
            version_file_comments = submission_version.versionfile_set.filter(
                author=request_user,
            )
            for comment in version_text_comments:
                print(f'Comment: {comment.text}')
                canvas_submission.edit(comment={
                        "text_comment": comment.text,
                    },
                )
            for comment in version_file_comments:
                print(f'Comment file: {comment.version_file}')
                new_file_name = comment.get_filename()
                tmp_folder_path = os.path.join(settings.BASE_DIR, "tmp")
                if not os.path.exists(tmp_folder_path):
                    os.makedirs(tmp_folder_path)
                with tempfile.TemporaryDirectory(dir=tmp_folder_path) as tmp_dir:
                    tmp_file_path = os.path.join(tmp_dir, new_file_name)
                    shutil.copyfile(comment.version_file.path, tmp_file_path)

                    uploaded = canvas_submission.upload_comment(
                        file=tmp_file_path,
                    )
                    if uploaded:
                        print(f"Uploaded file comment to canvas for {canvas_submission.user['name']}")
            
            

class Version(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # add a field to store the image to determine the version
    version_image = models.ImageField(upload_to='assignments/versions/', null=True, blank=True)

class VersionFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version_file = models.FileField(upload_to='assignments/versions/', null=True, blank=True)
    version = models.ForeignKey(Version, on_delete=models.CASCADE)
    author = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    def get_filename(self):
        return os.path.basename(self.version_file.name)
    
    def get_filesize(self):
        size = os.path.getsize(self.version_file.path)
        if size < 1024:
            return f"{size} B"
        elif size < 1024**2:
            return f"{size/1024:.1f} KB"
        elif size < 1024**3:
            return f"{size/1024**2:.1f} MB"
        else:
            return f"{size/1024**3:.1f} GB"

class VersionText(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    text = models.TextField()
    version = models.ForeignKey(Version, on_delete=models.CASCADE)
    author = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

            

            
        

    
