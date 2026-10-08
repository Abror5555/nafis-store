from datetime import date

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.catalog.models import Category, Product

from .models import Firm


def payload(**overrides):
    data = {
        "email": "owner@lojuvard.example.com",
        "password": "glaze-and-fire-2026",
        "name": "Lojuvard Ceramics",
        "legal_form": "llc",
        "tax_id": "305123456",
        "city": "Rishtan",
        "address": "12 Kulollar street",
        "phone": "+998 90 111 22 33",
        "company_email": "hello@lojuvard.example.com",
        "owner_full_name": "Aziz Rasulov",
        "owner_phone": "+998 91 222 33 44",
        "owner_birth_date": "1985-04-12",
        "passport_number": "ab 1234567",
        "passport_issued_by": "Rishtan district department",
        "passport_issue_date": "2019-06-01",
        "accept_terms": True,
    }
    data.update(overrides)
    return data


class FirmRegistrationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.category = Category.objects.create(name="Ceramics")

    def register(self, **overrides):
        return self.client.post(
            reverse("firm-register"), payload(main_category=self.category.id, **overrides), format="json"
        )

    def test_registers_firm_and_encrypts_passport(self):
        response = self.register()
        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()
        self.assertEqual(body["user"]["role"], "firm")
        self.assertEqual(body["user"]["panel"], "/firm")
        self.assertEqual(body["firm"]["passport_masked"], "AB*****67")
        self.assertNotIn("passport_number", body["firm"])

        firm = Firm.objects.get()
        self.assertNotIn("1234567", firm.passport_number_encrypted)
        self.assertEqual(firm.passport_number, "AB1234567")
        self.assertEqual(firm.owner.first_name, "Aziz")
        self.assertFalse(firm.owner.is_staff)

    def test_validation(self):
        self.register()
        cases = {
            "tax_id": {"tax_id": "305123456", "email": "other@example.com"},  # duplicate tax ID
            "owner_birth_date": {"owner_birth_date": str(date.today().replace(year=date.today().year - 16))},
            "passport_number": {"passport_number": "123"},
            "accept_terms": {"accept_terms": False},
        }
        for field, overrides in cases.items():
            overrides.setdefault("email", f"{field}@example.com")
            overrides.setdefault("tax_id", "305000999")
            response = self.register(**overrides)
            self.assertEqual(response.status_code, 400, field)
            self.assertIn(field, response.json(), field)

    def test_firm_products_are_scoped_and_stats_load(self):
        token = self.register().json()["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        created = self.client.post(
            reverse("firm-product-list"),
            {
                "name": "Lapis bowl",
                "category": self.category.id,
                "summary": "Blue bowl",
                "description": "A bowl.",
                "price": "35.00",
                "stock": 4,
                "origin": "Rishtan",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.content)
        product = Product.objects.get(name="Lapis bowl")
        self.assertEqual(product.firm.name, "Lojuvard Ceramics")

        other = Product.objects.create(
            category=self.category, name="Store plate", summary="x", description="x", price=10, origin="x"
        )
        listing = self.client.get(reverse("firm-product-list")).json()
        self.assertEqual([p["name"] for p in listing["results"]], ["Lapis bowl"])
        self.assertEqual(
            self.client.patch(reverse("firm-product-detail", args=[other.id]), {"price": "1"}).status_code, 404
        )

        stats = self.client.get(reverse("firm-stats")).json()
        self.assertEqual(set(stats), {"own", "market"})
        self.assertEqual(len(stats["own"]["revenue_series"]), 12)

    def test_suspended_firm_loses_panel_access(self):
        token = self.register().json()["access"]
        Firm.objects.update(status="suspended")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(self.client.get(reverse("firm-me")).status_code, 403)
