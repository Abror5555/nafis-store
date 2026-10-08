import io
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.models import StaffProfile

from .models import Conversation

User = get_user_model()
MEDIA = tempfile.mkdtemp()


def png(name="shot.png", size=(20, 20)):
    buffer = io.BytesIO()
    Image.new("RGB", size, (42, 68, 166)).save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


def make_operator(email, first="Dilnoza"):
    user = User.objects.create_user(email, email, "pass-word-2026", first_name=first)
    StaffProfile.objects.create(user=user, role="operator", phone="+998901112233")
    return user


@override_settings(MEDIA_ROOT=MEDIA)
class SupportChatTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        cache.clear()
        self.guest = APIClient()
        self.operator = make_operator("op1@example.com")
        self.other = make_operator("op2@example.com", "Sardor")
        self.op = APIClient()
        self.op.force_authenticate(self.operator)

    def start(self, **data):
        payload = {"name": "Lena", "text": "Do you have blue plates?", **data}
        return self.guest.post(reverse("support-start"), payload, format="multipart")

    def test_full_chat_with_images(self):
        response = self.start(image=png())
        self.assertEqual(response.status_code, 201, response.content)
        token = response.json()["conversation"]["token"]
        sent = response.json()["messages"]
        self.assertEqual(sent[-1]["sender"], "customer")
        self.assertTrue(sent[-1]["image"].startswith("/media/support/"))

        waiting = self.op.get(reverse("operator-conversations"), {"box": "waiting"}).json()
        self.assertEqual(len(waiting), 1)
        chat_id = waiting[0]["id"]

        self.assertEqual(self.op.post(reverse("operator-claim", args=[chat_id])).status_code, 200)
        reply = self.op.post(
            reverse("operator-message", args=[chat_id]),
            {"text": "Yes, here it is", "image": png("p.png")},
            format="multipart",
        )
        self.assertEqual(reply.status_code, 201, reply.content)

        last_id = sent[-1]["id"]
        poll = self.guest.get(reverse("support-conversation", args=[token]), {"after": last_id}).json()
        self.assertEqual(poll["conversation"]["operator_name"], "Dilnoza")
        senders = [m["sender"] for m in poll["messages"]]
        self.assertEqual(senders, ["system", "operator"])

        conversation = Conversation.objects.get(pk=chat_id)
        self.assertIsNotNone(conversation.first_response_at)

    def test_other_operator_cannot_reply_or_read_claimed_chat(self):
        token = self.start().json()["conversation"]["token"]
        chat = Conversation.objects.get(token=token)
        self.op.post(reverse("operator-claim", args=[chat.pk]))
        other = APIClient()
        other.force_authenticate(self.other)
        self.assertEqual(other.post(reverse("operator-claim", args=[chat.pk])).status_code, 400)
        self.assertEqual(
            other.post(reverse("operator-message", args=[chat.pk]), {"text": "hi"}, format="json").status_code, 403
        )
        self.assertEqual(other.get(reverse("operator-conversation", args=[chat.pk])).status_code, 404)

    def test_rejects_non_images_and_empty_messages(self):
        token = self.start().json()["conversation"]["token"]
        fake = SimpleUploadedFile("x.png", b"not really an image", content_type="image/png")
        url = reverse("support-message", args=[token])
        self.assertEqual(self.guest.post(url, {"image": fake}, format="multipart").status_code, 400)
        self.assertEqual(self.guest.post(url, {"text": "  "}, format="multipart").status_code, 400)

    def test_closed_chat_takes_no_messages(self):
        token = self.start().json()["conversation"]["token"]
        self.guest.post(reverse("support-close", args=[token]))
        response = self.guest.post(reverse("support-message", args=[token]), {"text": "hello?"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_customers_and_strangers_cannot_open_operator_desk(self):
        self.assertEqual(self.guest.get(reverse("operator-conversations")).status_code, 401)
        customer = User.objects.create_user("c@example.com", "c@example.com", "pass-word-2026")
        client = APIClient()
        client.force_authenticate(customer)
        self.assertEqual(client.get(reverse("operator-me")).status_code, 403)

    def test_operator_cannot_log_into_django_admin(self):
        self.assertFalse(self.operator.is_staff)
        self.client.login(username="op1@example.com", password="pass-word-2026")
        response = self.client.get("/admin/")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin/login/", response["Location"])

    def test_operator_stats_count_unique_customers(self):
        for _ in range(2):
            token = self.start(contact="lena@example.com").json()["conversation"]["token"]
            chat = Conversation.objects.get(token=token)
            self.op.post(reverse("operator-message", args=[chat.pk]), {"text": "Hello"}, format="json")
        me = self.op.get(reverse("operator-me")).json()["stats"]["me"]
        self.assertEqual(me["conversations_total"], 2)
        self.assertEqual(me["customers_served"], 1)
        self.assertEqual(me["messages_total"], 2)
