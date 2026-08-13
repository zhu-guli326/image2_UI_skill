const views = [...document.querySelectorAll(".phone-main [data-view]")];
const feedback = document.querySelector("#feedback");
const params = new URLSearchParams(window.location.search);
let feedbackTimer;

if (params.has("embed")) {
  document.documentElement.classList.add("embed-mode");
  const fit = () =>
    document.documentElement.style.setProperty(
      "--embed-scale",
      String(Math.min(window.innerWidth / 390, window.innerHeight / 844)),
    );
  fit();
  window.addEventListener("resize", fit);
}

function announce(message) {
  feedback.textContent = message;
  feedback.classList.add("is-visible");
  window.clearTimeout(feedbackTimer);
  feedbackTimer = window.setTimeout(
    () => feedback.classList.remove("is-visible"),
    2400,
  );
}

function setView(name) {
  views.forEach((view) => {
    const active = view.dataset.view === name;
    view.hidden = !active;
    view.classList.toggle("is-active", active);
  });
  document
    .querySelectorAll(".bottom-nav button")
    .forEach((button) =>
      button.classList.toggle(
        "is-active",
        name === "catalog" && button.dataset.setView === "catalog",
      ),
    );
  document
    .querySelector(".phone-main")
    .classList.toggle("is-hero", name === "hero");
  announce(
    {
      catalog: "New arrivals are ready to explore.",
      detail: "Chestnut Day Pack, made for the everyday.",
      hero: "The field collection is ready.",
    }[name],
  );
}

document
  .querySelectorAll("[data-set-view]")
  .forEach((button) =>
    button.addEventListener("click", () => setView(button.dataset.setView)),
  );
document
  .querySelectorAll("[data-feedback]")
  .forEach((button) =>
    button.addEventListener("click", () => announce(button.dataset.feedback)),
  );
document.querySelectorAll(".tabs button").forEach((button) =>
  button.addEventListener("click", () => {
    document.querySelectorAll(".tabs button").forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("is-selected", active);
      tab.setAttribute("aria-selected", String(active));
    });
    announce(`${button.textContent} collection selected.`);
  }),
);
document.querySelectorAll(".swatches button").forEach((button) =>
  button.addEventListener("click", () => {
    document.querySelectorAll(".swatches button").forEach((swatch) => {
      const active = swatch === button;
      swatch.classList.toggle("is-selected", active);
      swatch.setAttribute("aria-pressed", String(active));
    });
    announce(`${button.getAttribute("aria-label")} selected.`);
  }),
);
document
  .querySelector("[data-order]")
  .addEventListener("click", () =>
    announce("Chestnut Day Pack added to your bag."),
  );
if (["catalog", "detail", "hero"].includes(params.get("view")))
  setView(params.get("view"));
