# JevPilot

https://github.com/user-attachments/assets/4baef58e-54ef-4d17-9982-353a0b6e6f45

<p align="center">
  <a href="https://jevpilot.standardagents.ai">
    <img src="docs/try-jevpilot.svg" alt="Try JevPilot →" width="256" height="64" />
  </a>
</p>

A demo project showing Tesla Autopilot-like behavior. It ships with a complete local **Full Self-Driving (FSD)** driver, plus an optional [Jev by TypeSafe AI](https://typesafe.ai/) integration for comparison.

**FSD works out of the box**: press **F** or **Engage FSD** in the driving dock. It follows the route, observes traffic lights and stop signs, queues behind traffic, handles highway ramps, brakes for hazards and stops at the destination. Everything runs in the browser — no sign-in, API key, credit or network request is involved. Driving keys or the touch controls take back control immediately.

Sign in with Standard Agents only if you want to try the hosted Jev decision loop ($0.25 of free play credit). Joining the early-access list is optional.

The hosted `/api/decide` endpoint requires a valid login session. The browser sends its secure, HttpOnly session cookie; the Jev API key stays on the server.

**Interstate 08:** start in Millbrook, turn onto the signed on-ramp, merge, cruise, and exit into Cedar Town for the final stop.

## How it works

Jev receives compact tables of eligible paths, road boundaries, nearby traffic, signals, stop memory, and destination guidance. Shared table values are sent once, and instructions include only relevant situations. The road graph is sent only when choosing an alternative route after staying more than 30 meters off course for six seconds. Detailed geometry and control calculations stay local.

The simulator samples fresh steering-and-speed combinations for each decision. On the road, it favors paths that keep the whole car on asphalt. Off road, it explores a wider field of forward and reverse paths and supplies a recovery target, road boundaries, and collision predictions.

An explicit `driving_style` describes an aggressive driver: keep progressing, stop at the actual line, and close gaps before stopping behind an obstacle. Jev can choose an approach path that progressively slows to a stop 0.5 m before the line. An immediate **stop** is offered only within 2.5 m of a blocker or required stop line, at the destination, or when no eligible moving path exists. Candidate speeds taper near required stops. Jev receives recent-stop memory and collision timing; a safety brake handles collision risks.

The bright blue ribbon on the road is the active plan: local FSD draws the route ahead, and Jev’s selected three-second path replaces it when Jev is driving. Use **Candidates** to show the other sampled paths: blue/cyan for forward, purple for reverse, amber for paths leaving the lane, orange for predicted collisions. Candidate generation and route searches run in a background worker; the renderer smoothly blends the sampled shapes. Open **JSON** to inspect road boundaries, recovery state, and actual choice probabilities.

Requests run up to 4 times/second near turns or traffic, and about 1.5 times/second on clear roads. Questions with one eligible answer are resolved locally. **JSON → Jev input** shows the exact API payload; the cost tooltip and response tab show average payload size and billed input tokens.

## Run locally

```sh
npm ci
cp .env.example .env
# Set TYPESAFE_API_KEY in .env.
npm run dev
```

Add your own [TypeSafe AI](https://typesafe.ai/) API key to `.env`:

```dotenv
TYPESAFE_API_KEY=your_key_here
```

Open [localhost:5173](http://localhost:5173). **Local development skips all login, signup, and demo credit limits.** No Standard Agents OAuth credentials are needed. Jev calls use your own key and TypeSafe account billing; free play works without a key. The key stays server-side in the gitignored `.env`—never use a `VITE_` variable for it.

This also applies to `npm run preview` after `npm run build`. Restart the local server after changing `.env`.

**F** toggles local FSD · **WASD** to drive · **Space** to brake · **C** cycles chase, driver, first person and bird’s-eye cameras. First person puts you in the Model Y cabin with a Tesla-style center display: status bar, gear strip, speed, power meter, surrounding traffic, speed limit, range, navigation, media and climate cards, and a bottom app bar.

## FSD design

`src/fsd.js` is a small deterministic controller: pure-pursuit path tracking with a speed profile for curve radius, speed limits, signal/stop memory, vehicle following, hazard envelopes and arrival braking. It reads the same route, controls and perception data as the Jev path, but makes every decision locally in `Simulation.step`. `npm test` includes end-to-end drives through town, city and interstate worlds that assert zero collisions and zero traffic violations without touching `fetch`.

Asset credits and licenses are included in [public/](public/).

Cloudflare deployment details: [docs/hosting.md](docs/hosting.md).
