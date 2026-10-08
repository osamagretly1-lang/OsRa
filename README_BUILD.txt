OsRa v121 / R45 — 3D Couple Motion Refined

ROOT ZIP STRUCTURE
------------------
index.html
app.js
style.css
sw.js
manifest.json
icon.svg
icon-192.png
icon-512.png
assets/
  osra3d.js

UPLOAD
------
- assets/ is INSIDE this same root folder. Upload all root files and the assets/ folder together.
- Do not upload only assets/ by itself.

DATA SAFETY
-----------
- IndexedDB version remains VER=100.
- Existing OsRa data is not migrated or reset by this release.
- No new photo scan, photo copy, or thumbnail regeneration routine was introduced.

3D / MOTION
-----------
- Osama + Rania are rendered as local WebGL low-poly 3D geometry.
- Boot sequence: walk in -> 3/2/1 -> hold -> high-five -> randomized 20–30s celebration.
- Celebration dance slot 2 is the requested lift-and-spin dance.
- High-five and partner-dance poses have a strict two-arm layout to avoid phantom/third hands.
- Forward page turns show Osama pushing from the lower-right corner.
- Backward page turns show Rania pushing from the lower-left corner.
- A corrected 2D fallback is used only when WebGL is unavailable.

CLASSICS
--------
Random classics include the requested white long-haired German Shepherd, fish/balloon, Cinderella/wand, gift dog, Tom/Jerry-style chase, Robinson + horse, Masha/Bear-style scene, SpongeBob-style scene, and Shaun-the-Sheep-style scene.
