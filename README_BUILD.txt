OsRa v100 — R24 PRESERVED UI + FAST THUMBS + ALL-ALBUM NAME LINK + SCAN CARD HIDE

Baseline: OsRa_v33_HQ_FINAL_SAFE_REVIEW_FIXED.zip ONLY.
No code from v67/v70/v77/v78/v79/v80/v81 or later branches was used as the baseline.

LINK ENGINE:
- One unified link engine. No separate duplicate "fast link" engine.
- Linking is LINK-ONLY: existing OsRa photo records are linked to existing phone originals; no import, new photo record, album, thumbnail, or copy is created.
- Visible albums are the target. Hidden albums are ignored. Excluded photos are a hard exclusion. Photos removed from all visible albums are ignored even when stale sourceId/sourceLinks remain.
- An album can point to a source root plus an exact subfolder target. A subfolder inside an existing source is NOT created as a second independent source. Old nested sources are consolidated into their parent source and their relative paths are rewritten.
- Fast direct mode: enumerate the selected target folder once, keep filename/handle entries in memory, then match by normalized full filename; if needed, use filename stem only when unique. No image bytes, file size, hash, or pixel analysis is needed in the normal path.
- For source roots without an exact target folder, saved relative paths are tried first; only unresolved names use a source index/fallback.
- Already verified links are skipped only when the saved verified path belongs to the current target folder. This prevents an old link in another folder from incorrectly suppressing a needed link.
- Link records are saved with sourceId + relative path + verified state in safe batches/checkpoints. A browser interruption can only redo the current unsaved small batch, not the whole operation.
- A failed source/folder is isolated; later sources continue.
- The final report is generated from the same target/link state used by the engine and only the latest report is persisted.

COUNTS / CONSISTENCY:
- Home and diagnostics distinguish visible photo IDs from total stored photo records. Hidden memories and hidden-only content are not counted as visible.
- The same exclusion/visibility rules are used by linking, HQ, calendar, and home counts.
- Duplicate maintenance and nested-source consolidation are deferred until after the first screen is rendered so OsRa can open sooner; they do not reset or clear data.

HQ:
- HQ uses the same eligible-photo rules: visible albums only, excluding excluded photos.
- "All", "selected albums", and "currently selected photos" are exact scopes; checking an album automatically selects the selected-albums scope.
- HQ copies remain separate from OsRa originals. Original phone files are never deleted by HQ creation.
- HQ manifest identifies photos by photoId and records the actual source relative path. Generated JPEGs keep the source-relative base/path with .jpg output.
- manifest.json is required for later HQ source linking; README.txt is documentation. manifest.progress.json is temporary and is removed after a successful build.

BACKUP / SAFETY:
- IndexedDB version remains VER=100; no database reset or object-store clearing was introduced.
- Backup data preserves album linkSourceId/linkFolderPath, photo sourceLinks, exclusions, memories, and thumbnails. Source handles themselves are not JSON-serializable, so another device must grant/link its local folders again.
- Recovery notice can be hidden without deleting the recovery data.

CACHE:
- app.js/index.html/sw.js cache markers are aligned to r24.


FINAL RE-REVIEW NOTES:
- Legacy excluded photo cleanup is deferred until after first paint, reducing launch-time writes without changing visible exclusions.
- HQ path selection prefers verified original links; stale unverified links are only fallback candidates.
- First-screen launch remains data-preserving; no IndexedDB clear/reset was introduced.

- Service Worker shell strategy is cache-first for fast launch, with network refresh in the background when a cached shell exists.

- Duplicate review remains fully opt-in and now has a cancel path; closing its modal while analysis is active also cancels it. No duplicate changes are applied during analysis.
- Visual duplicate comparison yields to the UI periodically so cancellation remains responsive.
- Settings keep the stored source roots as the main sources; manual album subfolders are shown compactly beneath their parent source and are not represented as separate library roots.


REQUESTED FINAL CHANGES:
- Built directly on the R24 CACHE HARD FIXED package; the R24 page structure/CSS are preserved.
- Photo-only scope retained; no active video UI or video scan path was added.
- Album-name matching is metadata-only and safe: every visible album is checked against matching source folders by normalized name; direct folders are preferred, nested folders are searched when needed, and duplicate matches stay unresolved and are reported.
- The unified fast link engine remains the only file-link engine; name matching only supplies album targets before linking.
- The scan continuation card can be hidden without deleting its saved checkpoint. It can be shown again from Settings.
- Thumbnail hydration reads visible/nearby thumbnails in IndexedDB batches and keeps a larger bounded memory cache, improving first display without changing thumbnail quality or the page layout.
- Backup already serializes Settings, so the hide preference is included in normal OsRa backup/safety snapshots.


R24 stable performance rebuild (2026-10-07): based directly on OsRa_v100_R24_FAST_THUMBS_ALL_ALBUM_NAME_LINK. The Add Album and Add Memory flows are preserved unchanged. Thumbnail reads are cache-first and batched; the first 24 visible thumbnail elements hydrate immediately, while the rest remain intersection-loaded. Thumbnail generation for future scans is modestly improved to 360px max while keeping the existing byte budget. IndexedDB schema/data version remains 100; no destructive migration was added.
