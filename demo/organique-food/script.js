const views = [...document.querySelectorAll("[data-view]")];
const feedback = document.querySelector("#feedback");
const menu = document.querySelector(".menu-sheet");
const params = new URLSearchParams(window.location.search);

if (params.has("embed")) {
  document.documentElement.classList.add("embed-mode");
  const fit = () =>
    document.documentElement.style.setProperty(
      "--embed-scale",
      String(Math.min(window.innerWidth / 390, window.innerHeight / 693.3333)),
    );
  fit();
  window.addEventListener("resize", fit);
}

function show(name) {
  views.forEach((view) => {
    const active = view.dataset.view === name;
    view.hidden = !active;
    view.classList.toggle("is-active", active);
  });
  menu.hidden = true;
  feedback.textContent =
    name === "plan"
      ? "Choose the days for your first delivery."
      : name === "confirmation"
        ? "Your Monday lunch is confirmed."
        : "Chicken Fattoush Salad is selected.";
}

document
  .querySelectorAll("[data-view-target]")
  .forEach((button) =>
    button.addEventListener("click", () => show(button.dataset.viewTarget)),
  );
document.querySelectorAll("[data-menu]").forEach((button) =>
  button.addEventListener("click", () => {
    menu.hidden = !menu.hidden;
    feedback.textContent = menu.hidden ? "Menu closed." : "Menu opened.";
  }),
);
document.querySelectorAll("[data-day]").forEach((button) =>
  button.addEventListener("click", () => {
    button.classList.toggle("is-selected");
    button.setAttribute(
      "aria-pressed",
      String(button.classList.contains("is-selected")),
    );
    const days = [...document.querySelectorAll("[data-day].is-selected")]
      .map((item) => item.dataset.day)
      .join(", ");
    feedback.textContent = days
      ? `Delivery days: ${days}.`
      : "Choose at least one delivery day.";
  }),
);
document
  .querySelector("[data-confirm]")
  .addEventListener("click", () => show("confirmation"));
document.querySelectorAll("[data-toast]").forEach((button) =>
  button.addEventListener("click", () => {
    feedback.textContent = button.dataset.toast;
    menu.hidden = true;
  }),
);
if (["plan", "confirmation"].includes(params.get("view")))
  show(params.get("view"));
