from decimal import Decimal

from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from .models import Category, Product


class CatalogApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.ceramics = Category.objects.create(name="Ceramics", slug="ceramics")
        cls.silk = Category.objects.create(name="Silk", slug="silk")
        cls.plate = Product.objects.create(
            category=cls.ceramics,
            name="Blue plate",
            summary="Plate",
            description="A plate",
            price=Decimal("40.00"),
            stock=3,
            origin="Rishtan",
            is_featured=True,
        )
        cls.scarf = Product.objects.create(
            category=cls.silk,
            name="Silk scarf",
            summary="Scarf",
            description="A scarf",
            price=Decimal("90.00"),
            stock=0,
            origin="Margilan",
        )
        cls.hidden = Product.objects.create(
            category=cls.silk,
            name="Hidden scarf",
            summary="Hidden",
            description="Hidden",
            price=Decimal("10.00"),
            stock=5,
            origin="Margilan",
            is_active=False,
        )

    def setUp(self):
        self.client = APIClient()

    def test_list_excludes_inactive_products(self):
        response = self.client.get(reverse("product-list"))
        self.assertEqual(response.status_code, 200)
        slugs = {p["slug"] for p in response.json()["results"]}
        self.assertEqual(slugs, {"blue-plate", "silk-scarf"})

    def test_filter_by_category_and_price(self):
        response = self.client.get(reverse("product-list"), {"category": "silk"})
        self.assertEqual([p["slug"] for p in response.json()["results"]], ["silk-scarf"])
        response = self.client.get(reverse("product-list"), {"max_price": "50"})
        self.assertEqual([p["slug"] for p in response.json()["results"]], ["blue-plate"])

    def test_search(self):
        response = self.client.get(reverse("product-list"), {"search": "rishtan"})
        self.assertEqual([p["slug"] for p in response.json()["results"]], ["blue-plate"])

    def test_detail_by_slug(self):
        response = self.client.get(reverse("product-detail", args=["blue-plate"]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["description"], "A plate")
        self.assertTrue(response.json()["in_stock"])

    def test_inactive_detail_is_404(self):
        response = self.client.get(reverse("product-detail", args=["hidden-scarf"]))
        self.assertEqual(response.status_code, 404)

    def test_category_counts_only_active(self):
        response = self.client.get(reverse("category-list"))
        counts = {c["slug"]: c["product_count"] for c in response.json()}
        self.assertEqual(counts, {"ceramics": 1, "silk": 1})

    def test_categories_follow_sort_order(self):
        Category.objects.filter(slug="silk").update(sort_order=0)
        Category.objects.filter(slug="ceramics").update(sort_order=5)
        response = self.client.get(reverse("category-list"))
        self.assertEqual([c["slug"] for c in response.json()], ["silk", "ceramics"])

    def test_slug_is_unique(self):
        other = Product.objects.create(
            category=self.ceramics,
            name="Blue plate",
            summary="x",
            description="x",
            price=Decimal("1.00"),
            origin="x",
        )
        self.assertEqual(other.slug, "blue-plate-2")


class SeedCommandTests(TestCase):
    def test_seed_is_idempotent(self):
        call_command("seed_demo", verbosity=0)
        first = Product.objects.count()
        call_command("seed_demo", verbosity=0)
        self.assertEqual(Product.objects.count(), first)
        self.assertGreaterEqual(first, 12)
