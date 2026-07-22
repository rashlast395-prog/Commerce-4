from fastapi import APIRouter, Header, HTTPException

from app.config import settings
from app.domain.analytics import (
    forecast_next_day_demand,
    revenue_by_day,
    segment_customers,
    top_selling_items,
)
from app.services.firestore_client import fetch_order_items_dataframe, fetch_orders_dataframe

router = APIRouter(prefix="/analytics")


def _require_internal_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if not settings.ai_service_api_key:
        # Not configured — allow through in local dev rather than locking
        # everyone out, matching the "degrade gracefully" pattern used
        # elsewhere (Firebase not configured, payment providers not set).
        return
    if x_api_key != settings.ai_service_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key")


@router.get("/revenue-trends")
def revenue_trends(restaurant_id: str | None = None, x_api_key: str | None = Header(default=None)) -> dict:
    _require_internal_api_key(x_api_key)
    orders = fetch_orders_dataframe(restaurant_id)
    return {"trend": revenue_by_day(orders)}


@router.get("/top-items")
def top_items(restaurant_id: str | None = None, limit: int = 5, x_api_key: str | None = Header(default=None)) -> dict:
    _require_internal_api_key(x_api_key)
    items = fetch_order_items_dataframe(restaurant_id)
    return {"items": top_selling_items(items, limit=limit)}


@router.get("/demand-forecast")
def demand_forecast(
    restaurant_id: str, menu_item_id: str, x_api_key: str | None = Header(default=None)
) -> dict:
    _require_internal_api_key(x_api_key)
    items = fetch_order_items_dataframe(restaurant_id)
    return forecast_next_day_demand(items, menu_item_id)


@router.get("/customer-segments")
def customer_segments(restaurant_id: str | None = None, x_api_key: str | None = Header(default=None)) -> dict:
    _require_internal_api_key(x_api_key)
    orders = fetch_orders_dataframe(restaurant_id)
    return {"segments": segment_customers(orders)}
