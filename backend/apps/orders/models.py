import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    class PaymentMethod(models.TextChoices):
        CARD = "card", "Card (Stripe)"
        CASH_ON_DELIVERY = "cod", "Cash on delivery"

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_method = models.CharField(max_length=10, choices=PaymentMethod.choices)

    full_name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=32)
    country = models.CharField(max_length=80)
    city = models.CharField(max_length=80)
    address = models.CharField(max_length=255)
    postal_code = models.CharField(max_length=20, blank=True)
    note = models.CharField(max_length=500, blank=True)

    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    shipping = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))

    stripe_session_id = models.CharField(max_length=255, blank=True, db_index=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.number

    @property
    def number(self) -> str:
        return f"NF-{self.pk:05d}" if self.pk else "NF-new"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("catalog.Product", on_delete=models.SET_NULL, null=True, related_name="order_items")
    # Snapshot of the product at purchase time, so later edits don't rewrite history.
    product_name = models.CharField(max_length=140)
    product_slug = models.SlugField(max_length=160)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self) -> str:
        return f"{self.quantity} × {self.product_name}"
