from __future__ import annotations

import logging

import pandas as pd

from app.config import settings

logger = logging.getLogger("richys-eat-ai-service")

_app_initialized = False


def _ensure_firebase_app() -> None:
    global _app_initialized
    if _app_initialized:
        return
    if not settings.firebase_configured:
        raise RuntimeError(
            "Firebase is not configured for the AI service — set FIREBASE_PROJECT_ID, "
            "FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in services/ai-service/.env"
        )

    import firebase_admin
    from firebase_admin import credentials

    cred = credentials.Certificate(
        {
            "type": "service_account",
            "project_id": settings.firebase_project_id,
            "client_email": settings.firebase_client_email,
            "private_key": (settings.firebase_private_key or "").replace("\\n", "\n"),
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    )
    firebase_admin.initialize_app(cred)
    _app_initialized = True


def fetch_orders_dataframe(restaurant_id: str | None = None) -> pd.DataFrame:
    """Returns one row per order: order_id, restaurant_id, customer_id, placed_at, total, status."""
    _ensure_firebase_app()
    from firebase_admin import firestore

    db = firestore.client()
    query = db.collection("orders")
    if restaurant_id:
        query = query.where("restaurantId", "==", restaurant_id)

    rows = []
    for doc in query.stream():
        data = doc.to_dict()
        rows.append(
            {
                "order_id": doc.id,
                "restaurant_id": data.get("restaurantId"),
                "customer_id": data.get("customerId"),
                "placed_at": pd.to_datetime(data.get("placedAt")),
                "total": data.get("total", 0),
                "status": data.get("status"),
            }
        )
    return pd.DataFrame(rows)


def fetch_order_items_dataframe(restaurant_id: str | None = None) -> pd.DataFrame:
    """Returns one row per line item across all orders: order_id, menu_item_id, name, quantity, placed_at."""
    _ensure_firebase_app()
    from firebase_admin import firestore

    db = firestore.client()
    query = db.collection("orders")
    if restaurant_id:
        query = query.where("restaurantId", "==", restaurant_id)

    rows = []
    for doc in query.stream():
        data = doc.to_dict()
        placed_at = pd.to_datetime(data.get("placedAt"))
        for item in data.get("items", []):
            rows.append(
                {
                    "order_id": doc.id,
                    "menu_item_id": item.get("menuItemId"),
                    "name": item.get("name"),
                    "quantity": item.get("quantity", 0),
                    "placed_at": placed_at,
                }
            )
    return pd.DataFrame(rows)
