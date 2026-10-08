from django.conf import settings
from django.db import models
from django.utils import timezone


class StaffProfile(models.Model):
    """Store employees who work in their own panels, not in Django admin."""

    class Role(models.TextChoices):
        OPERATOR = "operator", "Operator"
        EDITOR = "editor", "Content editor"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="staff_profile")
    role = models.CharField(max_length=20, choices=Role.choices)
    phone = models.CharField(max_length=32)
    position = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["role", "user__first_name"]

    def __str__(self) -> str:
        return f"{self.user.get_full_name() or self.user.email} ({self.get_role_display()})"
