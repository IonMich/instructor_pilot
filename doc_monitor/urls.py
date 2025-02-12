"""doc_monitor URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from rest_framework_nested import routers
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from profiles.views import UserViewSet, RequesterUserViewSet
from courses.views import (
    CourseViewSet,
    AnnouncementsInCourseViewSet,
    ListCanvasCourses,
    GetCanvasCourse,
    PostCanvasCourse,
    PostCanvasSection,
    PostCanvasCourseEnrollments,
    PostCanvasAssignmentGroup,
    PostCanvasAssignment,
    PostCanvasAnnouncement,
    ListCanvasCourseAssignmentGroups,
    ListCanvasCourseAssignments,
    ListCanvasCourseAnnouncements,
)
from sections.views import (
    SectionViewSet,
    SectionInCourseViewSet,
    ListCanvasCourseSections,
    ListCanvasCourseSectionsDetailed,
    SectionMeetingsView,
)
from assignments.views import (
    AssignmentInCourseViewSet,
    AssignmentViewSet,
    ListAssignmentScoresViewSet,
    AssignmentIdentifySubmissions,
    AssignmentVersionSubmissions,
    AssignmentExtractInfoSubmissions,
    ExportSubmissionsPDFsView
)
from students.views import StudentInSectionViewSet, StudentInCourseViewSet
from submissions.views import (
    PaperSubmissionViewSet,
    PaperSubmissionInAssignmentViewSet,
    PaperSubmissionOfStudentInCourseViewSet,
    CommentViewSet,
)

# Routers provide an easy way of automatically determining the URL conf.
router = routers.DefaultRouter()
router.register(r"users", UserViewSet)
router.register(r"courses", CourseViewSet)
router.register(r"sections", SectionViewSet, basename="section")
router.register(r"assignments", AssignmentViewSet, basename="assignment")
router.register(r"submissions", PaperSubmissionViewSet, basename="submission")
router.register(r"comments", CommentViewSet, basename="comment")
course_router = routers.NestedDefaultRouter(router, r"courses", lookup="course")
course_router.register(r"sections", SectionInCourseViewSet, basename="course-section")
course_router.register(
    r"assignments", AssignmentInCourseViewSet, basename="course-assignment"
)
course_router.register(
    r"announcements", AnnouncementsInCourseViewSet, basename="course-announcement"
)
course_router.register(r"students", StudentInCourseViewSet, basename="course-student")
student_in_course_router = routers.NestedDefaultRouter(
    course_router, r"students", lookup="student"
)
student_in_course_router.register(
    r"submissions",
    PaperSubmissionOfStudentInCourseViewSet,
    basename="student-course-submission",
)
section_router = routers.NestedDefaultRouter(router, r"sections", lookup="section")
section_router.register(
    r"students", StudentInSectionViewSet, basename="section-student"
)
assignment_router = routers.NestedDefaultRouter(
    router, r"assignments", lookup="assignment"
)
assignment_router.register(
    r"submissions", PaperSubmissionInAssignmentViewSet, basename="assignment-submission"
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api-auth/", include("rest_framework.urls")),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/", include(course_router.urls)),
    path("api/", include(section_router.urls)),
    path("api/", include(assignment_router.urls)),
    path("api/", include(student_in_course_router.urls)),
    path("accounts/", include("django.contrib.auth.urls")),
    path("", include("students.urls", namespace="students")),
    path("", include("profiles.urls", namespace="profiles")),
    path("", include("submissions.urls", namespace="submissions")),
    path("", include("courses.urls", namespace="courses")),
    path("", include("assignments.urls", namespace="assignments")),
    path("", include("sections.urls", namespace="sections")),
    path(
        "api/requester/",
        RequesterUserViewSet.as_view(),
        name="requester-user",
    ),
    path(
        "api/assignments/<int:assignment_id>/scores/",
        ListAssignmentScoresViewSet.as_view(),
        name="assignment-scores",
    ),
    path(
        "api/assignments/<int:assignment_id>/identify_submissions/",
        AssignmentIdentifySubmissions.as_view(),
        name="assignment-identify-submissions",
    ),
    path(
        "api/assignments/<int:assignment_id>/version_submissions/",
        AssignmentVersionSubmissions.as_view(),
        name="assignment-version-submissions",
    ),
    path(
        "api/assignments/<int:assignment_id>/extract_info/",
        AssignmentExtractInfoSubmissions.as_view(),
        name="assignment-extract-submissions",
    ),
    path(
        "api/assignments/<int:assignment_id>/export_pdfs/",
        ExportSubmissionsPDFsView.as_view(),
        name="export-submissions-pdfs",
    ),
    # canvas api
    path("api/canvas/courses/", ListCanvasCourses.as_view(), name="canvas-courses"),
    path(
        "api/canvas/courses/<int:canvas_id>/",
        GetCanvasCourse.as_view(),
        name="canvas-course",
    ),
    path(
        "api/canvas/courses/<int:canvas_id>/sections/",
        ListCanvasCourseSections.as_view(),
        name="canvas-course-sections",
    ),
    path(
        "legacy/canvas/courses/<int:canvas_id>/sections/",
        ListCanvasCourseSectionsDetailed.as_view(),
        name="canvas-course-sections-detailed",
    ),
    path(
        "legacy/canvas/courses/<int:canvas_id>/assignment_groups/",
        ListCanvasCourseAssignmentGroups.as_view(),
        name="canvas-course-assignment-groups",
    ),
    path(
        "legacy/canvas/courses/<int:canvas_id>/assignments/",
        ListCanvasCourseAssignments.as_view(),
        name="canvas-course-assignments",
    ),
    path(
        "legacy/canvas/courses/<int:canvas_id>/announcements/",
        ListCanvasCourseAnnouncements.as_view(),
        name="canvas-course-announcements",
    ),
    path(
        "legacy/courses/create/", PostCanvasCourse.as_view(), name="api-create-course"
    ),
    path(
        "legacy/courses/<int:course_id>/sections/create/",
        PostCanvasSection.as_view(),
        name="api-create-section",
    ),
    path(
        "legacy/sections/<int:section_id>/meetings/",
        SectionMeetingsView.as_view(),
        name="api-meeting",
    ),
    path(
        "legacy/courses/<int:course_id>/enrollments/create/",
        PostCanvasCourseEnrollments.as_view(),
        name="api-create-enrollment",
    ),
    path(
        "legacy/courses/<int:course_id>/assignmentgroups/create/",
        PostCanvasAssignmentGroup.as_view(),
        name="api-create-assignment-group",
    ),
    path(
        "legacy/courses/<int:course_id>/assignments/create/",
        PostCanvasAssignment.as_view(),
        name="api-create-assignment",
    ),
    path(
        "legacy/courses/<int:course_id>/announcements/create/",
        PostCanvasAnnouncement.as_view(),
        name="api-create-announcement",
    ),
]

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
