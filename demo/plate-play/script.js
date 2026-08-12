const views = [...document.querySelectorAll("[data-view]")];
const toast = document.querySelector(".toast");
const navItems = [...document.querySelectorAll(".nav-item")];
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1600);
}

function go(viewName) {
  views.forEach((view) => { view.hidden = view.dataset.view !== viewName; });
  navItems.forEach((item) => item.classList.toggle("is-active", item.dataset.viewTarget === viewName));
  showToast({ home: "A good idea for lunch.", recipes: "172 lunches, sorted for you.", detail: "Recipe details opened." }[viewName] || "Updated.");
}

document.querySelectorAll("[data-view-target]").forEach((button) => {
  button.addEventListener("click", () => go(button.dataset.viewTarget));
});

document.querySelectorAll("[data-toast]").forEach((button) => {
  button.addEventListener("click", () => showToast(button.dataset.toast));
});

document.querySelectorAll("[data-category]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-category]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });
    showToast(`${button.dataset.category} recipes selected.`);
  });
});

document.querySelector("[data-heart]")?.addEventListener("click", (event) => {
  const button = event.currentTarget;
  const saved = button.textContent.trim() === "♡";
  button.textContent = saved ? "♥" : "♡";
  button.style.color = saved ? "var(--red)" : "";
  showToast(saved ? "Saved to your recipe box." : "Removed from saved recipes.");
});

const query = new URLSearchParams(location.search);
if (query.has("embed")) {
  document.documentElement.classList.add("embed-mode");
  const fit = () => document.documentElement.style.setProperty("--s", Math.min(innerWidth / 390, innerHeight / 844));
  fit();
  addEventListener("resize", fit);
}
