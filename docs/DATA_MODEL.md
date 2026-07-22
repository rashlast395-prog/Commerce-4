# Richy's Eat — Firestore Data Model (Multi-Vendor Marketplace)

Status: Phase 0 draft. This is the contract every later phase builds against —
changes here after Phase 1 will cascade into security rules, backend, and all
three frontends, so review carefully before we lock it in.

## Roles

| Role | Scope | Notes |
|---|---|---|
| `customer` | self | Default role on signup |
| `restaurant_owner` | own restaurant(s) | Can manage menu, orders, inventory, staff, reservations for restaurants they own |
| `restaurant_staff` | assigned restaurant | Reduced permissions subset of `restaurant_owner` (order fulfillment, menu edits — not payouts/settings) |
| `rider` | self + assigned orders | Platform-wide, not tied to a single restaurant |
| `platform_admin` | everything | Onboards/suspends restaurants, manages riders, sees platform-wide analytics & commission |

Role is stored on the `users` document as `role`, plus a `restaurantIds: string[]`
array for `restaurant_owner` / `restaurant_staff` (supports one owner running
multiple locations later without a schema change).

## Collections

### `users/{userId}`
```
uid: string (Firebase Auth UID, doc ID)
email: string
displayName: string
phone: string | null
role: "customer" | "restaurant_owner" | "restaurant_staff" | "rider" | "platform_admin"
restaurantIds: string[]           // populated for owner/staff
authProviders: string[]           // "password" | "google.com" | "github.com"
createdAt: timestamp
updatedAt: timestamp
isActive: boolean
fcmTokens: string[]               // for push notifications
```

### `restaurants/{restaurantId}`
```
name: string
ownerId: string                   // -> users/{uid}
description: string
cuisineTypes: string[]
logoUrl: string | null
coverImageUrl: string | null
address: { line1, city, region, geopoint }
operatingHours: { day: string, open: string, close: string, isClosed: boolean }[]
status: "pending" | "approved" | "suspended" | "rejected"
isOpenNow: boolean                // manual override toggle by owner
commissionRate: number            // e.g. 0.15 = 15%, set by platform_admin
ratingAvg: number
ratingCount: number
createdAt: timestamp
updatedAt: timestamp
```

### `restaurants/{restaurantId}/menuItems/{itemId}`  (subcollection)
```
name: string
description: string
price: number                     // in minor units (pesewas) to avoid float errors
category: string
imageUrl: string | null
isAvailable: boolean
modifiers: { name: string, options: { label: string, priceDelta: number }[], required: boolean }[]
createdAt / updatedAt: timestamp
```

### `orders/{orderId}`
```
customerId: string
restaurantId: string
riderId: string | null
items: { menuItemId, name, unitPrice, quantity, selectedModifiers, lineTotal }[]
subtotal: number
deliveryFee: number
platformCommission: number        // computed from restaurant.commissionRate at order time
total: number
status: OrderStatus               // see ORDER_STATE_MACHINE.md
deliveryAddress: { line1, city, geopoint }
paymentId: string | null          // -> payments/{paymentId}
paymentStatus: "pending" | "paid" | "failed" | "refunded"
placedAt: timestamp
statusHistory: { status: OrderStatus, at: timestamp, by: string }[]
```

### `riders/{riderId}`  (mirrors a `users` doc with role=rider, keyed by uid)
```
isOnline: boolean
currentLocation: geopoint | null
locationUpdatedAt: timestamp | null
activeOrderId: string | null
vehicleType: "bike" | "motorbike" | "car"
ratingAvg: number
ratingCount: number
```

### `reservations/{reservationId}`
```
restaurantId: string
customerId: string
partySize: number
reservationTime: timestamp
status: "requested" | "confirmed" | "cancelled" | "completed" | "no_show"
notes: string | null
createdAt: timestamp
```

### `reviews/{reviewId}`
```
restaurantId: string
customerId: string
orderId: string | null            // ties review to a verified order when possible
riderId: string | null            // set if this is a delivery rating
rating: number                    // 1-5
comment: string | null
createdAt: timestamp
```

### `inventory/{restaurantId}/items/{menuItemId}`  (subcollection)
```
stockLevel: number
lowStockThreshold: number
unit: string                      // "portions", "kg", etc.
updatedAt: timestamp
```

### `notifications/{userId}/items/{notificationId}`  (subcollection)
```
type: "order_status" | "new_order" | "reservation" | "message" | "system"
title: string
body: string
data: object                      // deep-link payload
isRead: boolean
createdAt: timestamp
```

### `conversations/{conversationId}` + `conversations/{conversationId}/messages/{messageId}`
```
conversations/{id}:
  participantIds: string[]
  type: "customer_rider" | "customer_restaurant" | "restaurant_platform_admin"
  orderId: string | null
  lastMessageAt: timestamp

messages/{id}:
  senderId: string
  text: string
  sentAt: timestamp
  readBy: string[]
```

### `payments/{paymentId}`
```
orderId: string
provider: "paystack" | "flutterwave"
providerReference: string
amount: number
currency: "GHS"
status: "initiated" | "success" | "failed" | "refunded"
createdAt: timestamp
```

### `activityLogs/{logId}`
```
actorId: string
actorRole: string
action: string                    // "order.status_changed", "menu_item.updated", etc.
entityType: string
entityId: string
metadata: object
at: timestamp
```

## Open questions to confirm before Phase 1 locks the schema
1. Delivery fee: flat rate, distance-based, or per-restaurant configurable?
2. Can a customer order from multiple restaurants in one checkout, or one restaurant per order (assumed: **one restaurant per order**, standard for marketplaces like this)?
3. Menu item modifiers — confirm the structure above covers your real menu complexity (e.g. size + toppings)?
