from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import FirmMeView, FirmProductsViewSet, FirmRegisterView, FirmStatsView

router = DefaultRouter()
router.register("firm/products", FirmProductsViewSet, basename="firm-product")

urlpatterns = [
    path("firms/register/", FirmRegisterView.as_view(), name="firm-register"),
    path("firm/me/", FirmMeView.as_view(), name="firm-me"),
    path("firm/stats/", FirmStatsView.as_view(), name="firm-stats"),
    *router.urls,
]
