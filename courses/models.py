from django.db import models
from universities.models import University
from django.contrib.auth.models import User
from courses.utils import get_canvas_course
from django.urls import reverse

# Create your models here.

semesters=(
        ("F","Fall"), 
        ("SP","Spring"),
        ("SU","Summer"),
        ("SUA","Summer A"),
        ("SUB","Summer B"),
        ("SUC","Summer C"),
)

class Course(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(max_length=500)
    
    semester_type = models.CharField(
        max_length=100, 
        choices=semesters)

    term = models.CharField(
        max_length=100,
        default="Summer C 2022")
        
    university = models.ForeignKey(
        University,
        on_delete=models.CASCADE,
        related_name="courses")
    instructors = models.ManyToManyField(
        User,
        related_name="courses")

    course_code = models.CharField(
        max_length=100,
        null=True,
        blank=True)

    canvas_id = models.CharField(
        max_length=100,
        null=True,
        blank=True)
        
    start_date = models.DateField()
    end_date = models.DateField(
        null=True,
        blank=True)
    
    year = models.IntegerField()
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.term})"

    def get_absolute_url(self):
        return reverse("courses:detail", kwargs={"pk": self.id})

    def get_students(self):
        students = []
        for section in self.sections.all():
            for student in section.students.all():
                students.append(student)
        return students


    def is_canvas_course(self):
        return self.canvas_id is not None

    def update_from_canvas(self, requester):
        if not self.is_canvas_course():
            print(
                "Course is currently not a canvas course. "
                "Trying to find corresponding canvas course.")
            canvas_course = get_canvas_course(self.course_code, self.term)
            if canvas_course is None:
                print("Canvas course not found")
                return None
            self.canvas_id = canvas_course.id
        else:
            canvas_course = get_canvas_course(canvas_id=self.canvas_id)

        for item in semesters:
            term_splitted = self.term.split(" ")
            if item[1] == " ".join(term_splitted[:-1]):
                self.semester_type = item[0]
                self.year = term_splitted[-1]
                break
        university_code = canvas_course.sis_course_id.split(".")[0].lower()
        try:
            university = University.objects.get(university_code=university_code)
        except University.DoesNotExist:
            raise Exception(f"University with code {university_code} does not exist in the database.")
        print(canvas_course.__dict__)
        self.university = university
        self.name = canvas_course.name
        self.start_date = canvas_course.start_at_date
        try:
            self.end_date = canvas_course.end_at_date
        except AttributeError:
            self.end_date = canvas_course.end_at

        self.save(update_fields=
            ["university",
            "name",
            "canvas_id",
            "semester_type",
            "year",
            "start_date",
            "end_date",
            "updated"
            ])
        # now update the sections
        from sections.models import Section
        sections = Section.update_from_canvas(
            requester=requester,
            course=self, 
            canvas_sections=canvas_course.sections)
        # now update the assignments
        self.update_assignments_from_canvas(canvas_course)

        # # now update the students
        self.update_students_from_canvas(canvas_course)


        
        return self
    
    def update_assignments_from_canvas(self, canvas_course):
        from assignments.models import Assignment
        assignments = Assignment.update_from_canvas(
            course=self,canvas_course=canvas_course)
        return assignments

    def update_students_from_canvas(self, canvas_course):
        from students.models import Student
        canvas_students = canvas_course.get_users(
            enrollment_type=["student"],
            include=[
                "enrollments","locked",
                "avatar_url","bio",
                "custom_links", 
                "current_grading_period_scores", 
                "uuid"])
        students = Student.update_from_canvas(
            course=self, canvas_students=canvas_students)
        return students