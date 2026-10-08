from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient


class AuthTests(TestCase):
    def setUp(self):
        cache.clear()  # reset rate-limit counters between tests
        self.client = APIClient()

    def register(self, **overrides):
        payload = {"first_name": "Aziza", "email": "Aziza@Example.com", "password": "silk-road-2026", **overrides}
        return self.client.post(reverse("auth-register"), payload, format="json")

    def test_register_login_and_me(self):
        response = self.register()
        self.assertEqual(response.status_code, 201, response.content)
        self.assertIn("access", response.json())

        response = self.client.post(
            reverse("auth-login"), {"email": "aziza@example.com", "password": "silk-road-2026"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        token = response.json()["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        me = self.client.get(reverse("auth-me")).json()
        self.assertEqual(me["email"], "aziza@example.com")
        self.assertEqual(me["first_name"], "Aziza")

    def test_duplicate_email_is_rejected(self):
        self.register()
        response = self.register(email="aziza@example.com")
        self.assertEqual(response.status_code, 400)

    def test_weak_password_is_rejected(self):
        response = self.register(password="12345678")
        self.assertEqual(response.status_code, 400)

    def test_wrong_password(self):
        self.register()
        response = self.client.post(
            reverse("auth-login"), {"email": "aziza@example.com", "password": "nope-nope"}, format="json"
        )
        self.assertEqual(response.status_code, 401)

    def test_owner_with_custom_username_signs_in_by_email(self):
        from django.contrib.auth import get_user_model

        get_user_model().objects.create_superuser("abror", "Boss@Example.com", "owner-pass-2026")
        response = self.client.post(
            reverse("auth-login"), {"email": "boss@example.com", "password": "owner-pass-2026"}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.json()['access']}")
        me = self.client.get(reverse("auth-me")).json()
        self.assertEqual(me["role"], "boss")
        self.assertEqual(me["panel"], "/boss")
