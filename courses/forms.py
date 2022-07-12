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
    
