from django.contrib.auth.models import User
from django.db import models
from django.db.models import Q
from django.urls import reverse

from courses.utils import get_canvas_course, get_canvas_object


class Course(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(
        max_length=500, 
        blank=True)
    
    term = models.CharField(
        max_length=100,
        default="Spring 2024")

    instructors = models.ManyToManyField(
        User,
        related_name="courses",
        blank=True)

    course_code = models.CharField(
        max_length=100,
        null=True,
        blank=True)

    image = models.ImageField(
        upload_to='courses/',
        null=True,
        blank=True)

    canvas_id = models.CharField(
        max_length=100,
        default="",
        blank=True)
        
    start_date = models.DateField(
        null=True,
        blank=True)
    end_date = models.DateField(
        null=True,
        blank=True)
    
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def get_short_name(self):
        return f"{self.course_code} {self.term}"

    def __str__(self):
        return f"{self.name} ({self.term})"

    def get_absolute_url(self):
        return reverse("courses:detail", kwargs={"pk": self.id})

    def get_students(self, section_pk=None):
        students = []
        if section_pk:
            section = self.sections.filter(pk=section_pk)
            for student in section.students.all():
                students.append(student)
        else:
            for section in self.sections.all():
                for student in section.students.all():
                    students.append(student)
        return students

    def get_all_assignment_groups(self):
        assignment_groups = self.assignment_groups.all()

        return assignment_groups

    def is_canvas_course(self):
        return self.canvas_id != ""
        
    def get_all_submission_student_comments(self, assignment_group_name=None,):
        """
        Return all submission comments in a course for a given assignment group.
        Keep only the comments that were written by someone other than the current user.
        """
        # get the corresponding canvas course
        try:
            canvas_course = get_canvas_course(canvas_id=self.canvas_id)
        except Exception as e:
            print(e)
            print("Canvas Id for this course is not valid.")
            print(f"{self.canvas_id=}")
            return None
        # find the canvas id of the assignment group with the given name
        assignment_groups = canvas_course.get_assignment_groups(
            include=["assignments"])
        if assignment_groups is None:
            raise ValueError("No assignment groups found")
        elif assignment_group_name is not None:
            for assignment_group in assignment_groups:
                if assignment_group.name == assignment_group_name:
                    assignment_groups = [assignment_group]
                    break
            else:
                raise ValueError("Assignment group not found")

        # get list of canvas assignment ids in the assignment group with id assignment_group_id
        assignment_ids = []
        for assignment_group in assignment_groups:
            for assignment in assignment_group.assignments:
                assignment_ids.append(assignment["id"])

        submissions = canvas_course.get_multiple_submissions(
            student_ids="all",
            assignment_ids=assignment_ids,
            include=["submission_comments"],
        )

        # get all submission comments not written by the requestor

        # get the canvas id of the requestor
        canvas = get_canvas_object()
        requestor_canvas_id = canvas.get_current_user().id

        # store them in a list of dictionaries
        # each dictionary has keys "author_canvas_id", "submission_id", "text", "created_at"

        submission_comments = []
        for submission in submissions:
            for comment in submission.submission_comments:
                if comment["author_id"] != requestor_canvas_id:
                    print(f"author name: {comment['author_name']}\n"
                            f"submission id: {submission.id}\n"
                            f"comment: {comment['comment']}\n"
                            f"created at: {comment['created_at']}\n")
                    submission_comments.append(
                        {
                            "author_canvas_id": comment["author_id"],
                            "submission_canvas_id": submission.id,
                            "text": comment["comment"],
                            "created_at": comment["created_at"],
                        }
                    )
                    
        return submission_comments

    def update_submission_comments_from_canvas(self):
        try:
            canvas_submission_comments = self.get_all_submission_student_comments()
            print(canvas_submission_comments)
        except Exception as e:
            print(e)
            return None


class Announcement(models.Model):
    title = models.CharField(max_length=255)
    body = models.TextField()
    date = models.DateTimeField()
    author = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )
    course = models.ForeignKey(
        Course, 
        on_delete=models.CASCADE,
        related_name="announcements")
    canvas_id = models.CharField(
        max_length=100,
        null=True,
        blank=True)

    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ["-date"]