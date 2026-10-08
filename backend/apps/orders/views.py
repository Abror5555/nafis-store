import logging

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import payments, services
from .models import Order
from .notifications import telegram_enabled
from .serializers import OrderCreateSerializer, OrderSerializer

logger = logging.getLogger(__name__)


def _field(obj, name):
    """Read a key from a Stripe object or a plain dict (Stripe objects have no .get())."""
    try:
        return obj[name]
    except (KeyError, TypeError):
        return None


class StoreConfigView(APIView):
    """Public store settings the frontend needs (no secrets)."""

    def get(self, request):
        return Response(
            {
                "store_name": settings.STORE_NAME,
                "currency": settings.CURRENCY,
                "free_shipping_threshold": settings.FREE_SHIPPING_THRESHOLD,
                "flat_shipping_rate": settings.FLAT_SHIPPING_RATE,
                "payment_methods": (["card"] if payments.stripe_enabled() else []) + ["cod"],
                "assistant_ai": bool(settings.ANTHROPIC_API_KEY),
                "telegram_notifications": telegram_enabled(),
            }
        )


class OrderCreateView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "orders"

    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data["payment_method"] == Order.PaymentMethod.CARD and not payments.stripe_enabled():
            return Response(
                {"payment_method": ["Card payments are not enabled on this store."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order = services.create_order(
            customer={k: data.get(k, "") for k in OrderCreateSerializer.CUSTOMER_FIELDS},
            items=data["items"],
            payment_method=data["payment_method"],
            user=request.user,
        )

        checkout_url = None
        if order.payment_method == Order.PaymentMethod.CARD:
            try:
                checkout_url = payments.create_checkout_session(order)
            except Exception:
                logger.exception("Stripe session creation failed for %s", order.number)
                services.cancel_and_restock(order)
                return Response(
                    {"detail": "Card payment is unavailable right now. Try cash on delivery."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        return Response(
            {"order": OrderSerializer(order).data, "checkout_url": checkout_url},
            status=status.HTTP_201_CREATED,
        )


class OrderDetailView(APIView):
    """Look up a single order by its unguessable public ID (used by the success page)."""

    def get(self, request, public_id):
        order = get_object_or_404(Order.objects.prefetch_related("items"), public_id=public_id)
        return Response(OrderSerializer(order).data)


class MyOrdersView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = []

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items")


class StripeWebhookView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if not settings.STRIPE_WEBHOOK_SECRET:
            return Response(status=status.HTTP_404_NOT_FOUND)
        try:
            event = payments.parse_webhook(request.body, request.headers.get("Stripe-Signature", ""))
        except Exception:
            return Response({"detail": "Invalid signature."}, status=status.HTTP_400_BAD_REQUEST)

        session = event["data"]["object"]
        order = Order.objects.filter(stripe_session_id=_field(session, "id")).first()
        if order is None:
            return Response(status=status.HTTP_200_OK)

        if event["type"] == "checkout.session.completed" and _field(session, "payment_status") == "paid":
            services.mark_paid(order)
        elif event["type"] == "checkout.session.expired":
            services.cancel_and_restock(order)
        return Response(status=status.HTTP_200_OK)
