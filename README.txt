OsRa v121 — R45 3D Couple Motion + Classic Miniatures

Base: R43 stable core. IndexedDB VER remains 100.

This package is the complete upload root. Keep every file and the assets/ folder together when uploading to GitHub Pages / hosting.

R45 fixes / refinements:
- Osama + Rania now use genuine local WebGL low-poly 3D geometry for the couple sequence; no PNG character overlays and no CDN dependency.
- Faces, hair, suit/tie, mauve off-shoulder dress and pearl trim were refined for a brighter, more cheerful miniature-cartoon look.
- Fixed the previous extra/phantom-hand problem: high-five and hand-holding poses use only the intended two arms per character; no floating third hand and no stray hand on Rania's waist.
- Reworked the acrobatic slot into the requested lift-and-spin dance: Osama remains grounded, lifts Rania, and rotates with a small controlled orbit so both figures remain readable.
- The five celebration dance slots remain: romantic turn, lift-and-spin, joyful hand-holding bounce, warm hug spin, high-five shuffle.
- Page-turn couple motion is corrected so Osama pushes from the lower-right on forward turns and Rania pushes from the lower-left on backward turns, appearing only during the turn.
- Added a lightweight 2D couple fallback for browsers/WebViews without WebGL, using the same corrected limb logic.
- Existing random classic message scenes remain: one long-haired white German Shepherd, fish/balloon, Cinderella/wand, gift dog, Tom/Jerry-style chase, Robinson + horse, Masha/Bear-style scene, SpongeBob-style scene, and Shaun-the-Sheep-style scene.

Safety/performance:
- No IndexedDB schema bump; VER=100 is untouched.
- No photo copying, global thumbnail regeneration, cloud upload, or automatic visual reindex was introduced.
- All 3D code is local under assets/osra3d.js.
