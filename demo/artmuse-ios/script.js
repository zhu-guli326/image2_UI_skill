const phones = Array.from(document.querySelectorAll(".phone"));
const toast = document.querySelector(".toast");
let toastTimer = null;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1400);
}

function focusScreen(screenName) {
  phones.forEach((phone) => {
    phone.classList.toggle("is-active", phone.dataset.screen === screenName);
  });

  const target = document.querySelector(`[data-screen="${screenName}"]`);
  if (target) {
    target.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", inline: "center", block: "nearest" });
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const nextScreen = button.dataset.go;
  const toastMessage = button.dataset.toast;

  if (nextScreen) {
    focusScreen(nextScreen);
    showToast(`${nextScreen[0].toUpperCase()}${nextScreen.slice(1)} opened`);
    return;
  }

  if (toastMessage) {
    showToast(toastMessage);
  }
});

document.addEventListener("keydown", (event) => {
  const currentIndex = phones.findIndex((phone) => phone.classList.contains("is-active"));
  if (event.key === "ArrowRight") {
    const next = phones[(currentIndex + 1) % phones.length];
    focusScreen(next.dataset.screen);
  }
  if (event.key === "ArrowLeft") {
    const next = phones[(currentIndex - 1 + phones.length) % phones.length];
    focusScreen(next.dataset.screen);
  }
});
