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
from profiles.views import UserViewSet
from courses.views import CourseViewSet
from sections.views import SectionViewSet, SectionInCourseViewSet
from assignments.views import AssignmentInCourseViewSet, AssignmentViewSet
from students.views import StudentInSectionViewSet, StudentInCourseViewSet
from submissions.views import PaperSubmissionViewSet, PaperSubmissionInAssignmentViewSet

# Routers provide an easy way of automatically determining the URL conf.
router = routers.DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'courses', CourseViewSet)
router.register(r'sections', SectionViewSet, basename='section')
router.register(r'assignments', AssignmentViewSet, basename='assignment')
router.register(r'submissions', PaperSubmissionViewSet, basename='submission')
course_router = routers.NestedDefaultRouter(router, r'courses', lookup='course')
course_router.register(r'sections', SectionInCourseViewSet, basename='course-section')
course_router.register(r'assignments', AssignmentInCourseViewSet, basename='course-assignment')
course_router.register(r'students', StudentInCourseViewSet, basename='course-student')
section_router = routers.NestedDefaultRouter(router, r'sections', lookup='section')
section_router.register(r'students', StudentInSectionViewSet, basename='section-student')
assignment_router = routers.NestedDefaultRouter(router, r'assignments', lookup='assignment')
assignment_router.register(r'submissions', PaperSubmissionInAssignmentViewSet, basename='assignment-submission')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api-auth/', include('rest_framework.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include(course_router.urls)),
    path('api/', include(section_router.urls)),
    path('api/', include(assignment_router.urls)),
    path('accounts/', include('django.contrib.auth.urls')),
    path('', include('students.urls', namespace='students')),
    path('', include('profiles.urls', namespace='profiles')),
    path('', include('submissions.urls', namespace='submissions')),
    path('', include('courses.urls', namespace='courses')),
    path('', include('assignments.urls', namespace='assignments')),
    path('', include('sections.urls', namespace='sections')),
]

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)