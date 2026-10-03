OsRa v39 Smart Backup

The backup is still a full OsRa backup, but now includes a dedicated linkIndex for cross-device original linking.
The linkIndex records a device-independent contentKey, fingerprint, size, stable OsRa photo id, memory references, and historical source links.
The contentKey uses SHA-256 over file size + first 64 KiB + last 64 KiB and does not include lastModified, so copied files on another phone can still match.
The original media files are never embedded in the backup. Small thumbnails may be included for local restoration.

Recommended phone-to-phone workflow:
1. Restore/merge this backup on the target phone.
2. In Settings, link the target photo folder(s).
3. Run the original-link search. Existing photo records are matched first; unmatched files are not silently added in match-only mode.

Database version remains VER=2.
