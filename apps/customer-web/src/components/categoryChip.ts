export function renderCategoryChip(
  label: string,
  options: { active?: boolean; onClick?: (label: string) => void } = {},
): HTMLElement {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "re-category-chip";
  chip.textContent = label;
  chip.setAttribute("aria-pressed", String(Boolean(options.active)));
  chip.addEventListener("click", () => options.onClick?.(label));
  return chip;
}
