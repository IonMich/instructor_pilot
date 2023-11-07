import re
from datetime import datetime

from django.contrib.auth.models import User
from django.db import models
from django.db.models import Q
from django.urls import reverse

from courses.models import Course


# Create your models here.
class Meeting(models.Model):
    day = models.CharField(
        max_length=10,
        )
    meeting_type = models.CharField(
        max_length=50,
        choices=[
            ('L', 'Lab'),
            ('T', 'Lecture'),
            ('P', 'Recitation'),
            ('W', 'Workshop'),
            ('O', 'Other'),
            ],
            blank=True,
        )

    start_time = models.TimeField()
    end_time = models.TimeField()
    location = models.CharField(
        max_length=255,
        blank=True,
        null=True)

    class Meta:
        ordering = ['day', 'start_time']

    def __str__(self):
        if self.location:
            return f"{self.day} {self.start_time} - {self.end_time} ({self.location})"
        else:
            return f"{self.day} {self.start_time} - {self.end_time}"


class Section(models.Model):
    name = models.CharField(
        max_length=255
        )
    course = models.ForeignKey(
        Course, 
        on_delete=models.SET_NULL,
        null=True,
        related_name="sections")
    teaching_assistant = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sections')

    meetings = models.ManyToManyField(
        Meeting,
        related_name='sections')

    class_number = models.CharField(
        max_length=100,
        null=True,
        blank=True)

    canvas_id = models.CharField(
        max_length=100,
        null=True,
        blank=True)
    def __str__(self):
        return self.name

    @classmethod
    def create_default_course_section(cls, course):
        return cls.objects.create(name="Unassigned",course=course)

    def get_absolute_url(self):
        return reverse('sections:detail', kwargs={'pk': self.pk})

    def recreate_meetings(self, meetings):
        self.meetings.remove()

        for ufsoc_meeting in meetings:
            start_time = datetime.strptime(
                ufsoc_meeting['meetTimeBegin'], 
                "%I:%M %p")
            end_time = datetime.strptime(
                ufsoc_meeting['meetTimeEnd'], 
                "%I:%M %p")
            meeting, _ = Meeting.objects.get_or_create(
                day="".join(ufsoc_meeting['meetDays']),
                start_time=start_time,
                end_time=end_time,
                location=f"{ufsoc_meeting['meetBuilding']} {ufsoc_meeting['meetRoom']}",)
            self.meetings.add(meeting)
        
        self.save()

    @classmethod
    def get_from_ufsoc(cls, requester, course):
        user = User.objects.get(username=requester)
        if not user.last_name:
            raise ValueError("User does not have a last name. Cannot search UF SOC. Please update your profile.")
            return []
        if course.term == "Development Term":
            print("Development term. Skipping UF SOC update.")
            return []
        from autocanvas.pipes.ufsoc import get_course_from_UFSOC_apix
        json_response = get_course_from_UFSOC_apix(
            course.term,
            course_code=course.course_code,
            instructor_name=user.last_name,
            program_level_name="Undergraduate",
        )
        # if nothing is found, try again without the instructor name
        # if only one result is found, then this means that this is the 
        # only section, and thus we can assume that this is what we are looking for
        # this is relevant for courses where the grader is not listed as the instructor
        if not json_response:
            print(f"No results found for {user.last_name} in UF SOC. Trying again without instructor name ...")
            json_response = get_course_from_UFSOC_apix(
                course.term,
                course_code=course.course_code,
                program_level_name="Undergraduate",
            )
        if not json_response:
            print(f"No results found in UF SOC. Skipping ...")
            return []
        if len(json_response) >= 1:
            print(f"Found {len(json_response)} courses in UF SOC. Using first result.")

        course.description = json_response[0]["description"]
        course.save()
        ufsoc_sections = json_response[0]["sections"]
        if not ufsoc_sections:
            print(f"No sections found in UF SOC. Skipping ...")
            return []
        else:
            print(f"Found {len(ufsoc_sections)} sections in UF SOC.")
        sections_to_return = []
        for ufsoc_section in ufsoc_sections:
            assert len(str(ufsoc_section['classNumber'])) == 5

            sections_to_return.append(
                {
                    "name": f"{ufsoc_section['display']} ({ufsoc_section['classNumber']})",
                    "class_number": ufsoc_section['classNumber'],
                    "meetings": ufsoc_section['meetTimes'],
                }
            )

        return sections_to_return


    

