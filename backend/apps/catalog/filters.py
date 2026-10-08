import django_filters

from .models import Product


class NumberInFilter(django_filters.BaseInFilter, django_filters.NumberFilter):
    pass


class ProductFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name="category__slug")
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    featured = django_filters.BooleanFilter(field_name="is_featured")
    in_stock = django_filters.BooleanFilter(method="filter_in_stock")
    ids = NumberInFilter(field_name="id")

    class Meta:
        model = Product
        fields = ("category", "min_price", "max_price", "featured", "in_stock", "ids")

    def filter_in_stock(self, queryset, name, value):
        return queryset.filter(stock__gt=0) if value else queryset.filter(stock=0)
