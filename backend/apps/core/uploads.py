"""Validation and naming for user-uploaded images."""

import uuid
from pathlib import Path

from django.utils import timezone
from rest_framework import serializers

MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "GIF"}


def validate_image(image):
    """DRF's ImageField already checks the file is a real image; this adds size and format limits."""
    if image is None:
        return image
    if image.size > MAX_IMAGE_BYTES:
        raise serializers.ValidationError("Images must be 5 MB or smaller.")
    fmt = getattr(getattr(image, "image", None), "format", None)
    if fmt and fmt.upper() not in ALLOWED_FORMATS:
        raise serializers.ValidationError("Upload a JPEG, PNG, WebP or GIF image.")
    return image


def _random_path(folder: str, filename: str) -> str:
    ext = Path(filename).suffix.lower()[:5] or ".jpg"
    return f"{folder}/{timezone.now():%Y/%m}/{uuid.uuid4().hex}{ext}"


# Module-level functions (not closures) so migrations can reference them.
def product_image_path(instance, filename):
    return _random_path("products", filename)


def support_image_path(instance, filename):
    return _random_path("support", filename)
