const views = [...document.querySelectorAll(".view")],
  out = document.querySelector("#feedback");
let t;
const q = new URLSearchParams(location.search);
if (q.has("embed")) {
  document.documentElement.classList.add("embed-mode");
  const f = () =>
    document.documentElement.style.setProperty(
      "--embed-scale",
      Math.min(innerWidth / 390, innerHeight / 693.3333),
    );
  f();
  addEventListener("resize", f);
}
function note(x) {
  out.textContent = x;
  out.classList.add("show");
  clearTimeout(t);
  t = setTimeout(() => out.classList.remove("show"), 1600);
}
function show(n) {
  views.forEach((v) => {
    const active = v.dataset.view === n;
    v.hidden = !active;
    v.classList.toggle("active", active);
  });
  note(
    {
      intro: "Discover considered materials.",
      catalog: "67 timeless pieces to explore.",
      detail: "Recycled wool, made for every day.",
    }[n],
  );
}
document
  .querySelectorAll("[data-set]")
  .forEach((b) => (b.onclick = () => show(b.dataset.set)));
document
  .querySelectorAll("[data-feedback]")
  .forEach((b) => (b.onclick = () => note(b.dataset.feedback)));
document.querySelectorAll(".cats button,.swatches button").forEach(
  (b) =>
    (b.onclick = () => {
      b.parentElement
        .querySelectorAll("button")
        .forEach((x) => x.classList.toggle("selected", x === b));
      note(`${b.textContent || b.getAttribute("aria-label")} selected.`);
    }),
);
document.querySelector("[data-cart]").onclick = () =>
  note("Recycled Wool Scarf added to your cart.");
if (["intro", "catalog", "detail"].includes(q.get("view"))) show(q.get("view"));
