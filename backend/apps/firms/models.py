from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

from apps.core import crypto

tax_id_validator = RegexValidator(r"^\d{9}$", "Tax ID (STIR) must be 9 digits.")
PASSPORT_PATTERN = r"^[A-Z]{2}\d{7}$"


class Firm(models.Model):
    """A business that sells its products through the store."""

    class LegalForm(models.TextChoices):
        LLC = "llc", "Limited liability company (LLC)"
        SOLE = "sole", "Sole proprietor"
        JSC = "jsc", "Joint-stock company"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"

    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="firm")

    # Company
    name = models.CharField(max_length=120)
    legal_form = models.CharField(max_length=10, choices=LegalForm.choices)
    tax_id = models.CharField("Tax ID (STIR)", max_length=9, unique=True, validators=[tax_id_validator])
    main_category = models.ForeignKey(
        "catalog.Category", on_delete=models.SET_NULL, null=True, blank=True, related_name="firms"
    )
    city = models.CharField(max_length=80)
    address = models.CharField(max_length=255)
    phone = models.CharField(max_length=32)
    email = models.EmailField()
    website = models.URLField(blank=True)
    description = models.TextField(blank=True)

    # Owner (identity check). The passport number is stored encrypted.
    owner_full_name = models.CharField(max_length=160)
    owner_phone = models.CharField(max_length=32)
    owner_birth_date = models.DateField()
    passport_number_encrypted = models.TextField()
    passport_issued_by = models.CharField(max_length=160)
    passport_issue_date = models.DateField()

    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE)
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    @property
    def passport_number(self) -> str:
        return crypto.decrypt(self.passport_number_encrypted)

    @passport_number.setter
    def passport_number(self, value: str) -> None:
        self.passport_number_encrypted = crypto.encrypt(value.strip().upper())

    @property
    def passport_masked(self) -> str:
        return crypto.mask(self.passport_number)
