"""Stripe Checkout integration (test mode friendly). Disabled when no key is set."""

from __future__ import annotations

from decimal import Decimal

import stripe
from django.conf import settings


def stripe_enabled() -> bool:
    return bool(settings.STRIPE_SECRET_KEY)


def _cents(amount: Decimal) -> int:
    return int((amount * 100).quantize(Decimal("1")))


def create_checkout_session(order) -> str:
    """Create a Stripe Checkout Session for the order and return its URL."""
    stripe.api_key = settings.STRIPE_SECRET_KEY
    line_items = [
        {
            "quantity": item.quantity,
            "price_data": {
                "currency": settings.CURRENCY,
                "unit_amount": _cents(item.unit_price),
                "product_data": {"name": item.product_name},
            },
        }
        for item in order.items.all()
    ]
    if order.shipping > 0:
        line_items.append(
            {
                "quantity": 1,
                "price_data": {
                    "currency": settings.CURRENCY,
                    "unit_amount": _cents(order.shipping),
                    "product_data": {"name": "Shipping"},
                },
            }
        )

    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=line_items,
        customer_email=order.email,
        client_reference_id=str(order.public_id),
        metadata={"order_id": str(order.public_id)},
        success_url=f"{settings.FRONTEND_URL}/checkout/success?order={order.public_id}",
        cancel_url=f"{settings.FRONTEND_URL}/checkout?cancelled=1",
    )
    order.stripe_session_id = session.id
    order.save(update_fields=["stripe_session_id", "updated_at"])
    return session.url


def parse_webhook(payload: bytes, signature: str):
    """Verify the Stripe signature and return the event. Raises on invalid input."""
    return stripe.Webhook.construct_event(payload, signature, settings.STRIPE_WEBHOOK_SECRET)
