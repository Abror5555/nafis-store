import io
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.urls import reverse
from PIL import Image
from rest_framework.test import APIClient

from apps.catalog.models import Category, Product
from apps.firms.models import Firm

User = get_user_model()
MEDIA = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=MEDIA)
class BossPanelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_platform", "--small", verbosity=0)
        cls.boss = User.objects.create_superuser("boss@example.com", "boss@example.com", "boss-pass-2026")

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.client.force_authenticate(self.boss)

    def test_every_boss_endpoint_answers(self):
        for name in (
            "boss-overview",
            "boss-users",
            "boss-firms",
            "boss-operators",
            "boss-editors",
            "boss-orders",
            "boss-products",
        ):
            for period in ("7d", "30d", "12m"):
                response = self.client.get(reverse(name), {"range": period})
                self.assertEqual(response.status_code, 200, (name, period))

    def test_overview_numbers_are_consistent(self):
        data = self.client.get(reverse("boss-overview"), {"range": "12m"}).json()
        sales = data["sales"]
        self.assertEqual(len(sales["revenue_series"]), 12)
        series_total = sum(row["revenue"] for row in sales["revenue_series"])
        self.assertAlmostEqual(series_total, sales["kpis"]["revenue"]["value"], places=2)
        self.assertEqual(sum(r["orders"] for r in sales["orders_series"]), sales["kpis"]["orders"]["value"])

    def test_user_filters_and_segments(self):
        data = self.client.get(reverse("boss-users"), {"role": "operator"}).json()
        self.assertEqual(data["count"], 4)
        self.assertTrue(all(r["role"] == "operator" for r in data["results"]))
        segments = {s["key"]: s["count"] for s in data["summary"]["segments"]}
        self.assertEqual(sum(segments.values()), data["summary"]["roles"]["customer"])
        never = self.client.get(reverse("boss-users"), {"segment": "never_bought"}).json()
        self.assertEqual(never["count"], segments["never_bought"])
        self.assertTrue(all(r["orders"] == 0 for r in never["results"]))

    def test_create_operator_and_editor(self):
        for kind in ("operators", "editors"):
            response = self.client.post(
                reverse(f"boss-{kind}"),
                {
                    "first_name": "New",
                    "last_name": kind,
                    "email": f"new.{kind}@example.com",
                    "phone": "+998 90 000 00 00",
                    "password": "fresh-start-2026",
                },
                format="json",
            )
            self.assertEqual(response.status_code, 201, response.content)
            user = User.objects.get(email=f"new.{kind}@example.com")
            self.assertFalse(user.is_staff)
            self.assertEqual(user.staff_profile.role, kind[:-1])

    def test_passport_reveal_and_firm_actions(self):
        firm = Firm.objects.first()
        detail = self.client.get(reverse("boss-firm", args=[firm.pk])).json()
        self.assertIn("*", detail["firm"]["passport_masked"])
        revealed = self.client.get(reverse("boss-firm-passport", args=[firm.pk])).json()
        self.assertRegex(revealed["passport_number"], r"^AA\d{7}$")
        self.client.post(reverse("boss-firm-action", args=[firm.pk, "suspend"]))
        firm.refresh_from_db()
        self.assertEqual(firm.status, "suspended")
        self.assertFalse(firm.products.filter(is_active=True).exists())

    def test_non_boss_is_refused(self):
        operator = User.objects.filter(staff_profile__role="operator").first()
        client = APIClient()
        client.force_authenticate(operator)
        self.assertEqual(client.get(reverse("boss-overview")).status_code, 403)
        self.assertEqual(client.get(reverse("boss-firm-passport", args=[Firm.objects.first().pk])).status_code, 403)


@override_settings(MEDIA_ROOT=MEDIA)
class EditorDeskTests(TestCase):
    def setUp(self):
        cache.clear()
        from apps.accounts.models import StaffProfile

        self.category = Category.objects.create(name="Silk")
        self.editor = User.objects.create_user(
            "ed@example.com", "ed@example.com", "pass-word-2026", first_name="Kamola"
        )
        StaffProfile.objects.create(user=self.editor, role="editor", phone="+998900000000")
        self.client = APIClient()
        self.client.force_authenticate(self.editor)

    def image(self):
        buffer = io.BytesIO()
        Image.new("RGB", (40, 40), (19, 138, 143)).save(buffer, format="JPEG")
        return SimpleUploadedFile("scarf.jpg", buffer.getvalue(), content_type="image/jpeg")

    def test_upload_counts_today(self):
        response = self.client.post(
            reverse("editor-product-list"),
            {
                "name": "Silk scarf",
                "category": self.category.id,
                "summary": "Scarf",
                "description": "A scarf.",
                "price": "40",
                "stock": "5",
                "origin": "Margilan",
                "image": self.image(),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertTrue(response.json()["image_url"].startswith("/media/products/"))
        product = Product.objects.get(name="Silk scarf")
        self.assertEqual(product.created_by, self.editor)
        self.assertIsNone(product.firm)
        me = self.client.get(reverse("editor-me")).json()["stats"]["me"]
        self.assertEqual(me["uploads_today"], 1)

    def test_rejects_bad_price_and_other_peoples_products(self):
        response = self.client.post(
            reverse("editor-product-list"),
            {
                "name": "Free",
                "category": self.category.id,
                "summary": "x",
                "description": "x",
                "price": "0",
                "stock": 1,
                "origin": "x",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        foreign = Product.objects.create(
            category=self.category, name="Not mine", summary="x", description="x", price=5, origin="x"
        )
        self.assertEqual(
            self.client.patch(reverse("editor-product-detail", args=[foreign.pk]), {"stock": 0}).status_code, 404
        )
