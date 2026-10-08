from django.db.models import Count, Q
from rest_framework import viewsets

from .filters import ProductFilter
from .models import Category, Product
from .serializers import CategorySerializer, ProductDetailSerializer, ProductListSerializer


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategorySerializer
    lookup_field = "slug"
    pagination_class = None
    filter_backends = []

    def get_queryset(self):
        return Category.objects.annotate(product_count=Count("products", filter=Q(products__is_active=True))).order_by(
            "sort_order", "name"
        )  # Meta.ordering is ignored in GROUP BY queries


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    lookup_field = "slug"
    filterset_class = ProductFilter
    search_fields = ("name", "summary", "description", "origin", "materials", "category__name")
    ordering_fields = ("price", "created_at", "name")
    ordering = ("-is_featured", "-created_at")

    def get_queryset(self):
        return Product.objects.active().select_related("category")

    def get_serializer_class(self):
        return ProductDetailSerializer if self.action == "retrieve" else ProductListSerializer
