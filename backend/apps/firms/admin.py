from django.contrib import admin

from .models import Firm


@admin.register(Firm)
class FirmAdmin(admin.ModelAdmin):
    list_display = ("name", "owner_full_name", "city", "status", "is_verified", "created_at")
    list_filter = ("status", "is_verified", "legal_form")
    search_fields = ("name", "tax_id", "owner_full_name", "email")
    raw_id_fields = ("owner",)
    # The encrypted value is never editable or visible here; only the masked form is shown.
    exclude = ("passport_number_encrypted",)
    readonly_fields = ("passport_masked", "created_at", "updated_at", "verified_at")

    @admin.display(description="Passport")
    def passport_masked(self, obj):
        return obj.passport_masked
