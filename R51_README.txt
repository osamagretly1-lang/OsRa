OsRa R51 — PREPARED CHOREOGRAPHY + CUSTOM SURPRISES + DAILY PHOTO + CAMERA CLEANUP

Base: OsRa_v122_R50_LINK_SCAN_PHOTO_FESTIVE.zip
R50 preserved separately as OsRa_v122_R50_BACKUP_BEFORE_R51.zip.

Motion is now split into two independent experiences:
1) Opening celebration: Osama and Rania enter from opposite sides, meet, move forward toward the viewer, the word “احتفال 🎉” appears, they pause/lean as if reading it, step back, high-five, and dance. Existing countdown/festive layers remain additive.
2) Page turn: both characters enter from opposite edges, lean their bodies inward, and use coordinated hand-push gestures in sync with the page-turn interval. This is not reused as the opening animation.

The six-mode dance picker retains all earlier dance motions and adds a lightweight 2.5D lift/spin illusion. This is an animation approximation, not a full 3D rig.

Future transparent art assets (NOT INCLUDED YET):
- assets/osama-3d.png and assets/rania-3d.png — base full-body character art
- assets/osama-page-push.png and assets/rania-page-push.png — optional page push pose
- assets/osama-lift.png and assets/rania-lift.png — optional lift/spin pose

Until those personalized assets are generated and added, the scenes use the safe existing emoji fallback. The new animation logic can be prepared without them, but a true resemblance to the user and Rania requires the final art assets.

Other R51 behavior changes:
- Photo of the day is stable during a date and avoids repeating the last selected photo when at least two eligible photos are available.
- Custom surprise messages save their own presentation and motion choice; saved messages can be expanded in settings and edited or deleted.
- Restoring excluded photos uses two explicit confirmation steps.
- Camera album reconciliation removes duplicate album memberships only; it does not delete photo records or original files.
- Celebration/loading ribbon follows the saved celebration toggle.
- IndexedDB version remains 100. Service worker and asset cache versions are bumped to R51.

This is a candidate test build, not a claim of completed live Android/device acceptance. Test real folder permission, large photo-library performance, exact camira scan, source links, and visual animation on the phone before replacing production.
