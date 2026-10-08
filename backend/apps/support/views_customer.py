"""Chat endpoints for shoppers. A secret token identifies the chat, so guests can use it too."""

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import services
from .models import Conversation, Message
from .serializers import (
    ConversationPublicSerializer,
    MessageInputSerializer,
    MessageSerializer,
    StartConversationSerializer,
)

PARSERS = [MultiPartParser, FormParser, JSONParser]


def _messages_after(conversation, request):
    after = request.query_params.get("after")
    messages = conversation.messages.select_related("author")
    if after and after.isdigit():
        messages = messages.filter(id__gt=int(after))
    return MessageSerializer(messages, many=True).data


class StartConversationView(APIView):
    parser_classes = PARSERS
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "support_start"

    def post(self, request):
        serializer = StartConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = request.user if request.user.is_authenticated else None
        conversation = Conversation.objects.create(
            customer=user,
            customer_name=data["name"].strip(),
            customer_contact=(data.get("contact") or (user.email if user else "")).strip(),
        )
        Message.objects.create(
            conversation=conversation,
            sender=Message.Sender.SYSTEM,
            text="Thanks for writing. An operator will join shortly.",
        )
        if data.get("text") or data.get("image"):
            services.add_message(
                conversation,
                sender=Message.Sender.CUSTOMER,
                author=user,
                text=data.get("text", ""),
                image=data.get("image"),
            )
        return Response(
            {
                "conversation": ConversationPublicSerializer(conversation).data,
                "messages": _messages_after(conversation, request),
            },
            status=status.HTTP_201_CREATED,
        )


class ConversationView(APIView):
    """Poll a chat: returns its state and any messages newer than ?after=<id>."""

    def get(self, request, token):
        conversation = get_object_or_404(Conversation.objects.select_related("operator"), token=token)
        return Response(
            {
                "conversation": ConversationPublicSerializer(conversation).data,
                "messages": _messages_after(conversation, request),
            }
        )


class CustomerMessageView(APIView):
    parser_classes = PARSERS
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "support_message"

    def post(self, request, token):
        conversation = get_object_or_404(Conversation, token=token)
        serializer = MessageInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = services.add_message(
            conversation,
            sender=Message.Sender.CUSTOMER,
            author=request.user if request.user.is_authenticated else None,
            **serializer.validated_data,
        )
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


class CustomerCloseView(APIView):
    def post(self, request, token):
        conversation = get_object_or_404(Conversation, token=token)
        services.close(conversation, by="customer")
        return Response(ConversationPublicSerializer(conversation).data)
