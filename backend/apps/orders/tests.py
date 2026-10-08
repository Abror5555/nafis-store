from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.catalog.models import Category, Product

from .models import Order
from .notifications import build_new_order_message

CUSTOMER = {
    "full_name": "Aziza Karimova",
    "email": "aziza@example.com",
    "phone": "+998 90 123 45 67",
    "country": "Uzbekistan",
    "city": "Tashkent",
    "address": "Amir Temur 1",
}


@override_settings(STRIPE_SECRET_KEY="", TELEGRAM_BOT_TOKEN="")
class OrderApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        category = Category.objects.create(name="Ceramics")
        cls.plate = Product.objects.create(
            category=category,
            name="Plate",
            summary="x",
            description="x",
            price=Decimal("40.00"),
            stock=3,
            origin="Rishtan",
        )
        cls.bowl = Product.objects.create(
            category=category,
            name="Bowl",
            summary="x",
            description="x",
            price=Decimal("120.00"),
            stock=1,
            origin="Rishtan",
        )

    def setUp(self):
        cache.clear()  # reset rate-limit counters between tests
        self.client = APIClient()

    def post_order(self, items, payment_method="cod", **extra):
        payload = {**CUSTOMER, "payment_method": payment_method, "items": items, **extra}
        return self.client.post(reverse("order-create"), payload, format="json")

    def test_creates_order_with_server_side_prices(self):
        response = self.post_order([{"product_id": self.plate.id, "quantity": 2}], price="0.01")
        self.assertEqual(response.status_code, 201, response.content)
        order = response.json()["order"]
        self.assertEqual(Decimal(order["subtotal"]), Decimal("80.00"))
        self.assertEqual(Decimal(order["shipping"]), Decimal("12.00"))
        self.assertEqual(Decimal(order["total"]), Decimal("92.00"))
        self.assertIsNone(response.json()["checkout_url"])
        self.plate.refresh_from_db()
        self.assertEqual(self.plate.stock, 1)

    def test_free_shipping_over_threshold(self):
        response = self.post_order(
            [{"product_id": self.plate.id, "quantity": 1}, {"product_id": self.bowl.id, "quantity": 1}]
        )
        self.assertEqual(Decimal(response.json()["order"]["shipping"]), Decimal("0.00"))

    def test_duplicate_lines_are_merged_before_stock_check(self):
        response = self.post_order(
            [{"product_id": self.plate.id, "quantity": 2}, {"product_id": self.plate.id, "quantity": 2}]
        )
        self.assertEqual(response.status_code, 400)
        self.plate.refresh_from_db()
        self.assertEqual(self.plate.stock, 3)
        self.assertEqual(Order.objects.count(), 0)

    def test_rejects_insufficient_stock(self):
        response = self.post_order([{"product_id": self.bowl.id, "quantity": 2}])
        self.assertEqual(response.status_code, 400)
        self.assertIn("Only 1 left", str(response.json()))

    def test_rejects_unknown_product(self):
        response = self.post_order([{"product_id": 99999, "quantity": 1}])
        self.assertEqual(response.status_code, 400)

    def test_rejects_card_when_stripe_disabled(self):
        response = self.post_order([{"product_id": self.plate.id, "quantity": 1}], payment_method="card")
        self.assertEqual(response.status_code, 400)

    def test_rejects_empty_cart_and_bad_phone(self):
        self.assertEqual(self.post_order([]).status_code, 400)
        response = self.post_order([{"product_id": self.plate.id, "quantity": 1}], phone="call me")
        self.assertEqual(response.status_code, 400)

    def test_public_lookup_by_uuid(self):
        public_id = self.post_order([{"product_id": self.plate.id, "quantity": 1}]).json()["order"]["public_id"]
        response = self.client.get(reverse("order-detail", args=[public_id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["items"]), 1)
        self.assertNotIn("email", response.json())
        self.assertNotIn("address", response.json())

    def test_my_orders_requires_auth_and_is_scoped(self):
        self.assertEqual(self.client.get(reverse("order-mine")).status_code, 401)
        user = get_user_model().objects.create_user("buyer@example.com", "buyer@example.com", "pass12345!")
        self.client.force_authenticate(user)
        self.post_order([{"product_id": self.plate.id, "quantity": 1}])
        self.client.force_authenticate(None)
        self.post_order([{"product_id": self.plate.id, "quantity": 1}])  # anonymous order
        self.client.force_authenticate(user)
        response = self.client.get(reverse("order-mine"))
        self.assertEqual(response.json()["count"], 1)

    @override_settings(STRIPE_SECRET_KEY="sk_test_x")
    def test_card_order_returns_checkout_url(self):
        with mock.patch("apps.orders.payments.create_checkout_session", return_value="https://checkout.test/s"):
            response = self.post_order([{"product_id": self.plate.id, "quantity": 1}], payment_method="card")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["checkout_url"], "https://checkout.test/s")

    @override_settings(STRIPE_SECRET_KEY="sk_test_x")
    def test_failed_stripe_session_restocks(self):
        with mock.patch("apps.orders.payments.create_checkout_session", side_effect=RuntimeError):
            response = self.post_order([{"product_id": self.plate.id, "quantity": 2}], payment_method="card")
        self.assertEqual(response.status_code, 502)
        self.plate.refresh_from_db()
        self.assertEqual(self.plate.stock, 3)
        self.assertEqual(Order.objects.get().status, Order.Status.CANCELLED)

    def test_config_hides_card_without_stripe(self):
        response = self.client.get(reverse("store-config"))
        self.assertEqual(response.json()["payment_methods"], ["cod"])

    def test_telegram_message_escapes_html(self):
        response = self.post_order([{"product_id": self.plate.id, "quantity": 1}], full_name="<b>Eve</b>")
        order = Order.objects.get(public_id=response.json()["order"]["public_id"])
        message = build_new_order_message(order)
        self.assertIn("&lt;b&gt;Eve&lt;/b&gt;", message)
        self.assertIn("Total: $52.00", message)


@override_settings(STRIPE_WEBHOOK_SECRET="whsec_test")
class StripeWebhookTests(TestCase):
    def setUp(self):
        cache.clear()  # reset rate-limit counters between tests
        category = Category.objects.create(name="Silk")
        self.product = Product.objects.create(
            category=category,
            name="Scarf",
            summary="x",
            description="x",
            price=Decimal("50.00"),
            stock=5,
            origin="Margilan",
        )
        self.order = Order.objects.create(payment_method="card", stripe_session_id="cs_123", **CUSTOMER)
        self.order.items.create(
            product=self.product,
            product_name="Scarf",
            product_slug="scarf",
            unit_price=Decimal("50.00"),
            quantity=2,
            line_total=Decimal("100.00"),
        )
        self.client = APIClient()

    def send(self, event):
        with mock.patch("apps.orders.payments.parse_webhook", return_value=event):
            return self.client.post(
                reverse("stripe-webhook"),
                b"{}",
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE="t=1,v1=x",
            )

    def test_completed_marks_paid(self):
        event = {"type": "checkout.session.completed", "data": {"object": {"id": "cs_123", "payment_status": "paid"}}}
        self.assertEqual(self.send(event).status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.PAID)

    def test_expired_cancels_and_restocks(self):
        event = {"type": "checkout.session.expired", "data": {"object": {"id": "cs_123"}}}
        self.send(event)
        self.order.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.CANCELLED)
        self.assertEqual(self.product.stock, 7)

    def test_invalid_signature_is_rejected(self):
        response = self.client.post(
            reverse("stripe-webhook"), b"{}", content_type="application/json", HTTP_STRIPE_SIGNATURE="bad"
        )
        self.assertEqual(response.status_code, 400)
