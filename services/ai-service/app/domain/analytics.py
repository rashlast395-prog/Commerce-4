"""
Pure analytics functions. Every function here takes plain data structures
in and returns plain data structures out — no Firestore, no HTTP. This is
what makes it testable without a live database (see tests/test_analytics.py).

Expected orders DataFrame columns: order_id, restaurant_id, placed_at
(datetime), total (int, minor units), status (str), customer_id.
Expected order_items DataFrame columns: order_id, menu_item_id, name,
quantity, placed_at (datetime).
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression


def revenue_by_day(orders: pd.DataFrame) -> list[dict]:
    """Daily revenue trend (minor units), delivered orders only."""
    if orders.empty:
        return []
    delivered = orders[orders["status"] == "delivered"].copy()
    if delivered.empty:
        return []
    delivered["day"] = pd.to_datetime(delivered["placed_at"]).dt.date
    grouped = delivered.groupby("day")["total"].sum().reset_index()
    grouped = grouped.sort_values("day")
    return [{"date": str(row["day"]), "revenueMinorUnits": int(row["total"])} for _, row in grouped.iterrows()]


def top_selling_items(order_items: pd.DataFrame, limit: int = 5) -> list[dict]:
    """Best-selling menu items by total quantity ordered."""
    if order_items.empty:
        return []
    grouped = (
        order_items.groupby(["menu_item_id", "name"])["quantity"]
        .sum()
        .reset_index()
        .sort_values("quantity", ascending=False)
        .head(limit)
    )
    return [
        {"menuItemId": row["menu_item_id"], "name": row["name"], "totalQuantity": int(row["quantity"])}
        for _, row in grouped.iterrows()
    ]


def forecast_next_day_demand(order_items: pd.DataFrame, menu_item_id: str) -> dict:
    """
    Simple linear-trend forecast of tomorrow's quantity for one menu item,
    from its daily order history. Not a production-grade time-series model —
    a straight-line fit is a reasonable, explainable baseline for a small
    restaurant's daily volume, and degrades gracefully with little data.
    """
    item_orders = order_items[order_items["menu_item_id"] == menu_item_id].copy()
    if item_orders.empty:
        return {"menuItemId": menu_item_id, "forecastQuantity": 0, "basedOnDays": 0}

    item_orders["day"] = pd.to_datetime(item_orders["placed_at"]).dt.date
    daily = item_orders.groupby("day")["quantity"].sum().reset_index().sort_values("day")

    if len(daily) < 2:
        # Not enough history for a trend line — use the flat average instead.
        avg = float(daily["quantity"].mean())
        return {"menuItemId": menu_item_id, "forecastQuantity": round(avg, 1), "basedOnDays": len(daily)}

    x = np.arange(len(daily)).reshape(-1, 1)
    y = daily["quantity"].values
    model = LinearRegression().fit(x, y)
    next_x = np.array([[len(daily)]])
    forecast = float(model.predict(next_x)[0])

    return {"menuItemId": menu_item_id, "forecastQuantity": round(max(forecast, 0), 1), "basedOnDays": len(daily)}


def segment_customers(orders: pd.DataFrame, n_clusters: int = 3) -> list[dict]:
    """
    Groups customers by (order frequency, total spend) using k-means.
    Cluster labels are relabeled 0=lowest spend .. n-1=highest spend so the
    output is stable/interpretable regardless of k-means' arbitrary label order.
    """
    if orders.empty:
        return []

    per_customer = (
        orders.groupby("customer_id")
        .agg(order_count=("order_id", "count"), total_spend=("total", "sum"))
        .reset_index()
    )

    n_customers = len(per_customer)
    if n_customers < n_clusters:
        # Too few customers to cluster meaningfully — every customer is their own segment.
        return [
            {
                "customerId": row["customer_id"],
                "orderCount": int(row["order_count"]),
                "totalSpendMinorUnits": int(row["total_spend"]),
                "segment": "new",
            }
            for _, row in per_customer.iterrows()
        ]

    features = per_customer[["order_count", "total_spend"]].values
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10).fit(features)

    # Order cluster centers by spend so segment labels are meaningful, not arbitrary.
    center_spend_order = np.argsort(kmeans.cluster_centers_[:, 1])
    label_names = {}
    names = ["low_value", "mid_value", "high_value"][:n_clusters]
    for rank, cluster_idx in enumerate(center_spend_order):
        label_names[cluster_idx] = names[rank] if rank < len(names) else f"segment_{rank}"

    per_customer["segment"] = [label_names[label] for label in kmeans.labels_]

    return [
        {
            "customerId": row["customer_id"],
            "orderCount": int(row["order_count"]),
            "totalSpendMinorUnits": int(row["total_spend"]),
            "segment": row["segment"],
        }
        for _, row in per_customer.iterrows()
    ]
