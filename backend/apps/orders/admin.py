from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = ("product", "product_name", "unit_price", "quantity", "line_total")
    fields = readonly_fields

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("number", "full_name", "city", "total", "payment_method", "status", "created_at")
    list_filter = ("status", "payment_method", "created_at")
    search_fields = ("id", "full_name", "email", "phone", "public_id")
    readonly_fields = (
        "public_id",
        "user",
        "payment_method",
        "subtotal",
        "shipping",
        "total",
        "stripe_session_id",
        "created_at",
        "updated_at",
    )
    inlines = [OrderItemInline]
    actions = ["mark_shipped", "mark_delivered"]
    fieldsets = (
        (None, {"fields": ("status", "payment_method", "public_id", "user")}),
        ("Customer", {"fields": ("full_name", "email", "phone", "note")}),
        ("Delivery", {"fields": ("country", "city", "address", "postal_code")}),
        ("Totals", {"fields": ("subtotal", "shipping", "total", "stripe_session_id")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    @admin.display(description="Order", ordering="id")
    def number(self, obj):
        return obj.number

    @admin.action(description="Mark selected orders as shipped")
    def mark_shipped(self, request, queryset):
        updated = queryset.filter(status__in=["pending", "paid"]).update(status=Order.Status.SHIPPED)
        self.message_user(request, f"{updated} order(s) marked as shipped.")

    @admin.action(description="Mark selected orders as delivered")
    def mark_delivered(self, request, queryset):
        updated = queryset.filter(status=Order.Status.SHIPPED).update(status=Order.Status.DELIVERED)
        self.message_user(request, f"{updated} order(s) marked as delivered.")
