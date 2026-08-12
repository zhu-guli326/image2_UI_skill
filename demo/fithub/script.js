const views = [...document.querySelectorAll(".view")],
  out = document.querySelector("#feedback");
let timer;
const q = new URLSearchParams(location.search);
const phoneWidth = 390;
const phoneHeight = 844;
if (q.has("embed")) {
  document.documentElement.classList.add("embed-mode");
  const fit = () =>
    document.documentElement.style.setProperty(
      "--embed-scale",
      Math.min(innerWidth / phoneWidth, innerHeight / phoneHeight),
    );
  fit();
  addEventListener("resize", fit);
} else {
  const fitStage = () => {
    const previewInset =
      innerWidth <= phoneWidth || innerHeight <= phoneHeight ? 0 : 24;
    document.documentElement.style.setProperty(
      "--stage-scale",
      Math.min(
        1,
        (innerWidth - previewInset) / phoneWidth,
        (innerHeight - previewInset) / phoneHeight,
      ),
    );
  };
  fitStage();
  addEventListener("resize", fitStage);
}
function note(t) {
  out.textContent = t;
  out.classList.add("show");
  clearTimeout(timer);
  timer = setTimeout(() => out.classList.remove("show"), 1800);
}
function show(n) {
  views.forEach((v) => {
    v.hidden = v.dataset.view !== n;
    v.classList.toggle("active", v.dataset.view === n);
  });
  document
    .querySelectorAll(".dock button")
    .forEach((b) => {
      const selected = b.dataset.set === n;
      b.classList.toggle("selected", selected);
      if (selected) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
  note(
    {
      discover: "Choose a workout that fits today.",
      activity: "Your daily activity is ready.",
      focus: "Select a target area to begin.",
    }[n],
  );
}
document
  .querySelectorAll("[data-set]")
  .forEach((b) => b.addEventListener("click", () => show(b.dataset.set)));
document
  .querySelectorAll("[data-feedback]")
  .forEach((b) => b.addEventListener("click", () => note(b.dataset.feedback)));
document.querySelectorAll(".filters button,.dates button").forEach((b) =>
  b.addEventListener("click", () => {
    b.parentElement
      .querySelectorAll("button")
      .forEach((x) => {
        const selected = x === b;
        x.classList.toggle("selected", selected);
        if (x.getAttribute("role") === "tab")
          x.setAttribute("aria-selected", String(selected));
      });
    note(`${b.textContent} selected.`);
  }),
);
document.querySelectorAll("[data-zone]").forEach((b) =>
  b.addEventListener("click", () => {
    document
      .querySelectorAll("[data-zone]")
      .forEach((x) => x.classList.toggle("selected", x === b));
    note(`${b.dataset.zone} focus selected.`);
  }),
);
if (["discover", "activity", "focus"].includes(q.get("view")))
  show(q.get("view"));
