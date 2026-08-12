const tracks = [
  { id: "afterimage", title: "Afterimage", artist: "Nova Ray", album: "Signal Skin", art: "./assets/album-afterimage.png", duration: 252, accent: "#143fca" },
  { id: "eclipse", title: "Black Iris", artist: "Mira Sol", album: "Nocturne Index", art: "./assets/album-eclipse.png", duration: 226, accent: "#152555" },
  { id: "glasshouse", title: "Glasshouse", artist: "Iori Vale", album: "Cold Mineral", art: "./assets/album-crystal.png", duration: 198, accent: "#667685" },
  { id: "slow-bloom", title: "Slow Bloom", artist: "Elias North", album: "Soft Voltage", art: "./assets/album-coral-wave.png", duration: 241, accent: "#c55f52" },
];

const artists = [
  { name: "Nova Ray", meta: "1.8M monthly listeners", avatar: "./assets/avatar-ava-kline.png" },
  { name: "Mira Sol", meta: "932K monthly listeners", avatar: "./assets/avatar-mira-sol.png" },
  { name: "Iori Vale", meta: "706K monthly listeners", avatar: "./assets/avatar-iori-vale.png" },
  { name: "Elias North", meta: "514K monthly listeners", avatar: "./assets/avatar-elias-north.png" },
  { name: "Zen Cole", meta: "1.1M monthly listeners", avatar: "./assets/avatar-zen-cole.png" },
];

const state = {
  currentIndex: 0,
  playing: true,
  progress: 31,
  shuffle: false,
  repeat: false,
  route: "discover",
  favorites: new Set(tracks.map((track) => track.id)),
};

const feedback = document.querySelector("#feedback");
const playerScreen = document.querySelector(".player-screen");
const progressInput = document.querySelector("[data-progress]");
const collectionView = document.querySelector("[data-collection-view]");
const discoverMain = document.querySelector("[data-discover-main]");
const params = new URLSearchParams(window.location.search);
let feedbackTimer;

function icon(name) {
  return `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

function currentTrack() {
  return tracks[state.currentIndex];
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function say(message) {
  feedback.textContent = message;
  feedback.classList.add("is-visible");
  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => feedback.classList.remove("is-visible"), 1600);
}

function renderTrackButton(track, index, variant) {
  const prefix = variant === "ranked" ? `<b>${String(index + 1).padStart(2, "0")}</b>` : "";
  return `<button class="track-row" type="button" data-track-id="${track.id}" aria-label="Play ${track.title} by ${track.artist}">${prefix}<img src="${track.art}" alt="" /><span><strong>${track.title}</strong><small>${track.artist} · ${track.album}</small></span><i>${icon(variant === "ranked" ? "play" : "more")}</i></button>`;
}

function renderLists() {
  document.querySelector('[data-track-list="artist"]').innerHTML = tracks.slice(0, 3).map((track, index) => renderTrackButton(track, index, "compact")).join("");
  document.querySelector('[data-track-list="discover"]').innerHTML = tracks.slice(0, 3).map((track, index) => renderTrackButton(track, index, "ranked")).join("");
  renderCollection();
  bindTrackButtons();
}

function renderCollection() {
  const list = document.querySelector('[data-track-list="collection"]');
  if (!list) return;
  const items = state.route === "favorites" ? tracks.filter((track) => state.favorites.has(track.id)) : tracks;
  list.innerHTML = items.map((track, index) => renderTrackButton(track, index, "collection")).join("");
  const count = document.querySelector("[data-collection-count]");
  if (count) count.textContent = `${items.length} ${state.route === "favorites" ? "saved" : "available"} tracks`;
}

function bindTrackButtons() {
  document.querySelectorAll("[data-track-id]").forEach((button) => {
    button.onclick = () => selectTrack(button.dataset.trackId, true);
  });
}

function renderArtistRail() {
  const rail = document.querySelector("[data-artist-rail]");
  rail.innerHTML = artists.map((artist, index) => `<button class="artist-chip${index === 0 ? " is-active" : ""}" type="button" data-artist-index="${index}" aria-label="Open ${artist.name} profile"><img src="${artist.avatar}" alt="" /><span>${artist.name}</span></button>`).join("");
  rail.querySelectorAll("[data-artist-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const artist = artists[Number(button.dataset.artistIndex)];
      rail.querySelectorAll(".artist-chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
      document.querySelectorAll("[data-artist-name]").forEach((element) => { element.textContent = artist.name.toUpperCase(); });
      document.querySelectorAll("[data-artist-meta]").forEach((element) => { element.textContent = artist.meta; });
      focusPhone("artist");
      say(`${artist.name} profile opened.`);
    });
  });
}

function setIcon(button, name) {
  const use = button?.querySelector("use");
  if (use) use.setAttribute("href", `#i-${name}`);
}

function syncPlayer() {
  const track = currentTrack();
  document.querySelector("[data-player-art]").src = track.art;
  document.querySelector("[data-player-art]").alt = `${track.title} abstract album artwork`;
  document.querySelector("[data-player-title]").textContent = track.title.toUpperCase();
  document.querySelector("[data-player-artist]").textContent = track.artist.toUpperCase();
  document.querySelector("[data-duration]").textContent = formatTime(track.duration);
  document.querySelector("[data-mini-art]").src = track.art;
  document.querySelector("[data-mini-title]").textContent = track.title;
  document.querySelector("[data-mini-artist]").textContent = track.artist;
  playerScreen.style.setProperty("--player-accent", track.accent);
  playerScreen.classList.toggle("is-playing", state.playing);
  const favorite = state.favorites.has(track.id);
  document.querySelectorAll("[data-favorite]").forEach((button) => {
    button.setAttribute("aria-pressed", String(favorite));
    button.setAttribute("aria-label", favorite ? "Remove current track from favorites" : "Favorite current track");
  });
  syncProgress();
  syncPlaybackButtons();
}

function syncProgress() {
  const track = currentTrack();
  progressInput.value = String(state.progress);
  progressInput.style.setProperty("--progress", `${state.progress}%`);
  document.querySelector("[data-elapsed]").textContent = formatTime(track.duration * state.progress / 100);
}

function syncPlaybackButtons() {
  document.querySelectorAll("[data-play]").forEach((button) => {
    setIcon(button, state.playing ? "pause" : "play");
    button.setAttribute("aria-label", state.playing ? "Pause" : "Play");
    button.setAttribute("aria-pressed", String(state.playing));
  });
  const mini = document.querySelector("[data-mini-icon]");
  setIcon(mini, state.playing ? "pause" : "play");
  playerScreen.classList.toggle("is-playing", state.playing);
}

function selectTrack(id, openPlayer = false) {
  const index = tracks.findIndex((track) => track.id === id);
  if (index < 0) return;
  state.currentIndex = index;
  state.progress = 0;
  state.playing = true;
  syncPlayer();
  if (openPlayer) focusPhone("player");
  say(`${currentTrack().title} is now playing.`);
}

function moveTrack(direction) {
  if (state.shuffle) {
    state.currentIndex = (state.currentIndex + 2) % tracks.length;
  } else {
    state.currentIndex = (state.currentIndex + direction + tracks.length) % tracks.length;
  }
  state.progress = 0;
  syncPlayer();
  say(`${currentTrack().title} selected.`);
}

function focusPhone(name) {
  document.querySelectorAll("[data-phone]").forEach((phone) => phone.classList.toggle("is-focused", phone.dataset.phone === name));
  document.querySelectorAll("[data-mobile-target]").forEach((button) => button.classList.toggle("is-active", button.dataset.mobileTarget === name));
}

function setRoute(route) {
  state.route = route;
  document.querySelectorAll("[data-route]").forEach((button) => button.classList.toggle("is-active", button.dataset.route === route));
  if (route === "artist") {
    focusPhone("artist");
    return;
  }
  focusPhone("discover");
  const isCollection = route === "favorites" || route === "library";
  discoverMain.hidden = isCollection;
  collectionView.hidden = !isCollection;
  if (isCollection) {
    document.querySelector("[data-collection-title]").textContent = route === "favorites" ? "Favorites" : "Library";
    renderCollection();
    bindTrackButtons();
  }
}

function bindControls() {
  document.querySelectorAll("[data-play]").forEach((button) => button.addEventListener("click", () => {
    state.playing = !state.playing;
    syncPlaybackButtons();
    say(state.playing ? "Playback resumed." : "Playback paused.");
  }));
  document.querySelector("[data-previous]").addEventListener("click", () => moveTrack(-1));
  document.querySelector("[data-next]").addEventListener("click", () => moveTrack(1));
  document.querySelector("[data-shuffle]").addEventListener("click", (event) => {
    state.shuffle = !state.shuffle;
    event.currentTarget.setAttribute("aria-pressed", String(state.shuffle));
    say(state.shuffle ? "Shuffle on." : "Shuffle off.");
  });
  document.querySelector("[data-repeat]").addEventListener("click", (event) => {
    state.repeat = !state.repeat;
    event.currentTarget.setAttribute("aria-pressed", String(state.repeat));
    say(state.repeat ? "Repeat on." : "Repeat off.");
  });
  document.querySelectorAll("[data-favorite]").forEach((button) => button.addEventListener("click", () => {
    const id = currentTrack().id;
    if (state.favorites.has(id)) state.favorites.delete(id);
    else state.favorites.add(id);
    syncPlayer();
    if (state.route === "favorites") {
      renderCollection();
      bindTrackButtons();
    }
    say(state.favorites.has(id) ? "Added to Favorites." : "Removed from Favorites.");
  }));
  progressInput.addEventListener("input", () => {
    state.progress = Number(progressInput.value);
    syncProgress();
  });
  document.querySelector("[data-mini-player]").addEventListener("click", () => focusPhone("player"));
  document.querySelectorAll("[data-mobile-target]").forEach((button) => button.addEventListener("click", () => focusPhone(button.dataset.mobileTarget)));
  document.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => setRoute(button.dataset.route)));
  document.querySelectorAll("[data-feedback]").forEach((button) => button.addEventListener("click", () => say(button.dataset.feedback)));

  const liveOverlay = document.querySelector("[data-live-overlay]");
  document.querySelectorAll("[data-live-open]").forEach((button) => button.addEventListener("click", () => {
    liveOverlay.hidden = false;
    focusPhone("discover");
    say("Live session opened.");
  }));
  document.querySelector("[data-live-close]").addEventListener("click", () => { liveOverlay.hidden = true; });
  document.querySelector("[data-live-toggle]").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const playing = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(playing));
    setIcon(button, playing ? "pause" : "play");
    button.querySelector("b").textContent = playing ? "Pause session" : "Play session";
  });
}

renderArtistRail();
renderLists();
bindControls();
syncPlayer();

setInterval(() => {
  if (!state.playing) return;
  const step = 100 / currentTrack().duration;
  state.progress += step;
  if (state.progress >= 100) {
    if (state.repeat) state.progress = 0;
    else moveTrack(1);
  }
  syncProgress();
}, 1000);

if (params.has("embed")) document.documentElement.classList.add("embed-mode");
if (params.get("view") && ["artist", "player", "discover"].includes(params.get("view"))) focusPhone(params.get("view"));
