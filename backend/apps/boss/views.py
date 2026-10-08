"""The boss panel API: company-wide statistics and management of every kind of account."""

import logging

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import StaffProfile
from apps.accounts.roles import IsBoss
from apps.accounts.serializers import StaffCreateSerializer
from apps.catalog.models import Product
from apps.firms.models import Firm
from apps.firms.serializers import FirmProfileSerializer
from apps.orders.models import Order

from . import analytics

User = get_user_model()
audit = logging.getLogger("audit")


def paginate(request, rows: list) -> dict:
    try:
        page = max(1, int(request.query_params.get("page", 1)))
        size = min(100, max(5, int(request.query_params.get("page_size", 20))))
    except ValueError:
        page, size = 1, 20
    start = (page - 1) * size
    return {"count": len(rows), "page": page, "page_size": size, "results": rows[start : start + size]}


def search_rows(rows: list[dict], query: str, *fields: str) -> list[dict]:
    query = (query or "").strip().lower()
    if not query:
        return rows
    return [r for r in rows if any(query in str(r.get(f) or "").lower() for f in fields)]


def sort_rows(rows: list[dict], ordering: str | None, allowed: set[str]) -> list[dict]:
    if not ordering:
        return rows
    key = ordering.lstrip("-")
    if key not in allowed:
        return rows
    # None values always sort last.
    present = [r for r in rows if r.get(key) is not None]
    missing = [r for r in rows if r.get(key) is None]
    return sorted(present, key=lambda r: r[key], reverse=ordering.startswith("-")) + missing


class BossView(APIView):
    permission_classes = [IsBoss]

    def period(self):
        return analytics.make_period(self.request.query_params.get("range"))


# --- Overview ---------------------------------------------------------------


class OverviewView(BossView):
    def get(self, request):
        period = self.period()
        firm_list = analytics.firm_rows()
        operators = analytics.operator_rows(period)
        editors = analytics.editor_rows(period)
        return Response(
            {
                "sales": analytics.sales_overview(period),
                "firms": analytics.firms_summary(period, firm_list),
                "support": analytics.support_summary(period, operators),
                "editors": analytics.editors_summary(period, editors),
            }
        )


# --- Users ------------------------------------------------------------------


class UsersView(BossView):
    def get(self, request):
        period = self.period()
        customers = analytics.customer_rows()
        rows = customers + analytics.staff_user_rows()
        role = request.query_params.get("role")
        if role and role != "all":
            rows = [r for r in rows if r["role"] == role]
        segment = request.query_params.get("segment")
        if segment:
            rows = [r for r in rows if r["segment"] == segment]
        rows = search_rows(rows, request.query_params.get("search"), "name", "email", "detail")
        rows = sort_rows(
            rows, request.query_params.get("ordering") or "-joined", {"joined", "last_seen", "orders", "spend", "name"}
        )
        return Response({"summary": analytics.users_summary(period, customers), **paginate(request, rows)})


class UserUpdateView(BossView):
    def patch(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user == request.user:
            return Response({"detail": "You can't deactivate your own account."}, status=status.HTTP_400_BAD_REQUEST)
        if "is_active" in request.data:
            user.is_active = bool(request.data["is_active"])
            user.save(update_fields=["is_active"])
            audit.info("boss %s set is_active=%s for user %s", request.user.pk, user.is_active, user.pk)
        return Response({"id": user.id, "is_active": user.is_active})


# --- Firms ------------------------------------------------------------------


class FirmsView(BossView):
    def get(self, request):
        period = self.period()
        rows = analytics.firm_rows()
        summary = analytics.firms_summary(period, rows)
        segment = request.query_params.get("segment")
        if segment:
            rows = [r for r in rows if r["segment"] == segment]
        if request.query_params.get("verified") in ("true", "false"):
            wanted = request.query_params["verified"] == "true"
            rows = [r for r in rows if r["is_verified"] == wanted]
        rows = search_rows(rows, request.query_params.get("search"), "name", "owner", "email", "city", "category")
        rows = sort_rows(
            rows,
            request.query_params.get("ordering") or "-revenue_30d",
            {"revenue_30d", "revenue_total", "units_30d", "products", "joined", "name"},
        )
        return Response({"summary": summary, **paginate(request, rows)})


class FirmDetailView(BossView):
    def get(self, request, pk):
        firm = get_object_or_404(Firm.objects.select_related("owner", "main_category"), pk=pk)
        return Response({"firm": FirmProfileSerializer(firm).data, "stats": analytics.firm_stats(firm)})


class FirmActionView(BossView):
    def post(self, request, pk, action):
        firm = get_object_or_404(Firm, pk=pk)
        if action == "verify":
            firm.is_verified, firm.verified_at = True, timezone.now()
        elif action == "unverify":
            firm.is_verified, firm.verified_at = False, None
        elif action == "suspend":
            firm.status = Firm.Status.SUSPENDED
            firm.products.update(is_active=False)
        elif action == "activate":
            firm.status = Firm.Status.ACTIVE
        else:
            return Response({"detail": "Unknown action."}, status=status.HTTP_400_BAD_REQUEST)
        firm.save()
        audit.info("boss %s did %s on firm %s", request.user.pk, action, firm.pk)
        return Response(FirmProfileSerializer(firm).data)


class FirmPassportView(BossView):
    """Reveals the full passport number. Every reveal is written to the audit log."""

    def get(self, request, pk):
        firm = get_object_or_404(Firm, pk=pk)
        audit.warning("boss %s revealed passport of firm %s", request.user.pk, firm.pk)
        return Response({"passport_number": firm.passport_number})


# --- Operators & editors ----------------------------------------------------


class StaffListView(BossView):
    role = ""

    def rows(self, period):
        raise NotImplementedError

    def summary(self, period, rows):
        raise NotImplementedError

    def get(self, request):
        period = self.period()
        rows = self.rows(period)
        summary = self.summary(period, rows)
        rows = search_rows(rows, request.query_params.get("search"), "name", "email", "phone", "position")
        return Response({"summary": summary, **paginate(request, rows)})

    def post(self, request):
        serializer = StaffCreateSerializer(data=request.data, context={"role": self.role})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        audit.info("boss %s created %s %s", request.user.pk, self.role, user.pk)
        return Response({"id": user.id, "email": user.email}, status=status.HTTP_201_CREATED)


class OperatorsView(StaffListView):
    role = StaffProfile.Role.OPERATOR

    def rows(self, period):
        return analytics.operator_rows(period)

    def summary(self, period, rows):
        return analytics.support_summary(period, rows)


class EditorsView(StaffListView):
    role = StaffProfile.Role.EDITOR

    def rows(self, period):
        return analytics.editor_rows(period)

    def summary(self, period, rows):
        return analytics.editors_summary(period, rows)


# --- Orders -----------------------------------------------------------------


class BossOrderSerializer(serializers.ModelSerializer):
    number = serializers.CharField(read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "number",
            "full_name",
            "email",
            "phone",
            "city",
            "country",
            "status",
            "payment_method",
            "total",
            "items_count",
            "created_at",
        )
        read_only_fields = tuple(f for f in fields if f != "status")

    def get_items_count(self, obj):
        return sum(i.quantity for i in obj.items.all())


class BossOrdersView(generics.ListAPIView):
    permission_classes = [IsBoss]
    serializer_class = BossOrderSerializer
    filterset_fields = ("status", "payment_method")
    search_fields = ("full_name", "email", "phone", "city")
    ordering_fields = ("created_at", "total")
    ordering = ("-created_at",)

    def get_queryset(self):
        qs = Order.objects.prefetch_related("items")
        search = self.request.query_params.get("search", "").strip().upper()
        if search.startswith("NF-") and search[3:].isdigit():
            return qs.filter(pk=int(search[3:]))
        return qs


class BossOrderUpdateView(generics.UpdateAPIView):
    permission_classes = [IsBoss]
    serializer_class = BossOrderSerializer
    queryset = Order.objects.all()
    http_method_names = ["patch"]


# --- Products ---------------------------------------------------------------


class BossProductSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    seller = serializers.SerializerMethodField()
    uploaded_by = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "slug",
            "category",
            "category_slug",
            "seller",
            "uploaded_by",
            "price",
            "stock",
            "image",
            "is_active",
            "is_featured",
            "created_at",
        )
        read_only_fields = ("id", "name", "slug", "category", "seller", "uploaded_by", "price", "stock", "created_at")

    def get_seller(self, obj):
        return obj.firm.name if obj.firm_id else "Nafis"

    def get_uploaded_by(self, obj):
        return obj.created_by.get_full_name() if obj.created_by_id else ""

    def get_image(self, obj):
        return obj.image.url if obj.image else None


class BossProductsView(generics.ListAPIView):
    permission_classes = [IsBoss]
    serializer_class = BossProductSerializer
    filterset_fields = ("is_active", "is_featured", "category")
    search_fields = ("name", "firm__name", "created_by__first_name", "created_by__last_name")
    ordering_fields = ("created_at", "price", "stock", "name")
    ordering = ("-created_at",)

    def get_queryset(self):
        qs = Product.objects.select_related("category", "firm", "created_by")
        seller = self.request.query_params.get("seller")
        if seller == "store":
            qs = qs.filter(firm__isnull=True)
        elif seller == "firms":
            qs = qs.filter(firm__isnull=False)
        return qs


class BossProductUpdateView(generics.UpdateAPIView):
    permission_classes = [IsBoss]
    serializer_class = BossProductSerializer
    queryset = Product.objects.all()
    http_method_names = ["patch"]
