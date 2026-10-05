OsRa v100 — TRUE STABLE FIXED FINAL

Baseline: OsRa_v33_HQ_FINAL_SAFE_REVIEW_FIXED.zip ONLY.
No code was taken from v67/v70/v77/v78/v79/v80/v81 or any later branch.

Fixes in this v100 rebuild:
- IndexedDB database version is 100 so an existing OsRaDB at v5 or lower can be upgraded without losing data.
- No IndexedDB object store is cleared or deleted during startup/upgrade.
- Legacy thumbnail blobs found inside photos are migrated idempotently into the thumbs store during schema upgrade.
- Service Worker cache is unique to v100 and uses network-first/no-store for the shell.
- App script has a unique query string to prevent stale JavaScript.
- PWA manifest identity/start_url remains unchanged.

Important: the ZIP contains program files, not the live private IndexedDB data or the phone's original photos.


Revision r3 — requested behavior:
- Source-only relink is immediate and does not run a scan, create photos/albums, or rebuild thumbnails.
- Reusing an existing source or the same normalized source name reuses that source record rather than creating another.
- Duplicate auto albums with the same normalized name are consolidated into one visible album; redundant automatic records are hidden, not deleted.
- Exact photo records with the same strong content key are consolidated while preserving album memberships and source links.
- Global image search returns the album once with its current photo count; message search returns only message hits and opens/highlights the matching message.

- Interrupted scans are not resumed automatically on startup/visibility; resuming is manual only.

- Fast source relink batches legacy photo-record writes instead of opening one IndexedDB transaction per photo.
- HQ creation uses one image decode per source image and batches progress writes, reducing overhead without changing the selection or output rules.
- Fast HQ relink checks saved paths through directory/file handles without reading full image bytes.
