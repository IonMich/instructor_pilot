from django.db import models
from universities.models import University
from django.contrib.auth.models import User
from courses.utils import get_canvas_course, get_canvas_object
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

    image = models.ImageField(
        upload_to='courses/',
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
        assignment_groups = self.assignments.values_list('assignment_group', flat=True).distinct()

        return assignment_groups


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
        try:
            self.start_date = canvas_course.start_at_date
        except AttributeError:
            if canvas_course.start_at is not None:
                self.start_date = canvas_course.start_at
            else:
                import datetime
                d_start = datetime.datetime.strptime(canvas_course.term["start_at"],"%Y-%m-%dT%H:%M:%SZ")
                new_format = "%Y-%m-%d"
                self.start_date = d_start.strftime(new_format)
        try:
            self.end_date = canvas_course.end_at_date
        except AttributeError:
            if canvas_course.end_at is not None:
                self.end_date = canvas_course.end_at
            else:
                self.end_date = canvas_course.term["end_at"]
                import datetime
                d_end = datetime.datetime.strptime(canvas_course.term["end_at"],"%Y-%m-%dT%H:%M:%SZ")
                new_format = "%Y-%m-%d"
                self.end_date = d_end.strftime(new_format)

        image_url = canvas_course.image_download_url
        from urllib import request
        import os
        from django.core.files import File
        result = request.urlretrieve(image_url)
        self.image.save(
            f"{self.course_code}_{self.term}.png",
            File(open(result[0], 'rb'))
            )

        self.save(update_fields=
            ["university",
            "name",
            "image",
            "canvas_id",
            "semester_type",
            "year",
            "start_date",
            "end_date",
            "updated"
            ])
        canvas = get_canvas_object()
        canvas_course_announcements = canvas.get_announcements([canvas_course])

        
        Announcement.update_from_canvas(
            requester=requester,
            course=self,
            canvas_announcements=canvas_course_announcements)

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

    @classmethod
    def update_from_canvas(cls, requester, course, canvas_announcements):
        for canvas_announcement in canvas_announcements:
            try:
                announcement = cls.objects.get(canvas_id=canvas_announcement.id)
            except cls.DoesNotExist:
                announcement = cls(canvas_id=canvas_announcement.id)
            
            announcement.date = canvas_announcement.created_at
            import datetime
            _d = datetime.datetime.strptime(announcement.date,"%Y-%m-%dT%H:%M:%SZ")
            new_format = "%Y-%m-%d"
            announcement.date = _d.strftime(new_format)
            announcement.title = canvas_announcement.title
            announcement.body = canvas_announcement.message
            announcement.date = canvas_announcement.created_at
            announcement.author = canvas_announcement.user_name
            announcement.course = course
            announcement.save()
        return cls.objects.filter(course=course)
    
    class Meta:
        ordering = ["-date"]