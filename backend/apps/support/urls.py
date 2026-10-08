from django.urls import path

from . import views_customer as customer
from . import views_operator as operator

urlpatterns = [
    # Shopper side
    path("support/conversations/", customer.StartConversationView.as_view(), name="support-start"),
    path("support/conversations/<uuid:token>/", customer.ConversationView.as_view(), name="support-conversation"),
    path(
        "support/conversations/<uuid:token>/messages/",
        customer.CustomerMessageView.as_view(),
        name="support-message",
    ),
    path("support/conversations/<uuid:token>/close/", customer.CustomerCloseView.as_view(), name="support-close"),
    # Operator desk
    path("operator/me/", operator.OperatorMeView.as_view(), name="operator-me"),
    path("operator/conversations/", operator.OperatorConversationList.as_view(), name="operator-conversations"),
    path(
        "operator/conversations/<int:pk>/",
        operator.OperatorConversationDetail.as_view(),
        name="operator-conversation",
    ),
    path("operator/conversations/<int:pk>/claim/", operator.OperatorClaimView.as_view(), name="operator-claim"),
    path(
        "operator/conversations/<int:pk>/messages/",
        operator.OperatorMessageView.as_view(),
        name="operator-message",
    ),
    path("operator/conversations/<int:pk>/close/", operator.OperatorCloseView.as_view(), name="operator-close"),
    path("operator/products/", operator.OperatorProductLookup.as_view(), name="operator-products"),
]
