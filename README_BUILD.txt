OsRa v110 — 2026-10-08 — R34: boot hearts + custom surprise messages + 1m/3m timing

Base preserved: OsRa v100 R24 family; IndexedDB version remains 100 to protect existing data.

R25 changes:
- Safe album/source linking validates a manually selected folder before saving it; zero matches are rejected.
- One OsRa album can link to multiple real source folders; each new source searches only the photos still missing originals.
- Manual linking continues until the user explicitly says there are no more sources. Visual matching appears only as the final optional fallback.
- Visual matching supports one folder, multiple folders, or a parent folder searched recursively; results are suggestions only and require user approval.
- Link reports include aggregate results plus per-source scan/match/verification counts where available.
- HQ build warns explicitly about missing originals and never silently hides skipped photos; existing multi-source HQ collection logic is preserved.
- Custom occasion countdowns can celebrate automatically on their date with lightweight fireworks/hearts/flowers/kisses. The small button is `🎉 احتفل 🥳` and becomes `🎉 احتفل nicht 😔` only for the current day when muted. Birthday greeting/content remains separate and unchanged.
- Romantic ticker messages appear infrequently in the top bar, each shown twice with randomized playful right-to-left animation.
- Added the missing Save Event handler required by the existing “محطات في قصتنا” UI.


R27 additions:
- Romantic messages now appear every day while OsRa is open, with a first message within seconds and ongoing randomized micro-effects roughly every 8–14 seconds in normal mode.
- On an active occasion day (and while `🎉 احتفل 🥳` is enabled), the romantic micro-effects accelerate to roughly every 4–7 seconds. Muting the occasion for today also stops the occasion-day acceleration/celebration layer without changing the countdown.
- Added the requested long surprise message: a slower top-bar appearance followed by a playful signboard that tilts, drops toward a small white puppy target, bounces, and fades.
- Added small randomized balloons, roses, hearts, flowers and other romantic particles as lightweight one-at-a-time effects.
- Added a large night-only message balloon: eligible only from 23:00 through 00:59, at most once per day per device, with a delayed surprise, pop/reveal, and fade-out. It can choose `هات بوسه🙈🙊` or another prior romantic message.
- Birthday Rania content remains untouched and separate.

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


R28 change: restored the original home-page three-card layout. The third card is now Rania birthday countdown; the generic "القادم" card was removed from the home page. New occasion countdowns remain available in "عداداتنا" and all R27 romantic/occasion/source-link features are preserved. IndexedDB schema remains VER=100.


R29 update: full-screen romantic surprise engine with 28 presentation modes, larger readable messages, varied flowers/hearts/kisses/balloons, occasion-day integration, and anti-repeat style selection. Birthday/home layout/data behavior from R28 preserved.


R35 patch: restored message-first surprise cadence; added random-fast movement mode; boot celebration now uses birthday-style moving large+mini ribbons plus bottom burst/top rain for ~3 seconds; cache build bumped.


R41: classic startup preserved; added a large 3→2→1→احتفاااااال countdown after the loading screen, then a 7-second post-open celebration; random surprises resume only after the full 10-second sequence.

R47 Complete Surprise System: merged the original cartoon surprise deck, expanded romantic/app-flirt message pool, preserved 28 scene styles + 10 motion styles, retained exact timing/speed settings, and kept the post-open countdown/celebration flow.


R47 note: stable core preserved; surprise messages keep the same stored pool and countdown settings, while presentation now rotates conservatively among free-position romantic scenes, the existing classic cartoon deck, side bubbles, and the plain ticker. Long message is rare. No scan/link/HQ engine changes.
