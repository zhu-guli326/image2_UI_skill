const cards = [...document.querySelectorAll(".activity-card")];
const feedback = document.querySelector("#feedback");
const carousel = document.querySelector("#activityCarousel");
const carouselLabel = document.querySelector("#carouselLabel");
const views = [...document.querySelectorAll("[data-view]")];
const labels = ["Doctor's appointment at 8:30", "Lunch at 12:00", "Paracetamol at 15:00", "Walk the dog at 17:00", "Go to sleep at 20:30"];
let selected = 2;
let pointerStart = null;

const params = new URLSearchParams(window.location.search);
if (params.has("embed")) {
  document.documentElement.classList.add("embed-mode");
  const fitEmbed = () => document.documentElement.style.setProperty("--embed-scale", String(Math.min(window.innerWidth / 390, window.innerHeight / 693.3333)));
  fitEmbed(); window.addEventListener("resize", fitEmbed);
}

function notify(message) { feedback.textContent = message; }
function renderCarousel() {
  cards.forEach((card, index) => {
    const relative = index - selected;
    card.classList.toggle("is-selected", relative === 0);
    card.style.zIndex = String(5 - Math.min(4, Math.abs(relative)));
    card.style.opacity = String(Math.abs(relative) > 2 ? 0 : relative === 0 ? 1 : Math.abs(relative) === 1 ? .63 : .34);
    card.style.transform = relative === 0 ? "translateX(-50%) scale(1)" : relative === -1 ? "translateX(calc(-50% - 192px)) translateY(47px) rotate(-8deg) scale(.86)" : relative === 1 ? "translateX(calc(-50% + 192px)) translateY(48px) rotate(8deg) scale(.86)" : relative < 0 ? "translateX(calc(-50% - 360px)) translateY(92px) rotate(-12deg) scale(.76)" : "translateX(calc(-50% + 360px)) translateY(92px) rotate(12deg) scale(.76)";
    card.tabIndex = relative === 0 ? 0 : -1;
  });
  carouselLabel.textContent = labels[selected];
  notify(`Selected: ${labels[selected]}.`);
}
function selectCard(index) { selected = Math.max(0, Math.min(cards.length - 1, index)); renderCarousel(); }
cards.forEach((card) => card.addEventListener("click", () => selectCard(Number(card.dataset.index))));
document.querySelectorAll("[data-carousel]").forEach((button) => button.addEventListener("click", () => selectCard(selected + (button.dataset.carousel === "next" ? 1 : -1))));
carousel.addEventListener("pointerdown", (event) => { pointerStart = event.clientX; carousel.setPointerCapture(event.pointerId); });
carousel.addEventListener("pointerup", (event) => { if (pointerStart === null) return; const change = event.clientX - pointerStart; if (Math.abs(change) > 24) selectCard(selected + (change > 0 ? -1 : 1)); pointerStart = null; });
carousel.addEventListener("pointercancel", () => { pointerStart = null; });
document.querySelectorAll("[data-tab]").forEach((tab) => tab.addEventListener("click", () => {
  const next = tab.dataset.tab;
  views.forEach((view) => { const active = view.dataset.view === next; view.hidden = !active; view.classList.toggle("is-active", active); });
  document.querySelectorAll(".tab").forEach((item) => { const active = item === tab; item.classList.toggle("is-active", active); active ? item.setAttribute("aria-current", "page") : item.removeAttribute("aria-current"); });
}));
document.querySelectorAll("[data-toast]").forEach((button) => button.addEventListener("click", () => notify(button.dataset.toast)));
if (params.get("card")) selectCard(Number(params.get("card")));
