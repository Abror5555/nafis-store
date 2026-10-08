"""Product create/edit API used by content editors and by firms (each sees only their own products)."""

from decimal import Decimal

from rest_framework import mixins, serializers, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.core.uploads import validate_image

from .models import Category, Product


class ProductWriteSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    image = serializers.ImageField(required=False, allow_null=True, validators=[validate_image])
    image_url = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "slug",
            "category",
            "category_name",
            "category_slug",
            "summary",
            "description",
            "price",
            "stock",
            "origin",
            "materials",
            "dimensions",
            "image",
            "image_url",
            "is_active",
            "created_at",
        )
        read_only_fields = ("id", "slug", "created_at")
        extra_kwargs = {"image": {"write_only": True}}

    def get_image_url(self, obj):
        return obj.image.url if obj.image else None

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        if value > Decimal("100000"):
            raise serializers.ValidationError("Price looks too high. Check the amount.")
        return value

    def validate_name(self, value):
        return value.strip()


class OwnProductsViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Base view: subclasses set permission_classes and scope the queryset."""

    serializer_class = ProductWriteSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    search_fields = ("name", "summary", "materials")
    ordering_fields = ("created_at", "price", "stock", "name")
    ordering = ("-created_at",)
    filterset_fields = ("category", "is_active")

    def owner_filter(self) -> dict:
        raise NotImplementedError

    def get_queryset(self):
        return Product.objects.filter(**self.owner_filter()).select_related("category")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, **self.extra_on_create())

    def extra_on_create(self) -> dict:
        return {}
