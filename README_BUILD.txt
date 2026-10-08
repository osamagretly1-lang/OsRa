OsRa v120 / R44 — 3D Couple + Classic Characters

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
  three.min.js (not required by this R44 renderer; kept out intentionally)

IMPORTANT
---------
- The assets folder is INSIDE this same root folder. Upload the complete ZIP contents together.
- IndexedDB DB version remains VER=100. Do not raise it.
- Existing OsRa data is not migrated or reset by this release.
- The R44 3D system is self-contained and offline: the couple and classic miniatures are drawn from 3D coordinates/primitives on a local canvas; no CDN/network dependency.
- Couple references used: user-provided Osama/Rania photos. No reference photos are included in the app package.
- Boot: couple walk in -> 3/2/1 -> approach/hand hold -> high-five -> randomized 20–29 second celebration dance.
- Page turns: Osama appears only during forward turns; Rania only during backward turns.
- Random surprise classics now include: one white long-haired German Shepherd, fish/balloon, Cinderella/wand, gift dog, Tom/Jerry-style chase, Robinson/horse, Masha/Bear-style scene, SpongeBob-style scene and a Shaun-the-Sheep-style scene.
- The five older classic scene functions remain as code fallbacks if the 3D layer is unavailable.
- No additional automatic photo scan, copying, cloud upload, or thumbnail regeneration was introduced.
