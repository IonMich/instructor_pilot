import re

from django.db import models
from django.db.models import Q

from sections.models import Section
from universities.models import University

# Create your models here.

class Student(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(
        max_length=100, 
        null=True, 
        blank=True, 
        unique=True)
    uni_id = models.CharField(max_length=20,unique=True)
    phone_number = models.CharField(
        max_length=100,
        null=True,
        blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    university = models.ForeignKey(
        University,
        on_delete=models.CASCADE,
        related_name="students")
    sections = models.ManyToManyField(
        Section,
        blank=True,
        related_name="students")

    canvas_id = models.CharField(
        max_length=100,
        null=True,
        blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @classmethod
    def update_from_canvas(
        cls, 
        course, 
        canvas_students,):
        profiles = []
        for canvas_student in canvas_students:
            first_name = canvas_student.sortable_name.split(",")[1]
            last_name = canvas_student.sortable_name.split(",")[0]
            try:
                university_identifying_id = canvas_student.sis_user_id
                new_id_type = "sis_user_id"
            except Exception as e:
                try:
                    university_identifying_id = "email."+canvas_student.email[:20]
                    new_id_type = "email"
                except Exception as e:
                    university_identifying_id = "uuid." + canvas_student.uuid[:20]
                    new_id_type = "uuid"

            try:
                student = cls.objects.filter(
                    Q(uni_id=university_identifying_id)
                    | Q(canvas_id=canvas_student.id)
                    ).first()
            except Exception as e:
                print(e)
                student = None
            
            if student:
                print(f"Found student {canvas_student.name}. Updating info ...")
                student.first_name = first_name
                student.last_name = last_name
                if student.uni_id != university_identifying_id and new_id_type == "sis_user_id":
                    print(f"Updating student {canvas_student.name} uni_id from:  {student.uni_id} to:  {university_identifying_id} ...")
                    student.uni_id = university_identifying_id
                student.canvas_id = canvas_student.id
                student_sections_in_course = student.sections.filter(course=course)
                
            else:
                print(f"Could not find student {canvas_student.name}. Creating new ...")
                
                student = cls.objects.create(
                    first_name=first_name,
                    last_name=last_name,
                    uni_id=university_identifying_id,
                    university=course.university,
                    canvas_id=canvas_student.id)

                student_sections_in_course = []

            course_sections_in_enrollments = []
            for canvas_enrollment in canvas_student.enrollments:
                if not canvas_enrollment["type"]=='StudentEnrollment':
                    continue
                section = course.sections.filter(
                    Q(canvas_id=canvas_enrollment["course_section_id"])
                ).first()
                if section:
                    course_sections_in_enrollments.append(section)
                else:
                    print(f"Could not find section with canvas_id {canvas_enrollment['course_section_id']} for student {canvas_student.name} ...")
            
            new_sections = set(course_sections_in_enrollments) - set(student_sections_in_course)
            for section in new_sections:
                print(f"Found new section {section} in enrollments. Adding to the list of sections for student {student} ...")
                student.sections.add(section)
            deprecated_sections = set(student_sections_in_course) - set(course_sections_in_enrollments)
            for section in deprecated_sections:
                print(f"Found deprecated section {section} in enrollments. Removing from the list of sections for student {student} ...")
                student.sections.remove(section)
            if not new_sections and not deprecated_sections:
                print(f"No changes in course sections for student {student} ...")
            
            student.save()
            profile_bio = canvas_student.bio if canvas_student.bio else ""
            avatar_url = canvas_student.avatar_url

            profiles.append({
                "profile": student.profile,
                "bio": profile_bio,
                "new_avatar_url": avatar_url
            })
        print("Updating avatars from canvas ...")
        cls.update_profiles_from_canvas(profiles)


    @classmethod
    def update_profiles_from_canvas(
        cls,
        profiles):

        # retrieve asynchrounously the avatars from canvas
        # and update the profile objects
        # max 30 concurrent requests
        import asyncio
        import os
        import aiohttp

        MAX_WORKERS = 30

        semaphore = asyncio.Semaphore(MAX_WORKERS)
        async def download_avatar(session, profile):
            url = profile["new_avatar_url"]
            basename = os.path.basename(url)
            async with semaphore, session.get(url) as response:
                filecontent = await response.read()
                return profile, basename, filecontent

        async def main(profiles):
            async with aiohttp.ClientSession() as session:
                tasks = [ download_avatar(session, profile) for profile in profiles ]
                finished = 0
                print(f"Downloading avatars...")
                results = []
                for task in asyncio.as_completed(tasks):
                    result = await task
                    finished += 1
                    print(f"Finished {finished} of {len(profiles)} ...", end="\r")
                    results.append(result)
                print("\n")
                return results
                    
        results = asyncio.run(main(profiles))
        
        # update the profile objects
        for result in results:
            profile, basename, filecontent = result
            if not result:
                continue

            from django.core.files.base import ContentFile
            # check if the new avatar is different from the old one
            # by comparing the md5 hashes of the two files
            from hashlib import md5
            new_avatar_md5 = md5(filecontent).hexdigest()
            student_profile = profile["profile"]
            new_bio = profile["bio"]
            try:
                old_avatar_filecontent = student_profile.avatar.file.read()
                old_avatar_md5 = md5(old_avatar_filecontent).hexdigest()
                if new_avatar_md5 == old_avatar_md5:
                    print("Avatar is the same. Not updating.")
                    continue
            except Exception as e:
                pass
            print("New avatar. Updating ...")
            student_profile.avatar.save(
                basename, 
                ContentFile(filecontent)
                )
            student_profile.bio = new_bio
            student_profile.save()
