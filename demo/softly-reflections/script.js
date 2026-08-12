const prompts = [
  { question: "WHAT FEELS\nHEAVY RIGHT\nNOW?", likes: "1.2k", comments: "87", topics: ["Emotions", "Overwhelm", "Thoughts"] },
  { question: "WHERE COULD\nYOU BE MORE\nGENTLE?", likes: "986", comments: "64", topics: ["Self-talk", "Care", "Change"] },
  { question: "WHAT ARE YOU\nREADY TO\nRELEASE?", likes: "1.8k", comments: "112", topics: ["Letting go", "Calm", "Growth"] },
];

const moods = {
  Low: { active: 5, message: "Low has been added to your day." },
  Calm: { active: 9, message: "Calm has been added to your day." },
  Bright: { active: 13, message: "Bright has been added to your day." },
  Tense: { active: 16, message: "Tense has been added to your day." },
};

const state = { promptIndex: 0, mood: "Calm", tab: "today", favorite: false };
const feedback = document.querySelector("#feedback");
const card = document.querySelector(".reflection-card");
const searchSheet = document.querySelector("[data-search-sheet]");
let feedbackTimer;

function say(message) {
  feedback.textContent = message;
  feedback.classList.add("is-visible");
  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => feedback.classList.remove("is-visible"), 1600);
}

function focusPhone(name) {
  document.querySelectorAll("[data-phone]").forEach((phone) => phone.classList.toggle("is-focused", phone.dataset.phone === name));
  document.querySelectorAll("[data-mobile-target]").forEach((button) => button.classList.toggle("is-active", button.dataset.mobileTarget === name));
}

function renderPrompt() {
  const prompt = prompts[state.promptIndex];
  document.querySelector("[data-question]").innerHTML = prompt.question.split("\n").join("<br />");
  document.querySelector("[data-likes]").textContent = prompt.likes;
  document.querySelector("[data-comments]").textContent = prompt.comments;
  document.querySelector("[data-topics]").innerHTML = prompt.topics.map((topic) => `<span>${topic}</span>`).join("");
}

function changePrompt(direction) {
  card.classList.add("is-switching");
  setTimeout(() => {
    state.promptIndex = (state.promptIndex + direction + prompts.length) % prompts.length;
    renderPrompt();
    card.classList.remove("is-switching");
    say(`Reflection ${state.promptIndex + 1} of ${prompts.length}.`);
  }, 170);
}

function setPromptFromText(question) {
  const normalized = question.toUpperCase();
  const existing = prompts.findIndex((prompt) => prompt.question.replaceAll("\n", " ") === normalized);
  if (existing >= 0) state.promptIndex = existing;
  else {
    prompts.unshift({ question: normalized.replace(/(.{14,22})\s/g, "$1\n").trim(), likes: "New", comments: "0", topics: ["Personal", "Pause", "Today"] });
    state.promptIndex = 0;
  }
  renderPrompt();
  focusPhone("reflections");
  setTab("today");
}

function setTab(name) {
  state.tab = name;
  document.querySelectorAll("[data-panel]").forEach((panel) => { panel.hidden = panel.dataset.panel !== name; });
  document.querySelectorAll("[data-tab]").forEach((button) => button.classList.toggle("is-active", button.dataset.tab === name));
  focusPhone("reflections");
}

function renderPromptLibrary() {
  const items = [
    ["What deserves a slower answer?", "Boundaries · 4 min"],
    ["Where did you feel most like yourself?", "Identity · 6 min"],
    ["What can remain unfinished today?", "Rest · 3 min"],
  ];
  document.querySelector("[data-prompt-library]").innerHTML = items.map(([title, meta]) => `<button class="library-prompt" type="button" data-library-question="${title}"><strong>${title}</strong><span>${meta}</span></button>`).join("");
  document.querySelectorAll("[data-library-question]").forEach((button) => button.addEventListener("click", () => setPromptFromText(button.dataset.libraryQuestion)));
}

function renderWeek() {
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  document.querySelector("[data-week-strip]").innerHTML = labels.map((label, index) => `<span class="week-day${[0, 1, 3, 5].includes(index) ? " is-done" : ""}"><b>${label}</b><i></i></span>`).join("");
}

function renderWaveform() {
  const heights = [8, 15, 24, 33, 47, 58, 66, 73, 61, 49, 38, 29, 43, 54, 34, 23, 15, 8];
  const active = moods[state.mood].active;
  document.querySelector("[data-waveform]").innerHTML = heights.map((height, index) => `<i class="${Math.abs(index - active) < 2 ? "is-active" : ""}" style="height:${height}px"></i>`).join("");
  document.querySelector("[data-mood-main]").dataset.activeMood = state.mood;
}

function chooseMood(name) {
  state.mood = name;
  document.querySelectorAll("[data-mood]").forEach((button) => {
    const selected = button.dataset.mood === name;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  renderWaveform();
  say(`${name} selected.`);
}

function renderSearchResults(query = "") {
  const source = [
    "What feels heavy right now?",
    "Where could you be more gentle?",
    "What are you ready to release?",
    "What can remain unfinished today?",
    "What gave you energy this week?",
  ].filter((item) => item.toLowerCase().includes(query.toLowerCase()));
  document.querySelector("[data-search-results]").innerHTML = source.map((item) => `<button class="search-result" type="button" data-search-question="${item}">${item}</button>`).join("");
  document.querySelectorAll("[data-search-question]").forEach((button) => button.addEventListener("click", () => {
    searchSheet.hidden = true;
    setPromptFromText(button.dataset.searchQuestion);
  }));
}

document.querySelectorAll("[data-start]").forEach((button) => button.addEventListener("click", () => {
  focusPhone("reflections");
  setTab("today");
  say("Today's reflection is ready.");
}));

document.querySelector("[data-explore]").addEventListener("click", () => {
  focusPhone("reflections");
  setTab("reflect");
  say("Prompt library opened.");
});

document.querySelectorAll("[data-welcome-prompt]").forEach((button) => button.addEventListener("click", () => setPromptFromText(button.dataset.welcomePrompt)));
document.querySelector("[data-previous]").addEventListener("click", () => changePrompt(-1));
document.querySelector("[data-next]").addEventListener("click", () => changePrompt(1));
document.querySelector("[data-open-mood]").addEventListener("click", () => focusPhone("mood"));
document.querySelector("[data-back]").addEventListener("click", () => focusPhone("reflections"));

document.querySelector("[data-favorite]").addEventListener("click", (event) => {
  state.favorite = !state.favorite;
  event.currentTarget.setAttribute("aria-pressed", String(state.favorite));
  say(state.favorite ? "Reflection saved." : "Reflection removed from saved.");
});

document.querySelector("[data-notification]").addEventListener("click", (event) => {
  const unread = event.currentTarget.getAttribute("aria-pressed") === "true";
  event.currentTarget.setAttribute("aria-pressed", String(!unread));
  say(unread ? "Notifications marked as read." : "One gentle reminder is waiting.");
});

document.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tab)));
document.querySelectorAll("[data-mobile-target]").forEach((button) => button.addEventListener("click", () => focusPhone(button.dataset.mobileTarget)));
document.querySelectorAll("[data-mood]").forEach((button) => button.addEventListener("click", () => chooseMood(button.dataset.mood)));

document.querySelector("[data-complete]").addEventListener("click", () => {
  document.querySelector("[data-mood-main]").hidden = true;
  document.querySelector("[data-mood-complete]").hidden = false;
  document.querySelector("[data-saved-mood]").textContent = moods[state.mood].message;
  say("Mood check-in saved.");
});

document.querySelector("[data-return]").addEventListener("click", () => {
  document.querySelector("[data-mood-main]").hidden = false;
  document.querySelector("[data-mood-complete]").hidden = true;
  focusPhone("reflections");
  setTab("today");
});

document.querySelector("[data-search-open]").addEventListener("click", () => {
  searchSheet.hidden = false;
  renderSearchResults();
  setTimeout(() => document.querySelector("[data-search-input]").focus(), 0);
});

document.querySelector("[data-search-close]").addEventListener("click", () => { searchSheet.hidden = true; });
document.querySelector("[data-search-input]").addEventListener("input", (event) => renderSearchResults(event.target.value));

renderPrompt();
renderPromptLibrary();
renderWeek();
renderWaveform();

const params = new URLSearchParams(window.location.search);
if (params.has("embed")) document.documentElement.classList.add("embed-mode");
if (params.get("view") && ["welcome", "reflections", "mood"].includes(params.get("view"))) focusPhone(params.get("view"));
