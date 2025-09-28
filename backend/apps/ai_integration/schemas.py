from datetime import datetime

from ninja import ModelSchema, Schema

from .models import AIModel, UsageTracking


class AIModelSchema(ModelSchema):
    class Meta:
        model = AIModel
        fields = [
            "id",
            "name",
            "display_name",
            "provider",
            "openrouter_model_id",
            "supports_vision",
            "supports_function_calling",
            "supports_streaming",
            "max_context_length",
            "max_output_tokens",
            "input_price_per_million",
            "output_price_per_million",
            "is_active",
            "requires_subscription",
            "min_subscription_tier",
            "average_response_time_ms",
            "reliability_score",
            "created_at",
            "updated_at",
        ]


class UsageRecordSchema(ModelSchema):
    class Meta:
        model = UsageTracking
        fields = [
            "id",
            "model_used",
            "operation_type",
            "input_tokens",
            "output_tokens",
            "total_tokens",
            "estimated_cost",
            "response_time_ms",
            "was_cached",
            "created_at",
        ]


class CostEstimateResponse(Schema):
    estimated_cost: float
    model: str
    input_tokens: int
    output_tokens: int
    calculated_at: datetime

