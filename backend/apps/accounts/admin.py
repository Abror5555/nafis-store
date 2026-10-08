from django.contrib import admin

from .models import StaffProfile


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "phone", "position", "created_at")
    list_filter = ("role",)
    search_fields = ("user__email", "user__first_name", "user__last_name", "phone")
    raw_id_fields = ("user",)
