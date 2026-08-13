const views = [...document.querySelectorAll("[data-view]")];
const tabs = [...document.querySelectorAll(".tab")];
const feedback = document.querySelector("#feedback");
const params = new URLSearchParams(window.location.search);
const isEmbedded = params.has("embed");
if (isEmbedded) {
  document.documentElement.classList.add("embed-mode");
  const fit = () =>
    document.documentElement.style.setProperty(
      "--embed-scale",
      String(Math.min(window.innerWidth / 390, window.innerHeight / 844)),
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
    name === "playlist"
      ? "Sport Mood is ready to play."
      : name === "welcome"
        ? "Welcome to Brightly."
        : "Your dashboard is ready.";
}
document
  .querySelectorAll("[data-view-target]")
  .forEach((button) =>
    button.addEventListener("click", () => show(button.dataset.viewTarget)),
  );
document
  .querySelectorAll("[data-toast]")
  .forEach((button) =>
    button.addEventListener(
      "click",
      () => (feedback.textContent = button.dataset.toast),
    ),
  );
document.querySelectorAll("[data-date]").forEach((button) =>
  button.addEventListener("click", () => {
    document
      .querySelectorAll("[data-date]")
      .forEach((item) => item.classList.toggle("is-selected", item === button));
    feedback.textContent = `${button.dataset.date} selected.`;
  }),
);
document.querySelector("[data-play]").addEventListener("click", (event) => {
  const playing = event.currentTarget.classList.toggle("is-playing");
  feedback.textContent = playing
    ? "Sport Mood is playing."
    : "Sport Mood is paused.";
});
document
  .querySelector("[data-seek]")
  .addEventListener(
    "click",
    () => (feedback.textContent = "Playlist position updated."),
  );
if (params.get("view") === "playlist") show("playlist");
