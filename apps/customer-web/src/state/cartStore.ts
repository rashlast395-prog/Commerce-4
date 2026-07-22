export interface CartLine {
  menuItemId: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  imageUrl: string;
  unitPriceMinorUnits: number;
  quantity: number;
  selectedModifiers: { name: string; option: string; priceDelta: number }[];
}

interface CartState {
  restaurantId: string | null;
  restaurantName: string | null;
  lines: CartLine[];
}

export class CartRestaurantConflictError extends Error {
  currentRestaurantName: string;
  constructor(currentRestaurantName: string) {
    super(`Cart already has items from ${currentRestaurantName}`);
    this.currentRestaurantName = currentRestaurantName;
  }
}

let state: CartState = { restaurantId: null, restaurantName: null, lines: [] };
const listeners = new Set<(state: CartState) => void>();

function setState(next: CartState): void {
  state = next;
  for (const listener of listeners) listener(state);
}

export function getCartState(): CartState {
  return state;
}

export function subscribeCart(listener: (state: CartState) => void): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

/** Same menuItemId + same modifier selections merges into one line (quantity adds). */
function lineKey(menuItemId: string, modifiers: CartLine["selectedModifiers"]): string {
  const modKey = modifiers
    .map((m) => `${m.name}:${m.option}`)
    .sort()
    .join("|");
  return `${menuItemId}::${modKey}`;
}

/**
 * Throws CartRestaurantConflictError if the cart already has items from a
 * different restaurant. Catch it, confirm with the user, then call
 * addToCart(line, { forceReplace: true }) to clear and start fresh.
 */
export function addToCart(line: CartLine, options: { forceReplace?: boolean } = {}): void {
  if (state.restaurantId && state.restaurantId !== line.restaurantId) {
    if (!options.forceReplace) {
      throw new CartRestaurantConflictError(state.restaurantName ?? "another restaurant");
    }
    state = { restaurantId: null, restaurantName: null, lines: [] };
  }

  const key = lineKey(line.menuItemId, line.selectedModifiers);
  const existingIndex = state.lines.findIndex(
    (l) => lineKey(l.menuItemId, l.selectedModifiers) === key,
  );

  const lines =
    existingIndex >= 0
      ? state.lines.map((l, i) => (i === existingIndex ? { ...l, quantity: l.quantity + line.quantity } : l))
      : [...state.lines, line];

  setState({ restaurantId: line.restaurantId, restaurantName: line.restaurantName, lines });
}

export function updateQuantity(menuItemId: string, modifiers: CartLine["selectedModifiers"], quantity: number): void {
  const key = lineKey(menuItemId, modifiers);
  if (quantity <= 0) {
    const lines = state.lines.filter((l) => lineKey(l.menuItemId, l.selectedModifiers) !== key);
    setState({ ...state, lines, restaurantId: lines.length ? state.restaurantId : null, restaurantName: lines.length ? state.restaurantName : null });
    return;
  }
  const lines = state.lines.map((l) => (lineKey(l.menuItemId, l.selectedModifiers) === key ? { ...l, quantity } : l));
  setState({ ...state, lines });
}

export function clearCart(): void {
  setState({ restaurantId: null, restaurantName: null, lines: [] });
}

export function cartSubtotal(state: CartState): number {
  return state.lines.reduce((sum, line) => {
    const modifiersTotal = line.selectedModifiers.reduce((s, m) => s + m.priceDelta, 0);
    return sum + (line.unitPriceMinorUnits + modifiersTotal) * line.quantity;
  }, 0);
}

export function cartItemCount(state: CartState): number {
  return state.lines.reduce((sum, line) => sum + line.quantity, 0);
}
