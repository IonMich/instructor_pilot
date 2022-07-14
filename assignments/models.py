from django.db import models
from courses.models import Course
from django.contrib.auth.models import User
from courses.views import course_detail_view
from submissions.utils import CommaSeparatedFloatField
from courses.utils import get_canvas_course
from django.urls import reverse

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

    def get_max_question_scores(self):
        return self.max_question_scores.split(",")

    def get_graders(self):
        return self.course.instructors.all()

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
        return self.submissions.all()

    

    @classmethod
    def update_from_canvas(
        cls, 
        course, canvas_course, 
        max_question_scores={
            "Quizzes": "2,2",
        }
        ):
        # I should probably rename to bulk_update_from_canvas 
        course_assignments = course.assignments.all()
        canvas_assignment_groups = canvas_course.get_assignment_groups(
            include=["assignments", "submission", "score_statistics", "overrides"]
            )
        for canvas_assignment_group in canvas_assignment_groups:
            for canvas_assignment in canvas_assignment_group.assignments:
                print(canvas_assignment)
                if str(canvas_assignment["id"]) in [a.canvas_id for a in course_assignments]:
                    assignment = course_assignments.get(canvas_id=str(canvas_assignment["id"]))
                    assignment.name = canvas_assignment["name"]
                    assignment.description = canvas_assignment["description"]
                    assignment.assignment_group = canvas_assignment_group.name             
                else:
                    assignment = cls.objects.create(
                        name=canvas_assignment["name"],
                        description=canvas_assignment["description"],
                        course=course,
                        canvas_id=str(canvas_assignment["id"]),
                        max_question_scores=str(canvas_assignment["points_possible"])
                        )
                
                # if canvas_assignment["due_at"] is not None:
                #     assignment.start_date = canvas_assignment["due_at"]
                #     assignment.due_date = canvas_assignment["due_at"]
                #     assignment.ready_by = canvas_assignment["due_at"]
                assignment.assignment_group = canvas_assignment_group.name  
                assignment.max_question_scores = max_question_scores.get(canvas_assignment_group.name,None)
                if assignment.max_question_scores is None:
                    assignment.max_question_scores = str(canvas_assignment["points_possible"])
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


    def upload_graded_submissions_to_canvas(self):
        """Uploads the graded submissions to canvas.
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
                    canvas_id=canvas_submission.id)
                print(f"Found submission in database for {canvas_submission.user['name']}")
            except self.submissions_papersubmission_related.model.DoesNotExist:
                print(f"No submission found in database for {canvas_submission.user['name']}")
                continue
            if submission.grade is None:
                print(f"Will not upload submission without grade for {canvas_submission.user['name']}")
                continue
            
            for comment in submission.submissions_submissioncomment_related.all():
                print(f'Comment: {comment.text}')
            score = submission.grade
            question_grades_comment = ""
            for idx, question_grade in enumerate(submission.get_question_grades()):
                question_grades_comment += f"Question {idx+1} Grade: {question_grade}\n"
            print(f'Student grade: {score}')
            print(f'Question grades comment: {question_grades_comment}')
            canvas_submission.edit(submission={
                'posted_grade': score},
                comment= 
                    {"text_comment":question_grades_comment,
                    },
                )
            print(f"Uploaded grade and grade comment for {canvas_submission.user['name']}")
            
            for comment in submission.submissions_submissioncomment_related.all():
                print(f'Comment: {comment.text}')
                canvas_submission.edit(comment={
                        "text_comment": comment.text,
                    },
                )
            print(f'Submission comment file url: {submission.pdf}')
            uploaded = canvas_submission.upload_comment(
                file=submission.pdf,
            )
            if uploaded:
                print(f"Uploaded file comment to canvas for {canvas_submission.user['name']}")

            

            
        

    
