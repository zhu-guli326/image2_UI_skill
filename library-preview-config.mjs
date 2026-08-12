export const libraryPreviewAssetVersion = "20260812-live-snapshots-v5";

export const defaultPreviewDevice = Object.freeze({ width: 390, height: 693 });
export const standardVideoPreviewDevice = Object.freeze({ width: 390, height: 844 });

export const libraryPreviewProfiles = Object.freeze({
  museum: { image: { width: 360, height: 511 }, video: standardVideoPreviewDevice },
  fashion: { image: { width: 360, height: 721 }, video: standardVideoPreviewDevice },
  fufu: { image: { width: 390, height: 693 }, live: { width: 390, height: 693 } },
  organique: { image: { width: 390, height: 693 }, live: { width: 390, height: 693 } },
  cleanbite: { image: { width: 390, height: 844 }, live: { width: 390, height: 844 } },
  "plate-play": { image: { width: 390, height: 844 }, live: { width: 390, height: 844 } },
  "carry-bag": { image: { width: 390, height: 693 }, live: { width: 390, height: 693 } },
  fithub: { image: { width: 390, height: 844 }, video: { width: 390, height: 844 }, live: { width: 390, height: 844 } },
  "still-form": { image: { width: 390, height: 693 }, live: { width: 390, height: 693 } },
  news: { image: { width: 360, height: 683 }, video: standardVideoPreviewDevice },
  itinerary: { image: { width: 402, height: 840 }, live: { width: 402, height: 840 } },
  journal: { image: { width: 390, height: 693 }, live: { width: 390, height: 693 } },
  buddy: { image: { width: 390, height: 693 }, live: { width: 390, height: 693 } },
  notebook: { image: { width: 390, height: 693 }, live: { width: 390, height: 693 } },
  "signal-grid": { image: { width: 390, height: 693 }, live: { width: 390, height: 693 } },
  "volt-route": { image: { width: 390, height: 693 }, live: { width: 390, height: 693 } },
  moodly: { image: { width: 390, height: 693 }, live: { width: 390, height: 693 } },
  reflect: { image: { width: 390, height: 693 }, live: { width: 390, height: 693 } },
  moe: { image: { width: 390, height: 693 }, video: standardVideoPreviewDevice, live: { width: 390, height: 693 } },
  loy: { image: { width: 390, height: 693 }, live: { width: 390, height: 693 } },
  mimo: { image: { width: 390, height: 693 }, live: { width: 390, height: 693 } },
  "relay-music": { image: { width: 390, height: 844 }, live: { width: 390, height: 844 } },
  "softly-reflections": { image: { width: 390, height: 844 }, live: { width: 390, height: 844 } },
});

export function getLibraryPreviewDevice(id, mode = "live") {
  return libraryPreviewProfiles[id]?.[mode] || (mode === "video" ? standardVideoPreviewDevice : defaultPreviewDevice);
}
