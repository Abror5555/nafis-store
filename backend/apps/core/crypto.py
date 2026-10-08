"""Symmetric encryption for sensitive fields (e.g. passport numbers)."""

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def _fernet() -> Fernet:
    key = settings.FIELD_ENCRYPTION_KEY
    if not key:
        # Derived from SECRET_KEY so a demo works out of the box.
        # Set FIELD_ENCRYPTION_KEY in production so rotating SECRET_KEY can't lock you out of the data.
        key = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest()).decode()
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode() if value else ""


def decrypt(token: str) -> str:
    if not token:
        return ""
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        return ""


def mask(value: str, keep_start: int = 2, keep_end: int = 2) -> str:
    if not value:
        return ""
    if len(value) <= keep_start + keep_end:
        return "*" * len(value)
    return value[:keep_start] + "*" * (len(value) - keep_start - keep_end) + value[-keep_end:]
