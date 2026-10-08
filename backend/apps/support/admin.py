from django.contrib import admin

from .models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    fields = ("sender", "author", "text", "image", "created_at")
    readonly_fields = fields


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "customer_name", "operator", "status", "created_at", "first_response_at")
    list_filter = ("status",)
    search_fields = ("customer_name", "customer_contact")
    raw_id_fields = ("customer", "operator")
    inlines = [MessageInline]
