# Generated Home UI Demo

This demo recreates the three-screen real-estate mobile UI reference as a clickable HTML/CSS/JS prototype.

## What is generated

The following bitmap assets were generated through the configured local image API path and saved into `assets/`:

- `house-card-gen.png`
- `house-wide-gen.png`
- `room-thumbnails-gen.png`
- `avatar-gen.png`

The right AR-tour screen currently uses `interior-stairs-temp.png`, a generated house exterior image, because repeated attempts to generate a dedicated interior staircase asset returned upstream `502` errors. The screen is still wired as a generated-asset slot and can be replaced with a staircase image later without changing the UI code.

## Run

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8123
```

Then open `http://127.0.0.1:8123/`.

## Validation

The prototype was checked at a `658x494` viewport:

- Three phone screens render.
- All local images load with no broken image references.
- Bottom navigation and room tabs update active state.
- Screenshot output is available under `screenshots/replica-658x494-gen.png`.
