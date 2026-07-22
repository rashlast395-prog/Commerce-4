const formatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  minimumFractionDigits: 2,
});

export function formatPriceFromMinorUnits(minorUnits: number): string {
  return formatter.format(minorUnits / 100);
}
