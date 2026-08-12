const phones = Array.from(document.querySelectorAll(".phone"));
const appViews = Array.from(document.querySelectorAll(".app-view"));
const dockButtons = Array.from(document.querySelectorAll(".dock [data-view-target]"));
const dock = document.querySelector(".dock");
const toast = document.querySelector(".toast");
let timer = null;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const screenOrder = phones.map((phone) => phone.dataset.screen);
const viewOrder = ["home", "folder", "search", "create", "schedule", "settings"];

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
let currentScreen = phones.find((phone) => phone.classList.contains("is-active"))?.dataset.screen || screenOrder[0];
let currentView = appViews.find((panel) => panel.classList.contains("is-visible"))?.dataset.view || "home";

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(timer);
  timer = setTimeout(() => toast.classList.remove("show"), 1400);
}

function setActive(screen) {
  const direction = screenOrder.indexOf(screen) >= screenOrder.indexOf(currentScreen) ? "motion-forward" : "motion-back";
  phones.forEach((phone) => {
    const active = phone.dataset.screen === screen;
    phone.classList.toggle("is-active", active);
    phone.classList.toggle("motion-forward", active && direction === "motion-forward");
    phone.classList.toggle("motion-back", active && direction === "motion-back");
  });
  const target = document.querySelector(`[data-screen="${screen}"]`);
  if (target) {
    target.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "nearest", inline: "center" });
    currentScreen = screen;
  }
}

function setAppView(view) {
  const direction = viewOrder.indexOf(view) >= viewOrder.indexOf(currentView) ? "motion-forward" : "motion-back";
  appViews.forEach((panel) => {
    const active = panel.dataset.view === view;
    panel.classList.toggle("is-visible", active);
    panel.classList.toggle("motion-forward", active && direction === "motion-forward");
    panel.classList.toggle("motion-back", active && direction === "motion-back");
    panel.inert = !active;
    panel.setAttribute("aria-hidden", String(!active));
  });
  dockButtons.forEach((button) => {
    const selected = button.dataset.viewTarget === view;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  const dockIndex = dockButtons.findIndex((button) => button.dataset.viewTarget === view);
  if (dockIndex >= 0) {
    dock.style.setProperty("--dock-index", String(dockIndex));
    dock.style.setProperty("--dock-offset", `${dockIndex * 100}%`);
  }
  currentView = view;
  setActive("home");
}

function selectChoice(button, selector) {
  const group = button.closest(selector);
  if (!group) return false;
  const buttons = Array.from(group.querySelectorAll(":scope > button"));
  buttons.forEach((item) => {
    const selected = item === button;
    item.classList.toggle("active", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
  return true;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  selectChoice(button, ".swatches, .formatbar, .chips");

  if (button.dataset.viewTarget) {
    setAppView(button.dataset.viewTarget);
    showToast(`${button.dataset.viewTarget} page`);
    return;
  }

  if (button.dataset.go) {
    setActive(button.dataset.go);
    showToast(`${button.dataset.go} opened`);
    return;
  }

  if (button.dataset.saveNote !== undefined) {
    setAppView("folder");
    showToast("Note saved");
    return;
  }

  if (button.dataset.toast) {
    showToast(button.dataset.toast);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.target.closest("input, textarea, select, [contenteditable='true']")) return;
  const index = phones.findIndex((phone) => phone.classList.contains("is-active"));
  if (event.key === "ArrowRight") {
    setActive(phones[(index + 1) % phones.length].dataset.screen);
  }
  if (event.key === "ArrowLeft") {
    setActive(phones[(index - 1 + phones.length) % phones.length].dataset.screen);
  }
});

appViews.forEach((panel) => {
  const active = panel.dataset.view === currentView;
  panel.inert = !active;
  panel.setAttribute("aria-hidden", String(!active));
});
dockButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.viewTarget === currentView)));
dock.style.setProperty("--dock-offset", "0%");
