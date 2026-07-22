export interface CartItemModifierSelection {
  name: string;
  option: string;
}

export interface CartItem {
  menuItemId: string;
  quantity: number;
  selectedModifiers: CartItemModifierSelection[];
}

export interface CreateOrderInput {
  restaurantId: string;
  items: CartItem[];
  deliveryAddress: {
    line1: string;
    city: string;
    geopoint: { lat: number; lng: number };
  };
}
