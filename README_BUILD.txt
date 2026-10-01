OsRa v29 — PHOTOS ONLY — STABLE

هذه النسخة مخصصة للنسخة الأساسية المستقرة.
- الصور والذكريات وباقي وظائف OsRa محفوظة.
- واجهة الفيديو غير موجودة.
- الفيديوهات القديمة لا يتم حذفها من قاعدة البيانات، لكنها لا تظهر ولا تدخل في فحص الصور.
- لا يوجد تغيير في قاعدة البيانات يطلب ترقية إصدار IndexedDB.

رفع GitHub:
ضع محتويات هذا المجلد مكان ملفات OsRa الحالية في النسخة الأساسية.


تحسين جودة الصور: THUMB_VERSION=4، المعاينات حتى 1024px وبجودة WebP عالية، مع حد أقصى 512KB للمعاينة. الصور الأصلية لا تُضغط وتظل هي المستخدمة عند فتح الصورة كاملة مع صلاحية المكتبة.


v29 image behavior: optimized local thumbnails for speed; on opening a photo, the thumbnail appears immediately and is replaced by the original photo from the linked local folder. Originals are never compressed, uploaded, deleted, or copied into OsRa.
