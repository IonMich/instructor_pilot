from django.contrib.auth.models import User
from rest_framework import serializers


# Serializers define the API representation.
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "url",
            "username",
            "email",
            "is_staff",
            "first_name",
            "last_name",
            "profile",
        ]
        depth = 1
