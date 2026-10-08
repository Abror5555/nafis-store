"""
Statistics shared by the boss panel, the firm dashboard and the staff panels.

Everything here returns plain dicts and lists of JSON-friendly values.
Time series always come with every bucket filled in (zeros included), so the
charts never have gaps.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Max, Q, Sum
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone

from apps.accounts.roles import role_of
from apps.catalog.models import Product
from apps.firms.models import Firm
from apps.orders.models import Order, OrderItem
from apps.support.models import Conversation, Message

User = get_user_model()

SOLD_STATUSES = ["pending", "paid", "shipped", "delivered"]
RANGE_DAYS = {"7d": 7, "30d": 30, "90d": 90}


# ---------------------------------------------------------------------------
# Periods and series
# ---------------------------------------------------------------------------


@dataclass
class Period:
    key: str
    start: datetime
    end: datetime
    prev_start: datetime
    granularity: str  # "day" | "month"

    @property
    def label(self) -> str:
        return {"7d": "last 7 days", "30d": "last 30 days", "90d": "last 90 days", "12m": "last 12 months"}[self.key]


def _local_midnight(day: date) -> datetime:
    return timezone.make_aware(datetime.combine(day, datetime.min.time()))


def _add_months(day: date, months: int) -> date:
    month = day.month - 1 + months
    return date(day.year + month // 12, month % 12 + 1, 1)


def make_period(key: str | None) -> Period:
    key = key if key in (*RANGE_DAYS, "12m") else "30d"
    now = timezone.now()
    today = timezone.localdate()
    if key == "12m":
        start = _local_midnight(_add_months(today.replace(day=1), -11))
        granularity = "month"
    else:
        start = _local_midnight(today - timedelta(days=RANGE_DAYS[key] - 1))
        granularity = "day"
    return Period(key, start, now, start - (now - start), granularity)


def buckets(period: Period) -> list[date]:
    out, cursor = [], period.start.astimezone(timezone.get_current_timezone()).date()
    end = timezone.localdate()
    while cursor <= end:
        out.append(cursor)
        cursor = _add_months(cursor, 1) if period.granularity == "month" else cursor + timedelta(days=1)
    return out


def _trunc(field: str, granularity: str):
    tz = timezone.get_current_timezone()
    return TruncMonth(field, tzinfo=tz) if granularity == "month" else TruncDate(field, tzinfo=tz)


def _as_date(value) -> date:
    return value.date() if isinstance(value, datetime) else value


def series(queryset, date_field: str, period: Period, **aggregates) -> list[dict]:
    """Group a queryset into the period's buckets. Returns [{"label": "2026-10-01", <agg>: n, ...}]."""
    rows = (
        queryset.filter(**{f"{date_field}__gte": period.start})
        .annotate(bucket=_trunc(date_field, period.granularity))
        .values("bucket")
        .annotate(**aggregates)
    )
    found = {_as_date(r["bucket"]): r for r in rows}
    result = []
    for day in buckets(period):
        row = found.get(day, {})
        result.append({"label": day.isoformat(), **{k: _num(row.get(k)) for k in aggregates}})
    return result


def _num(value):
    if value is None:
        return 0
    if isinstance(value, Decimal):
        return round(float(value), 2)
    return value


def change_pct(current, previous) -> float | None:
    current, previous = float(current or 0), float(previous or 0)
    if previous == 0:
        return None
    return round((current - previous) / previous * 100, 1)


def kpi(current, previous) -> dict:
    return {"value": _num(current), "previous": _num(previous), "change": change_pct(current, previous)}


def _sold_orders():
    return Order.objects.filter(status__in=SOLD_STATUSES)


def _sold_items():
    return OrderItem.objects.filter(order__status__in=SOLD_STATUSES)


# ---------------------------------------------------------------------------
# Sales (boss overview)
# ---------------------------------------------------------------------------


def sales_overview(period: Period) -> dict:
    current = _sold_orders().filter(created_at__gte=period.start)
    previous = _sold_orders().filter(created_at__gte=period.prev_start, created_at__lt=period.start)
    cur = current.aggregate(revenue=Sum("total"), orders=Count("id"))
    prev = previous.aggregate(revenue=Sum("total"), orders=Count("id"))
    cur_units = _sold_items().filter(order__created_at__gte=period.start).aggregate(n=Sum("quantity"))["n"]
    prev_units = (
        _sold_items()
        .filter(order__created_at__gte=period.prev_start, order__created_at__lt=period.start)
        .aggregate(n=Sum("quantity"))["n"]
    )
    aov = (cur["revenue"] or 0) / cur["orders"] if cur["orders"] else 0
    prev_aov = (prev["revenue"] or 0) / prev["orders"] if prev["orders"] else 0
    customers = customers_qs()
    new_customers = customers.filter(date_joined__gte=period.start).count()
    prev_new = customers.filter(date_joined__gte=period.prev_start, date_joined__lt=period.start).count()

    items = _sold_items().filter(order__created_at__gte=period.start)
    top = (
        items.values("product_id", "product_name")
        .annotate(units=Sum("quantity"), revenue=Sum("line_total"))
        .order_by("-units")[:6]
    )
    firm_names = dict(Product.objects.filter(firm__isnull=False).values_list("id", "firm__name"))
    by_category = items.values("product__category__name").annotate(revenue=Sum("line_total")).order_by("-revenue")
    split = items.aggregate(
        store=Sum("line_total", filter=Q(product__firm__isnull=True)),
        firms=Sum("line_total", filter=Q(product__firm__isnull=False)),
    )

    return {
        "period": {"key": period.key, "label": period.label, "granularity": period.granularity},
        "kpis": {
            "revenue": kpi(cur["revenue"], prev["revenue"]),
            "orders": kpi(cur["orders"], prev["orders"]),
            "units": kpi(cur_units, prev_units),
            "average_order": kpi(aov, prev_aov),
            "new_customers": kpi(new_customers, prev_new),
        },
        "revenue_series": series(_sold_orders(), "created_at", period, revenue=Sum("total")),
        "orders_series": series(_sold_orders(), "created_at", period, orders=Count("id")),
        "top_products": [
            {
                "name": r["product_name"],
                "seller": firm_names.get(r["product_id"], "Nafis"),
                "units": r["units"],
                "revenue": _num(r["revenue"]),
            }
            for r in top
        ],
        "by_category": [
            {"label": r["product__category__name"] or "Other", "revenue": _num(r["revenue"])} for r in by_category
        ],
        "seller_split": {"store": _num(split["store"]), "firms": _num(split["firms"])},
        "recent_orders": [
            {
                "number": o.number,
                "customer": o.full_name,
                "city": o.city,
                "total": _num(o.total),
                "status": o.status,
                "created_at": o.created_at,
            }
            for o in Order.objects.order_by("-created_at")[:6]
        ],
    }


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


def customers_qs():
    return User.objects.filter(is_superuser=False, staff_profile__isnull=True, firm__isnull=True)


SEGMENT_LABELS = {
    "power": "Power buyers",
    "active": "Active",
    "occasional": "Occasional",
    "never_bought": "Signed up, never bought",
    "churned": "Churned",
}


def customer_segment(user, now: datetime) -> str:
    """
    churned:       account disabled, or bought before but nothing for 90+ days
    never_bought:  registered but has not placed an order
    power:         4+ orders or $400+ spent, seen in the last 90 days
    active:        ordered or signed in within the last 30 days
    occasional:    everyone else (bought before, last seen 30-90 days ago)
    """
    orders = user.order_count or 0
    seen = [d for d in (user.last_login, user.last_order_at, user.date_joined) if d]
    idle_days = (now - max(seen)).days if seen else 999
    if not user.is_active:
        return "churned"
    if orders == 0:
        return "never_bought"
    if idle_days > 90:
        return "churned"
    if orders >= 4 or (user.spend or 0) >= 400:
        return "power"
    if idle_days <= 30:
        return "active"
    return "occasional"


def customer_rows() -> list[dict]:
    now = timezone.now()
    sold = Q(orders__status__in=SOLD_STATUSES)
    users = customers_qs().annotate(
        order_count=Count("orders", filter=sold),
        spend=Sum("orders__total", filter=sold),
        last_order_at=Max("orders__created_at", filter=sold),
    )
    rows = []
    for u in users:
        rows.append(
            {
                "id": u.id,
                "name": u.get_full_name() or u.first_name or u.email,
                "email": u.email,
                "role": "customer",
                "joined": u.date_joined,
                "last_seen": max([d for d in (u.last_login, u.last_order_at) if d], default=None),
                "orders": u.order_count,
                "spend": _num(u.spend),
                "segment": customer_segment(u, now),
                "is_active": u.is_active,
            }
        )
    return rows


def staff_user_rows() -> list[dict]:
    rows = []
    for u in User.objects.filter(
        Q(is_superuser=True) | Q(staff_profile__isnull=False) | Q(firm__isnull=False)
    ).select_related("staff_profile", "firm"):
        rows.append(
            {
                "id": u.id,
                "name": u.get_full_name() or u.first_name or u.email,
                "email": u.email,
                "role": role_of(u),
                "joined": u.date_joined,
                "last_seen": u.last_login,
                "orders": None,
                "spend": None,
                "segment": None,
                "is_active": u.is_active,
                "detail": u.firm.name if hasattr(u, "firm") else "",
            }
        )
    return rows


def users_summary(period: Period, customer_list: list[dict]) -> dict:
    segments = Counter(r["segment"] for r in customer_list)
    roles = {
        "customer": len(customer_list),
        "firm": Firm.objects.count(),
        "operator": User.objects.filter(staff_profile__role="operator").count(),
        "editor": User.objects.filter(staff_profile__role="editor").count(),
        "boss": User.objects.filter(is_superuser=True).count(),
    }
    return {
        "roles": roles,
        "segments": [{"key": k, "label": v, "count": segments.get(k, 0)} for k, v in SEGMENT_LABELS.items()],
        "signups_series": series(customers_qs(), "date_joined", period, signups=Count("id")),
        "total": sum(roles.values()),
    }


# ---------------------------------------------------------------------------
# Firms
# ---------------------------------------------------------------------------

FIRM_SEGMENT_LABELS = {
    "top": "Top sellers",
    "active": "Selling well",
    "struggling": "Active, weak sales",
    "idle": "Signed up, no products",
    "churned": "Left or suspended",
}


def _firm_sales(since: datetime, until: datetime | None = None) -> dict[int, dict]:
    items = _sold_items().filter(product__firm__isnull=False, order__created_at__gte=since)
    if until:
        items = items.filter(order__created_at__lt=until)
    return {
        r["product__firm_id"]: r
        for r in items.values("product__firm_id").annotate(revenue=Sum("line_total"), units=Sum("quantity"))
    }


def firm_rows() -> list[dict]:
    now = timezone.now()
    d30, d60, d90 = now - timedelta(days=30), now - timedelta(days=60), now - timedelta(days=90)
    last30, prev30 = _firm_sales(d30), _firm_sales(d60, d30)
    all_time = {
        r["product__firm_id"]: r
        for r in _sold_items()
        .filter(product__firm__isnull=False)
        .values("product__firm_id")
        .annotate(revenue=Sum("line_total"), units=Sum("quantity"), last_sale=Max("order__created_at"))
    }
    firms = Firm.objects.select_related("owner", "main_category").annotate(
        product_count=Count("products", filter=Q(products__is_active=True), distinct=True)
    )
    # Top sellers: the best quarter of firms that sold something this month (at least one, $300+).
    sellers = sorted((f for f in firms if f.id in last30), key=lambda f: last30[f.id]["revenue"], reverse=True)
    top_ids = {f.id for f in sellers[: max(1, -(-len(sellers) // 4))] if last30[f.id]["revenue"] >= 300}

    rows = []
    for f in firms:
        r30 = last30.get(f.id, {})
        total = all_time.get(f.id, {})
        revenue_30 = float(r30.get("revenue") or 0)
        units_30 = r30.get("units") or 0
        last_sale = total.get("last_sale")
        last_seen = max([d for d in (last_sale, f.owner.last_login) if d], default=f.created_at)
        if f.status == Firm.Status.SUSPENDED or (last_seen < d90 and units_30 == 0):
            segment = "churned"
        elif f.product_count == 0:
            segment = "idle"
        elif f.id in top_ids:
            segment = "top"
        elif units_30 <= 3:
            segment = "struggling"
        else:
            segment = "active"
        rows.append(
            {
                "id": f.id,
                "name": f.name,
                "owner": f.owner_full_name,
                "email": f.email,
                "phone": f.phone,
                "city": f.city,
                "category": f.main_category.name if f.main_category else "",
                "products": f.product_count,
                "revenue_30d": round(revenue_30, 2),
                "revenue_change": change_pct(revenue_30, prev30.get(f.id, {}).get("revenue")),
                "units_30d": units_30,
                "revenue_total": _num(total.get("revenue")),
                "last_sale": last_sale,
                "segment": segment,
                "status": f.status,
                "is_verified": f.is_verified,
                "joined": f.created_at,
            }
        )
    return rows


def firms_summary(period: Period, rows: list[dict]) -> dict:
    segments = Counter(r["segment"] for r in rows)
    month_start = _local_midnight(timezone.localdate().replace(day=1))
    selling = [r for r in rows if r["revenue_30d"] > 0]
    ranked = sorted(rows, key=lambda r: r["revenue_30d"], reverse=True)
    return {
        "total": len(rows),
        "verified": sum(1 for r in rows if r["is_verified"]),
        "new_this_month": Firm.objects.filter(created_at__gte=month_start).count(),
        "revenue_30d": round(sum(r["revenue_30d"] for r in rows), 2),
        "average_revenue_30d": round(sum(r["revenue_30d"] for r in selling) / len(selling), 2) if selling else 0,
        "products": sum(r["products"] for r in rows),
        "segments": [{"key": k, "label": v, "count": segments.get(k, 0)} for k, v in FIRM_SEGMENT_LABELS.items()],
        "leaders": [
            {"id": r["id"], "name": r["name"], "revenue_30d": r["revenue_30d"], "units_30d": r["units_30d"]}
            for r in ranked[:5]
            if r["revenue_30d"] > 0
        ],
        "signups_series": series(Firm.objects.all(), "created_at", period, signups=Count("id")),
        "revenue_series": series(
            _sold_orders().filter(items__product__firm__isnull=False),
            "created_at",
            period,
            revenue=Sum("items__line_total"),
        ),
    }


# ---------------------------------------------------------------------------
# Operators
# ---------------------------------------------------------------------------


def _staff(role: str):
    return User.objects.filter(staff_profile__role=role).select_related("staff_profile").order_by("first_name")


def operator_rows(period: Period) -> list[dict]:
    operators = list(_staff("operator"))
    conversations = list(
        Conversation.objects.filter(operator__in=operators).only(
            "operator_id", "customer_id", "customer_contact", "token", "created_at", "first_response_at", "status"
        )
    )
    sent = dict(
        Message.objects.filter(sender=Message.Sender.OPERATOR, author__in=operators)
        .values("author_id")
        .annotate(n=Count("id"))
        .values_list("author_id", "n")
    )
    sent_in_period = dict(
        Message.objects.filter(sender=Message.Sender.OPERATOR, author__in=operators, created_at__gte=period.start)
        .values("author_id")
        .annotate(n=Count("id"))
        .values_list("author_id", "n")
    )
    last_active = dict(
        Message.objects.filter(sender=Message.Sender.OPERATOR, author__in=operators)
        .values("author_id")
        .annotate(t=Max("created_at"))
        .values_list("author_id", "t")
    )
    by_operator = defaultdict(list)
    for c in conversations:
        by_operator[c.operator_id].append(c)

    rows = []
    for op in operators:
        chats = by_operator.get(op.id, [])
        recent = [c for c in chats if c.created_at >= period.start]
        times = [c.response_seconds for c in recent if c.response_seconds is not None]
        rows.append(
            {
                "id": op.id,
                "name": op.get_full_name() or op.email,
                "first_name": op.first_name,
                "last_name": op.last_name,
                "email": op.email,
                "phone": op.staff_profile.phone,
                "position": op.staff_profile.position,
                "is_active": op.is_active,
                "joined": op.staff_profile.created_at,
                "last_active": last_active.get(op.id),
                "conversations_total": len(chats),
                "conversations_period": len(recent),
                "customers_served": len({c.customer_key for c in chats}),
                "customers_period": len({c.customer_key for c in recent}),
                "messages_total": sent.get(op.id, 0),
                "messages_period": sent_in_period.get(op.id, 0),
                "avg_response_seconds": round(sum(times) / len(times)) if times else None,
                "resolved_period": sum(1 for c in recent if c.status == Conversation.Status.CLOSED),
                "open_now": sum(1 for c in chats if c.status == Conversation.Status.OPEN),
            }
        )
    rows.sort(key=lambda r: (r["conversations_period"], r["customers_period"]), reverse=True)
    for rank, row in enumerate(rows, start=1):
        row["rank"] = rank
    return rows


def support_summary(period: Period, rows: list[dict]) -> dict:
    recent = Conversation.objects.filter(created_at__gte=period.start)
    previous = Conversation.objects.filter(created_at__gte=period.prev_start, created_at__lt=period.start)
    times = [c.response_seconds for c in recent.exclude(first_response_at=None)]
    prev_times = [c.response_seconds for c in previous.exclude(first_response_at=None)]
    hours = Counter(timezone.localtime(c.created_at).hour for c in recent.only("created_at"))
    total = recent.count()
    return {
        "operators": len(rows),
        "waiting_now": Conversation.objects.filter(status=Conversation.Status.WAITING).count(),
        "open_now": Conversation.objects.filter(status=Conversation.Status.OPEN).count(),
        "conversations": kpi(total, previous.count()),
        "customers": kpi(len({c.customer_key for c in recent}), len({c.customer_key for c in previous})),
        "avg_response_seconds": kpi(
            round(sum(times) / len(times)) if times else 0,
            round(sum(prev_times) / len(prev_times)) if prev_times else 0,
        ),
        "resolution_rate": round(recent.filter(status=Conversation.Status.CLOSED).count() / total * 100, 1)
        if total
        else 0,
        "inflow_series": series(Conversation.objects.all(), "created_at", period, conversations=Count("id")),
        "by_hour": [{"label": f"{h:02d}:00", "conversations": hours.get(h, 0)} for h in range(24)],
        "leaders": [
            {
                "id": r["id"],
                "name": r["name"],
                "conversations": r["conversations_period"],
                "customers": r["customers_period"],
                "avg_response_seconds": r["avg_response_seconds"],
            }
            for r in rows[:5]
            if r["conversations_period"] > 0
        ],
    }


def operator_personal(user, period: Period) -> dict:
    rows = operator_rows(period)
    me = next((r for r in rows if r["id"] == user.id), None)
    return {
        "me": me,
        "team_size": len(rows),
        "inflow_series": series(
            Conversation.objects.filter(operator=user), "created_at", period, conversations=Count("id")
        ),
        "team_average_period": round(sum(r["conversations_period"] for r in rows) / len(rows), 1) if rows else 0,
    }


# ---------------------------------------------------------------------------
# Content editors
# ---------------------------------------------------------------------------


def editor_rows(period: Period) -> list[dict]:
    now = timezone.now()
    today = _local_midnight(timezone.localdate())
    editors = list(_staff("editor"))
    stats = {
        r["created_by_id"]: r
        for r in Product.objects.filter(created_by__in=editors)
        .values("created_by_id")
        .annotate(
            total=Count("id"),
            today=Count("id", filter=Q(created_at__gte=today)),
            week=Count("id", filter=Q(created_at__gte=now - timedelta(days=7))),
            period=Count("id", filter=Q(created_at__gte=period.start)),
            last_upload=Max("created_at"),
        )
    }
    rows = []
    for ed in editors:
        s = stats.get(ed.id, {})
        rows.append(
            {
                "id": ed.id,
                "name": ed.get_full_name() or ed.email,
                "first_name": ed.first_name,
                "last_name": ed.last_name,
                "email": ed.email,
                "phone": ed.staff_profile.phone,
                "position": ed.staff_profile.position,
                "is_active": ed.is_active,
                "joined": ed.staff_profile.created_at,
                "uploads_today": s.get("today", 0),
                "uploads_week": s.get("week", 0),
                "uploads_period": s.get("period", 0),
                "uploads_total": s.get("total", 0),
                "last_upload": s.get("last_upload"),
            }
        )
    rows.sort(key=lambda r: (r["uploads_period"], r["uploads_total"]), reverse=True)
    for rank, row in enumerate(rows, start=1):
        row["rank"] = rank
    return rows


def editors_summary(period: Period, rows: list[dict]) -> dict:
    uploads = Product.objects.filter(created_by__staff_profile__role="editor")
    previous = uploads.filter(created_at__gte=period.prev_start, created_at__lt=period.start).count()
    by_category = (
        uploads.filter(created_at__gte=period.start).values("category__name").annotate(n=Count("id")).order_by("-n")
    )
    return {
        "editors": len(rows),
        "uploads": kpi(sum(r["uploads_period"] for r in rows), previous),
        "today": sum(r["uploads_today"] for r in rows),
        "inflow_series": series(uploads, "created_at", period, uploads=Count("id")),
        "by_category": [{"label": r["category__name"], "uploads": r["n"]} for r in by_category],
        "leaders": [
            {"id": r["id"], "name": r["name"], "uploads": r["uploads_period"], "today": r["uploads_today"]}
            for r in rows[:5]
            if r["uploads_period"] > 0
        ],
    }


def editor_personal(user, period: Period) -> dict:
    rows = editor_rows(period)
    me = next((r for r in rows if r["id"] == user.id), None)
    mine = Product.objects.filter(created_by=user)
    return {
        "me": me,
        "team_size": len(rows),
        "inflow_series": series(mine, "created_at", period, uploads=Count("id")),
        "by_category": [
            {"label": r["category__name"], "uploads": r["n"]}
            for r in mine.values("category__name").annotate(n=Count("id")).order_by("-n")
        ],
    }


# ---------------------------------------------------------------------------
# Firm dashboard: the market, and the firm itself
# ---------------------------------------------------------------------------


def _product_units(since: datetime, until: datetime | None = None) -> dict[int, dict]:
    items = _sold_items().filter(order__created_at__gte=since, product__isnull=False)
    if until:
        items = items.filter(order__created_at__lt=until)
    return {
        r["product_id"]: r
        for r in items.values("product_id").annotate(units=Sum("quantity"), revenue=Sum("line_total"))
    }


def market_stats(firm: Firm) -> dict:
    now = timezone.now()
    d30, d60 = now - timedelta(days=30), now - timedelta(days=60)
    last30, prev30 = _product_units(d30), _product_units(d60, d30)
    products = {p.id: p for p in Product.objects.select_related("category", "firm")}

    def describe(pid, data):
        p = products[pid]
        units, prev = data.get("units") or 0, (prev30.get(pid) or {}).get("units") or 0
        return {
            "id": pid,
            "name": p.name,
            "category": p.category.name,
            "seller": p.firm.name if p.firm else "Nafis",
            "is_yours": p.firm_id == firm.id,
            "units_30d": units,
            "units_prev_30d": prev,
            "change": change_pct(units, prev),
            "revenue_30d": _num(data.get("revenue")),
        }

    top = sorted(last30.items(), key=lambda kv: kv[1]["units"], reverse=True)[:8]
    declining = []
    for pid, data in prev30.items():
        if pid not in products or (data["units"] or 0) < 3:
            continue
        row = describe(pid, last30.get(pid, {}))
        if row["change"] is not None and row["change"] <= -25:
            declining.append(row)
    declining.sort(key=lambda r: r["change"])

    # Best-selling product in each of the last six months
    month_start = _local_midnight(_add_months(timezone.localdate().replace(day=1), -5))
    monthly = (
        _sold_items()
        .filter(order__created_at__gte=month_start, product__isnull=False)
        .annotate(month=TruncMonth("order__created_at", tzinfo=timezone.get_current_timezone()))
        .values("month", "product_id")
        .annotate(units=Sum("quantity"))
    )
    best: dict[date, tuple[int, int]] = {}
    for r in monthly:
        month = _as_date(r["month"])
        if month not in best or r["units"] > best[month][1]:
            best[month] = (r["product_id"], r["units"])
    leaders = [
        {
            "month": month.isoformat(),
            "name": products[pid].name,
            "seller": products[pid].firm.name if products[pid].firm else "Nafis",
            "is_yours": products[pid].firm_id == firm.id,
            "units": units,
        }
        for month, (pid, units) in sorted(best.items())
        if pid in products
    ]

    period = make_period("12m")
    categories = list(Product.objects.values_list("category__name", flat=True).distinct().order_by("category__name"))
    per_category = (
        _sold_items()
        .filter(order__created_at__gte=period.start, product__isnull=False)
        .annotate(month=_trunc("order__created_at", "month"))
        .values("month", "product__category__name")
        .annotate(units=Sum("quantity"))
    )
    grid = defaultdict(dict)
    for r in per_category:
        grid[_as_date(r["month"])][r["product__category__name"]] = r["units"]
    category_trends = [
        {"label": m.isoformat(), **{c: grid.get(m, {}).get(c, 0) for c in categories}} for m in buckets(period)
    ]

    return {
        "top_products": [describe(pid, data) for pid, data in top if pid in products],
        "declining": declining[:6],
        "monthly_leaders": leaders,
        "categories": categories,
        "category_trends": category_trends,
    }


def firm_stats(firm: Firm) -> dict:
    now = timezone.now()
    d30, d60, d90 = now - timedelta(days=30), now - timedelta(days=60), now - timedelta(days=90)
    own_items = _sold_items().filter(product__firm=firm)

    def window(since, until=None):
        qs = own_items.filter(order__created_at__gte=since)
        if until:
            qs = qs.filter(order__created_at__lt=until)
        return qs.aggregate(revenue=Sum("line_total"), units=Sum("quantity"), orders=Count("order", distinct=True))

    cur, prev = window(d30), window(d60, d30)
    period = make_period("12m")
    weekdays = Counter()
    for created, qty in own_items.filter(order__created_at__gte=d90).values_list("order__created_at", "quantity"):
        weekdays[timezone.localtime(created).weekday()] += qty

    last30, prev30 = _product_units(d30), _product_units(d60, d30)
    monthly = (
        own_items.filter(order__created_at__gte=period.start)
        .annotate(month=_trunc("order__created_at", "month"))
        .values("product_id", "month")
        .annotate(units=Sum("quantity"))
    )
    peak: dict[int, tuple[date, int]] = {}
    for r in monthly:
        if r["product_id"] not in peak or r["units"] > peak[r["product_id"]][1]:
            peak[r["product_id"]] = (_as_date(r["month"]), r["units"])
    totals = dict(own_items.values("product_id").annotate(n=Sum("quantity")).values_list("product_id", "n"))

    products = []
    for p in firm.products.select_related("category").order_by("-created_at"):
        units = (last30.get(p.id) or {}).get("units") or 0
        prev_units = (prev30.get(p.id) or {}).get("units") or 0
        if units >= 10 or (p.stock and units >= p.stock):
            pace = "fast"
        elif units == 0:
            pace = "slow"
        else:
            pace = "steady"
        products.append(
            {
                "id": p.id,
                "name": p.name,
                "slug": p.slug,
                "category": p.category.name,
                "price": _num(p.price),
                "stock": p.stock,
                "is_active": p.is_active,
                "units_30d": units,
                "change": change_pct(units, prev_units),
                "revenue_30d": _num((last30.get(p.id) or {}).get("revenue")),
                "units_total": totals.get(p.id, 0),
                "peak_month": peak[p.id][0].isoformat() if p.id in peak else None,
                "pace": pace,
            }
        )

    best = max(products, key=lambda r: r["units_30d"], default=None)
    return {
        "kpis": {
            "revenue": kpi(cur["revenue"], prev["revenue"]),
            "units": kpi(cur["units"], prev["units"]),
            "orders": kpi(cur["orders"], prev["orders"]),
            "products": {"value": sum(1 for p in products if p["is_active"]), "previous": None, "change": None},
        },
        "best_seller": best["name"] if best and best["units_30d"] else None,
        "revenue_series": series(
            Order.objects.filter(status__in=SOLD_STATUSES, items__product__firm=firm),
            "created_at",
            period,
            revenue=Sum("items__line_total"),
        ),
        "units_series": series(
            Order.objects.filter(status__in=SOLD_STATUSES, items__product__firm=firm),
            "created_at",
            period,
            units=Sum("items__quantity"),
        ),
        "weekday": [
            {"label": name, "units": weekdays.get(i, 0)}
            for i, name in enumerate(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])
        ],
        "products": products,
    }
