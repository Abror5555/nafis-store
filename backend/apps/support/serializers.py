from rest_framework import serializers

from apps.core.uploads import validate_image

from .models import Conversation, Message


def display_name(user) -> str:
    if not user:
        return ""
    return user.get_full_name() or user.first_name or user.email


class MessageSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ("id", "sender", "author_name", "text", "image", "created_at")

    def get_author_name(self, obj):
        return obj.author.first_name if obj.author and obj.sender == Message.Sender.OPERATOR else ""

    def get_image(self, obj):
        return obj.image.url if obj.image else None


class MessageInputSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=2000, required=False, allow_blank=True, trim_whitespace=True)
    image = serializers.ImageField(required=False, allow_null=True, validators=[validate_image])

    def validate(self, attrs):
        if not attrs.get("text") and not attrs.get("image"):
            raise serializers.ValidationError("Write a message or attach an image.")
        return attrs


class StartConversationSerializer(MessageInputSerializer):
    name = serializers.CharField(max_length=80)
    contact = serializers.CharField(max_length=120, required=False, allow_blank=True)

    def validate(self, attrs):
        # Opening a chat with only a name is allowed; the first message can come later.
        return attrs


class ConversationPublicSerializer(serializers.ModelSerializer):
    operator_name = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ("token", "status", "customer_name", "operator_name", "created_at")

    def get_operator_name(self, obj):
        return obj.operator.first_name if obj.operator else ""


class ConversationListSerializer(serializers.ModelSerializer):
    operator_name = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()
    is_registered = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = (
            "id",
            "customer_name",
            "customer_contact",
            "status",
            "operator_name",
            "is_mine",
            "is_registered",
            "created_at",
            "first_response_at",
            "last_message_at",
            "last_message",
        )

    def get_operator_name(self, obj):
        return display_name(obj.operator)

    def get_last_message(self, obj):
        message = obj.messages.exclude(sender=Message.Sender.SYSTEM).order_by("-id").first()
        if not message:
            return None
        return {
            "sender": message.sender,
            "text": message.text[:120],
            "has_image": bool(message.image),
        }

    def get_is_mine(self, obj):
        request = self.context.get("request")
        return bool(request and obj.operator_id == request.user.id)

    def get_is_registered(self, obj):
        return obj.customer_id is not None
