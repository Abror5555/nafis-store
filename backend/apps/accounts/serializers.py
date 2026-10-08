from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import StaffProfile
from .roles import PANEL_PATHS, role_of

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=60)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        candidate = User(username=attrs["email"], email=attrs["email"], first_name=attrs["first_name"])
        validate_password(attrs["password"], user=candidate)
        return attrs

    def create(self, validated_data):
        # The email doubles as the username so everyone signs in with their email.
        return User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            first_name=validated_data["first_name"],
            password=validated_data["password"],
        )


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    panel = serializers.SerializerMethodField()
    firm_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "first_name", "last_name", "email", "date_joined", "role", "panel", "firm_name")
        read_only_fields = fields

    def get_role(self, obj):
        return role_of(obj)

    def get_panel(self, obj):
        return PANEL_PATHS.get(role_of(obj), "/account")

    def get_firm_name(self, obj):
        return obj.firm.name if hasattr(obj, "firm") else None


class StaffCreateSerializer(serializers.Serializer):
    """Used by the boss to add an operator or a content editor."""

    first_name = serializers.CharField(max_length=60)
    last_name = serializers.CharField(max_length=60)
    email = serializers.EmailField()
    phone = serializers.RegexField(r"^\+?[0-9 ()-]{7,20}$", error_messages={"invalid": "Enter a valid phone number."})
    position = serializers.CharField(max_length=80, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        candidate = User(username=attrs["email"], email=attrs["email"], first_name=attrs["first_name"])
        validate_password(attrs["password"], user=candidate)
        return attrs

    def create(self, validated_data):
        role = self.context["role"]
        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            password=validated_data["password"],
        )
        # Staff accounts are deliberately NOT is_staff: they can't open Django admin.
        StaffProfile.objects.create(
            user=user, role=role, phone=validated_data["phone"], position=validated_data.get("position", "")
        )
        return user
