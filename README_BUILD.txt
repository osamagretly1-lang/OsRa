OsRa v100 — r18 ULTRA FAST DIRECT ALBUM LINK + SAFE TARGETS

Baseline: OsRa_v33_HQ_FINAL_SAFE_REVIEW_FIXED.zip ONLY.
No code from v67/v70/v77/v78/v79/v80/v81 or later branches was used as the baseline.

CORE LINKING RULES:
- Linking is LINK-ONLY: no new photo records, albums, thumbnails, or copied originals.
- Each album may specify its own exact original source folder.
- In direct album-folder mode, OsRa checks the requested filename directly in the selected folder; no recursive source enumeration is performed for the common case.
- Excluded photos are skipped completely.
- Photos removed from all visible albums are not link targets, even if an old sourceId/source link remains on the photo record.
- Hidden-only albums are not link targets.
- Already VERIFIED links are skipped.
- Fallback indexing is used only for unresolved photos on non-direct sources.
- Results are saved in batches and progress is shown without refreshing the page.
- Original phone files are never deleted by linking.
- HQ creation remains separate from linking.

SAFETY:
- IndexedDB version remains VER=100; no reset or object-store deletion is introduced.
- Service-worker/app cache markers are aligned to r18.
