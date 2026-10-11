# Chord Flags

A calm, private web app for running the **Eguchi Chord Identification Method (CIM)** at home. A parent runs short daily sessions. The child only ever sees colored flags and hears a real (sampled) piano.

- Next.js (App Router) static export, TypeScript, Tailwind CSS
- Tone.js playing bundled Salamander Grand Piano samples (no synthesized sound)
- All data in IndexedDB (Dexie). No accounts, no backend, no analytics, no third-party requests at runtime
- Installable PWA that works offline on iPad and phone, portrait and landscape

> Built with AI assistance. Review the method summary, the chord voicings and the code before relying on them.

## Quick start

Requires Node 22.18+ (Node 24 recommended).

```bash
npm install
npm run dev          # http://localhost:3000 (service worker disabled in dev)
npm test             # Vitest unit tests
npm run lint
npm run typecheck
npm run build        # static export to out/ + offline service worker (out/sw.js)
npm start            # serve out/ at http://localhost:3000 (tiny built-in server)
npm run voicings     # print every chord's notes, MIDI numbers and A440 frequencies
```

### Hosting

`out/` is plain static files, so you can host it anywhere (Netlify, GitHub Pages, S3, a home server).

- **HTTPS is required** for the service worker (offline mode) and screen wake lock. `localhost` counts as secure while testing.
- **Hosting under a sub-path** (e.g. `https://you.github.io/cim/`): build with `NEXT_PUBLIC_BASE_PATH=/cim npm run build`.
- **Install on iPad or iPhone:** open the site in Safari, tap Share, then *Add to Home Screen*. The installed app runs full-screen. (iPhone Safari has no fullscreen API in the browser itself.) Open it once while online so the piano samples are cached for offline use.

## How the method rules are enforced

| Rule | Where |
|---|---|
| Fixed order, one color per chord | `lib/chords.ts` (single source of truth) |
| Always the same pitch, voicing and instrument | `lib/audio.ts`: one sampler, fixed velocity and envelope; no transposition API exists |
| Colors only on the child's screen | `app/session`, `components/child/*`: icons and flags only (no text) |
| ~20 chords per session, 4–5 sessions/day | Settings: session length (10–30, default 20), daily goal (default 5) |
| ≥ 14 days **and** 100% before adding a chord; parent confirms | `lib/advancement.ts` (`MIN_DAYS_ON_SET`, last *N* completed sessions all perfect; *N* defaults to 3). `lib/repo.ts#confirmStep` re-validates with `lib/curriculum.ts#applyStep` so nothing can be skipped |
| Red alone first, then yellow, then random mixing | `lib/curriculum.ts#initialEvents` and `nextStep`; `lib/randomizer.ts` |
| No single notes before all nine white-key chords | `isSingleNoteModeUnlocked` only becomes true via the parent-confirmed note-names step, which `nextStep` offers only after all nine |
| Randomizer: uniform, max 3 in a row, every chord at least once | `lib/randomizer.ts#generateSequence` |

Notes on interpretation:

- **"Days on the current set"** counts calendar days since the parent confirmed the latest step (local time).
- **100%** means the most recent *N* completed sessions on the current set were all perfect. Partial sessions don't count, and neither do sessions from an earlier set. Real-piano sessions count the same as app sessions. In the note-names stage, single-note sessions decide mastery.
- A session is never shorter than the number of chords in play, so every chord can appear.
- **Single-note mode** uses the seven white keys from middle C (C4–B4).
- After the nine white-key chords, the order of **note names** and **black-key chords** is a per-child setting. It locks once either stage has started.

## Verifying chord voicings

All voicings live in [`lib/chords.ts`](lib/chords.ts), which starts with the reminder to verify them against the reference implementation.

1. Run `npm run voicings` to print each chord's notes (low to high), MIDI numbers and frequencies.
2. Compare them with the reference app's data file: <https://github.com/pganssle/cim/blob/HEAD/_data/chords.yml> (the app is at <https://pganssle.github.io/cim/>). As of October 2026 all 14 match.
3. `lib/chords.test.ts` pins the agreed voicings, so an accidental edit fails `npm test`. If you change a voicing on purpose, update the table in that test in the same commit.
4. To check by ear, play a chord in the app next to a tuner app or a piano tuned to A440.

**How the samples become exact pitches.** Salamander records every third semitone. The app bundles A3, C4, D♯4, F♯4, A4, C5, D♯5 and F♯5, and Tone.Sampler re-pitches the nearest sample by at most one semitone, using an exact 2^(n/12) playback rate. Every pitch is therefore precise (A4 = 440 Hz), and each chord always uses the same samples, so it sounds identical every time. If you add chords outside A3–F♯5, bundle more samples and extend `SAMPLE_FILES` in `lib/audio.ts`.

## Project structure

```
app/
  page.tsx                 Parent launcher: pick child, today's goal, streak, start a mode
  session/page.tsx         Child chord session: flags only, no text
  notes/page.tsx           Single-note solfège mode (locked until the note-names stage)
  piano/page.tsx           Parent-led real-piano mode: keyboard diagram + color buttons
  parent/page.tsx          Dashboard (behind a 3-second press-and-hold gate)
  parent/history/page.tsx  Habit calendar, streaks, full session log
  parent/settings/page.tsx Settings, backup export/import, reset/delete
  how-it-works/page.tsx    Plain-language guide for parents
  manifest.ts, icon.png, apple-icon.png, globals.css, layout.tsx
components/
  Flag.tsx                 SVG pennant (wave animation, optional colorblind pattern)
  child/                   FlagGrid (≥120px cells), ProgressDots (stars), top bar, start/done screens
  charts/                  AccuracyChart, ConfusionMatrix, HabitCalendar
  parent/ProfileBits.tsx   Profile switcher, add-child form, goal dots
  HoldButton.tsx, ParentGate.tsx, ParentShell.tsx, PianoKeyboard.tsx, ConfirmDialog.tsx, Icons.tsx
lib/
  chords.ts                All chord data (voicings, colors, patterns)
  solfege.ts               Fixed-do syllables, note parsing, single-note set
  randomizer.ts            Session order generator                     (tested)
  curriculum.ts            Stages, next step, stage-order setting      (tested)
  advancement.ts           14-day + N-perfect-sessions rule            (tested)
  stats.ts                 Scores, streaks, daily history, confusion   (tested)
  db.ts, repo.ts, backup.ts, hooks.ts   Dexie schema, writes, JSON backup, live queries
  audio.ts, wakeLock.ts, fullscreen.ts, useTrialRunner.ts
public/samples/salamander/ Bundled piano samples + ATTRIBUTION.txt
scripts/                   generate-sw.mjs (+ sw-template.js), generate-icons.mjs, serve.mjs, print-voicings.ts
```

## Data model (IndexedDB, database `chord-flags`)

```ts
profiles: {
  id, name, createdAt,
  settings: { sessionLength, dailyGoal, perfectSessionsRequired, flagPatterns, stageOrder, showStars },
  events: ({ type: "add-chord", chordId, at } | { type: "unlock-note-names", at })[]  // append-only
}
sessions: {
  id, profileId, mode: "chords" | "piano" | "notes",
  startedAt, endedAt, dayKey /* local YYYY-MM-DD */, targetCount, itemsInPlay, completed,
  trials: { target, response, correct, replays, responseMs, at }[]
}
meta: { key: "activeProfileId", value }
```

Progress is an append-only event log. The current stage, the chords in play and the date the current set started are all derived from it, so the history of when each chord was added is never lost. Sessions are saved after **every** answer, so a session that ends early (or a closed tab) is kept as a partial.

**Backup:** Settings → Export writes a JSON file of every profile and session. Import merges by id. Clearing the browser's site data deletes everything, so export now and then.

## Accessibility

- Parent screens are keyboard-operable. The parent gate and "end session" respond to holding Space/Enter. Charts support arrow-key reading and have table views. Dialogs use native `<dialog>`.
- `prefers-reduced-motion` turns off waving, pulsing and sparkles. A static halo and star still mark a correct answer.
- Optional colorblind-friendly flag patterns (off by default).
- Chart colors were checked for color-vision deficiency in light and dark modes. The child's screen keeps one calm light background, so the black flag is always visible.

## Platform notes

- **iOS audio:** audio starts on the first tap (the big play button). On iOS 17+ the app asks for the "playback" audio session, so the ring/silent switch doesn't mute the piano. On older iOS, turn the silent switch off.
- **Wake lock:** used during sessions where supported (iOS 16.4+, Chrome, Edge). Where it isn't, set auto-lock to a few minutes.
- With all 14 flags on a phone held **landscape**, the flags can't all fit at 120px, so the grid scrolls. Portrait fits all 14.

## Credits and licenses

- **Piano samples:** Salamander Grand Piano V3 by Alexander Holm, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). See `public/samples/salamander/ATTRIBUTION.txt`. The credit also appears on the in-app "How it works" page.
- **Reference implementation** for voicings and colors: <https://pganssle.github.io/cim/> by Paul Ganssle.
- Tone.js (MIT), Dexie (Apache-2.0), Next.js/React/Tailwind (MIT). See `THIRD_PARTY_NOTICES.md`.

## About the evidence

CIM rests mainly on one small Japanese study (Sakakibara, 2014, *Psychology of Music*, 24 children aged 2–6). It hasn't been independently replicated, so treat the method as promising but unproven. The in-app guide says the same and suggests pairing CIM with relative-pitch play, such as singing songs in different keys.
