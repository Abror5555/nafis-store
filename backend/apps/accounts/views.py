from django.contrib.auth import get_user_model
from django.contrib.auth.models import update_last_login
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


def _tokens_for(user) -> dict:
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


class RegisterView(generics.GenericAPIView):
    serializer_class = RegisterSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        update_last_login(None, user)
        return Response(
            {"user": UserSerializer(user).data, **_tokens_for(user)},
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """Email + password login. The email is stored as the username."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        identifier = str(data.pop("email", "") or data.get("username", "")).strip()
        # Accounts made on the site use the email as username; owners made with
        # `createsuperuser` may have a different username, so look them up by email.
        match = User.objects.filter(email__iexact=identifier).order_by("id").first() if identifier else None
        data["username"] = match.username if match else identifier.lower()
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
