from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.catalog.serializers import ProductListSerializer

from .service import answer


class TurnSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(max_length=1000)


class AssistantRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=500, trim_whitespace=True)
    history = TurnSerializer(many=True, required=False, max_length=10)

    def validate_history(self, turns):
        # Keep the last few turns and make sure the conversation starts with a user turn.
        turns = turns[-6:]
        while turns and turns[0]["role"] != "user":
            turns = turns[1:]
        return turns


class AssistantView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "assistant"

    def post(self, request):
        serializer = AssistantRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = answer(serializer.validated_data["message"], serializer.validated_data.get("history", []))
        return Response(
            {
                "reply": result.reply,
                "mode": result.mode,
                "products": ProductListSerializer(result.products, many=True).data,
            }
        )
