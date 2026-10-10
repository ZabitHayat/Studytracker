# BDS Block III Study Tracker — Learnova-inspired design

Responsive Block III-only study dashboard inspired by the uploaded reference: purple LMS styling, sidebar navigation, summary cards, daily schedule, progress ring, subject progress, countdown, backlog center and focus timer.

- Exactly 23 study days (original Block III Days 46–68 mapped to tracker Days 1–23)
- Subject/topic progress, daily task completion, timer, backlog and weekend plan
- Live countdown after setting the exam date/time
- Browser notification permission/reminder logic
- Custom topics, dark mode, import/export, later-revision list

## GitHub Pages
Upload `index.html`, `app.js`, `style.css`, and `plan.json` to the repository root. Then go to **Settings → Pages → Deploy from a branch → main → /(root) → Save**.

Progress is saved in this browser's local storage. Export progress for backup. Browser reminders need permission; reliable push notifications with the website fully closed require additional PWA/push infrastructure.
