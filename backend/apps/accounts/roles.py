"""One place that decides what kind of account a user is."""

from rest_framework.permissions import BasePermission

BOSS = "boss"
OPERATOR = "operator"
EDITOR = "editor"
FIRM = "firm"
CUSTOMER = "customer"

PANEL_PATHS = {BOSS: "/boss", OPERATOR: "/operator", EDITOR: "/editor", FIRM: "/firm", CUSTOMER: "/account"}


def role_of(user) -> str | None:
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return BOSS
    # Reverse one-to-one access raises when the row is missing; hasattr turns that into False.
    if hasattr(user, "staff_profile"):
        return user.staff_profile.role
    if hasattr(user, "firm"):
        return FIRM
    return CUSTOMER


class _RolePermission(BasePermission):
    role: str = ""
    message = "Your account doesn't have access to this panel."

    def has_permission(self, request, view):
        return role_of(request.user) == self.role and request.user.is_active


class IsBoss(_RolePermission):
    role = BOSS


class IsOperator(_RolePermission):
    role = OPERATOR


class IsEditor(_RolePermission):
    role = EDITOR


class IsFirmOwner(_RolePermission):
    role = FIRM

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.firm.status == "active"
