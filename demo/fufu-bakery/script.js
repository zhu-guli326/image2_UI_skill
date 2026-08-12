const views = [...document.querySelectorAll("[data-view]")];
const feedback = document.querySelector("#feedback");
const tabbar = document.querySelector(".tabbar");

const previewParams = new URLSearchParams(window.location.search);

if (previewParams.has("embed")) {
  document.documentElement.classList.add("embed-mode");
  const fitEmbedPreview = () => {
    const scale = Math.min(window.innerWidth / 390, window.innerHeight / 693.3333);
    document.documentElement.style.setProperty("--embed-scale", String(scale));
  };
  fitEmbedPreview();
  window.addEventListener("resize", fitEmbedPreview);
}

function notify(message) {
  if (feedback) feedback.textContent = message;
}

function showView(name) {
  views.forEach((view) => {
    const active = view.dataset.view === name;
    view.hidden = !active;
    view.classList.toggle("is-active", active);
  });
  tabbar.hidden = name === "welcome";
  document.querySelector(".home-indicator").hidden = name === "welcome";
  if (name !== "welcome") {
    document.querySelectorAll(".tab").forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle("is-active", active);
      if (active) tab.setAttribute("aria-current", "page"); else tab.removeAttribute("aria-current");
    });
    notify(name === "member" ? "Three stamps are waiting for you." : name === "menu" ? "Choose something freshly baked." : "The oven is warm.");
  }
}

document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.go)));
document.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.tab)));
document.querySelectorAll("[data-toast]").forEach((button) => button.addEventListener("click", () => notify(button.dataset.toast)));
document.querySelectorAll("[data-add]").forEach((button) => button.addEventListener("click", () => {
  const name = button.dataset.add;
  button.classList.add("is-added");
  notify(`${name} added to your bakery list.`);
}));

const initialView = previewParams.get("view");
if (["home", "menu", "member"].includes(initialView)) showView(initialView);
window.scrollTo(0, 0);
