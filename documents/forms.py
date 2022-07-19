from django import forms

CHOICES = (
    ('1', 'Quiz 1'),
    ('2', 'Quiz 2'),
    ('3', 'Quiz 3'),
)

class DocumentSearchForm(forms.Form):
    date_from = forms.DateField(widget=forms.DateInput(attrs={'type': 'date'}))
    date_to = forms.DateField(widget=forms.DateInput(attrs={'type': 'date'}))
    assignment_group = forms.ChoiceField(choices=CHOICES)
    include_makeups = forms.BooleanField(initial=True, required=False)

