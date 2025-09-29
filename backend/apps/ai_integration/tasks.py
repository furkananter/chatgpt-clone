import logging

logger = logging.getLogger(__name__)


def track_usage(user_id: str, model: str, tokens_used: int):
    from django.db.models import F
    from apps.authentication.models import User
    from .models import AIModel, UsageTracking

    try:
        ai_model = AIModel.objects.get(name=model)
        estimated_cost = (tokens_used / 1_000_000) * float(ai_model.input_price_per_million)
    except AIModel.DoesNotExist:
        estimated_cost = 0.0

    UsageTracking.objects.create(
        user_id=user_id,
        model_used=model,
        operation_type="chat",
        total_tokens=tokens_used,
        estimated_cost=estimated_cost,
    )

    User.objects.filter(id=user_id).update(
        monthly_message_count=F("monthly_message_count") + 1
    )

