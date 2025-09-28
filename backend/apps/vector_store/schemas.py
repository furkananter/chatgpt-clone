from typing import Any, Dict, List

from ninja import Schema


class VectorSearchRequest(Schema):
    query: str
    limit: int = 5
    filter_metadata: Dict[str, Any] | None = None


class VectorSearchResult(Schema):
    message_id: str
    score: float
    metadata: Dict[str, Any]


class VectorSearchResponse(Schema):
    results: List[VectorSearchResult]

