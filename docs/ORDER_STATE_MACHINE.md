# Order Status State Machine

```
placed
  -> payment_confirmed   (auto, on successful Paystack/Flutterwave webhook)
  -> rejected             (restaurant declines, e.g. item unavailable) [terminal]

payment_confirmed
  -> accepted_by_restaurant
  -> cancelled_by_customer  (only allowed before restaurant accepts) [terminal]

accepted_by_restaurant
  -> preparing

preparing
  -> ready_for_pickup

ready_for_pickup
  -> rider_assigned        (auto or manual dispatch)

rider_assigned
  -> picked_up

picked_up
  -> out_for_delivery

out_for_delivery
  -> delivered              [terminal]
  -> delivery_failed         [terminal] (goes to admin review)

(any pre-picked_up state)
  -> cancelled_by_restaurant [terminal] (triggers refund flow)
```

Rules:
- Every transition is written to `orders/{id}.statusHistory` with actor + timestamp (feeds `activityLogs` too).
- WebSocket emits `order:status_changed` to customer, restaurant, and (once assigned) rider on every transition.
- Refunds are only auto-triggered from `cancelled_by_restaurant` and `delivery_failed`; customer-initiated cancellation after `payment_confirmed` requires restaurant/admin approval (fraud/abuse prevention).
