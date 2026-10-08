"""
Shopping assistant.

With ANTHROPIC_API_KEY set, answers come from Claude, grounded in the live
catalog. Without a key, a keyword matcher over the catalog is used instead, so
the feature still works in a demo without any paid API.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from decimal import Decimal

from django.conf import settings

from apps.catalog.models import Product

logger = logging.getLogger(__name__)

MAX_SUGGESTIONS = 3
STOPWORDS = {
    "a",
    "an",
    "the",
    "and",
    "or",
    "for",
    "to",
    "of",
    "in",
    "on",
    "with",
    "i",
    "me",
    "my",
    "you",
    "do",
    "have",
    "any",
    "is",
    "are",
    "it",
    "that",
    "this",
    "something",
    "some",
    "want",
    "need",
    "looking",
    "show",
    "find",
    "please",
    "can",
    "gift",
    "buy",
    "under",
    "below",
}


@dataclass
class AssistantAnswer:
    reply: str
    products: list[Product] = field(default_factory=list)
    mode: str = "search"


def _catalog():
    return list(Product.objects.active().select_related("category").order_by("category__sort_order", "name"))


def _price_cap(message: str) -> Decimal | None:
    match = re.search(r"(?:under|below|less than|max|up to)\s*\$?\s*(\d+(?:\.\d+)?)", message, re.I)
    return Decimal(match.group(1)) if match else None


def keyword_answer(message: str) -> AssistantAnswer:
    words = [w for w in re.findall(r"[a-z]+", message.lower()) if w not in STOPWORDS and len(w) > 2]
    cap = _price_cap(message)
    scored = []
    for product in _catalog():
        if cap is not None and product.price > cap:
            continue
        haystack = " ".join(
            [product.name, product.summary, product.category.name, product.materials, product.origin]
        ).lower()
        stems = [w[:-1] if w.endswith("s") and len(w) > 3 else w for w in words]
        score = sum(2 if s in product.name.lower() else 1 for s in stems if s in haystack)
        if score or (cap is not None and not words):
            scored.append((score, product.is_featured, product))
    scored.sort(key=lambda t: (t[0], t[1]), reverse=True)
    if words:
        products = [p for _, _, p in scored[:MAX_SUGGESTIONS]]
    else:
        # Only a budget was given: suggest one piece from each craft instead of three plates.
        products, seen = [], set()
        for _, _, product in scored:
            if product.category_id not in seen and product.in_stock:
                products.append(product)
                seen.add(product.category_id)
            if len(products) == MAX_SUGGESTIONS:
                break

    if products:
        reply = "Here is what matches your request. Open a product to see materials, size and stock."
    else:
        reply = (
            "Nothing in the shop matches that yet. Try a material or object, such as "
            "“silk scarf”, “blue plate” or “something under $40”."
        )
    return AssistantAnswer(reply=reply, products=products, mode="search")


SYSTEM_PROMPT = """You are the shopping assistant for {store}, an online shop selling handmade \
crafts from Uzbekistan. Help customers choose products from the catalog below.

Rules:
- Recommend only products that appear in the catalog. Never invent products, prices or stock.
- Keep replies under 90 words, friendly and concrete (mention material, size or origin when useful).
- If nothing fits, say so and suggest the closest alternative.
- Shipping: free over ${free}, otherwise ${flat}. Payment by card or cash on delivery.
- Off-topic questions: politely steer back to the shop.
- If you recommend products, finish with one final line exactly like:
  PRODUCTS: slug-one, slug-two
  (up to {max} slugs from the catalog). Omit that line if you recommend nothing.

Catalog (slug | name | category | price | stock | origin | materials | summary):
{catalog}
"""


def _catalog_text(products: list[Product]) -> str:
    return "\n".join(
        f"{p.slug} | {p.name} | {p.category.name} | ${p.price} | {p.stock} | {p.origin} | {p.materials} | {p.summary}"
        for p in products
    )


def _split_products_line(text: str) -> tuple[str, list[str]]:
    match = re.search(r"^\s*PRODUCTS:\s*(.+?)\s*$", text, re.M | re.I)
    if not match:
        return text.strip(), []
    slugs = [s.strip() for s in match.group(1).split(",") if s.strip()]
    reply = (text[: match.start()] + text[match.end() :]).strip()
    return reply, slugs[:MAX_SUGGESTIONS]


def ai_answer(message: str, history: list[dict]) -> AssistantAnswer:
    import anthropic

    products = _catalog()
    system = SYSTEM_PROMPT.format(
        store=settings.STORE_NAME,
        free=settings.FREE_SHIPPING_THRESHOLD,
        flat=settings.FLAT_SHIPPING_RATE,
        max=MAX_SUGGESTIONS,
        catalog=_catalog_text(products),
    )
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=20.0)
    response = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=400,
        system=system,
        messages=[*history, {"role": "user", "content": message}],
    )
    text = "".join(block.text for block in response.content if block.type == "text")
    reply, slugs = _split_products_line(text)
    by_slug = {p.slug: p for p in products}
    suggested = [by_slug[s] for s in slugs if s in by_slug]
    return AssistantAnswer(reply=reply or "Here are some ideas.", products=suggested, mode="ai")


def answer(message: str, history: list[dict]) -> AssistantAnswer:
    if settings.ANTHROPIC_API_KEY:
        try:
            return ai_answer(message, history)
        except Exception:
            logger.exception("AI assistant failed; falling back to keyword search")
    return keyword_answer(message)
