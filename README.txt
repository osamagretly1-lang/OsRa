OsRa v19 — Complete safe build

مبنية فوق OsRa REPAIR v6 ثم تمت مراجعة وإصلاح v7 قبل إعادة البناء.

أهم ما تم تثبيته وإصلاحه:
- التقويم يعمل كقسم فعلي ويعرض الذكريات السنوية التي تغطي اليوم، والمحطات والتقاط الصور بواسطة EXIF عند توفرها.
- الذكرى: تاريخ بداية ونهاية، والنهاية تبدأ تلقائيًا مثل البداية. النطاق شامل، ويظهر سنويًا في كل يوم بين البداية والنهاية، بما في ذلك عبور ديسمبر/يناير.
- «في مثل هذا اليوم»: جميع الذكريات المطابقة، مع صور مصغرة متعددة وزر فتح الذكرى والصور، ولا تظهر رسالة عند عدم وجود تطابق.
- EXIF DateTimeOriginal يُقرأ محليًا من JPEG مع فصل capturedAt عن lastModified؛ عند غياب EXIF يبقى capturedAt فارغًا.
- الفحص يمنع التكرار ويحافظ على سجل الصورة عند النقل/إعادة التسمية باستخدام بصمة محتوى محلية عندما تتوفر، مع عدم حذف الملفات المفقودة تلقائيًا.
- نقل/إزالة/استبعاد/إعادة ترتيب الصور، ونقل عدة صور، وإنشاء ألبوم جديد ونقل الصور إليه.
- النسخة الاحتياطية تشمل بيانات الذكريات والنطاقات والاستبعاد وcapturedAt والبصمة ومعلومات الفهرسة، والاسترجاع يعيد بيانات الفهرس دون حذف سجلات الصور الحالية.
- زر صوت قلب الورق محفوظ، وحالته تحفظ محليًا.
- عن OsRa محفوظة مع الإهداء الكامل.
- Service Worker v8: تحديث موثوق للملفات الأساسية مع network-first، وتسجيله مع updateViaCache:none وupdate() لتقليل بقاء النسخة القديمة.

الخصوصية:
- لا توجد مكتبات خارجية أو CDN أو Analytics.
- الصور الأصلية لا تُرفع إلى GitHub؛ القراءة تتم من مجلد محلي تختاره أنت، والمعاينات تبقى داخل تخزين الموقع المحلي.


OsRa v15 UI addition: romantic album photo viewer, thumbnail strip, swipe navigation, and optional slideshow. Existing data/indexing logic remains unchanged from v13.


OsRa v19 additions:
- Local contentKey for cross-device media matching without relying on file modification time.
- Full restore keeps a pre-restore safety snapshot.
- Manual album ordering (move up/down) plus optional ordering by detail completeness.
- Automatic cleanup only for empty auto-generated albums; user-edited/text-rich memories are protected.
- Romantic heart-gate transition retained and enhanced.


OsRa v20 + Album Name Link (2026-10-06)
- Added only a lightweight album-name -> same-named-folder connector.
- Added a fast album relinker + report that uses those saved folder paths.
- The database schema/version remains VER=1.
- Service-worker cache was renamed so the modified v20 assets are actually loaded.

OsRa v24 Photo-only + Album Name Link + Fast Report
- Album name matching is a preflight only: it connects an OsRa album to a same-named source folder and does not create/delete albums or move originals.
- Fast linking then performs filename/stem matching inside the selected album folder and produces a report.
- Backup/restore keeps OsRa data and photo manifests; original photo files remain in the local source folder.
