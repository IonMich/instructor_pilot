from django import template

register = template.Library()
# Create your views here.



@register.filter(name='dj_iter')
def dj_iter(gen):
    """
    This is used to create a random number in the views.py file.
    
    """
    try:
       return next(gen)
    except StopIteration:
       return 'Completed Iteration'