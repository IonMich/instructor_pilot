from rest_framework import permissions

class IsTA(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Write permissions are only allowed to the owner of the snippet.
        sections = obj.sections.all()
        return any([section.teaching_assistant == request.user for section in sections])