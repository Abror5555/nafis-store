from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Conversation, Message


def add_message(conversation: Conversation, *, sender: str, author=None, text: str = "", image=None) -> Message:
    if conversation.status == Conversation.Status.CLOSED:
        raise ValidationError({"detail": "This chat has ended. Start a new one to keep talking."})
    message = Message.objects.create(
        conversation=conversation, sender=sender, author=author, text=text or "", image=image or ""
    )
    now = timezone.now()
    conversation.last_message_at = now
    fields = ["last_message_at"]
    if sender == Message.Sender.OPERATOR and conversation.first_response_at is None:
        conversation.first_response_at = now
        fields.append("first_response_at")
    conversation.save(update_fields=fields)
    return message


@transaction.atomic
def claim(conversation: Conversation, operator) -> Conversation:
    conversation = Conversation.objects.select_for_update().get(pk=conversation.pk)
    if conversation.status != Conversation.Status.WAITING or conversation.operator_id:
        raise ValidationError({"detail": "Another operator has already taken this chat."})
    conversation.operator = operator
    conversation.status = Conversation.Status.OPEN
    conversation.save(update_fields=["operator", "status"])
    Message.objects.create(
        conversation=conversation,
        sender=Message.Sender.SYSTEM,
        text=f"{operator.first_name or 'An operator'} joined the chat.",
    )
    return conversation


def close(conversation: Conversation, *, by: str) -> Conversation:
    if conversation.status == Conversation.Status.CLOSED:
        return conversation
    Message.objects.create(
        conversation=conversation,
        sender=Message.Sender.SYSTEM,
        text="The customer ended the chat." if by == "customer" else "The operator closed the chat.",
    )
    conversation.status = Conversation.Status.CLOSED
    conversation.closed_at = timezone.now()
    conversation.save(update_fields=["status", "closed_at"])
    return conversation
