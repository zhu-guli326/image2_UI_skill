const feedback = document.querySelector("#feedback");
const views = [...document.querySelectorAll("[data-view]")];
const routineProgress = document.querySelector("#routine-progress");
const celebrationCount = document.querySelector("#celebration-count");
const screen = document.querySelector(".screen");
const completedHabits = new Set();
let previousView = "home";

const previewParams = new URLSearchParams(window.location.search);
if (previewParams.has("capture")) document.documentElement.classList.add("capture-mode");
if (previewParams.has("embed")) {
  document.documentElement.classList.add("embed-mode");
  const fitEmbedPreview = () => {
    const scale = Math.min(window.innerWidth / 390, window.innerHeight / 844);
    document.documentElement.style.setProperty("--embed-scale", String(scale));
  };
  fitEmbedPreview();
  window.addEventListener("resize", fitEmbedPreview);
}

function showView(nextView) {
  previousView = document.querySelector(".app-view.is-active")?.dataset.view || "home";
  views.forEach((view) => {
    const active = view.dataset.view === nextView;
    view.hidden = !active;
    view.classList.toggle("is-active", active);
  });
  screen.classList.toggle("is-intro", nextView === "intro");
  if (nextView !== "home") document.querySelector(".tab.is-active")?.classList.remove("is-active");
  if (nextView === "home") document.querySelector('[data-tab="Today"]')?.classList.add("is-active");
}

function updateProgress() {
  routineProgress.textContent = `${completedHabits.size}/3`;
  celebrationCount.textContent = String(Math.max(1, completedHabits.size));
}

function notify(message) {
  feedback.textContent = message;
}

document.querySelectorAll("[data-date]").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll("[data-date]").forEach((item) => {
    const selected = item === button;
    item.classList.toggle("is-today", selected);
    selected ? item.setAttribute("aria-current", "date") : item.removeAttribute("aria-current");
  });
  notify(`${button.dataset.date} selected`);
}));

document.querySelectorAll("[data-toast]").forEach((button) => button.addEventListener("click", () => notify(button.dataset.toast)));
document.querySelectorAll("[data-open-task]").forEach((button) => button.addEventListener("click", () => {
  showView("task");
  notify("Walk habit opened");
}));
document.querySelectorAll("[data-complete-habit]").forEach((button) => button.addEventListener("click", () => {
  const id = button.dataset.completeHabit;
  completedHabits.has(id) ? completedHabits.delete(id) : completedHabits.add(id);
  button.classList.toggle("is-complete", completedHabits.has(id));
  updateProgress();
  notify(completedHabits.has(id) ? "Habit marked complete" : "Habit reopened");
}));
document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => {
  showView(button.dataset.go || previousView);
  notify("Back to today");
}));
document.querySelector("[data-finish]").addEventListener("click", () => {
  completedHabits.add("walk");
  document.querySelector('[data-open-task="walk"]').classList.add("is-complete");
  updateProgress();
  showView("celebration");
  notify("Walk completed. Good job!");
});
document.querySelectorAll("[data-tab]").forEach((tab) => tab.addEventListener("click", () => {
  document.querySelectorAll("[data-tab]").forEach((item) => {
    const active = item === tab;
    item.classList.toggle("is-active", active);
    active ? item.setAttribute("aria-current", "page") : item.removeAttribute("aria-current");
  });
  if (tab.dataset.tab === "Today") showView("home");
  notify(tab.dataset.tab === "Today" ? "Today is open" : `${tab.dataset.tab} will grow with your next check-in`);
}));

updateProgress();
