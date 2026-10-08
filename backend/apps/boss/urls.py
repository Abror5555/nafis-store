from django.urls import path

from . import views

urlpatterns = [
    path("boss/overview/", views.OverviewView.as_view(), name="boss-overview"),
    path("boss/users/", views.UsersView.as_view(), name="boss-users"),
    path("boss/users/<int:pk>/", views.UserUpdateView.as_view(), name="boss-user"),
    path("boss/firms/", views.FirmsView.as_view(), name="boss-firms"),
    path("boss/firms/<int:pk>/", views.FirmDetailView.as_view(), name="boss-firm"),
    path("boss/firms/<int:pk>/passport/", views.FirmPassportView.as_view(), name="boss-firm-passport"),
    path(
        "boss/firms/<int:pk>/<str:action>/",
        views.FirmActionView.as_view(),
        name="boss-firm-action",
    ),
    path("boss/operators/", views.OperatorsView.as_view(), name="boss-operators"),
    path("boss/editors/", views.EditorsView.as_view(), name="boss-editors"),
    path("boss/orders/", views.BossOrdersView.as_view(), name="boss-orders"),
    path("boss/orders/<int:pk>/", views.BossOrderUpdateView.as_view(), name="boss-order"),
    path("boss/products/", views.BossProductsView.as_view(), name="boss-products"),
    path("boss/products/<int:pk>/", views.BossProductUpdateView.as_view(), name="boss-product"),
]
