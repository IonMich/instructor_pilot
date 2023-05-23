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

    
    @classmethod
    def update_from_canvas(
        cls, 
        requester, 
        course, 
        all_canvas_sections, 
        enrolled_canvas_sections,
        only_enrolled_sections=True,
        add_from_resources=True,
        ):
        user = User.objects.get(username=requester)
        resource_sections = []
        if add_from_resources:
            if course.university.university_code == "ufl":
                resource_sections = cls.get_from_ufsoc(requester, course)
        has_resources = len(resource_sections) > 0
        resource_class_numbers = [section['class_number'] for section in resource_sections]
        enrolled_canvas_section_names = [section['name'] for section in enrolled_canvas_sections]
        for canvas_section in all_canvas_sections:
            try:
                canvas_section_id = canvas_section['id']
                canvas_section_name = canvas_section['name']
            except:
                canvas_section_id = canvas_section.id
                canvas_section_name = canvas_section.name

            # Skip the default course section 
            if canvas_section_name == course.name:
                print(f"Skipping default course section {canvas_section_name}")
                continue
            # Skip the any section that has no students enrolled
            if canvas_section.__dict__.get("students") is None:
                print(f"Skipping section {canvas_section_name} because it has no students enrolled.")
                continue

            section = cls.objects.filter(
                Q(canvas_id=canvas_section_id)
                | Q(name=canvas_section_name)
                | Q(class_number__in=re.findall(r'\d+', canvas_section_name))
                ).first()

            if section:
                # update
                print(f"Found db section {section.name} with canvas_id: {section.canvas_id} on Canvas. Updating from Canvas")
                section.name = canvas_section_name
            else:
                # create
                if (canvas_section_name not in enrolled_canvas_section_names) and only_enrolled_sections:
                    print(f"Could not find section {canvas_section_name} in the list of enrolled sections. Skipping ...")
                    continue
                # check if section is in the intersection of canvas sections and sections found in the extra resource
                # if it is not, then skip it. Matching by class number.
                numbers_in_section_name = re.findall(r'\d+', canvas_section_name)
                matching_resource_idx = None
                for resource_idx, classNumber in enumerate(resource_class_numbers):
                    if str(classNumber) in numbers_in_section_name:
                        matching_resource_idx = resource_idx
                        break
                if has_resources:
                    if matching_resource_idx is None:
                        print(f"Could not match canvas section {canvas_section_name} in extra resource sections. Skipping ...")
                        continue
                    resource = resource_sections[matching_resource_idx]
                    classNumber = resource_class_numbers[matching_resource_idx]
                else:
                    classNumber = numbers_in_section_name[-1]

                print(f"Could not find section {canvas_section_name} in database. Creating new ...")
                section = cls.objects.create(
                    name=canvas_section_name,
                    class_number=classNumber,)
                
                if has_resources:
                    section.recreate_meetings(resource['meetings'])


            section.course = course
            section.canvas_id = canvas_section_id
            section.teaching_assistant = user
            
            section.save()
            
        return cls.objects.filter(course=course)

    

