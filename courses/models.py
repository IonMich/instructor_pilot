from django.db.models import Q
from django.contrib.auth.models import User
from django.db import models
from django.urls import reverse

from courses.utils import get_canvas_course, get_canvas_object
from universities.models import University

# Create your models here.

semesters = (
        ("F","Fall"), 
        ("SP","Spring"),
        ("SU","Summer"),
        ("SUA","Summer A"),
        ("SUB","Summer B"),
        ("SUC","Summer C"),
        ("D", "Development"),
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
                # list available courses on canvas
                canvas_courses = get_canvas_object().get_courses()
                print("Available Canvas Courses:")
                for course in canvas_courses:
                    try:
                        description = f"{course}"
                        print(description)
                    except Exception as e:
                        print(e)
                        print(course.id)
                return
            self.canvas_id = canvas_course.id
        else:
            canvas_course = get_canvas_course(canvas_id=self.canvas_id)

        if self.term == "Development Term":
            self.semester_type = "D"
            import datetime
            self.year = str(datetime.datetime.now().year)
        else:
            for item in semesters:
                term_splitted = self.term.split(" ")
                if item[1] == " ".join(term_splitted[:-1]):
                    self.semester_type = item[0]
                    self.year = term_splitted[-1]
                    break
        
        try:
            university_code = canvas_course.sis_course_id.split(".")[0].lower()
            university = University.objects.get(
                Q(university_code__iexact=university_code)
            )

        except Exception as e:
            print(e)
            print("University not found. Assigning to first university.")
            university = University.objects.first()
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
                try:
                    d_start = datetime.datetime.strptime(canvas_course.term["start_at"],"%Y-%m-%dT%H:%M:%SZ")
                    new_format = "%Y-%m-%d"
                    self.start_date = d_start.strftime(new_format)
                except Exception as e:
                    now = datetime.datetime.now()
                    self.start_date = now.strftime("%Y-%m-%d")
        try:
            self.end_date = canvas_course.end_at_date
        except AttributeError:
            if canvas_course.end_at is not None:
                self.end_date = canvas_course.end_at
            else:
                import datetime
                try:
                    d_end = datetime.datetime.strptime(canvas_course.term["end_at"],"%Y-%m-%dT%H:%M:%SZ")
                    new_format = "%Y-%m-%d"
                    self.end_date = d_end.strftime(new_format)
                except Exception as e:
                    now = datetime.datetime.now()
                    # add 3 months
                    end_date = now + datetime.timedelta(days=90)
                    self.end_date = end_date.strftime("%Y-%m-%d")

        image_url = canvas_course.image_download_url
        if image_url not in [None,'']:
            from urllib import request

            from django.core.files import File
            result = request.urlretrieve(image_url)
            from hashlib import md5
            new_avatar_md5 = md5(open(result[0], 'rb').read()).hexdigest()
            try:
                old_avatar_md5 = md5(open(course.image.path, 'rb').read()).hexdigest()
                if new_avatar_md5 == old_avatar_md5:
                    print("Course image is the same. Not updating.")
            except Exception as e:
                print("Handling exception: ", e)
                pass
            print("Course image has changed. Updating.")
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

        add_from_resources = True if len(self.course_code.split(" ")) == 1 else False

        print(canvas_course.sections)
        
        # if all enrolled sections for user have the same name as the course name, then
        # we can assume that the course designers did not add the TAs to their
        # individual sections, but rather to the course itself. In this case,
        # use other methods to get the sections for this TA.
        all_canvas_sections = canvas_course.get_sections(include=["students","avatar_url","enrollments"])
        enrolled_canvas_sections = canvas_course.sections
        if any([section["name"] == canvas_course.name for section in canvas_course.sections]):
            print("No section enrollments found in the course for this user. "
                "Will try to find sections for this user.")
            only_enrolled_sections = False
        else:
            only_enrolled_sections = True

        
        Section.update_from_canvas(
            requester=requester,
            course=self, 
            all_canvas_sections=all_canvas_sections,
            enrolled_canvas_sections=enrolled_canvas_sections,
            only_enrolled_sections=only_enrolled_sections,
            add_from_resources=add_from_resources)
        
        # now update the assignments
        self.update_assignments_from_canvas(canvas_course)

        # now update the students
        self.update_students_from_canvas(canvas_course)

        # TODO: too slow. Need to find a better way to do this.
        # # now update the submission comments
        # self.update_submission_comments_from_canvas()
    
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