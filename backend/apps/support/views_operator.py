"""Operator desk: the chat queue, replies with images, quick product facts and personal stats."""

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, serializers, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.roles import IsOperator
from apps.boss import analytics
from apps.catalog.models import Product

from . import services
from .models import Conversation, Message
from .serializers import ConversationListSerializer, MessageInputSerializer, MessageSerializer


def _visible(user):
    """Operators see the shared waiting queue and their own chats, never a colleague's open chat."""
    return Conversation.objects.filter(Q(status=Conversation.Status.WAITING) | Q(operator=user))


class OperatorMeView(APIView):
    permission_classes = [IsOperator]

    def get(self, request):
        user = request.user
        period = analytics.make_period(request.query_params.get("range"))
        return Response(
            {
                "profile": {
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "phone": user.staff_profile.phone,
                    "position": user.staff_profile.position,
                    "joined": user.staff_profile.created_at,
                },
                "stats": analytics.operator_personal(user, period),
                "queue": {
                    "waiting": Conversation.objects.filter(status=Conversation.Status.WAITING).count(),
                    "mine_open": Conversation.objects.filter(operator=user, status=Conversation.Status.OPEN).count(),
                },
            }
        )


class OperatorConversationList(generics.ListAPIView):
    permission_classes = [IsOperator]
    serializer_class = ConversationListSerializer
    filter_backends = []
    pagination_class = None  # queues are short; closed chats are capped below

    def get_queryset(self):
        box = self.request.query_params.get("box", "waiting")
        qs = _visible(self.request.user).select_related("operator")
        if box == "mine":
            return qs.filter(operator=self.request.user, status=Conversation.Status.OPEN)
        if box == "closed":
            return qs.filter(operator=self.request.user, status=Conversation.Status.CLOSED)[:50]
        return qs.filter(status=Conversation.Status.WAITING).order_by("created_at")


class OperatorConversationDetail(APIView):
    permission_classes = [IsOperator]

    def get(self, request, pk):
        conversation = get_object_or_404(_visible(request.user).select_related("customer"), pk=pk)
        messages = conversation.messages.select_related("author")
        after = request.query_params.get("after")
        if after and after.isdigit():
            messages = messages.filter(id__gt=int(after))
        previous_chats = 0
        if conversation.customer_id:
            previous_chats = Conversation.objects.filter(customer_id=conversation.customer_id).exclude(pk=pk).count()
        return Response(
            {
                "conversation": ConversationListSerializer(conversation, context={"request": request}).data,
                "customer": {
                    "name": conversation.customer_name,
                    "contact": conversation.customer_contact,
                    "registered": conversation.customer_id is not None,
                    "orders": conversation.customer.orders.count() if conversation.customer_id else 0,
                    "previous_chats": previous_chats,
                },
                "messages": MessageSerializer(messages, many=True).data,
            }
        )


class OperatorClaimView(APIView):
    permission_classes = [IsOperator]

    def post(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk)
        services.claim(conversation, request.user)
        return Response({"ok": True})


class OperatorMessageView(APIView):
    permission_classes = [IsOperator]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk)
        if conversation.status == Conversation.Status.WAITING and not conversation.operator_id:
            services.claim(conversation, request.user)
            conversation.refresh_from_db()
        if conversation.operator_id != request.user.id:
            return Response({"detail": "This chat belongs to another operator."}, status=status.HTTP_403_FORBIDDEN)
        serializer = MessageInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = services.add_message(
            conversation, sender=Message.Sender.OPERATOR, author=request.user, **serializer.validated_data
        )
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


class OperatorCloseView(APIView):
    permission_classes = [IsOperator]

    def post(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk, operator=request.user)
        services.close(conversation, by="operator")
        return Response({"ok": True})


class ProductFactSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name")
    category_slug = serializers.CharField(source="category.slug")
    seller = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "slug",
            "category",
            "category_slug",
            "seller",
            "price",
            "stock",
            "origin",
            "materials",
            "dimensions",
            "summary",
            "image",
            "is_active",
        )

    def get_seller(self, obj):
        return obj.firm.name if obj.firm_id else "Nafis"

    def get_image(self, obj):
        return obj.image.url if obj.image else None


class OperatorProductLookup(generics.ListAPIView):
    """Short product facts an operator can read out to a customer."""

    permission_classes = [IsOperator]
    serializer_class = ProductFactSerializer
    search_fields = ("name", "summary", "materials", "origin", "category__name", "firm__name")
    ordering = ("name",)
    filterset_fields = ("category",)

    def get_queryset(self):
        return Product.objects.select_related("category", "firm")
