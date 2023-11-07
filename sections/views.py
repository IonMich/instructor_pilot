import json
import re

from django.apps import apps
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

from sections.models import Meeting, Section


@login_required
def api_section_meetings_put_view(request, pk):
    if request.method != 'PUT':
        return JsonResponse({'error': 'Invalid request method: {}'.format(request.method)})
    try:
        section = Section.objects.get(pk=pk)
    except Section.DoesNotExist:
        return JsonResponse({'error': 'Section with pk {} does not exist'.format(pk)})
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON body'})
    try:
        meeting = Meeting.objects.create(
            **body)
        section.meetings.add(meeting)
        print(f"Created meeting: {meeting}")
    except Exception as e:
        section.meetings.all().delete()
        return JsonResponse({
            'message': 'Error creating meeting: {}'.format(e),
            'success': False,
        })
    meeting_id = meeting.pk

    return JsonResponse({
        'message': 'Course synced successfully!',
        'meeting_id': meeting_id,
        'success': True,
    })

def api_section_meetings_delete_view(request, pk):
    if request.method != 'DELETE':
        return JsonResponse({'error': 'Invalid request method: {}'.format(request.method)})
    try:
        section = Section.objects.get(pk=pk)
    except Section.DoesNotExist:
        return JsonResponse({'error': 'Section with pk {} does not exist'.format(pk)})
    try:
        section.meetings.all().delete()
    except Exception as e:
        return JsonResponse({
            'message': 'Error deleting meetings: {}'.format(e),
            'success': False,
        })
    print(f"Deleted meetings for section: {section}")
    return JsonResponse({
        'message': 'Meetings deleted successfully!',
        'success': True,
    })

def api_section_meetings(request, pk):
    if request.method == 'PUT':
        return api_section_meetings_put_view(request, pk)
    elif request.method == 'DELETE':
        return api_section_meetings_delete_view(request, pk)
    else:
        return JsonResponse({'error': 'Invalid request method: {}'.format(request.method)})

