import pandas as pd

from sections.models import Section
from students.models import Student


def import_students_to_sections(csv_fpath: str):
    """
    Import students to sections.
    """
    df = pd.read_csv(csv_fpath, skiprows=[1,], dtype=str)
    for i, row in df.iterrows():
        try:
            import re
            match = re.match(r'.*\((\d{5})\)',row['Section'])
            if match is None:
                raise ValueError("No 5 digit match in section")
            print(f"{match.group(1)}")
            section = Section.objects.get(class_number=str(match.group(1)))
        except Section.DoesNotExist:
            print("section does not exist")
            section = None
            continue
        
        match = re.match(r"(.*),\s(.*)",row['Name'])
        if match is None:
            raise ValueError("Student name should be in the format 'Last, First'")
        print(f"{match.group(1)} {match.group(2)}")
        print(row['SIS User ID'])
        print(row.get('SIS Login ID'))
        student, created = Student.objects.get_or_create(
            first_name=match.group(2),
            last_name=match.group(1),
            uni_id=row['SIS User ID'],
            email=row.get('SIS Login ID'))
        
        print(created)
        print("Student:", student.__dict__)
        if section is not None:
            student.sections.add(section)
            section.save()
            print(f"Added {student.first_name} {student.last_name}"
                f" ({student.uni_id}) to {section.name}")
    print("Done.")
    return df