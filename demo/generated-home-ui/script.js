const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const phones = [
  document.querySelector(".phone-home"),
  document.querySelector(".phone-detail"),
  document.querySelector(".phone-tour"),
];
const screenNames = ["home", "detail", "tour"];
const bottomNav = document.querySelector(".bottom-nav");
const roomTabs = document.querySelector(".room-tabs");
let currentScreen = "home";

function navigateToPhone(screenName) {
  const targetIndex = screenNames.indexOf(screenName);
  const currentIndex = screenNames.indexOf(currentScreen);
  const target = phones[targetIndex];
  if (!target || targetIndex === currentIndex) return;

  target.dataset.motionDirection = targetIndex > currentIndex ? "forward" : "back";
  phones.forEach((phone, index) => phone.classList.toggle("is-current", index === targetIndex));
  target.scrollIntoView({
    behavior: reduceMotion.matches ? "auto" : "smooth",
    block: "center",
    inline: "center",
  });
  currentScreen = screenName;
}

function selectBottomNav(button) {
  const buttons = Array.from(bottomNav.querySelectorAll("button"));
  const index = buttons.indexOf(button);
  buttons.forEach((item) => {
    const selected = item === button;
    item.classList.toggle("active", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
  bottomNav.style.setProperty("--nav-index", String(index));
  bottomNav.style.setProperty("--nav-offset", `${index * 100}%`);
}

function selectRoom(button) {
  const buttons = Array.from(roomTabs.querySelectorAll("button"));
  const index = buttons.indexOf(button);
  buttons.forEach((item) => {
    const selected = item === button;
    item.classList.toggle("active", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
  roomTabs.style.setProperty("--room-index", String(index));
  roomTabs.dataset.selectedIndex = String(index);
}

function pulseCommand(button) {
  button.classList.add("is-pressed");
  window.setTimeout(() => button.classList.remove("is-pressed"), 140);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  const propertyCard = event.target.closest(".property-card");
  if (button) pulseCommand(button);

  if (button?.closest(".bottom-nav")) {
    selectBottomNav(button);
    return;
  }
  if (button?.closest(".room-tabs")) {
    selectRoom(button);
    return;
  }
  if (button?.matches(".phone-detail .back")) {
    navigateToPhone("home");
    return;
  }
  if (button?.matches(".phone-tour .back")) {
    navigateToPhone("detail");
    return;
  }
  if (button?.matches(".ar-chip, .property-card button:not(.rating)")) {
    navigateToPhone("tour");
    return;
  }
  if (propertyCard) navigateToPhone("detail");
});

document.addEventListener("keydown", (event) => {
  if (!event.target.matches(".property-card") || !["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  navigateToPhone("detail");
});

phones[0].classList.add("is-current");
bottomNav.style.setProperty("--nav-index", "0");
bottomNav.style.setProperty("--nav-offset", "0%");
roomTabs.style.setProperty("--room-index", "1");
roomTabs.dataset.selectedIndex = "1";
