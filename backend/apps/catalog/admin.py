from django.contrib import admin
from django.utils.html import format_html

from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "sort_order", "product_count")
    list_editable = ("sort_order",)
    prepopulated_fields = {"slug": ("name",)}

    @admin.display(description="Products")
    def product_count(self, obj):
        return obj.products.count()


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("thumb", "name", "category", "price", "stock", "is_active", "is_featured")
    list_display_links = ("thumb", "name")
    list_editable = ("price", "stock", "is_active", "is_featured")
    list_filter = ("category", "is_active", "is_featured")
    search_fields = ("name", "summary", "origin", "materials")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("name", "slug", "category", "summary", "description")}),
        ("Details", {"fields": ("origin", "materials", "dimensions", "image")}),
        ("Sales", {"fields": ("price", "stock", "is_active", "is_featured")}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @admin.display(description="")
    def thumb(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="height:40px;border-radius:4px" alt="">', obj.image.url)
        return "—"
