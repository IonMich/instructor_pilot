import glob
import os

import pandas as pd

from django.db.models import Q
from sections.models import Section
from students.models import Student
from universities.models import University


def import_students_to_sections(csv_fpath):
    """
    Import students to sections.
    """
    df = pd.read_csv(csv_fpath, skiprows=[1,], dtype=str)
    for i, row in df.iterrows():
        try:
            import re
            match = re.match('.*\((\d{5})\)',row['Section'])
            print(f"{match.group(1)}")
            section = Section.objects.get(name=str(match.group(1)))
        except Section.DoesNotExist:
            print("section does not exist")
            section = None
        
        university = University.objects.get(
            Q(university_code__iexact="ufl")
        )
        
        match = re.match("(.*),\s(.*)",row['Student'])
        print(f"{match.group(1)} {match.group(2)}")
        print(row['SIS User ID'])
        print(row['SIS Login ID'])
        student, created = Student.objects.get_or_create(
            first_name=match.group(2),
            last_name=match.group(1),
            university=university,
            uni_id=row['SIS User ID'],
            email=row['SIS Login ID'])
        
        student.sections.add(section)
        print(created)
        print("Student:", student.__dict__)
        section.save()
        print(f"Added {student.first_name} {student.last_name}"
                f" ({student.uni_id}) to {section.name}")
    print("Done.")
    return df