OsRa v100 — R24 multi-source album linking + interactive review + birthday greeting

Base: OsRa_v100_R24_STABLE_FAST_THUMBS_PRESERVED_UI / R24 family.
Preserved: album UI, memory UI, add album, add memory, IndexedDB VER 100, thumbnail cache strategy.

Changes:
- An album may keep multiple original/source folders through `linkFolders` while legacy primary fields remain compatible.
- Album name matching supports exact auto-linking and interactive review for multiple exact matches or similar names.
- Review lets the user select one or more folders and assign each selected folder to the current or a different visible album.
- Original lookup and fast linking use all album source folders.
- Birthday Rania greeting appears only on the configured annual birthday date; clicking “اليوم عيد ميلاد رانيا” opens the requested greeting.
- No visual/pixel search was added to the normal linking flow.
