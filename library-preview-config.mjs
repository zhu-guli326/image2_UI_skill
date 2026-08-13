export const libraryPreviewAssetVersion = "20260813-multi-screen-v7";

export const standardPreviewDevice = Object.freeze({ width: 390, height: 844 });
export const defaultPreviewDevice = standardPreviewDevice;
export const standardVideoPreviewDevice = standardPreviewDevice;
export const standardPreviewDisplayDevice = standardPreviewDevice;

const libraryPreviewCaseIds = [
  "museum",
  "fashion",
  "fufu",
  "organique",
  "cleanbite",
  "plate-play",
  "carry-bag",
  "fithub",
  "still-form",
  "news",
  "itinerary",
  "journal",
  "buddy",
  "notebook",
  "signal-grid",
  "volt-route",
  "moodly",
  "reflect",
  "moe",
  "loy",
  "mimo",
  "relay-music",
  "softly-reflections",
];

export const libraryPreviewProfiles = Object.freeze(Object.fromEntries(
  libraryPreviewCaseIds.map((id) => [id, Object.freeze({
    image: standardPreviewDevice,
    video: standardPreviewDevice,
    live: standardPreviewDevice,
  })]),
));

export function getLibraryPreviewDevice(id, mode = "live") {
  return libraryPreviewProfiles[id]?.[mode] || standardPreviewDevice;
}

export function getLibraryPreviewDisplayDevice() {
  return standardPreviewDisplayDevice;
}
