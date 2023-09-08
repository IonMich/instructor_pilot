from django import forms

from courses.models import Course


class SyncFromCanvasForm(forms.ModelForm):
    class Meta:
        model=Course
        fields=('id',)

    def sync_from_canvas(self, pk, requester):
        course = Course.objects.get(pk=pk)
        print(f"pk={pk}")
        course = course.update_from_canvas(requester)
        return course

class CreateCourseForm(forms.ModelForm):
    class Meta:
        model=Course
        fields=('name', 'description', 'semester_type', 'term', 'university', 'instructors', 'course_code', 'image', 'canvas_id', 'start_date', 'end_date', )

    def create_course(self, requester):
        import datetime

        from django.utils import timezone
        
        course = Course.objects.create(
            name=self.cleaned_data['name'],
            description=self.cleaned_data['description'],
            semester_type=self.cleaned_data['semester_type'],
            term=self.cleaned_data['term'],
            university=self.cleaned_data['university'],
            instructors=self.cleaned_data['instructors'],
            course_code=self.cleaned_data['course_code'],
            image=self.cleaned_data['image'],
            canvas_id=self.cleaned_data['canvas_id'],
            start_date=self.cleaned_data['start_date'],
            end_date=self.cleaned_data['end_date'],
        )
    
