OsRa v42
Strong audited backup + cross-device original linking.

The backup stores OsRa data, photo records, original-location metadata, thumbnails and a separate linking index. Original photo files themselves are never embedded in the backup.

When moving to another phone, OsRa can scan linked folders and match existing photo records without depending on the old folder path. In match-only mode it links existing records and does not auto-add unmatched photos.

The new strong match key samples eight distributed 16 KiB regions plus file size and hashes them with SHA-256. The previous size+head+tail content key is retained for compatibility with older backups.

Safety snapshots stay inside the app and are silent. Scan checkpoints no longer rebuild the full safety snapshot on every batch, reducing scan overhead.

No IndexedDB schema change.
