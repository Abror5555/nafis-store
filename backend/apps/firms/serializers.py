import re
from datetime import date

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from apps.catalog.models import Category

from .models import PASSPORT_PATTERN, Firm

User = get_user_model()
PHONE = r"^\+?[0-9 ()-]{7,20}$"


class FirmRegisterSerializer(serializers.Serializer):
    # Account
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    # Company
    name = serializers.CharField(max_length=120)
    legal_form = serializers.ChoiceField(choices=Firm.LegalForm.choices)
    tax_id = serializers.RegexField(r"^\d{9}$", error_messages={"invalid": "Tax ID (STIR) must be 9 digits."})
    main_category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), required=False, allow_null=True)
    city = serializers.CharField(max_length=80)
    address = serializers.CharField(max_length=255)
    phone = serializers.RegexField(PHONE, error_messages={"invalid": "Enter a valid phone number."})
    company_email = serializers.EmailField()
    website = serializers.URLField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    # Owner
    owner_full_name = serializers.CharField(max_length=160)
    owner_phone = serializers.RegexField(PHONE, error_messages={"invalid": "Enter a valid phone number."})
    owner_birth_date = serializers.DateField()
    passport_number = serializers.CharField(max_length=16, write_only=True)
    passport_issued_by = serializers.CharField(max_length=160)
    passport_issue_date = serializers.DateField()
    accept_terms = serializers.BooleanField()

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_tax_id(self, value):
        if Firm.objects.filter(tax_id=value).exists():
            raise serializers.ValidationError("A firm with this tax ID is already registered.")
        return value

    def validate_passport_number(self, value):
        value = value.strip().upper().replace(" ", "")
        if not re.fullmatch(PASSPORT_PATTERN, value):
            raise serializers.ValidationError("Use the format AA1234567: two letters and seven digits.")
        return value

    def validate_owner_birth_date(self, value):
        today = date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 18:
            raise serializers.ValidationError("The owner must be at least 18 years old.")
        if age > 110:
            raise serializers.ValidationError("Check the date of birth.")
        return value

    def validate_passport_issue_date(self, value):
        if value > date.today():
            raise serializers.ValidationError("The issue date can't be in the future.")
        return value

    def validate_accept_terms(self, value):
        if not value:
            raise serializers.ValidationError("Accept the seller terms to continue.")
        return value

    def validate(self, attrs):
        first_name = attrs["owner_full_name"].split()[0] if attrs["owner_full_name"].split() else ""
        validate_password(
            attrs["password"], user=User(username=attrs["email"], email=attrs["email"], first_name=first_name)
        )
        return attrs

    @transaction.atomic
    def create(self, data):
        parts = data["owner_full_name"].split()
        user = User.objects.create_user(
            username=data["email"],
            email=data["email"],
            first_name=parts[0] if parts else "",
            last_name=" ".join(parts[1:]),
            password=data["password"],
        )
        firm = Firm(
            owner=user,
            name=data["name"].strip(),
            legal_form=data["legal_form"],
            tax_id=data["tax_id"],
            main_category=data.get("main_category"),
            city=data["city"],
            address=data["address"],
            phone=data["phone"],
            email=data["company_email"],
            website=data.get("website", ""),
            description=data.get("description", ""),
            owner_full_name=data["owner_full_name"].strip(),
            owner_phone=data["owner_phone"],
            owner_birth_date=data["owner_birth_date"],
            passport_issued_by=data["passport_issued_by"],
            passport_issue_date=data["passport_issue_date"],
        )
        firm.passport_number = data["passport_number"]
        firm.save()
        return firm


class FirmProfileSerializer(serializers.ModelSerializer):
    """What the firm owner (and the boss) sees. The passport number is only ever shown masked here."""

    legal_form_display = serializers.CharField(source="get_legal_form_display", read_only=True)
    main_category_name = serializers.CharField(source="main_category.name", read_only=True, default="")
    passport_masked = serializers.CharField(read_only=True)
    owner_email = serializers.EmailField(source="owner.email", read_only=True)

    class Meta:
        model = Firm
        fields = (
            "id",
            "name",
            "legal_form",
            "legal_form_display",
            "tax_id",
            "main_category",
            "main_category_name",
            "city",
            "address",
            "phone",
            "email",
            "website",
            "description",
            "owner_full_name",
            "owner_phone",
            "owner_email",
            "owner_birth_date",
            "passport_masked",
            "passport_issued_by",
            "passport_issue_date",
            "status",
            "is_verified",
            "verified_at",
            "created_at",
        )
        read_only_fields = (
            "id",
            "name",
            "legal_form",
            "tax_id",
            "owner_full_name",
            "owner_phone",
            "owner_birth_date",
            "passport_issued_by",
            "passport_issue_date",
            "status",
            "is_verified",
            "verified_at",
            "created_at",
        )
