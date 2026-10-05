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
