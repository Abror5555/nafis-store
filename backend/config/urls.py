from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.static import serve

admin.site.site_header = f"{settings.STORE_NAME} admin"
admin.site.site_title = f"{settings.STORE_NAME} admin"
admin.site.index_title = "Store management"


def health(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/", include("apps.catalog.urls")),
    path("api/", include("apps.orders.urls")),
    path("api/", include("apps.accounts.urls")),
    path("api/", include("apps.assistant.urls")),
    path("api/", include("apps.firms.urls")),
    path("api/", include("apps.support.urls")),
    path("api/", include("apps.boss.urls")),
]

if settings.SERVE_MEDIA:
    # Fine for a demo deployment; use object storage or a web server in real production.
    urlpatterns += [
        re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
    ]
