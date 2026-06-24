const buttons = document.querySelectorAll("button");

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.add("is-pressed");
    window.setTimeout(() => button.classList.remove("is-pressed"), 140);
  });
});

document.querySelectorAll(".bottom-nav button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".bottom-nav button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
});

document.querySelectorAll(".room-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".room-tabs button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
});

document.querySelectorAll(".mini-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelector(".phone-detail").scrollIntoView({ behavior: "smooth", block: "center" });
  });
});
