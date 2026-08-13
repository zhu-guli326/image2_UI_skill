const views = [...document.querySelectorAll("[data-view]")];
const feedback = document.querySelector("#feedback");
const tabs = [...document.querySelectorAll("[data-tab]")];
const params = new URLSearchParams(window.location.search);

if (params.has("embed")) { document.documentElement.classList.add("embed-mode"); const fit = () => document.documentElement.style.setProperty("--embed-scale", String(Math.min(window.innerWidth / 390, window.innerHeight / 844))); fit(); window.addEventListener("resize", fit); }
function showView(name) { views.forEach((view) => { const active = view.dataset.view === name; view.hidden = !active; view.classList.toggle("is-active", active); }); const nextTab = name === "welcome" ? "explore" : name; tabs.forEach((tab) => { const active = tab.dataset.tab === nextTab; tab.classList.toggle("is-active", active); active ? tab.setAttribute("aria-current", "page") : tab.removeAttribute("aria-current"); }); feedback.textContent = name === "explore" ? "Pick a place to start your plan." : name === "trips" ? "Your saved ideas live here." : name === "profile" ? "Travel at your own pace." : "Your next trip can start small."; }
document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.go)));
tabs.forEach((tab) => tab.addEventListener("click", () => showView(tab.dataset.tab)));
document.querySelectorAll("[data-toast]").forEach((button) => button.addEventListener("click", () => { feedback.textContent = button.dataset.toast; }));
if (["explore", "trips", "profile"].includes(params.get("view"))) showView(params.get("view"));
