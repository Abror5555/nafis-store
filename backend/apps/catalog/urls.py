from django.urls import path
from rest_framework.routers import DefaultRouter

from .editor import EditorMeView, EditorProductsViewSet
from .views import CategoryViewSet, ProductViewSet

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("products", ProductViewSet, basename="product")
router.register("editor/products", EditorProductsViewSet, basename="editor-product")

urlpatterns = [
    path("editor/me/", EditorMeView.as_view(), name="editor-me"),
    *router.urls,
]
