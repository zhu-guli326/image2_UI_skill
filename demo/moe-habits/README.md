# Moe Habits

Open `index.html` directly in a browser, or serve the repository root and open `/demo/moe-habits/`.

The default screen is the dark welcome page. `Start today` opens the routine; open the walk habit and finish it to reach the completion state.

The generated illustration is stored in `assets/moe-mascots.png` and is a Youtoken `gpt-image-2` asset. Text, navigation, buttons, status information, and icons are code-rendered.

Rendered frames are in `screenshots/01-intro.png` through `screenshots/04-celebration.png`. The four-step video is `moe-habits-demo.mp4`, and `mobile-preview.png` is the library-card poster.

Rebuild the video as a real browser interaction recording at `780x1688` with:

```bash
node demo/moe-habits/render-video.mjs http://127.0.0.1:4174/demo/moe-habits/index.html
```
