from django.apps import apps
from django.db import models
from django.db.models import Q

from sections.models import Section

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
    
    def get_section_in_course(self, course):
        # if the student is enrolled in multiple sections in the same course
        # raise an error
        student_sections = self.sections.filter(course=course)
        
        if len(student_sections) > 1:
            raise ValueError(f"Student {self} is enrolled in multiple sections in course {course}")
        elif len(student_sections) == 0:
            return None
        else:
            return student_sections.first()
        
    def get_papersubmissions_in_course(self, course):
        """returns a list of submissions for this student in the given course
        """
        PaperSubmission = apps.get_model('submissions', 'PaperSubmission')
        submissions = PaperSubmission.objects.filter(
            Q(student=self) & Q(assignment__course=course)
        )
        return submissions


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

            # check if the new avatar is different from the old one
            # by comparing the md5 hashes of the two files
            from hashlib import md5

            from django.core.files.base import ContentFile
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
