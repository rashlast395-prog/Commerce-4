import os
import sys

import pandas as pd  # type: ignore[import]

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from app.domain.analytics import (
    forecast_next_day_demand,
    revenue_by_day,
    segment_customers,
    top_selling_items,
)


def test_revenue_by_day_sums_delivered_orders_only():
    orders = pd.DataFrame(
        [
            {"order_id": "1", "customer_id": "c1", "placed_at": "2026-07-01T10:00:00", "total": 5000, "status": "delivered"},
            {"order_id": "2", "customer_id": "c2", "placed_at": "2026-07-01T12:00:00", "total": 3000, "status": "delivered"},
            {"order_id": "3", "customer_id": "c1", "placed_at": "2026-07-02T10:00:00", "total": 2000, "status": "cancelled_by_customer"},
        ]
    )
    result = revenue_by_day(orders)
    assert result == [{"date": "2026-07-01", "revenueMinorUnits": 8000}]


def test_revenue_by_day_empty_input():
    assert revenue_by_day(pd.DataFrame(columns=["order_id", "placed_at", "total", "status"])) == []


def test_top_selling_items_ranks_by_quantity():
    items = pd.DataFrame(
        [
            {"order_id": "1", "menu_item_id": "m1", "name": "Jollof", "quantity": 3, "placed_at": "2026-07-01"},
            {"order_id": "2", "menu_item_id": "m1", "name": "Jollof", "quantity": 2, "placed_at": "2026-07-02"},
            {"order_id": "3", "menu_item_id": "m2", "name": "Tilapia", "quantity": 1, "placed_at": "2026-07-01"},
        ]
    )
    result = top_selling_items(items, limit=2)
    assert result[0] == {"menuItemId": "m1", "name": "Jollof", "totalQuantity": 5}
    assert result[1]["menuItemId"] == "m2"


def test_forecast_next_day_demand_with_upward_trend():
    items = pd.DataFrame(
        [
            {"menu_item_id": "m1", "placed_at": "2026-07-01", "quantity": 2},
            {"menu_item_id": "m1", "placed_at": "2026-07-02", "quantity": 4},
            {"menu_item_id": "m1", "placed_at": "2026-07-03", "quantity": 6},
        ]
    )
    result = forecast_next_day_demand(items, "m1")
    assert result["basedOnDays"] == 3
    assert 7 <= result["forecastQuantity"] <= 9


def test_forecast_next_day_demand_no_history():
    empty = pd.DataFrame(columns=["menu_item_id", "placed_at", "quantity"])
    result = forecast_next_day_demand(empty, "ghost")
    assert result == {"menuItemId": "ghost", "forecastQuantity": 0, "basedOnDays": 0}


def test_segment_customers_labels_by_spend():
    orders = pd.DataFrame(
        [
            {"order_id": "1", "customer_id": "low1", "total": 1000},
            {"order_id": "2", "customer_id": "low2", "total": 1200},
            {"order_id": "3", "customer_id": "mid1", "total": 5000},
            {"order_id": "4", "customer_id": "mid2", "total": 5200},
            {"order_id": "5", "customer_id": "high1", "total": 20000},
            {"order_id": "6", "customer_id": "high2", "total": 21000},
        ]
    )
    result = segment_customers(orders, n_clusters=3)
    by_customer = {r["customerId"]: r["segment"] for r in result}
    assert by_customer["low1"] == "low_value"
    assert by_customer["mid1"] == "mid_value"
    assert by_customer["high1"] == "high_value"


def test_segment_customers_too_few_for_clustering():
    orders = pd.DataFrame([{"order_id": "1", "customer_id": "c1", "total": 1000}])
    result = segment_customers(orders, n_clusters=3)
    assert result == [{"customerId": "c1", "orderCount": 1, "totalSpendMinorUnits": 1000, "segment": "new"}]
