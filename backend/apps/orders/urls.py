from django.urls import path

from .views import MyOrdersView, OrderCreateView, OrderDetailView, StoreConfigView, StripeWebhookView

urlpatterns = [
    path("config/", StoreConfigView.as_view(), name="store-config"),
    path("orders/", OrderCreateView.as_view(), name="order-create"),
    path("orders/mine/", MyOrdersView.as_view(), name="order-mine"),
    path("orders/<uuid:public_id>/", OrderDetailView.as_view(), name="order-detail"),
    path("payments/stripe/webhook/", StripeWebhookView.as_view(), name="stripe-webhook"),
]
