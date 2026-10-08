"""Content editor desk: personal upload statistics and product management."""

from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.roles import IsEditor
from apps.boss import analytics

from .owned import OwnProductsViewSet


class EditorMeView(APIView):
    permission_classes = [IsEditor]

    def get(self, request):
        user = request.user
        period = analytics.make_period(request.query_params.get("range"))
        return Response(
            {
                "profile": {
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "phone": user.staff_profile.phone,
                    "position": user.staff_profile.position,
                    "joined": user.staff_profile.created_at,
                },
                "stats": analytics.editor_personal(user, period),
            }
        )


class EditorProductsViewSet(OwnProductsViewSet):
    permission_classes = [IsEditor]

    def owner_filter(self):
        return {"created_by": self.request.user}
