# Career Mode

A from-scratch, no-backend sports career simulator. Build a player in **Football, Basketball, Baseball, Bowling, or Golf**, then simulate their entire story — high school, college, the draft (or turning pro), and a full professional career — while spending earned skill points to grow them from a 65 overall toward a 99, MyCareer-style.

Everything runs client-side in plain HTML/CSS/JS. No build step, no server, no dependencies. Progress saves automatically to your browser's `localStorage`.

## What's included

- `index.html` — app shell + PWA/homescreen metadata
- `app.js` — all app logic (data model, simulation engine, rendering, routing)
- `style.css` — all styling
- `manifest.json` + `service-worker.js` — homescreen install support
- `icons/` — generated app icons (standard, maskable, Apple touch icon, favicons)

## Features

- **5 sports**, each with its own progression path:
  - Football / Basketball / Baseball: High School (2 games) → commit to a College → College (3 games) → Draft → Pro. Baseball specifically lands you in the **Minors** first, with a per-game call-up chance until you reach the Majors.
  - Bowling / Golf: same High School → College path, then **Turn Pro** straight into a tournament tour (no draft), with PBA/PGA-style stats (scoring average, cuts made, titles, tour points, earnings).
- **Unlimited career slots per sport** — create as many players as you want, delete any of them from the Edit tab.
- **Full character creator**: name, jersey number, gender, hometown, height, weight, birthday, and a live-preview generated avatar (skin tone, hairstyle, hair color) — all rendered as code, no external art assets.
- **Position select for Football / Basketball / Baseball** drives which 6 attributes your build develops, and height/weight nudge your starting attributes toward power or speed.
- **MyCareer-style attribute upgrades**: every simulated game/tournament earns skill points; spend them per-attribute (costs rise as you approach 99 overall).
- **Team sports** get a full simulated league: schedule, division standings, conference standings, playoff picture, current record, and **trade requests** (the front office can say no, and there's a short cooldown).
- **Bowling/Golf** get a tour schedule, a simulated field of rival pros, and a tour points leaderboard instead of a W-L record.
- **Stats tab** with season-by-season tables plus career totals, with sport-appropriate derived stats (PPG/RPG/APG, AVG/ERA, bowling average, scoring average, etc).
- Everything is fictional (leagues, teams, colleges, opponents) — there's no use of real league names, team names, or athlete names.

## Running it locally

Just open `index.html` in a browser — no build step required. For the full PWA experience (service worker + "Add to Home Screen"), serve it over `http://localhost` rather than opening the file directly, since service workers don't run on `file://`. The easiest way:

```bash
# from inside the project folder
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Opening in WebStorm

1. **File → Open...** and select this project folder.
2. WebStorm will recognize it as a static HTML/CSS/JS project — no configuration needed.
3. Right-click `index.html` → **Open in Browser** to use WebStorm's built-in dev server (this serves it over `http://`, so the service worker and install prompt work correctly).
4. Edit `app.js` / `style.css` / `index.html` directly — there's no compile/bundle step.

## Deploying to GitHub Pages

1. Create a new GitHub repository and push these files to it (keep them at the repo root, or in a `/docs` folder — either works, see step 3):
   ```bash
   git init
   git add .
   git commit -m "Career Mode"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. On GitHub, go to your repo's **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a branch", pick the `main` branch and the `/ (root)` folder (or `/docs` if you put the files there), then **Save**.
4. After a minute or two, GitHub will give you a URL like `https://<your-username>.github.io/<your-repo>/`. That's your live app.

## Adding it to your phone's home screen

Once it's live on GitHub Pages:

- **iPhone (Safari):** open the link → tap the Share icon → **Add to Home Screen**.
- **Android (Chrome):** open the link → tap the **⋮** menu → **Add to Home Screen** / **Install app**.

It'll launch full-screen with its own icon, no browser chrome, just like a native app.

## How saving works

All career data is stored in your browser's `localStorage`, scoped to the domain you're visiting it from (e.g. your `github.io` URL). That means:

- Progress persists across visits/reloads on the same device and browser.
- It does **not** sync between devices or browsers — it's local to wherever you're using it.
- Clearing your browser's site data for that domain will erase your saved careers.

## Customizing

A few places worth knowing about if you want to tweak things in `app.js`:

- `SPORT_META` / `POSITIONS` — sport metadata, positions, and the 6 attributes each position develops.
- `LEAGUE_SHAPE` / `TOUR_SHAPE` — league size, conferences/divisions, season length, tour field size.
- `CITY_NAMES` / `MASCOTS` / college & name pools — everything is fictional by design (to avoid using real league, team, or athlete names); swap these lists for your own flavor any time.
- `upgradeCost()` — the skill-point cost curve for attribute upgrades.
