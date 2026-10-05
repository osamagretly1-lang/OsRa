OsRa v100 — FINAL CACHE HARD RESET

This build keeps the existing OsRa database format (IndexedDB DB="OsRaDB", version 2) and the current v33-based functionality, while making the web-app update path independent from previous cache versions.

Build ID: osra100-20261005
App asset: app.js?v=osra100-20261005
Service worker cache: OsRa-v100-osra100-20261005

Key update fixes:
- New service-worker script URL with a unique v100 query.
- New unique cache name.
- Legacy OsRa-* caches are removed on activation.
- Shell assets (index/app/style/manifest) use network-first with cache:"no-store".
- If a new SW becomes controller, the current tab reloads once.
- About page visibly shows OsRa v100 / BUILD 100.
- Book page-turn sound is triggered before the async save so browser user-activation is preserved.

DATA SAFETY:
- No IndexedDB/database reset.
- No deletion of photos or original source files.
- Existing DB version remains 2.

DEPLOYMENT:
Replace the published root files on the GitHub Pages branch with the contents of this folder. Then open the normal OsRa URL. The first successful load should show BUILD 100 in «عن OsRa».
