# ChronoShift - 2-Week Timesheet & Break Tracker

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

**ChronoShift** is a mobile-ready, bi-weekly timesheet and break tracking application designed for precision time management, automated overtime calculations, embedded SQLite data storage, and cross-platform Android / PWA support.

---

## Key Features

- 📅 **14-Day (2-Week) Pay Period Management**: Seamlessly navigate between pay periods, configure custom pay period start dates, and track hours week-by-week.
- ⚡ **Automated Overtime Calculations**: Calculates overtime (1.5x rate of pay) for hours exceeding weekly thresholds (e.g. 40 hours) or optional daily overtime limits.
- 🗄️ **Embedded SQLite Database**: Powered by WebAssembly SQLite (`sql.js`) with automated IndexedDB persistence, a built-in SQLite Inspector, and full `.sqlite` database file export/import capabilities.
- ⏱️ **Punch Clock &amp; Break Timers**: Track shifts with instant clock-in/clock-out actions. Use dedicated smoke, rest, and lunch break countdown timers complete with audio chime alerts.
- 📳 **Cellphone Break Expiration Alerts**: When break countdown timers finish, the app triggers audio chimes, device vibration, and browser/mobile push notifications so you never miss the end of a break.
- 📝 **Time Card Correction Tab ("Fix Timecard")**: Quickly select any historical date to review or correct forgotten or inaccurate clock-ins, clock-outs, lunch deductions, and shift notes.
- 📱 **Android &amp; PWA Ready (Capacitor)**: Bundled with custom clock app icons across all Android screen densities and signed release APKs available in GitHub Releases.
- 📤 **SMS &amp; Email Exports**: Formatted clipboard exports ready to share via text message or email.
- 🌓 **Light &amp; Dark Mode**: Fully responsive modern UI with automatic system preference detection and manual toggle.

---

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set your `GEMINI_API_KEY` in `.env.local` (optional, for AI features).
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## Building Android APK & Releases

To build a signed release APK using Capacitor:

```bash
# 1. Build web production bundle
npm run build

# 2. Sync web assets into Android project
npx cap sync android

# 3. Build signed release APK
cd android && ./gradlew assembleRelease
```

Signed release APKs are automatically attached to GitHub Releases (e.g., `v0.0.2`).
