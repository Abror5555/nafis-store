"""Order business logic, kept out of views so it can be tested directly."""

from __future__ import annotations

from collections import OrderedDict
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import F
from rest_framework.exceptions import ValidationError

from apps.catalog.models import Product

from . import notifications
from .models import Order, OrderItem

MAX_QTY_PER_LINE = 20


def calculate_shipping(subtotal: Decimal) -> Decimal:
    if subtotal >= Decimal(settings.FREE_SHIPPING_THRESHOLD):
        return Decimal("0.00")
    return Decimal(settings.FLAT_SHIPPING_RATE).quantize(Decimal("0.01"))


def _merge_lines(items: list[dict]) -> OrderedDict[int, int]:
    """Combine duplicate product lines from the client into one quantity per product."""
    merged: OrderedDict[int, int] = OrderedDict()
    for line in items:
        merged[line["product_id"]] = merged.get(line["product_id"], 0) + line["quantity"]
    if any(qty > MAX_QTY_PER_LINE for qty in merged.values()):
        raise ValidationError({"items": f"Maximum {MAX_QTY_PER_LINE} of one item per order."})
    return merged


@transaction.atomic
def create_order(*, customer: dict, items: list[dict], payment_method: str, user=None) -> Order:
    """
    Create an order from client-supplied product IDs and quantities.

    Prices always come from the database, never from the client. Stock rows are
    locked for the duration of the transaction so two buyers can't take the
    last item at the same time.
    """
    lines = _merge_lines(items)
    products = {p.id: p for p in Product.objects.active().select_for_update().filter(id__in=lines.keys())}

    missing = [pid for pid in lines if pid not in products]
    if missing:
        raise ValidationError({"items": "Some products are no longer available. Please refresh your cart."})

    errors = []
    for pid, qty in lines.items():
        product = products[pid]
        if product.stock < qty:
            errors.append(f"Only {product.stock} left of “{product.name}”.")
    if errors:
        raise ValidationError({"items": errors})

    order = Order.objects.create(
        user=user if user and user.is_authenticated else None,
        payment_method=payment_method,
        **customer,
    )

    subtotal = Decimal("0.00")
    order_items = []
    for pid, qty in lines.items():
        product = products[pid]
        line_total = product.price * qty
        subtotal += line_total
        order_items.append(
            OrderItem(
                order=order,
                product=product,
                product_name=product.name,
                product_slug=product.slug,
                unit_price=product.price,
                quantity=qty,
                line_total=line_total,
            )
        )
        Product.objects.filter(pk=pid).update(stock=F("stock") - qty)
    OrderItem.objects.bulk_create(order_items)

    order.subtotal = subtotal
    order.shipping = calculate_shipping(subtotal)
    order.total = subtotal + order.shipping
    order.save(update_fields=["subtotal", "shipping", "total", "updated_at"])

    transaction.on_commit(lambda: notifications.notify_new_order(order.pk))
    return order


@transaction.atomic
def mark_paid(order: Order) -> None:
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.status == Order.Status.PENDING:
        order.status = Order.Status.PAID
        order.save(update_fields=["status", "updated_at"])
        transaction.on_commit(lambda: notifications.notify_order_paid(order.pk))


@transaction.atomic
def cancel_and_restock(order: Order) -> None:
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.status != Order.Status.PENDING:
        return
    for item in order.items.select_related("product"):
        if item.product_id:
            Product.objects.filter(pk=item.product_id).update(stock=F("stock") + item.quantity)
    order.status = Order.Status.CANCELLED
    order.save(update_fields=["status", "updated_at"])
