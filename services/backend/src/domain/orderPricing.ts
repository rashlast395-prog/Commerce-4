import type { CartItem, MenuItem, OrderLineItem, Restaurant } from "@richys-eat/shared-types";
import { DEFAULT_DELIVERY_FEE_MINOR_UNITS } from "../config/constants.js";
import { ApiError } from "../middleware/errorHandler.js";

export interface OrderTotals {
  lineItems: OrderLineItem[];
  subtotal: number;
  deliveryFee: number;
  platformCommission: number;
  total: number;
}

/**
 * Resolves cart items against real menu items (never trusting client-sent
 * prices), validates required modifiers and availability, and computes the
 * order's money fields. Throws ApiError on any invalid input.
 */
export function computeOrderTotals(
  restaurant: Pick<Restaurant, "deliveryFeeOverride" | "commissionRate">,
  menuItemsById: Map<string, MenuItem>,
  cartItems: CartItem[],
): OrderTotals {
  const lineItems: OrderLineItem[] = cartItems.map((cartItem) => {
    const menuItem = menuItemsById.get(cartItem.menuItemId);
    if (!menuItem) {
      throw new ApiError(400, `Menu item ${cartItem.menuItemId} not found on this restaurant`);
    }
    if (!menuItem.isAvailable) {
      throw new ApiError(409, `${menuItem.name} is currently unavailable`);
    }
    if (cartItem.quantity < 1 || !Number.isInteger(cartItem.quantity)) {
      throw new ApiError(400, `Invalid quantity for ${menuItem.name}`);
    }

    let modifiersTotal = 0;
    const resolvedModifiers = cartItem.selectedModifiers.map((selection) => {
      const modifierDef = menuItem.modifiers.find((m) => m.name === selection.name);
      const optionDef = modifierDef?.options.find((o) => o.label === selection.option);
      if (!modifierDef || !optionDef) {
        throw new ApiError(400, `Invalid modifier selection "${selection.name}: ${selection.option}"`);
      }
      modifiersTotal += optionDef.priceDelta;
      return { name: selection.name, option: selection.option, priceDelta: optionDef.priceDelta };
    });

    for (const modifierDef of menuItem.modifiers) {
      if (modifierDef.required && !cartItem.selectedModifiers.some((s) => s.name === modifierDef.name)) {
        throw new ApiError(400, `${menuItem.name} requires a selection for "${modifierDef.name}"`);
      }
    }

    const unitPrice = menuItem.price + modifiersTotal;
    return {
      menuItemId: menuItem.id,
      name: menuItem.name,
      unitPrice,
      quantity: cartItem.quantity,
      selectedModifiers: resolvedModifiers,
      lineTotal: unitPrice * cartItem.quantity,
    };
  });

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = restaurant.deliveryFeeOverride ?? DEFAULT_DELIVERY_FEE_MINOR_UNITS;
  const platformCommission = Math.round(subtotal * restaurant.commissionRate);
  const total = subtotal + deliveryFee;

  return { lineItems, subtotal, deliveryFee, platformCommission, total };
}
