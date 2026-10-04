OsRa v57 — Smart Recovery + New Photo Review

Base: OsRa v56 STABLE REAL SEARCH STATUS.
The internal DB version remains unchanged.

1. Original recovery
- Fast matching by existing strong keys/name+size.
- Deep/exhaustive recursive scan through all currently accessible linked sources.
- Final strict perceptual (DCT) visual recovery for unresolved photos, useful for renamed/moved/resized/recompressed copies.
- Visual auto-link requires a very high score and a clear margin over the next candidate.
- Ambiguous visual candidates are shown for manual confirmation; confirmation stores the candidate's exact file keys for later verification.
- The operation panel reports real inspected counts, current phase/path, elapsed time, and current rate only; no fake ETA or fake completion percentage.

2. New Photo Review
- Photos newly discovered by a normal scan enter a review queue.
- Nearby capture-time photos are grouped.
- Each group receives an advisory album suggestion based on date range/nearby album photos/source/name and a thumbnail-based visual signal.
- The suggestion never moves anything automatically.
- You can select any subset of the new photos, then choose any visible OsRa album as the destination.
- You may create a new album from the same screen.
- After assigning photos, the same review screen stays open and shows only the remaining photos.
- Selected photos may also be marked reviewed without moving them.

3. Search navigation
- Global search now includes indexed photos.
- Opening a photo or memory from search keeps the same query/result set available when returning.

4. Stability / cache
- Service Worker cache is bumped to v57.
- App script is cache-busted with v57.
- Existing manifest/icons/about/sound/backup behavior was not replaced.

Privacy and platform limitation
Original files remain in the user-controlled folders and are never uploaded or copied into OsRa. OsRa can only scan folders that the user has explicitly granted access to; it cannot scan arbitrary Android storage outside those permissions.
