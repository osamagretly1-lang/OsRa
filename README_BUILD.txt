OsRa v100 — r15 DIRECT TARGET LINK + LIVE STATUS

Baseline: OsRa_v33_HQ_FINAL_SAFE_REVIEW_FIXED.zip ONLY.
No code from v67/v70/v77/v78/v79/v80/v81 or later branches was used as the baseline.

WHAT CHANGED IN r15:
- The original-photo linker remains LINK-ONLY: no new photo records, albums, thumbnails, or copied originals.
- Each album may specify its own original source folder; that mapping is used first.
- Each currently saved source is processed sequentially; results are saved before moving to the next source.
- Already VERIFIED source links are skipped immediately.
- The fast path now tries the already-known target path / filename directly first. When the album folder is unchanged, this can finish the link without enumerating the source at all.
- Only photos that fail the direct path/name attempt enter the fallback source index; fallback matching remains conservative and does not guess ambiguous files.
- Excluded photos are skipped.
- Database writes are batched; live link counters, current filename, remaining count, and elapsed time update without a page refresh.
- Link progress is persisted periodically, while verified work is skipped on later runs.
- The final report lists photos that still have no available original link after all sources finish.
- Wake Lock is requested while supported, but Android/Chrome may still suspend a fully backgrounded web page; this is a platform limitation.
- App shell references and service-worker cache marker are aligned to r15 to reduce stale-build loading risk.
- HQ creation remains separate from linking and does not start automatically.

WHY THIS IS FASTER:
The common case no longer starts by recursively enumerating an entire source folder. OsRa first tries the saved path / filename for each requested photo. A full recursive enumeration is used only for unresolved photos.

SAFETY:
- IndexedDB version remains VER=100; no database reset or deletion is introduced.
- Original phone files remain outside OsRa and are never deleted by linking.
