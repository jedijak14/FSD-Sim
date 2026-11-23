# FSD-Sim — Tesla Interior Simulator

A real-time Tesla Model 3 driving simulator game built on **three.js**, evolved from the [dashsplat](https://github.com/R44VC0RP/dashsplat) 3D world (navigable Tesla dashcam scenes) into a playable game. Instead of playing back recorded cameras, you drive the car in real time.

> Independent fan project. Not affiliated with, endorsed by, or sponsored by Tesla, Inc. Tesla, Model 3, Autopilot, FSD, Autopark and related names are trademarks of Tesla, Inc.

## Features
- **First-person cockpit** — full Tesla interior: dashboard, center screen, yoke steering wheel, accelerator & brake pedals, gear stalk that physically moves when you shift. No hands — just the interior.
- **Third-person chase camera** — toggle with `C`.
- **Smooth, high-quality shading** — no blocky cars; everything uses smooth Three.js Standard materials, PCF soft shadows, fog, and ACES tone mapping. Road textured from the provided `tesla-model-3-realistic-graphics.zip` assets; the zip's realistic GLB exterior loads for third-person view (falls back to a smooth proxy).
- **Autopilot modes** — `1` Manual / `2` Autosteer / `3` FSD Beta.
- **Smart FSD** — stops at red traffic lights and stop signs, slows/yields for vehicles ahead, maintains following distance, auto-resumes when clear.
- **Autopark** — `P` (when in Drive and stopped).
- **Full Tesla UI** — center-screen replica with Navigation, Media, Phone, Theater, Web Browser, Climate, Controls and Settings.
- **Media & streaming apps** — Spotify, Apple Music, Audible, YouTube Music (Media) and Netflix, Disney+, Hulu, HBO Max, YouTube, Twitch (Theater, Park-only).
- **Custom Chromium-style browser** — loads any website in an in-car webview.
- **Tesla settings** — Autopilot/FSD toggles, stopping/steering mode, units, software check.
- **Synthesized audio** — EV motor whine, turn signals, door chime, gear-shift chime, crash sound (Web Audio API).

## Controls
| Key | Action |
|-----|--------|
| W / ↑ | Accelerate |
| S / ↓ | Brake |
| A / ← | Steer left |
| D / → | Steer right |
| C | Toggle 1st ↔ 3rd person |
| R | Gear Reverse |
| D | Gear Drive |
| N | Gear Neutral |
| P | Gear Park / toggle Autopark (if parked) |
| 1 | Manual driving |
| 2 | Autosteer |
| 3 | FSD Beta |
| T / Esc | Open / close Tesla UI |
| Click canvas | Start audio (browser gesture) |

## Files
- `index.html` — entry point
- `css/style.css` — Tesla UI styling
- `js/main.js` — Three.js scene, cameras, player physics, loop
- `js/audio.js` — synthesized Tesla sounds (Web Audio API)
- `js/interior.js` — smooth-shaded cockpit (dash, screen, wheel, pedals, stalk)
- `js/world.js` — road, traffic cars, traffic lights, stop signs
- `js/fsd.js` — Autopilot / Autosteer / FSD / Autopark logic
- `js/ui.js` — Tesla center-screen UI, apps, browser, settings
- `assets/` — extracted from `tesla-model-3-realistic-graphics.zip` (GLB + textures)

## Run
Serve the folder statically (ES modules + asset loading), e.g.:

```bash
python3 -m http.server 8080 --directory /home/user/FSD-Sim
# open http://localhost:8080
```

Then click the canvas to start audio and drive.

## Notes on streaming apps
Netflix, Disney+, Hulu, HBO Max and YouTube block embedding in third-party iframes (DRM/rights), so in the sim they launch as Theater tiles and open the real site in the in-car Web Browser app — mirroring how a real Chromium-based Tesla browser behaves.
