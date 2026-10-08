from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.catalog.models import Category, Product

from .service import _split_products_line


@override_settings(ANTHROPIC_API_KEY="")
class AssistantTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        silk = Category.objects.create(name="Silk")
        ceramics = Category.objects.create(name="Ceramics")
        Product.objects.create(
            category=silk,
            name="Khan-atlas silk scarf",
            summary="Silk scarf",
            description="x",
            price=Decimal("64.00"),
            stock=4,
            origin="Margilan",
            materials="100% silk",
        )
        Product.objects.create(
            category=ceramics,
            name="Blue plate",
            summary="Plate",
            description="x",
            price=Decimal("30.00"),
            stock=4,
            origin="Rishtan",
            materials="Clay",
        )

    def setUp(self):
        cache.clear()  # reset rate-limit counters between tests

    def ask(self, message, **extra):
        return APIClient().post(reverse("assistant"), {"message": message, **extra}, format="json")

    def test_keyword_mode_finds_products(self):
        data = self.ask("Do you have silk scarves?").json()
        self.assertEqual(data["mode"], "search")
        self.assertEqual([p["slug"] for p in data["products"]], ["khan-atlas-silk-scarf"])

    def test_keyword_mode_price_cap(self):
        data = self.ask("something under $40").json()
        self.assertEqual([p["slug"] for p in data["products"]], ["blue-plate"])

    def test_no_match(self):
        data = self.ask("electric guitar").json()
        self.assertEqual(data["products"], [])

    def test_message_length_is_limited(self):
        self.assertEqual(self.ask("x" * 501).status_code, 400)

    def test_ai_mode_uses_only_known_slugs(self):
        fake_response = SimpleNamespace(
            content=[SimpleNamespace(type="text", text="Try the scarf.\nPRODUCTS: khan-atlas-silk-scarf, made-up")]
        )
        fake_client = mock.MagicMock()
        fake_client.messages.create.return_value = fake_response
        patched = mock.patch("anthropic.Anthropic", return_value=fake_client)
        with override_settings(ANTHROPIC_API_KEY="sk-test"), patched:
            data = self.ask("gift for my mother", history=[{"role": "assistant", "content": "Hi"}]).json()
        self.assertEqual(data["mode"], "ai")
        self.assertEqual(data["reply"], "Try the scarf.")
        self.assertEqual([p["slug"] for p in data["products"]], ["khan-atlas-silk-scarf"])
        sent_messages = fake_client.messages.create.call_args.kwargs["messages"]
        self.assertEqual(sent_messages[0]["role"], "user")

    def test_ai_failure_falls_back_to_search(self):
        failing = mock.patch("anthropic.Anthropic", side_effect=RuntimeError)
        with override_settings(ANTHROPIC_API_KEY="sk-test"), failing:
            data = self.ask("silk").json()
        self.assertEqual(data["mode"], "search")

    def test_split_products_line(self):
        reply, slugs = _split_products_line("Hello\nPRODUCTS: a, b, c, d")
        self.assertEqual(reply, "Hello")
        self.assertEqual(slugs, ["a", "b", "c"])
