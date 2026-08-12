const views = [...document.querySelectorAll("[data-view]")];
const tabs = [...document.querySelectorAll(".tab")];
const feedback = document.querySelector("#feedback");
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
  tabs.forEach((tab) => {
    const active = tab.dataset.viewTarget === name;
    tab.classList.toggle("is-active", active);
    active
      ? tab.setAttribute("aria-current", "page")
      : tab.removeAttribute("aria-current");
  });
  feedback.textContent =
    name === "routes"
      ? "Route to Volt Central Park is ready."
      : name === "charging"
        ? "Your EV is charging at 120 kilowatts."
        : "Your vehicle is at 54%.";
}
document
  .querySelectorAll("[data-view-target]")
  .forEach((button) =>
    button.addEventListener("click", () => show(button.dataset.viewTarget)),
  );
document.querySelectorAll("[data-toast]").forEach((button) =>
  button.addEventListener("click", () => {
    feedback.textContent = button.dataset.toast;
  }),
);
document.querySelector("[data-charge]").addEventListener("click", (event) => {
  const paused = event.currentTarget.classList.toggle("is-paused");
  event.currentTarget.querySelector("span").textContent = paused
    ? "Resume charging"
    : "Pause charging";
  feedback.textContent = paused
    ? "Charging paused at 74%."
    : "Charging resumed at 120 kilowatts.";
});
if (["charging", "routes"].includes(params.get("view")))
  show(params.get("view"));
