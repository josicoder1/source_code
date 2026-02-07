DriveLite — Frontend Demo

This is a standalone frontend-only demo of a cloud file storage app. It uses ES modules and localStorage. No backend required.

How to run:
- Open `drive-frontend-app/index.html` in a modern browser (Chrome/Edge/Firefox).
- Or run a static server from the folder, e.g. `npx serve drive-frontend-app` or `python -m http.server` and visit `http://localhost:8000`.

Features implemented:
- Login / Register (mock auth stored in localStorage)
- Dashboard with storage and recent activity
- File Manager: upload (drag/drop), create folder, list/grid, preview, trash
- Shared, Trash, Profile & Settings (theme + language UI)
- LocalStorage persistence for users, files, folders, and settings
- Modal dialogs, toast notifications, responsive layout, dark mode

Files added: index.html, css/styles.css, js/* modules, assets/*.
