OsRa R53 — Current Character Sprites Build

This is the full OsRa static-web-app package, based on R52. It is a continuation build, not a fresh replacement of the database or a new app.

WHAT WAS ADDED
- Transparent base character images for the boot scene, main couple scene and page-turn scene.
- Pose changes for slow dance, joyful bounce, and left/right shuffle.
- A rotating full-body flip effect in the acrobatic phase as an interim 2.5D effect.
- 8 extracted Osama poses and 7 matching-design Rania poses in assets/pose-library/.
- Service-worker cache version bumped to R53 so the new art does not remain hidden behind the old R52 cache.

WHAT IS NOT FINISHED YET
The current source sheets do not include a real pose where Osama's arms visibly support Rania during a lift. They also do not contain complete paired start/flip/landing artwork. The program keeps these dedicated slots unset rather than pretending the available standing/waving poses are a real connected carry. When the additional pictures arrive, replace/add the required files for liftStart, liftRaised, liftSpin, liftLand, danceHugOpen/Hold/Release, and danceAcroStart/Flip/Land, then register those assets in OSRA_POSE_ASSETS in app.js.

INSTALL / UPDATE
1. Keep your existing copy/backup of the previous OsRa folder.
2. Extract this ZIP while preserving the folder paths.
3. Upload/replace the website files together: index.html, app.js, style.css, sw.js, manifest.json, icons, and the complete assets/ folder.
4. Do not upload only app.js; the new images are required.
5. Open the live site online once so the R53 service worker can download/cache its assets. Then test the boot celebration, page turn, and dance modes.
6. If an old version remains on the phone, close/reopen the site and allow the new service worker to activate. R53 uses a new cache name.

DATA SAFETY
- IndexedDB version is unchanged at VER=100.
- The change is limited to presentation, motion assets, and cache versioning.
- No existing memories, albums, photo index, backups, or source-linking data are intentionally modified by this patch.

NEXT STEP
Send the remaining pose sheets when ready. Keep each character's look consistent and include clear separate frames for carrying/lifting, spinning, lowering, jumping, flip start, upside-down/mid-flip, and landing. They can be integrated into this R53 branch without rebuilding the app from scratch.
