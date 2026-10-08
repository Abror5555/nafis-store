import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.uploads import support_image_path


class Conversation(models.Model):
    """A live chat between a shopper and a store operator."""

    class Status(models.TextChoices):
        WAITING = "waiting", "Waiting for an operator"
        OPEN = "open", "In progress"
        CLOSED = "closed", "Closed"

    # Secret handle the shopper's browser keeps; works for guests without an account.
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_conversations",
    )
    customer_name = models.CharField(max_length=80)
    customer_contact = models.CharField(max_length=120, blank=True)
    operator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="handled_conversations",
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.WAITING, db_index=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    first_response_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    last_message_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-last_message_at"]

    def __str__(self) -> str:
        return f"Chat #{self.pk} with {self.customer_name}"

    @property
    def response_seconds(self) -> int | None:
        if not self.first_response_at:
            return None
        return int((self.first_response_at - self.created_at).total_seconds())

    @property
    def customer_key(self) -> str:
        """Identifies the person behind the chat, for counting unique customers served."""
        if self.customer_id:
            return f"user:{self.customer_id}"
        if self.customer_contact:
            return f"contact:{self.customer_contact.strip().lower()}"
        return f"chat:{self.token}"


class Message(models.Model):
    class Sender(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        OPERATOR = "operator", "Operator"
        SYSTEM = "system", "System"

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.CharField(max_length=10, choices=Sender.choices)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    text = models.TextField(blank=True, max_length=2000)
    image = models.ImageField(upload_to=support_image_path, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return f"{self.get_sender_display()}: {self.text[:40]}"
