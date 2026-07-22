export function renderHero(): HTMLElement {
  const hero = document.createElement("section");
  hero.className = "re-hero re-animate-fade";
  hero.innerHTML = `
    <h1 class="re-hero__title">Great food, delivered fast.</h1>
    <p class="re-hero__subtitle">Order from the best local restaurants near you — tracked live, every step of the way.</p>
  `;
  return hero;
}
