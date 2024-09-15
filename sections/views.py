import json
import re

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
            "enrollments",
            "total_students",
            "passback_status",
            "permissions",
        ]
        canvas_course = None
        try:
            canvas_course = canvas.get_course(
                course_id, use_sis_id=False, include=list_to_include
            )
        except Exception as e:
            print(e)
            return Response(
                data=None,
                status=500,
            )
        canvas_sections = canvas_course.get_sections(include=list_to_include)
        canvas_sections_serialized = []
        for section in canvas_sections:
            retrieved_dict = section.__dict__

            section_dict = {
                "canvas_id": section.id,
                "name": retrieved_dict.get("name", ""),
                "course_id": retrieved_dict.get("course_id", ""),
                "total_students": retrieved_dict.get("total_students", 0),
                "enrollments": retrieved_dict.get("enrollments", []),
            }
            canvas_sections_serialized.append(section_dict)
        return Response(canvas_sections_serialized, status=200)


class ListCanvasCourseSectionsDetailed(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, canvas_id):
        canvas = get_canvas_object()
        list_to_include = [
            "course_image",
            "observed_users",
            "teachers",
            "total_students",
            "sections",
            "course_progress",
            "term",
            "public_description",
            "course_image",
        ]
        canvas_course = None
        try:
            canvas_course = canvas.get_course(
                int(canvas_id), use_sis_id=False, include=list_to_include
            )
        except Exception as e:
            print(e)
            return Response(status=500)
        list_to_include = [
            "enrollments",
            "total_students",
            "passback_status",
            "permissions",
        ]
        canvas_sections = canvas_course.get_sections(include=list_to_include)
        canvas_sections_serialized = []
        for section in canvas_sections:
            section_dict = section.__dict__
            # remove the _requester object
            section_dict.pop("_requester")
            canvas_sections_serialized.append(section_dict)
        canvas_sections = canvas_course.sections
        for section in canvas_sections:
            print(section)
            section_dict = section
            # get the canvas_sections_serialized object with the same id
            section_id = section_dict["id"]
            corresponding_section = next(
                (
                    item
                    for item in canvas_sections_serialized
                    if item["id"] == section_id
                ),
                None,
            )
            if corresponding_section:
                corresponding_section.update(section_dict)
        list_to_include = [
            "enrollments",
            "locked",
            "bio",
            "sis_user_id",
            "sis_login_id",
            "avatar_url",
        ]

        canvas_users = []
        try:
            canvas_users = canvas_course.get_users(
                enrollment_type=["student"], include=list_to_include
            )
        except Exception as e:
            print(e)
        manual_total_students = {}
        for user in canvas_users:
            user_dict = user.__dict__
            # remove the _requester object
            user_dict.pop("_requester")
            student_section_enrollments = user_dict["enrollments"]
            for enrollment in student_section_enrollments:
                if enrollment["type"] != "StudentEnrollment":
                    continue
                section_id = enrollment["course_section_id"]
                if section_id not in manual_total_students:
                    manual_total_students[section_id] = 0
                manual_total_students[section_id] += 1
        for section in canvas_sections_serialized:
            section_id = section["id"]
            if section_id in manual_total_students:
                section["manual_total_students"] = manual_total_students[section_id]
            else:
                section["manual_total_students"] = 0

        canvas_students_serialized = []
        for user in canvas_users:
            user_dict = user.__dict__
            canvas_students_serialized.append(user_dict)

        for section in canvas_sections_serialized:
            # add alreadyAdded flag if the section is already added
            # in the database
            section_id = section["id"]
            Section = apps.get_model("sections", "Section")
            try:
                Section.objects.get(canvas_id=section_id)
                section["alreadyAdded"] = True
            except Exception as e:
                print(e)
                section["alreadyAdded"] = False

        from courses.utils import get_course_from_UFSOC_apix

        try:
            ufsoc_json_response = get_course_from_UFSOC_apix(
                term_name=canvas_course.term["name"],
                course_code=canvas_course.course_code,
                instructor_name="",
                program_level_name="Undergraduate",
            )
            print(ufsoc_json_response)
            if len(ufsoc_json_response) == 0:
                ufsoc_json_response = {
                    "message": "No course found in UFSOC API",
                    "success": False,
                    "error": "No course found in UFSOC API",
                }
            elif len(ufsoc_json_response) == 1:
                ufsoc_json_response = ufsoc_json_response[0]
                ufsoc_json_response["success"] = True
            else:
                ufsoc_json_response = ufsoc_json_response[0]
                ufsoc_json_response["success"] = True
                ufsoc_json_response["error"] = "Multiple courses found in UFSOC API"
        except Exception as e:
            print(f"Handling: {e}")
            ufsoc_json_response = {
                "message": "Something went wrong while fetching courses from UFSOC API.",
                "success": False,
                "error": str(e),
            }
        if not ufsoc_json_response["success"]:
            response_data = {
                "message": "Canvas courses fetched successfully!",
                "sections": canvas_sections_serialized,
                "students": canvas_students_serialized,
                "course_description": "",
                "success": True,
            }
            return Response(response_data, status=200)

        sections = ufsoc_json_response["sections"]
        for section in sections:
            # match section by classNumber or by number
            number = section["number"]
            class_number = section["classNumber"]
            # each canvas_sections_serialized section has name .*\-(\d{4})\((\d{5})\)
            # where the first capture group is the section "number" and the second
            # capture group is the section "classNumber"
            # we need to match either the section number or the classNumber
            regex = r".*\-([0-9a-zA-Z]{4})\((\d{5})\)"
            for canvas_section in canvas_sections_serialized:
                if "name" not in canvas_section:
                    continue
                matches = re.finditer(regex, canvas_section["name"], re.MULTILINE)
                for match in matches:
                    if (match.group(1) == str(number)) or (
                        match.group(2) == str(class_number)
                    ):
                        canvas_section.update(section)
                        break
        try:
            user_last_name = request.user.last_name
            for section in canvas_sections_serialized:
                if "instructors" not in section:
                    continue
                for instructor in section["instructors"]:
                    print(instructor)
                    if user_last_name.lower() in instructor["name"].lower():
                        print("match")
                        section["matchesInstructorLastName"] = True
                        break
        except Exception as e:
            print(e)
            print(
                "User has no last name. Add a last name to the user via the user settings page or the admin page."
            )

        course_description = ufsoc_json_response["description"]
        response_data = {
            "message": "Canvas sections fetched successfully!",
            "sections": canvas_sections_serialized,
            "students": canvas_students_serialized,
            "course_description": course_description,
            "success": True,
        }
        return Response(response_data, status=200)


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


@login_required
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


@login_required
def api_section_meetings(request, pk):
    if request.method == "PUT":
        return api_section_meetings_put_view(request, pk)
    elif request.method == "DELETE":
        return api_section_meetings_delete_view(request, pk)
    else:
        return JsonResponse(
            {"error": "Invalid request method: {}".format(request.method)}
        )
