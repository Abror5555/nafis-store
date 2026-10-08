"""
Twelve months of believable demo activity, so every panel has statistics to show.

Creates operators, content editors, partner firms with their products, customers
with different buying habits, orders with seasonality, and support chats.
All people, firms and documents are fictional; emails use example.com.
"""

import random
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import StaffProfile
from apps.catalog.models import Category, Product
from apps.firms.models import Firm
from apps.orders.models import Order, OrderItem
from apps.orders.services import calculate_shipping
from apps.support.models import Conversation, Message

User = get_user_model()
MARKER_TAX_ID = "300000001"

OPERATORS = [
    ("Dilnoza", "Karimova", "Senior operator", 1.6, 35),
    ("Sardor", "Aliyev", "Operator", 1.2, 70),
    ("Madina", "Yusupova", "Operator", 1.0, 95),
    ("Bekzod", "Rahimov", "Evening shift", 0.6, 160),
]
EDITORS = [
    ("Kamola", "Nazarova", "Lead content editor", 1.5),
    ("Javohir", "Tursunov", "Content editor", 1.0),
    ("Nilufar", "Saidova", "Photo and content editor", 0.7),
]

# name, legal form, category, city, owner, plan, verified, days since signup
FIRMS = [
    ("Lojuvard Ceramics", "llc", "ceramics", "Rishtan", "Aziz Rasulov", "top", True, 330),
    ("Oydin Silk", "llc", "silk", "Margilan", "Shahnoza Ergasheva", "top", True, 300),
    ("Mis Ustasi Copper", "sole", "home-wood", "Bukhara", "Ulugbek Hamroyev", "active", True, 260),
    ("Gulnor Suzani Studio", "sole", "textiles", "Samarkand", "Gulnora Mirzayeva", "active", True, 210),
    ("Naqsh Woodworks", "llc", "home-wood", "Khiva", "Otabek Qodirov", "active", False, 150),
    ("Qalampir Atelier", "sole", "textiles", "Chust", "Feruza Islomova", "struggling", False, 120),
    ("Choyxona Goods", "llc", "ceramics", "Tashkent", "Jasur Nematov", "idle", False, 12),
    ("Shohi Silk Line", "jsc", "silk", "Andijan", "Laylo Abdullayeva", "churned", True, 340),
]

FIRM_PRODUCTS = {
    "Lojuvard Ceramics": [
        (
            "Lojuvard serving bowl",
            "Wide bowl in deep lapis blue with a white rim.",
            52,
            9,
            "Red clay, cobalt glaze",
            "Ø 26 cm",
        ),
        ("Turquoise fruit dish", "Footed dish for fruit and sweets.", 44, 7, "Red clay, ishqor glaze", "Ø 24 cm"),
        ("Pomegranate mug pair", "Two mugs painted with small pomegranates.", 30, 14, "Stoneware", "300 ml each"),
        (
            "Rishtan wall plate, small",
            "A hanging plate with a painted bird.",
            26,
            11,
            "Red clay, ishqor glaze",
            "Ø 20 cm",
        ),
        ("Glazed spice jars, set of 3", "Lidded jars for spices or salt.", 36, 6, "Stoneware", "Height 9 cm"),
    ],
    "Oydin Silk": [
        ("Oydin khan-atlas stole", "Long silk stole in moonlight grey and blue.", 78, 6, "100% silk", "200 × 50 cm"),
        ("Ikat silk tie", "Hand-cut silk tie in a small ikat repeat.", 34, 15, "100% silk", "148 × 8 cm"),
        ("Silk headscarf, saffron", "Square scarf with a saffron ikat border.", 48, 10, "100% silk", "90 × 90 cm"),
        (
            "Adras clutch bag",
            "Small clutch sewn from adras offcuts.",
            38,
            8,
            "Silk and cotton, cotton lining",
            "24 × 14 cm",
        ),
    ],
    "Mis Ustasi Copper": [
        ("Copper coffee pot", "Hand-chased pot for coffee or tea.", 64, 5, "Copper, tin lining", "700 ml"),
        ("Engraved copper bowl", "Small bowl engraved with an islimi vine.", 32, 9, "Copper, lacquer", "Ø 14 cm"),
        ("Copper candle holder", "Pierced holder that throws a patterned light.", 28, 12, "Copper", "Height 16 cm"),
    ],
    "Gulnor Suzani Studio": [
        (
            "Suzani cushion, sun motif",
            "Embroidered cushion cover with a red sun medallion.",
            58,
            7,
            "Cotton, silk thread",
            "45 × 45 cm",
        ),
        ("Suzani table runner", "Narrow runner with a vine border.", 72, 4, "Cotton, silk thread", "160 × 40 cm"),
        (
            "Embroidered tote bag",
            "Everyday tote with a suzani panel.",
            40,
            10,
            "Cotton canvas, embroidery",
            "40 × 38 cm",
        ),
        (
            "Mini suzani wall panel",
            "Small embroidered panel ready to frame.",
            46,
            6,
            "Cotton, silk thread",
            "40 × 40 cm",
        ),
    ],
    "Naqsh Woodworks": [
        ("Carved walnut tray", "Serving tray with a carved girih border.", 66, 5, "Walnut, natural oil", "40 × 26 cm"),
        ("Walnut chess box", "Carved box that opens into a board.", 88, 3, "Walnut, maple", "30 × 30 cm"),
        ("Carved coaster set", "Six coasters with different star patterns.", 24, 16, "Walnut", "Ø 10 cm"),
    ],
    "Qalampir Atelier": [
        (
            "Do'ppi for children",
            "Smaller skullcap with the pepper-pod pattern.",
            22,
            9,
            "Cotton, silk thread",
            "Head size 50–52 cm",
        ),
        (
            "Embroidered glasses case",
            "Soft case with pepper-pod embroidery.",
            16,
            12,
            "Cotton, silk thread",
            "17 × 8 cm",
        ),
    ],
    "Shohi Silk Line": [
        ("Shohi silk shawl", "Wide silk shawl in plum and gold.", 84, 4, "100% silk", "200 × 70 cm"),
        ("Silk eye mask", "Sleep mask cut from khan-atlas.", 18, 20, "100% silk", "One size"),
    ],
}

# New arrivals uploaded by the content team for the store's own catalog
STORE_ARRIVALS = [
    (
        "ceramics",
        "Rishtan pitcher",
        "Tall pitcher for water or ayran.",
        42,
        6,
        "Rishtan, Fergana Valley",
        "Red clay, ishqor glaze",
    ),
    (
        "ceramics",
        "Painted salt cellar",
        "Tiny lidded pot for the table.",
        15,
        18,
        "Rishtan, Fergana Valley",
        "Red clay",
    ),
    (
        "ceramics",
        "Lagan plate, 40 cm",
        "Extra-large plate for a family plov.",
        96,
        3,
        "Rishtan, Fergana Valley",
        "Red clay, ishqor glaze",
    ),
    (
        "textiles",
        "Ikat throw blanket",
        "Light adras throw for the sofa.",
        110,
        4,
        "Margilan, Fergana Valley",
        "Silk warp, cotton weft",
    ),
    ("textiles", "Suzani coaster set", "Four embroidered coasters.", 19, 15, "Bukhara", "Cotton, silk thread"),
    (
        "textiles",
        "Adras fabric by the metre",
        "Cut to order for sewing projects.",
        24,
        40,
        "Margilan, Fergana Valley",
        "Silk warp, cotton weft",
    ),
    ("silk", "Silk scrunchie trio", "Three hair ties in ikat silk.", 14, 30, "Margilan, Fergana Valley", "100% silk"),
    (
        "silk",
        "Khan-atlas pocket notebook",
        "A5 notebook bound in silk.",
        21,
        12,
        "Margilan, Fergana Valley",
        "Silk cover, paper",
    ),
    ("silk", "Silk bow tie", "Self-tie bow tie in red ikat.", 29, 9, "Margilan, Fergana Valley", "100% silk"),
    ("home-wood", "Walnut spoon set", "Three carved serving spoons.", 27, 14, "Khiva, Khorezm region", "Walnut"),
    ("home-wood", "Copper tea glass holders", "Pair of holders for tea glasses.", 33, 8, "Bukhara", "Copper"),
    (
        "home-wood",
        "Carved bread board",
        "Board with a carved non (bread) stamp border.",
        38,
        7,
        "Khiva, Khorezm region",
        "Walnut",
    ),
]

FIRST_NAMES = [
    "Aziza",
    "Bobur",
    "Kamila",
    "Rustam",
    "Malika",
    "Timur",
    "Zarina",
    "Akmal",
    "Sevara",
    "Jahongir",
    "Nodira",
    "Farrukh",
    "Gulchehra",
    "Islom",
    "Mohira",
    "Sherzod",
    "Anna",
    "Lena",
    "Mehmet",
    "Sofia",
    "Daniel",
    "Yuna",
    "Omar",
    "Elif",
    "Lucas",
    "Mira",
    "Arman",
    "Aigerim",
    "Hana",
    "Noah",
]
LAST_NAMES = [
    "Tashkentova",
    "Usmonov",
    "Ismoilova",
    "Qosimov",
    "Hasanova",
    "Jurayev",
    "Sobirova",
    "Nazarov",
    "Fischer",
    "Yilmaz",
    "Kim",
    "Haddad",
    "Silva",
    "Novak",
    "Bekova",
    "Petrov",
    "Moreau",
    "Sato",
]
CITIES = [
    ("Tashkent", "Uzbekistan", 30),
    ("Samarkand", "Uzbekistan", 8),
    ("Bukhara", "Uzbekistan", 5),
    ("Istanbul", "Turkey", 7),
    ("Berlin", "Germany", 6),
    ("Seoul", "South Korea", 5),
    ("Dubai", "UAE", 6),
    ("London", "United Kingdom", 6),
    ("New York", "United States", 7),
    ("Almaty", "Kazakhstan", 6),
    ("Moscow", "Russia", 6),
    ("Paris", "France", 4),
]
# Relative demand per month (Jan..Dec): Navruz in March, gifts in November and December, quiet summer
SEASON = [0.8, 0.85, 1.25, 1.0, 0.95, 0.75, 0.7, 0.75, 0.9, 1.0, 1.3, 1.6]

CUSTOMER_LINES = [
    "Hi! Is the {p} still available?",
    "Can you ship to {c}? How long does it take?",
    "I'm looking for a gift for my mother, something in silk.",
    "Do you have this plate in a bigger size?",
    "Hello, my order hasn't arrived yet. Can you check it?",
    "Is the colour in the photo accurate?",
    "Can I pay in cash when it arrives?",
    "Do you have anything similar to this but cheaper?",
]
OPERATOR_LINES = [
    "Hello! Yes, we have {n} left in stock.",
    "Shipping to {c} takes about 7 to 10 days.",
    "I'd suggest the khan-atlas scarf, it's our most popular gift.",
    "Let me check that for you, one moment please.",
    "Your parcel left Tashkent yesterday, here is what I can see.",
    "The colours are close to the photo, slightly deeper in daylight.",
    "Yes, cash on delivery works for every country we ship to.",
    "Thanks for writing! Anything else I can help with?",
]


class Command(BaseCommand):
    help = "Create 12 months of demo activity for the panels (firms, staff, customers, orders, chats)."

    def add_arguments(self, parser):
        parser.add_argument("--password", default="nafis-demo-2026", help="Password for every demo account.")
        parser.add_argument("--small", action="store_true", help="Create a small data set (used by tests).")

    def handle(self, *args, **options):
        if Firm.objects.filter(tax_id=MARKER_TAX_ID).exists():
            self.stdout.write(self.style.WARNING("Demo platform data already exists, nothing to do."))
            return
        call_command("seed_demo", verbosity=0)
        self.rng = random.Random(2026)
        self.now = timezone.now()
        self.password = options["password"]
        # Hash once: hashing per user would take minutes for a few hundred accounts.
        self.password_hash = make_password(self.password)
        self.small = options["small"]
        with transaction.atomic():
            operators = self.create_staff(OPERATORS, StaffProfile.Role.OPERATOR)
            editors = self.create_staff(EDITORS, StaffProfile.Role.EDITOR)
            self.assign_store_products(editors)
            firms = self.create_firms()
            customers = self.create_customers()
            orders = self.create_orders(customers, firms)
            chats = self.create_conversations(operators, customers)
        if options["verbosity"]:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created {len(operators)} operators, {len(editors)} editors, {len(firms)} firms, "
                    f"{len(customers)} customers, {orders} orders and {chats} support chats."
                )
            )
            self.stdout.write("Demo sign-ins (password: %s):" % self.password)
            for email in (operators[0].email, editors[0].email, firms[0].owner.email):
                self.stdout.write(f"  {email}")

    # -- helpers -------------------------------------------------------------

    def ago(self, days: float, jitter_hours: float = 10) -> timezone.datetime:
        return self.now - timedelta(days=days, hours=self.rng.uniform(0, jitter_hours))

    def phone(self) -> str:
        r = self.rng
        return (
            f"+998 {r.choice([90, 91, 93, 94, 97, 99])} {r.randint(100, 999)} {r.randint(10, 99)} {r.randint(10, 99)}"
        )

    def make_user(self, first, last, email, joined, last_login=None):
        user = User(username=email, email=email, first_name=first, last_name=last, date_joined=joined)
        user.password = self.password_hash
        user.last_login = last_login
        user.save()
        return user

    # -- people --------------------------------------------------------------

    def create_staff(self, people, role):
        users = []
        for first, last, position, *rest in people:
            email = f"{first}.{last}@example.com".lower()
            joined = self.ago(rest[1] if role == StaffProfile.Role.OPERATOR else 300)
            user = self.make_user(first, last, email, joined, self.ago(self.rng.uniform(0, 1)))
            StaffProfile.objects.create(user=user, role=role, phone=self.phone(), position=position, created_at=joined)
            user.weight = rest[0]
            users.append(user)
        return users

    def assign_store_products(self, editors):
        weights = [e.weight for e in editors]
        # The original catalog was uploaded about a year ago
        for i, product in enumerate(Product.objects.filter(firm__isnull=True).order_by("id")):
            product.created_by = self.rng.choices(editors, weights)[0]
            product.created_at = self.ago(345 - i * 3)
            product.save(update_fields=["created_by", "created_at"])
        categories = {c.slug: c for c in Category.objects.all()}
        arrivals = STORE_ARRIVALS[:4] if self.small else STORE_ARRIVALS
        for i, (cat, name, summary, price, stock, origin, materials) in enumerate(arrivals):
            # Spread over the last six weeks, with the two newest uploaded today
            days = 0.05 * (i + 1) if i < 2 else self.rng.uniform(1, 42)
            Product.objects.create(
                category=categories[cat],
                name=name,
                summary=summary,
                description=f"{summary} Made by hand and checked by our team before it ships.",
                price=Decimal(price),
                stock=stock,
                origin=origin,
                materials=materials,
                created_by=self.rng.choices(editors, weights)[0],
                created_at=self.now - timedelta(days=days),
            )

    def create_firms(self):
        categories = {c.slug: c for c in Category.objects.all()}
        firms = []
        plans = FIRMS[:4] if self.small else FIRMS
        for n, (name, form, cat, city, owner, plan, verified, days) in enumerate(plans, start=1):
            first, last = owner.split(" ", 1)
            email = f"{first}.{last}.firm@example.com".lower()
            joined = self.ago(days)
            user = self.make_user(first, last, email, joined, self.ago(1 if plan in ("top", "active") else 60))
            firm = Firm(
                owner=user,
                name=name,
                legal_form=form,
                tax_id=f"3000000{n:02d}",
                main_category=categories[cat],
                city=city,
                address=f"{self.rng.randint(1, 120)} Mustaqillik street",
                phone=self.phone(),
                email=f"hello@{name.lower().replace(' ', '').replace(chr(39), '')}.example.com",
                description=f"{name} is a family workshop in {city}.",
                owner_full_name=owner,
                owner_phone=self.phone(),
                owner_birth_date=date(1970 + n * 2, (n % 12) + 1, 10 + n),
                passport_issued_by=f"{city} city department of internal affairs",
                passport_issue_date=date(2018, (n % 12) + 1, 5),
                created_at=joined,
                status=Firm.Status.SUSPENDED if plan == "churned" else Firm.Status.ACTIVE,
                is_verified=verified,
                verified_at=joined + timedelta(days=3) if verified else None,
            )
            firm.passport_number = f"AA{n:07d}"  # obviously fictional
            firm.save()
            firm.plan = plan
            for i, (pname, summary, price, stock, materials, dims) in enumerate(FIRM_PRODUCTS.get(name, [])):
                Product.objects.create(
                    category=categories[cat],
                    name=pname,
                    summary=summary,
                    description=f"{summary} Made and sold by {name}, {city}.",
                    price=Decimal(price),
                    stock=stock,
                    origin=city,
                    materials=materials,
                    dimensions=dims,
                    firm=firm,
                    created_by=user,
                    created_at=joined + timedelta(days=2 + i * 6),
                    is_active=plan != "churned",
                )
            firms.append(firm)
        return firms

    def create_customers(self):
        count = 25 if self.small else 160
        personas = self.rng.choices(
            ["power", "active", "occasional", "never", "churned"], [12, 30, 18, 22, 18], k=count
        )
        customers = []
        for i, persona in enumerate(personas):
            first, last = self.rng.choice(FIRST_NAMES), self.rng.choice(LAST_NAMES)
            # More sign-ups recently: the shop is growing
            joined_days = 360 * (self.rng.random() ** 1.4)
            if persona == "churned":
                joined_days = self.rng.uniform(150, 360)
            elif persona in ("power", "occasional"):
                joined_days = max(joined_days, self.rng.uniform(60, 360))
            last_login = {
                "power": self.ago(self.rng.uniform(0, 12)),
                "active": self.ago(self.rng.uniform(0, 25)),
                "occasional": self.ago(self.rng.uniform(35, 80)),
                "never": self.ago(max(0, joined_days - self.rng.uniform(0, 2))) if self.rng.random() < 0.7 else None,
                "churned": self.ago(self.rng.uniform(110, max(115, joined_days - 5))),
            }[persona]
            user = self.make_user(
                first, last, f"{first}.{last}.{i}@example.com".lower(), self.ago(joined_days), last_login
            )
            if persona == "churned" and self.rng.random() < 0.15:
                user.is_active = False
                user.save(update_fields=["is_active"])
            user.persona = persona
            customers.append(user)
        return customers

    # -- orders --------------------------------------------------------------

    def order_date(self, earliest_days: float, latest_days: float):
        """Random date between the two bounds, following the seasonal curve."""
        for _ in range(50):
            days = self.rng.uniform(latest_days, earliest_days)
            moment = self.now - timedelta(days=days, minutes=self.rng.randint(0, 600))
            if self.rng.random() < SEASON[timezone.localtime(moment).month - 1] / max(SEASON):
                return moment
        return moment

    def product_weights(self, firms):
        plan_of = {f.id: f.plan for f in firms}
        products = list(Product.objects.select_related("firm"))
        weights, trend = {}, {}
        for p in products:
            plan = plan_of.get(p.firm_id)
            weights[p.id] = {"top": 4.0, "active": 2.0, "struggling": 0.25, "churned": 1.5, None: 2.0}.get(plan, 1.0)
            if p.is_featured:
                weights[p.id] *= 1.6
        # A few products cooling off and a few catching on, so the trend lists have something to say
        store = [p for p in products if p.firm_id is None and p.stock > 0]
        for p in self.rng.sample(store, k=min(3, len(store))):
            trend[p.id] = "falling"
        for p in self.rng.sample(store, k=min(3, len(store))):
            trend.setdefault(p.id, "rising")
        return products, weights, trend, plan_of

    def pick_products(self, products, weights, trend, plan_of, moment):
        age = (self.now - moment).days
        candidates, w = [], []
        for p in products:
            if p.created_at > moment:
                continue
            plan = plan_of.get(p.firm_id)
            if plan == "churned" and age < 100:
                continue
            if plan == "struggling" and age < 30 and self.rng.random() < 0.85:
                continue
            weight = weights[p.id]
            if trend.get(p.id) == "falling":
                weight *= 3.0 if 30 <= age < 60 else (0.15 if age < 30 else 1)
            elif trend.get(p.id) == "rising":
                weight *= 3.0 if age < 30 else 0.7
            candidates.append(p)
            w.append(weight)
        if not candidates:
            return []
        lines = self.rng.choices([1, 2, 3], [60, 30, 10])[0]
        chosen = []
        for p in self.rng.choices(candidates, w, k=lines):
            if p not in chosen:
                chosen.append(p)
        return chosen

    def create_orders(self, customers, firms):
        products, weights, trend, plan_of = self.product_weights(firms)
        plans = []  # (moment, user or None)
        for user in customers:
            joined_days = (self.now - user.date_joined).days
            persona = user.persona
            if persona == "power":
                n = self.rng.randint(5, 11)
                plans += [(self.order_date(joined_days, 0), user) for _ in range(n - 1)]
                plans.append((self.order_date(20, 0), user))
            elif persona == "active":
                n = self.rng.randint(1, 3)
                plans += [(self.order_date(joined_days, 0), user) for _ in range(n - 1)]
                plans.append((self.order_date(28, 0), user))
            elif persona == "occasional":
                plans += [(self.order_date(min(joined_days, 85), 35), user) for _ in range(self.rng.randint(1, 3))]
            elif persona == "churned":
                plans += [
                    (self.order_date(joined_days, max(100, joined_days * 0.4)), user)
                    for _ in range(self.rng.randint(1, 4))
                ]
        guests = 60 if self.small else 520
        plans += [(self.order_date(360, 0), None) for _ in range(guests)]

        orders, order_lines = [], []
        for moment, user in plans:
            chosen = self.pick_products(products, weights, trend, plan_of, moment)
            if not chosen:
                continue
            first = user.first_name if user else self.rng.choice(FIRST_NAMES)
            last = user.last_name if user else self.rng.choice(LAST_NAMES)
            city, country, _ = self.rng.choices(CITIES, [c[2] for c in CITIES])[0]
            age = (self.now - moment).days
            if age > 14:
                status = self.rng.choices(["delivered", "shipped", "cancelled"], [88, 6, 6])[0]
            elif age > 3:
                status = self.rng.choices(["shipped", "paid", "pending", "cancelled"], [50, 25, 20, 5])[0]
            else:
                status = self.rng.choices(["pending", "paid"], [60, 40])[0]
            lines = [(p, self.rng.choices([1, 2, 3], [80, 17, 3])[0]) for p in chosen]
            subtotal = sum((p.price * q for p, q in lines), Decimal("0"))
            shipping = calculate_shipping(subtotal)
            orders.append(
                Order(
                    user=user,
                    status=status,
                    payment_method=self.rng.choice(["card", "cod"]),
                    full_name=f"{first} {last}",
                    email=(user.email if user else f"{first}.{last}@example.com".lower()),
                    phone=self.phone(),
                    country=country,
                    city=city,
                    address=f"{self.rng.randint(1, 200)} Main street",
                    subtotal=subtotal,
                    shipping=shipping,
                    total=subtotal + shipping,
                    created_at=moment,
                )
            )
            order_lines.append(lines)

        Order.objects.bulk_create(orders, batch_size=500)
        items = [
            OrderItem(
                order=order,
                product=p,
                product_name=p.name,
                product_slug=p.slug,
                unit_price=p.price,
                quantity=q,
                line_total=p.price * q,
            )
            for order, lines in zip(orders, order_lines, strict=True)
            for p, q in lines
        ]
        OrderItem.objects.bulk_create(items, batch_size=1000)
        return len(orders)

    # -- support chats -------------------------------------------------------

    def create_conversations(self, operators, customers):
        total = 30 if self.small else 420
        op_weights = [o.weight for o in operators]
        speed = {o.id: s for o, s in zip(operators, [40, 75, 110, 160], strict=False)}
        hours = list(range(24))
        hour_weights = [1, 1, 0, 0, 0, 0, 1, 2, 4, 6, 8, 9, 9, 7, 6, 6, 6, 7, 8, 9, 9, 7, 4, 2]
        products = list(Product.objects.filter(is_active=True).values_list("name", flat=True))
        registered = [c for c in customers if c.persona != "never"]
        conversations, scripts = [], []
        for i in range(total):
            days = 120 * (self.rng.random() ** 1.2)
            moment = timezone.localtime(self.now - timedelta(days=days)).replace(
                hour=self.rng.choices(hours, hour_weights)[0], minute=self.rng.randint(0, 59)
            )
            if moment > self.now:
                moment -= timedelta(days=1)
            customer = self.rng.choice(registered) if self.rng.random() < 0.4 and registered else None
            name = customer.first_name if customer else self.rng.choice(FIRST_NAMES)
            operator = self.rng.choices(operators, op_weights)[0]
            response = timedelta(seconds=max(8, self.rng.gauss(speed[operator.id], speed[operator.id] * 0.4)))
            conversations.append(
                Conversation(
                    customer=customer,
                    customer_name=name,
                    customer_contact=customer.email if customer else f"{name.lower()}{i}@example.com",
                    operator=operator,
                    status=Conversation.Status.CLOSED,
                    created_at=moment,
                    first_response_at=moment + response,
                    closed_at=moment + response + timedelta(minutes=8),
                    last_message_at=moment + response + timedelta(minutes=6),
                )
            )
            scripts.append((operator, self.rng.randint(2, 4)))

        # A live queue: a few people waiting right now and two chats in progress
        live = [] if self.small else [("Lena", None), ("Timur", None), ("Yuna", None), ("Bobur", 0), ("Elif", 1)]
        for name, op_index in live:
            moment = self.now - timedelta(minutes=self.rng.randint(2, 25))
            operator = operators[op_index] if op_index is not None else None
            conversations.append(
                Conversation(
                    customer_name=name,
                    customer_contact=f"{name.lower()}@example.com",
                    operator=operator,
                    status=Conversation.Status.OPEN if operator else Conversation.Status.WAITING,
                    created_at=moment,
                    first_response_at=moment + timedelta(seconds=50) if operator else None,
                    last_message_at=moment,
                )
            )
            scripts.append((operator, 1))

        Conversation.objects.bulk_create(conversations, batch_size=500)
        messages = []
        for chat, (operator, rounds) in zip(conversations, scripts, strict=True):
            t = chat.created_at
            messages.append(
                Message(
                    conversation=chat,
                    sender="system",
                    created_at=t,
                    text="Thanks for writing. An operator will join shortly.",
                )
            )
            for r in range(rounds):
                p = self.rng.choice(products) if products else "plate"
                city = self.rng.choice(CITIES)[0]
                messages.append(
                    Message(
                        conversation=chat,
                        sender="customer",
                        author=chat.customer,
                        created_at=t + timedelta(seconds=5),
                        text=self.rng.choice(CUSTOMER_LINES).format(p=p, c=city),
                    )
                )
                if operator:
                    t = chat.first_response_at if r == 0 else t + timedelta(minutes=1)
                    messages.append(
                        Message(
                            conversation=chat,
                            sender="operator",
                            author=operator,
                            created_at=t,
                            text=self.rng.choice(OPERATOR_LINES).format(n=self.rng.randint(2, 9), c=city),
                        )
                    )
        Message.objects.bulk_create(messages, batch_size=1000)
        return len(conversations)
