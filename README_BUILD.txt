OsRa v100 — r6 TRUE FAST ALL SOURCES LINK + FINAL REPORT

Baseline: OsRa_v33_HQ_FINAL_SAFE_REVIEW_FIXED.zip ONLY.
No code from v67/v70/v77/v78/v79/v80/v81 or later branches.

FAST SOURCE LINK:
- Uses the currently saved source folders.
- Processes every linked source sequentially.
- Finishes and saves each source before moving to the next.
- Verifies saved real file paths without reading image bytes.
- Does not scan directory trees, hash images, generate thumbnails, create photos, or create albums.
- Existing photo/album data is not wiped or rebuilt.

Repeated scans:
- Normal scan remains the explicit operation for adding genuinely new photos.
- Re-running the fast linker adds only missing source links; it does not duplicate photo records or album membership.
