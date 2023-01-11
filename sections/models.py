import re
from datetime import datetime

from django.contrib.auth.models import User
from django.db import models
from django.db.models import Q
from django.urls import reverse

from courses.models import Course
from universities.models import University


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
        return f"{self.day} {self.start_time} - {self.end_time} ({self.location})"


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

    @classmethod
    def update_from_ufsoc(cls, requester, course):
        user = User.objects.get(username=requester)
        from autocanvas.pipes.ufsoc import get_course_from_UFSOC_apix
        json_response = get_course_from_UFSOC_apix(
            course.term,
            course_code=course.course_code,
            instructor_name=user.last_name,
            program_level_name="Undergraduate",
        )
        course.description = json_response[0]["description"]
        course.save()
        ufsoc_sections = json_response[0]["sections"]
        if not ufsoc_sections:
            print(f"No sections found in UF SOC. Skipping ...")
            return []
        for ufsoc_section in ufsoc_sections:
            assert len(str(ufsoc_section['classNumber'])) == 5
            section = cls.objects.filter(name__contains=f"({ufsoc_section['classNumber']})").first()

            if section:
                print(f"UF SOC section {ufsoc_section['classNumber']} matches course section {section.name}. Updating ...")
                section.course = course
                section.class_number = ufsoc_section['classNumber']
            else:
                print(f"Could not find UF SOC section {ufsoc_section['classNumber']} in course sections. Creating.")
                section = cls.objects.create(
                    name=f"{ufsoc_section['display']} ({ufsoc_section['classNumber']})",
                    course=course,
                    teaching_assistant=user,
                    class_number=ufsoc_section['classNumber'],
                )
                
            section.meetings.remove()
            for ufsoc_meeting in ufsoc_section['meetTimes']:
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
                section.meetings.add(meeting)
            
            section.save()

        return

    
    @classmethod
    def update_from_canvas(cls, requester, course, canvas_sections, only_enrolled_sections=True):
        user = User.objects.get(username=requester)
        Section.update_from_ufsoc(requester, course)
        for canvas_section in canvas_sections:
            try:
                canvas_section_id = canvas_section['id']
                canvas_section_name = canvas_section['name']
            except:
                canvas_section_id = canvas_section.id
                canvas_section_name = canvas_section.name
            section = cls.objects.filter(
                Q(canvas_id=canvas_section_id)
                | Q(name=canvas_section_name)
                | Q(class_number__in=re.findall(r'\d+', canvas_section_name))
                ).first()

            if section:
                print(f"Found section {canvas_section_name}. Updating ...")
                section.name = canvas_section_name
                section.course = course
                section.canvas_id = canvas_section_id
            else:
                if not only_enrolled_sections:
                    # More than the explicitly enrolled sections are included in the canvas_sections list
                    # Don't create sections that are not explicitly enrolled, so skip to avoid clutter
                    continue
                print(f"Could not find section {canvas_section_name}. Creating new ...")
                section = cls.objects.create(
                    name=canvas_section_name,
                    canvas_id=canvas_section_id,
                    course=course)


            section.teaching_assistant = user
            
            section.save()
            
        return cls.objects.filter(course=course)

    

