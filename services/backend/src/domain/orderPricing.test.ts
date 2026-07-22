import assert from "node:assert/strict";
import { test } from "node:test";
import type { CartItem, MenuItem, Restaurant } from "@richys-eat/shared-types";
import { computeOrderTotals } from "./orderPricing.js";

const baseRestaurant: Pick<Restaurant, "deliveryFeeOverride" | "commissionRate"> = {
  deliveryFeeOverride: null,
  commissionRate: 0.15,
};

const jollof: MenuItem = {
  id: "item-1",
  restaurantId: "r1",
  name: "Jollof rice",
  description: "",
  price: 4500,
  category: "Rice",
  imageUrl: null,
  isAvailable: true,
  modifiers: [
    {
      name: "Protein",
      required: true,
      options: [
        { label: "Chicken", priceDelta: 0 },
        { label: "Beef", priceDelta: 500 },
      ],
    },
  ],
  createdAt: "",
  updatedAt: "",
};

test("computes subtotal, default delivery fee, commission, and total", () => {
  const menuItemsById = new Map([[jollof.id, jollof]]);
  const cartItems: CartItem[] = [
    { menuItemId: jollof.id, quantity: 2, selectedModifiers: [{ name: "Protein", option: "Chicken" }] },
  ];

  const result = computeOrderTotals(baseRestaurant, menuItemsById, cartItems);

  assert.equal(result.subtotal, 9000); // 4500 * 2
  assert.equal(result.deliveryFee, 1000); // platform default
  assert.equal(result.platformCommission, 1350); // 15% of 9000
  assert.equal(result.total, 10000); // subtotal + deliveryFee
});

test("applies modifier price deltas per unit", () => {
  const menuItemsById = new Map([[jollof.id, jollof]]);
  const cartItems: CartItem[] = [
    { menuItemId: jollof.id, quantity: 3, selectedModifiers: [{ name: "Protein", option: "Beef" }] },
  ];

  const result = computeOrderTotals(baseRestaurant, menuItemsById, cartItems);

  // (4500 + 500) * 3
  assert.equal(result.subtotal, 15000);
  assert.equal(result.lineItems[0]?.unitPrice, 5000);
});

test("uses restaurant delivery fee override when set", () => {
  const menuItemsById = new Map([[jollof.id, jollof]]);
  const cartItems: CartItem[] = [
    { menuItemId: jollof.id, quantity: 1, selectedModifiers: [{ name: "Protein", option: "Chicken" }] },
  ];

  const result = computeOrderTotals({ ...baseRestaurant, deliveryFeeOverride: 750 }, menuItemsById, cartItems);

  assert.equal(result.deliveryFee, 750);
});

test("rejects missing required modifier", () => {
  const menuItemsById = new Map([[jollof.id, jollof]]);
  const cartItems: CartItem[] = [{ menuItemId: jollof.id, quantity: 1, selectedModifiers: [] }];

  assert.throws(() => computeOrderTotals(baseRestaurant, menuItemsById, cartItems), /requires a selection/);
});

test("rejects unavailable menu item", () => {
  const unavailable: MenuItem = { ...jollof, isAvailable: false };
  const menuItemsById = new Map([[unavailable.id, unavailable]]);
  const cartItems: CartItem[] = [
    { menuItemId: unavailable.id, quantity: 1, selectedModifiers: [{ name: "Protein", option: "Chicken" }] },
  ];

  assert.throws(() => computeOrderTotals(baseRestaurant, menuItemsById, cartItems), /currently unavailable/);
});

test("rejects a menu item that doesn't exist", () => {
  const menuItemsById = new Map<string, MenuItem>();
  const cartItems: CartItem[] = [{ menuItemId: "ghost", quantity: 1, selectedModifiers: [] }];

  assert.throws(() => computeOrderTotals(baseRestaurant, menuItemsById, cartItems), /not found/);
});
