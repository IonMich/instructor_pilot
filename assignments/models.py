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
        

    
