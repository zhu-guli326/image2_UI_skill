const phones = Array.from(document.querySelectorAll(".phone"));
const stage = document.querySelector(".stage");
const toast = document.querySelector(".toast");
let toastTimer = null;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const screenOrder = phones.map((phone) => phone.dataset.screen);
let currentScreen = phones.find((phone) => phone.classList.contains("is-active"))?.dataset.screen || screenOrder[0];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1400);
}

function focusScreen(screenName) {
  const currentIndex = screenOrder.indexOf(currentScreen);
  const nextIndex = screenOrder.indexOf(screenName);
  const direction = nextIndex >= currentIndex ? "forward" : "back";
  stage.dataset.navDirection = direction;

  phones.forEach((phone) => {
    phone.classList.toggle("is-active", phone.dataset.screen === screenName);
  });

  const target = document.querySelector(`[data-screen="${screenName}"]`);
  if (target) {
    target.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", inline: "center", block: "nearest" });
    currentScreen = screenName;
  }
}

function selectWithinGroup(button) {
  const group = button.closest(".tabs, .detail-tabs, .tabbar");
  if (!group) return false;
  const selectedClass = group.classList.contains("tabbar") ? "selected" : "active";
  const buttons = Array.from(group.querySelectorAll(":scope > button"));
  buttons.forEach((item) => {
    const selected = item === button;
    item.classList.toggle(selectedClass, selected);
    item.setAttribute("aria-pressed", String(selected));
  });
  group.style.setProperty("--selection-index", String(buttons.indexOf(button)));
  return true;
}

function toggleFavorite(button) {
  const selected = button.getAttribute("aria-pressed") !== "true";
  button.setAttribute("aria-pressed", String(selected));
  button.classList.toggle("is-selected", selected);
  button.textContent = selected ? "♥" : "♡";
  showToast(selected ? "Artwork saved" : "Artwork removed");
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const nextScreen = button.dataset.go;
  const toastMessage = button.dataset.toast;

  if (button.dataset.toggle === "favorite") {
    toggleFavorite(button);
    return;
  }

  selectWithinGroup(button);

  if (nextScreen) {
    focusScreen(nextScreen);
    showToast(`${nextScreen[0].toUpperCase()}${nextScreen.slice(1)} opened`);
    return;
  }

  if (toastMessage) {
    showToast(toastMessage);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.target.closest("input, textarea, select, [contenteditable='true']")) return;
  const currentIndex = phones.findIndex((phone) => phone.classList.contains("is-active"));
  if (event.key === "ArrowRight") {
    const next = phones[(currentIndex + 1) % phones.length];
    focusScreen(next.dataset.screen);
  }
  if (event.key === "ArrowLeft") {
    const next = phones[(currentIndex - 1 + phones.length) % phones.length];
    focusScreen(next.dataset.screen);
  }
});
