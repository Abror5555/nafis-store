from rest_framework import serializers

from .models import Order, OrderItem

REQUIRED = {"blank": "Fill in this field.", "required": "Fill in this field."}


class OrderLineInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=20)


class OrderCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=120, error_messages=REQUIRED)
    email = serializers.EmailField(error_messages={**REQUIRED, "invalid": "Enter a valid email address."})
    phone = serializers.RegexField(
        r"^\+?[0-9 ()-]{7,20}$", error_messages={**REQUIRED, "invalid": "Enter a valid phone number."}
    )
    country = serializers.CharField(max_length=80, error_messages=REQUIRED)
    city = serializers.CharField(max_length=80, error_messages=REQUIRED)
    address = serializers.CharField(max_length=255, error_messages=REQUIRED)
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True)
    note = serializers.CharField(max_length=500, required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(choices=Order.PaymentMethod.choices)
    items = OrderLineInputSerializer(many=True, allow_empty=False, max_length=50)

    CUSTOMER_FIELDS = ("full_name", "email", "phone", "country", "city", "address", "postal_code", "note")


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ("product_name", "product_slug", "unit_price", "quantity", "line_total")


class OrderSerializer(serializers.ModelSerializer):
    number = serializers.CharField(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)

    class Meta:
        model = Order
        fields = (
            "public_id",
            "number",
            "status",
            "status_display",
            "payment_method",
            "payment_method_display",
            "full_name",
            "city",
            "country",
            "subtotal",
            "shipping",
            "total",
            "items",
            "created_at",
        )
