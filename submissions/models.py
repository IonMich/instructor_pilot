import os
import random
import string
import uuid

from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.db import models
from django.db.models import Max
from django.urls import reverse
from django.utils import timezone
from PIL import Image

from assignments.models import Assignment, Version
from students.models import Student
from submissions.digits_classify import (classify, import_students_from_db,
                                         import_onnx_model)
from submissions.utils import (CommaSeparatedFloatField, convert_pdf_to_images,
                               get_quiz_pdf_path, open_UploadedFile_as_PDF,
                               submission_image_upload_to,
                               submission_upload_to)

# Create your models here.

class Submission(models.Model):
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False)
    
    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_related",
        related_query_name="%(app_label)s_%(class)ss", null=True,
        blank=True)
        
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_related",
        related_query_name="%(app_label)s_%(class)ss",
        null=True,
        blank=True)

    attempt = models.IntegerField(default=1)

    grade = models.FloatField(null=True, blank=True)

    question_grades = CommaSeparatedFloatField(
        max_length=200,
        null=True,
        blank=True)

    def get_question_grades(self):
        if self.question_grades is None:
            return []
        return self.question_grades.split(",")

    def set_question_grades(self, grades):
        print(grades)
        self.question_grades = ",".join(grades)
        print(self.question_grades)
        self.save()

    def summarize_question_grades(self):
        "return a list of strings summarizing the question grades"
        q_grades = self.get_question_grades()
        q_grades = [float(g) for g in q_grades]
        q_grades = [f"{g}/{max_g}" for g, max_g in zip(q_grades, self.assignment.max_question_scores)]

        return q_grades
        
    graded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_graded_by",
        related_query_name="%(app_label)s_%(class)ss")
    
    graded_at = models.DateTimeField(
        null=True,
        blank=True)

    grader_comments = models.TextField(
        null=True,
        blank=True)

    comment_files = models.FileField(
        null=True,
        blank=True)

    canvas_id = models.CharField(
        max_length=100,
        null=True,
        blank=True)

    canvas_url = models.URLField(
        null=True,
        blank=True)

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    def get_absolute_url(self):
        return reverse('submissions:submission_detail', kwargs={'pk': self.id})
    
    def clean(self, *args, **kwargs):
        super().clean(*args, **kwargs)
        if self.assignment is None:
            raise ValidationError("Submission must be associated with an assignment.")
        if self.student is None:
            raise ValidationError("Submission must be associated with a student.")
        if self.attempt is None:
            raise ValidationError("Submission must be associated with an attempt.")
        if self.attempt < 1:
            raise ValidationError("Submission attempt must be greater than 0.")
        if self.grade is not None and self.grade < 0:
            raise ValidationError("Submission grade must be greater than or equal to 0.")
        if self.grade is not None and self.grade > self.assignment.max_score:
            raise ValidationError("Submission grade must be less than or equal to the maximum grade.")
        if self.graded_by is None:
            raise ValidationError("Submission must be associated with a grader.")
        if self.graded_at is None:
            raise ValidationError("Submission must be associated with a graded_at datatime.")
 
        if self.question_grades is not None:
            q_grades = self.get_question_grades()
            for g in q_grades:
                if g == "":
                    raise ValidationError("Question grades must be non-empty.")
                else:
                    try:
                        g = float(g)
                    except ValueError:
                        raise ValidationError("Question grades must be floats.")
            q_grades = [float(g) for g in q_grades]
            
            q_max_grades = self.assignment.get_max_question_scores()
            q_max_grades = [float(g) for g in q_max_grades]
            for q_grade, q_max_grade in zip(q_grades, q_max_grades):
                if q_grade < 0 or q_grade > q_max_grade:
                    raise ValidationError("Question grades must be between 0 and the maximum question grade.")
            if len(q_grades) != self.assignment.number_of_questions:
                raise ValidationError("Question grades must be the same length as the number of questions in the assignment.")        
            # if the sum of the question grades is not close to the submission grade,
            # raise a validation error


    class Meta:
        abstract = True
        ordering = ["created"]

    def __str__(self):
        if self.assignment is None:
            return f"Submission {self.id}"
        else:
            if self.student is None:
                return f"Submission {self.id} for {self.assignment.name}"
            else:
                return f"Submission {self.id} for {self.assignment.name} by {self.student.first_name} {self.student.last_name}"
    
    def short_name(self):
        short_id = str(self.id).split("-")[0]
        return f"Submission {short_id}"
        
    def save(self, *args, **kwargs):
        s_grades = self.get_question_grades()
        if not all(g is None for g in s_grades):
            self.grade = sum(map(float, s_grades))
        else:
            self.grade = None
        if self.grade is None:
            self.graded_at = None
            self.graded_by = None
        else:
            self.graded_at = timezone.now()
        return super().save(*args, **kwargs)

    
class PaperSubmission(Submission):  
    CLASSIFICATION_TYPES = [
        ("M", "Manual"),
        ("D", "Digits"),
        ("W", "Words"),
    ]
    

    pdf = models.FileField(
        upload_to=submission_upload_to,
        null=True,
        blank=True)

    classification_type = models.CharField(
        max_length=20,
        choices=CLASSIFICATION_TYPES,
        default="M")

    # add a field for clustering with charfield
    # version = models.CharField(max_length=100, null=True, blank=True)
    version = models.ForeignKey(
        Version,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_version",
    )
    # finished changes here

    def __str__(self):
        return f"Paper "+ super().__str__()

    def get_absolute_url(self):
        return reverse(
            "submissions:detail", 
            kwargs={
                "submission_pk": self.pk,
                "course_pk": self.assignment.course.pk,
                "assignment_pk": self.assignment.pk})

    class Meta:
        verbose_name_plural = "Paper Submissions" 
        ordering = ["created"] 

    def non_grade_comments(self, include_file_comments=True):
        """get all the comments that have is_grade_summary=False
        
        If include_files is True, then include the comment files in the
        returned comments.
        """
        comments = self.submissions_submissioncomment_related.filter(is_grade_summary=False)
        if not include_file_comments:
            comments = comments.filter(comment_file=None)
        return comments

    def upload_to_canvas(self):
        # get the canvas course id
        pass

    @classmethod
    def get_images_for_classify(cls, assignment, dpi, top_percent=0.25, left_percent=0.5, crop_box=None, skip_pages=(0,1,3)):
        # for each PaperSubmission in assignment, use the pdf and the function
        # convert_pdf_to_images to get the images of interest
        # return a list of images with the following format:
        # [ [image1, image2, ...], [image1, image2, ...], ... ]
        # and a list of the submission pk's
        submissions = PaperSubmission.objects.filter(assignment=assignment)
        images = []
        image_sub_pks = []
        for submission in submissions:
            images.append(convert_pdf_to_images(submission.pdf.path, dpi, top_percent, left_percent, crop_box, skip_pages))
            image_sub_pks.append([submission.pk for i in range(len(images[-1]))])
        return images, image_sub_pks
    
    def get_num_pages(self):
        return PaperSubmissionImage.objects.filter(submission=self).count()


    @classmethod
    def add_papersubmissions_to_db(cls,
        assignment_target,
        num_pages_per_submission=2,
        dpi=150,
        student=None,
        quiz_number=None,
        quiz_dir_path=None,
        uploaded_files=None):
        """
        This method adds paper submissions to the database.
        It also saves the pdfs and images to the media directory
        by splitting the original pdf(s) into individual submissions.
        """
        print("assignment is:", assignment_target)

        # if student is provided, make sure that there is only one uploaded file
        if student and len(uploaded_files) > 1:
            raise ValueError("Can only upload one file per student.")

        import fitz
        created_submission_pks = []
        for file_idx, uploaded_file in enumerate(uploaded_files):
            print(f"File {file_idx+1}/{len(uploaded_files)}: {uploaded_file} as {type(uploaded_file)}")
            if uploaded_file:
                doc = open_UploadedFile_as_PDF(uploaded_file)
            else:
                doc = fitz.open(get_quiz_pdf_path(quiz_number, quiz_dir_path))
            
            n_pages = doc.page_count
            if student and n_pages != num_pages_per_submission:
                raise ValueError(
                    f"The number of pages in the pdf ({n_pages}) is "
                    f"not equal to num_pages_per_submission ({num_pages_per_submission}).")
            if n_pages % num_pages_per_submission != 0:
                raise ValueError("The number of pages in the pdf is not a multiple of num_pages_per_submission.")
            
            n_submissions = n_pages // num_pages_per_submission
            print(f"File metadata: {doc.metadata}")
            for i in range(n_submissions):
                # print on the same line the progress of the loop
                print(f"Submission {i+1}/{n_submissions}", end="\r")
                start_page = i * num_pages_per_submission
                end_page = (i + 1) * num_pages_per_submission - 1
                # we want to avoid name collisions, so we generate a random string
                # to append to the filename
                random_string = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
                pdf_filename = f'submission_batch_{file_idx}_{start_page}-{end_page}_{random_string}.pdf'
                doc_new = fitz.open()
                doc_new.insert_pdf(doc, from_page=start_page, to_page=end_page)
                doc_bytes = doc_new.tobytes()
                django_pdf_file = ContentFile(doc_bytes, name=pdf_filename)
                paper_submission = PaperSubmission.objects.create(
                    assignment=assignment_target,
                    pdf=django_pdf_file,)
                # if student is provided, we want to associate the submission
                # with the student
                if student:
                    paper_submission.student = student
                    paper_submission.save()
                created_submission_pks.append(paper_submission.pk)
                for j in range(num_pages_per_submission):
                    page = doc.load_page(start_page + j)
                    img_filename = f'submission-{i}-batch-{file_idx}-page-{j+1}-{random_string}.png'
                    pix = page.get_pixmap(dpi=dpi)
                    pix_bytes = pix.tobytes()
                    django_img_file = ContentFile(pix_bytes, name=img_filename)
                    PaperSubmissionImage.objects.create(
                        submission=paper_submission,
                        image=django_img_file,
                        page=j+1)
        print(f"\nCreated {len(created_submission_pks)} submissions.")

        return created_submission_pks

    @classmethod
    def classify(
        cls, 
        assignment,
        dpi=300,
        top_percent=0.25,
        left_percent=0.5,
        crop_box=None,
        skip_pages=(0, 1, 3,)):
        """ 
        use a deep learning model to classify the paper submissions
        """
        DETECTION_PROB_D = 1E-5
        model_path_onnx = os.path.join(settings.MEDIA_ROOT, "classify/digits_model.onnx")
        all_imgs, all_sub_pks = PaperSubmission.get_images_for_classify(
            assignment,
            dpi=dpi,
            top_percent=top_percent,
            left_percent=left_percent,
            crop_box=crop_box,
            skip_pages=skip_pages)
        df_ids = import_students_from_db(assignment.course)
        if len(df_ids) == 0:
            raise ValueError("No students with valid IDs found in the database.")
        # get the model
        sess, input_name, output_name =  import_onnx_model(model_path_onnx)
        model = {
            "sess": sess,
            "input_name": input_name,
            "output_name": output_name,
        }
        print("dpi is:", dpi)
        # we could skip specifing pages_to_skip here because
        # we already replaced them with None in get_images_for_classify
        df_digits = classify(
            model, 
            df_ids, 
            all_imgs,
            dpi=dpi,
            pages_to_skip=skip_pages,
            )

        df_digits_detections = (
                df_digits[df_digits["max_probability"] > DETECTION_PROB_D]
                .sort_values('max_probability', ascending=False)
                .drop_duplicates(['doc_idx',])
                .astype({'ufid': str})
                .sort_values('doc_idx'))

        
        if len(df_digits_detections) == 0:
            print("No detections above threshold.")
            classified_submission_pks = []
            not_classified_submission_pks = [pk_list[0] for pk_list in all_sub_pks]
            return classified_submission_pks, not_classified_submission_pks
        df_digits_detections["submission_pk"] = df_digits_detections.apply(
            lambda row: PaperSubmission.objects.get(pk=all_sub_pks[row.doc_idx][row.page_idx]).pk, 
            axis=1)
        df_digits_detections["student"] = df_digits_detections.apply(
            lambda row: Student.objects.get(uni_id=row.ufid), 
            axis=1)


        print(df_digits_detections)
        for row in df_digits_detections.itertuples():
            sub_to_update = PaperSubmission.objects.filter(id=row.submission_pk)
            if sub_to_update.first().student and sub_to_update.first().student != row.student:
                # replacing student, so reset canvas_id and canvas_url
                print(f"Warning: replacing student {sub_to_update.first().student} with {row.student} \nResetting canvas_id and canvas_url")
                sub_to_update.update(
                    canvas_id="",
                    canvas_url="",
                )
            sub_to_update.update(
                student=row.student,
                classification_type="D",
            )
        classified_submission_pks = df_digits_detections["submission_pk"].tolist()
        not_classified_submission_pks = [
            pk for pk in PaperSubmission.objects.filter(assignment=assignment).exclude(id__in=classified_submission_pks).values_list("id", flat=True)
        ]
        
        return classified_submission_pks, not_classified_submission_pks


class CanvasQuizSubmission(Submission):
    pass


    def __str__(self):
        return f"Canvas Quiz "+ super().__str__()

    def get_absolute_url(self):
        return reverse("submissions:detail", kwargs={"pk": self.pk})

    class Meta:
        verbose_name_plural = "Canvas Quiz Submissions"


class ScantronSubmission(Submission):
    pass

    def __str__(self):
        return f"Scantron "+ super().__str__()

    def get_absolute_url(self):
        title = self.__str__()
        return reverse(
            "submissions:detail", 
            kwargs = {
                "pk": self.pk,
                "title": title
                })

    class Meta:
        verbose_name_plural = "Scantron Submissions"


class PaperSubmissionImage(models.Model): 
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False)

    image = models.ImageField(upload_to=submission_image_upload_to)
    submission = models.ForeignKey(
        PaperSubmission,
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_related",
        related_query_name="%(app_label)s_%(class)ss",
        null=True,
        blank=True)

    page = models.IntegerField(
        null=True,
        blank=True)

    
    def __str__(self):
        return f"Paper Submission Image {self.pk}"

    class Meta:
        verbose_name_plural = "Paper Submission Images"

    def get_assignment(self):
        return self.submission.assignment
    
    @classmethod
    def get_max_page_number(cls, assignment):
        return cls.objects.filter(submission__assignment=assignment).aggregate(Max('page'))['page__max']

    @classmethod
    def get_all_assignment_imgs(cls, assignment):
        """
        Get all the images for an assignment.
        Note: Assumes that all submissions have the same number of images.
        Appears to be unused?
        """
        # get number of images per submission
        first_submission = PaperSubmission.objects.filter(assignment=assignment).first()
        num_pages_per_submission = PaperSubmissionImage.objects.filter(submission=first_submission).count()
        print(f"{num_pages_per_submission=}")
        sub_Images = cls.objects.filter(
            submission__assignment=assignment)
        all_imgs = []
        all_img_pks = []
        # open images as PIL.PngImagePlugin.PngImageFile
        # in the ipynb these were ppm images, 
        # so I might need to convert them to ppm
        for sub_image in sub_Images:
            img = Image.open(sub_image.image)
            all_imgs.append(img)
            all_img_pks.append(sub_image.pk)
        print("dpi", img.info["dpi"][0])

        # convert imgs to nested list every `num_pages_per_quiz`
        # for example, if num_pages_per_quiz=2, then:
        # [ [img1, img2], [img3, img4], ... ]
        all_imgs = [list(a) for a in zip(*[iter(all_imgs)] * num_pages_per_submission)]
        all_img_pks = [list(a) for a in zip(*[iter(all_img_pks)] * num_pages_per_submission)]
        
        return all_imgs, all_img_pks
        
class SubmissionComment(models.Model):
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False)

    paper_submission = models.ForeignKey(
        PaperSubmission,
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_related",
        related_query_name="%(app_label)s_%(class)ss",
        null=True,
        blank=True)

    text = models.TextField(
        null=True,
        blank=True)

    comment_file = models.FileField(
        upload_to="submissions/comments/", 
        null=True, 
        blank=True)

    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_related",
        related_query_name="%(app_label)s_%(class)ss",
        null=True,
        blank=True)

    created_at = models.DateTimeField(
        auto_now_add=True)

    updated_at = models.DateTimeField(
        auto_now=True)

    is_grade_summary = models.BooleanField(
        default=False,
        )

    canvas_id = models.CharField(
        max_length=100,
        null=True,
        blank=True)

    def get_assignment(self):
        return self.paper_submission.assignment

    def get_filename(self):
        return os.path.basename(self.comment_file.name)

    def get_filesize(self):
        size = os.path.getsize(self.comment_file.path)
        if size < 1024:
            return f"{size} B"
        elif size < 1024**2:
            return f"{size/1024:.1f} KB"
        elif size < 1024**3:
            return f"{size/1024**2:.1f} MB"
        else:
            return f"{size/1024**3:.1f} GB"

    def __str__(self):
        return f"Submission Comment {self.pk}"

    # if self.is_saved then title is required
    def clean(self):
        if self.is_saved and not self.saved_title:
            raise ValidationError(
                "Saved title is required if is_saved is True"
            )
            
    class Meta:
        verbose_name_plural = "Submission Comments"

    @classmethod
    def add_commentfiles_to_db(cls,
        submission_target,
        uploaded_files,
        author,
        ):
        """
        This method adds paper submissions to the database.
        It also saves the pdfs and images to the media directory
        by splitting the original pdf(s) into individual submissions.
        """
        print("submission is:", submission_target)
        new_comment_file_dir_in_media = os.path.join(
            "submissions", 
            f"course_{submission_target.assignment.course.pk}", 
            f"assignment_{submission_target.assignment.pk}",
            "comment")
        new_comment_file_dir = os.path.join(
            settings.MEDIA_ROOT, 
            new_comment_file_dir_in_media)

        if not os.path.exists(new_comment_file_dir):
            os.makedirs(new_comment_file_dir)

        created_comment_pks = []
        for file_idx, uploaded_file in enumerate(uploaded_files):
            print(uploaded_file.__dict__)
            try:
                file_path = uploaded_file.temporary_file_path()
            except AttributeError as e:
                # print("Error:", e)
                # print("Reading from bytes")
                # this actually not a pdf path but a File bytes object
                file_path = uploaded_file.file
            
        
            # copy file to new location, while keeping the original name
            new_file_path_in_media = os.path.join(
                new_comment_file_dir_in_media,
                uploaded_file.name,
            )
            new_file_path = os.path.join(
                new_comment_file_dir,
                uploaded_file.name,
            )

            # copy file to new location
            import shutil
            try:
                shutil.copyfile(file_path, new_file_path)
            except Exception as e:
                # we need to handle the case where the
                # file_path is a bytes object
                print("Error:", e)
                print("Reading from bytes")
                # this actually not a pdf path but a File bytes object
                with open(new_file_path, "wb") as f:
                    f.write(file_path.read())

            
           
            print(f"New: {file_path}\n")
            
            new_comment_file = SubmissionComment.objects.create(
                paper_submission=submission_target,
                comment_file=new_file_path_in_media,
                author=author,
            )
            new_comment_file.save()
            
            created_comment_pks.append(new_comment_file.pk)
            

        return created_comment_pks