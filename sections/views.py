import json

from django.apps import apps
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

from courses.utils import get_canvas_object
from sections.models import Meeting, Section

from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.views import APIView


from sections.permissions import IsOwnerOrReadOnly
from sections.serializers import SectionSerializer


class SectionViewSet(viewsets.ModelViewSet):
    """
    This ViewSet automatically provides `list`, `create`, `retrieve`,
    `update` and `destroy` actions.
    """

    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(teaching_assistant=self.request.user)


class SectionInCourseViewSet(viewsets.ModelViewSet):
    """
    This ViewSet automatically provides `list`, `create`, `retrieve`,
    `update` and `destroy` actions.
    """

    serializer_class = SectionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        course_id = self.kwargs["course_pk"]
        course = apps.get_model("courses.Course").objects.get(pk=course_id)
        serializer.save(course)
        serializer.save(teaching_assistant=self.request.user)

    def get_queryset(self):
        course_id = self.kwargs["course_pk"]
        return Section.objects.filter(course_id=course_id)

class ListCanvasCourseSections(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, course_id):
        canvas = get_canvas_object()
        list_to_include = [
            "enrollments", "total_students", 
            "passback_status", "permissions",
        ]
        canvas_course = None
        try:
            canvas_course = canvas.get_course(
                course_id, 
                use_sis_id=False,
                include=list_to_include)
        except Exception as e:
            print(e)
            return Response(
                data=None,
                status=500,
            )
        canvas_sections = canvas_course.get_sections(
            include=list_to_include)
        canvas_sections_serialized = []
        for section in canvas_sections:
            retrieved_dict = section.__dict__
            
            section_dict = {
                'canvas_id': section.id,
                'name': retrieved_dict.get('name', ''),
                'course_id': retrieved_dict.get('course_id', ''),
                'total_students': retrieved_dict.get('total_students', 0),
                'enrollments': retrieved_dict.get('enrollments', []),
            }
            canvas_sections_serialized.append(section_dict)
        return Response(canvas_sections_serialized, status=200)
    




@login_required
def api_section_meetings_put_view(request, pk):
    if request.method != "PUT":
        return JsonResponse(
            {"error": "Invalid request method: {}".format(request.method)}
        )
    try:
        section = Section.objects.get(pk=pk)
    except Section.DoesNotExist:
        return JsonResponse({"error": "Section with pk {} does not exist".format(pk)})
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body"})
    try:
        meeting = Meeting.objects.create(**body)
        section.meetings.add(meeting)
        print(f"Created meeting: {meeting}")
    except Exception as e:
        section.meetings.all().delete()
        return JsonResponse(
            {
                "message": "Error creating meeting: {}".format(e),
                "success": False,
            }
        )
    meeting_id = meeting.pk

    return JsonResponse(
        {
            "message": "Course synced successfully!",
            "meeting_id": meeting_id,
            "success": True,
        }
    )


def api_section_meetings_delete_view(request, pk):
    if request.method != "DELETE":
        return JsonResponse(
            {"error": "Invalid request method: {}".format(request.method)}
        )
    try:
        section = Section.objects.get(pk=pk)
    except Section.DoesNotExist:
        return JsonResponse({"error": "Section with pk {} does not exist".format(pk)})
    try:
        section.meetings.all().delete()
    except Exception as e:
        return JsonResponse(
            {
                "message": "Error deleting meetings: {}".format(e),
                "success": False,
            }
        )
    print(f"Deleted meetings for section: {section}")
    return JsonResponse(
        {
            "message": "Meetings deleted successfully!",
            "success": True,
        }
    )


def api_section_meetings(request, pk):
    if request.method == "PUT":
        return api_section_meetings_put_view(request, pk)
    elif request.method == "DELETE":
        return api_section_meetings_delete_view(request, pk)
    else:
        return JsonResponse(
            {"error": "Invalid request method: {}".format(request.method)}
        )
