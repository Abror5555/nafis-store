from django.contrib.auth.models import update_last_login
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.roles import IsFirmOwner
from apps.accounts.serializers import UserSerializer
from apps.boss import analytics
from apps.catalog.owned import OwnProductsViewSet

from .serializers import FirmProfileSerializer, FirmRegisterSerializer


class FirmRegisterView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = FirmRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        firm = serializer.save()
        update_last_login(None, firm.owner)
        refresh = RefreshToken.for_user(firm.owner)
        return Response(
            {
                "user": UserSerializer(firm.owner).data,
                "firm": FirmProfileSerializer(firm).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class FirmMeView(generics.RetrieveUpdateAPIView):
    serializer_class = FirmProfileSerializer
    permission_classes = [IsFirmOwner]
    http_method_names = ["get", "patch"]

    def get_object(self):
        return self.request.user.firm


class FirmStatsView(APIView):
    permission_classes = [IsFirmOwner]

    def get(self, request):
        firm = request.user.firm
        return Response({"own": analytics.firm_stats(firm), "market": analytics.market_stats(firm)})


class FirmProductsViewSet(OwnProductsViewSet):
    permission_classes = [IsFirmOwner]

    def owner_filter(self):
        return {"firm": self.request.user.firm}

    def extra_on_create(self):
        return {"firm": self.request.user.firm}
