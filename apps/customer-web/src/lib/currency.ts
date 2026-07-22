const formatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  minimumFractionDigits: 2,
});

/** MenuItem.price / Order line totals are stored in minor units (pesewas). */
export function formatPriceFromMinorUnits(minorUnits: number): string {
  return formatter.format(minorUnits / 100);
}
