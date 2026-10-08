"""Telegram notifications for the shop owner. Silently disabled when not configured."""

from __future__ import annotations

import html
import logging
import threading

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def telegram_enabled() -> bool:
    return bool(settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_ADMIN_CHAT_ID)


def _send(text: str) -> None:
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        response = requests.post(
            url,
            json={
                "chat_id": settings.TELEGRAM_ADMIN_CHAT_ID,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            },
            timeout=8,
        )
        if response.status_code != 200:
            logger.warning("Telegram returned %s: %s", response.status_code, response.text[:200])
    except requests.RequestException:
        logger.exception("Telegram notification failed")


def _dispatch(text: str) -> None:
    # Run in a background thread so checkout never waits on Telegram.
    threading.Thread(target=_send, args=(text,), daemon=True).start()


def build_new_order_message(order) -> str:
    esc = html.escape
    lines = [f"🛒 <b>New order {esc(order.number)}</b>", ""]
    for item in order.items.all():
        lines.append(f"• {esc(item.product_name)} × {item.quantity} — ${item.line_total}")
    lines += [
        "",
        f"Subtotal: ${order.subtotal}",
        f"Shipping: ${order.shipping}",
        f"<b>Total: ${order.total}</b>",
        f"Payment: {esc(order.get_payment_method_display())}",
        "",
        f"👤 {esc(order.full_name)}",
        f"📞 {esc(order.phone)}",
        f"✉️ {esc(order.email)}",
        f"📍 {esc(order.city)}, {esc(order.country)}",
    ]
    if order.note:
        lines.append(f"📝 {esc(order.note)}")
    return "\n".join(lines)


def notify_new_order(order_id: int) -> None:
    if not telegram_enabled():
        return
    from .models import Order

    order = Order.objects.prefetch_related("items").get(pk=order_id)
    _dispatch(build_new_order_message(order))


def notify_order_paid(order_id: int) -> None:
    if not telegram_enabled():
        return
    from .models import Order

    order = Order.objects.get(pk=order_id)
    _dispatch(f"✅ Order <b>{html.escape(order.number)}</b> was paid: ${order.total}")
