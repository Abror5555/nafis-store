from rest_framework import serializers

from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description", "product_count")


class CategoryRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug")


class ProductListSerializer(serializers.ModelSerializer):
    category = CategoryRefSerializer(read_only=True)
    image = serializers.SerializerMethodField()
    in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "slug",
            "summary",
            "price",
            "stock",
            "in_stock",
            "origin",
            "image",
            "is_featured",
            "category",
        )

    def get_image(self, obj):
        # Relative URL on purpose: the frontend proxies /media/* to the API,
        # so the same value works in the browser, in SSR and inside Docker.
        return obj.image.url if obj.image else None


class ProductDetailSerializer(ProductListSerializer):
    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ("description", "materials", "dimensions")
