OsRa v33 — HQ Final Safe

- Baseline: v33 stable album/book behavior + HQ Source.
- Recovery notice appears in Settings only; no hide/suppression control.
- Home keeps only a live scan status when an actual scan is running. Memories has no scan/recovery cards.
- HQ creation is resumable and selection-based (all visible albums / selected albums / current selected photos).
- Progress is stored separately from the large selection list to avoid rewriting thousands of photo IDs for every image.
- Images without an accessible original are skipped, reported at the end, and can be retried later.
- Optional fast linking checks saved paths only; it probes up to 10 samples before asking for confirmation and never creates albums or photo records.
- HQ manifest v2 contains a lightweight dataset identity derived from OsRa photo IDs. It is used only to prevent mixing an HQ source with a different OsRa backup; it does not inspect or fingerprint image contents.
- On the second phone, albums/order come from the normal data backup; HQ only supplies the file for the same photoId.
- Cache/app.js version was bumped to prevent stale JS.
- No code path clears IndexedDB/site data, and the build ZIP contains code only, not live OsRa data.
