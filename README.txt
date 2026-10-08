OsRa v101 — R25 safe multi-source linking + visual fallback + occasion celebration + romantic ticker

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

OsRa v100 — r24 FINAL + SIMPLE DUPLICATE CANCEL + SOURCE UI

OsRa HQ Source — final safe build

مصدر مستقل عالي الجودة لـ OsRa، منفصل عن Backup البيانات.
الحد الأقصى: 2048px للضلع الأطول، JPEG quality 88 تقريبًا.
الربط في الهاتف الآخر يعتمد على photoId + هوية مجموعة الصور، وليس اسم الملف أو حجمه.
نسخة البيانات هي مصدر الحقيقة للألبومات والترتيب؛ HQ يوفّر ملف الصورة فقط.
الصور المخفية أو المستبعدة لا تُنسخ كملفات HQ.

Stable R24 performance rebuild: preserved Add Album/Add Memory UI and existing data model; faster batch-first thumbnail hydration; no schema bump and no destructive migration.


OsRa v124 / R48: restored Rania birthday UI + persistent home birthday countdown + larger/brighter romantic surprises. Database VER remains 100.
