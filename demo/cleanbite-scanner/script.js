const feedback = document.querySelector("#feedback");
const phones = [...document.querySelectorAll("[data-phone]")];
const mobileButtons = [...document.querySelectorAll("[data-mobile-view]")];
const params = new URLSearchParams(window.location.search);
let feedbackTimer;

function say(message) {
  feedback.textContent = message;
  feedback.classList.add("is-visible");
  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => feedback.classList.remove("is-visible"), 1800);
}

function focusPhone(name) {
  phones.forEach((phone) => phone.classList.toggle("is-focused", phone.dataset.phone === name));
  mobileButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.mobileView === name));
}

document.querySelectorAll("[data-plan]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-plan]").forEach((plan) => {
      const selected = plan === button;
      plan.classList.toggle("is-selected", selected);
      plan.setAttribute("aria-checked", String(selected));
      const label = plan.querySelector(":scope > b");
      if (label) label.textContent = selected ? "Selected" : "Choose";
    });
    say(`${button.dataset.plan[0].toUpperCase()}${button.dataset.plan.slice(1)} plan selected.`);
  });
});

document.querySelector("[data-open-analysis]").addEventListener("click", () => {
  focusPhone("analysis");
  say("Guest preview opened.");
});
document.querySelector("[data-open-pricing]").addEventListener("click", () => {
  focusPhone("pricing");
  say("Back to membership options.");
});
document.querySelector("[data-share]").addEventListener("click", () => say("Share link prepared locally."));
document.querySelector("[data-save]").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const saved = button.getAttribute("aria-pressed") !== "true";
  button.setAttribute("aria-pressed", String(saved));
  button.classList.toggle("is-saved", saved);
  say(saved ? "Product saved." : "Product removed from saved items.");
});

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== button.dataset.tab;
    });
    say(`${button.textContent.trim()} view selected.`);
  });
});

mobileButtons.forEach((button) => button.addEventListener("click", () => focusPhone(button.dataset.mobileView)));
document.querySelector("[data-scan]").addEventListener("click", () => say("Scanner ready for another label."));

if (params.has("embed")) document.documentElement.classList.add("embed-mode");
if (params.get("view") === "pricing") focusPhone("pricing");
