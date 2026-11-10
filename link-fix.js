/* OsRa R98 — robust direct-file validation, duplicate candidate review, and restored link modes.
   This patch only attaches an original-file handle to an EXISTING photo record.
   It never creates a photo, album, memory, or thumbnail. */
(function installOsRaLinkRepairR97(){
  'use strict';
  const BUILD = 'osra122-20261110-r98-link-engine-repair';
  if (window.__osraLinkRepairBuild === BUILD) return;

  const originalNormalizePhotoLinks = window.normalizePhotoLinks;
  const originalFindOriginalFile = window.findOriginalFile;
  const originalLinkSourceAutoAlbum = window.linkSourceAutoAlbum;
  const originalApplyVisualLinks = window.applyVisualLinks;
  const originalPageSettings = window.pageSettings;
  let pendingDirect = null;

  const $ = selector => document.querySelector(selector);
  const imageFile = file => {
    try { return typeof window.isImageFile === 'function' && window.isImageFile(file); }
    catch (_) { return !!file && /^image\//i.test(file.type || ''); }
  };
  const number = value => Number(value) || 0;
  const safeCall = async (fn, ...args) => {
    try { return typeof fn === 'function' ? await fn(...args) : null; }
    catch (_) { return null; }
  };
  const cleanObjectUrl = () => {
    if (pendingDirect && pendingDirect.url) {
      try { URL.revokeObjectURL(pendingDirect.url); } catch (_) {}
    }
    pendingDirect = null;
  };
  const notify = message => {
    try { window.toast(message); } catch (_) { console.warn('[OsRa R97]', message); }
  };

  /* Preserve ordinary folder links exactly as before, while retaining the
     FileSystemFileHandle for a user-selected single original file. */
  if (typeof originalNormalizePhotoLinks === 'function') {
    window.normalizePhotoLinks = function normalizePhotoLinksR97(photo){
      const normalized = originalNormalizePhotoLinks(photo) || [];
      const raw = Array.isArray(photo && photo.sourceLinks) ? photo.sourceLinks : [];
      for (const item of raw) {
        if (!item || item.directFile !== true || !item.fileHandle || !item.sourceId || !item.relPath) continue;
        let link = normalized.find(x => String(x.sourceId) === String(item.sourceId) && String(x.relPath) === String(item.relPath));
        if (!link) {
          link = {
            sourceId:String(item.sourceId), relPath:String(item.relPath),
            name:item.name || photo.name || '', size:number(item.size),
            lastModified:number(item.lastModified), contentKey:item.contentKey || '',
            fingerprint:item.fingerprint || '', mimeType:item.mimeType || '',
            verified:item.verified === true, verifiedAt:number(item.verifiedAt),
          };
          normalized.push(link);
        }
        link.directFile = true;
        link.fileHandle = item.fileHandle;
        link.verified = item.verified === true;
        link.verifiedAt = number(item.verifiedAt);
        link.contentKey = item.contentKey || link.contentKey || '';
        link.fingerprint = item.fingerprint || link.fingerprint || '';
      }
      return normalized;
    };
  }

  /* Fix the actual R86 rejection bug: never stop after one stale content hash.
     Try every saved content key, then every saved fingerprint, then the exact
     legacy metadata tuple (name + size + lastModified). */
  window.verifyExactPhotoCandidate = async function verifyExactPhotoCandidateR97(photo, file){
    if (!photo || !imageFile(file)) return {matched:false};
    let photoLinks = [];
    try { photoLinks = window.photoLocations(photo) || []; } catch (_) {}
    const keys = [photo.contentKey, ...photoLinks.map(link=>link && link.contentKey)]
      .filter(value=>typeof value === 'string' && value.length);
    const fingerprints = [photo.fingerprint, ...photoLinks.map(link=>link && link.fingerprint)]
      .filter(value=>typeof value === 'string' && value.length);
    let actualKey = '', actualFingerprint = '';
    if (keys.length && typeof window.contentKey === 'function') {
      try {
        actualKey = await window.contentKey(file) || '';
        if (actualKey && keys.includes(actualKey))
          return {matched:true,key:actualKey,fingerprint:'',method:'content-key'};
      } catch (_) {}
    }
    if (fingerprints.length && typeof window.fingerprint === 'function') {
      try {
        actualFingerprint = await window.fingerprint(file) || '';
        if (actualFingerprint && fingerprints.includes(actualFingerprint))
          return {matched:true,key:actualKey,fingerprint:actualFingerprint,method:'fingerprint'};
      } catch (_) {}
    }
    const normalizeName = value => {
      try { return window.normalizeFileName(String(value || '')); }
      catch (_) { return String(value || '').trim().toLocaleLowerCase(); }
    };
    const normalizeStem = value => {
      try { return window.normalizeFileStem(String(value || '')); }
      catch (_) { return normalizeName(value).replace(/\.[^.\/]+$/, ''); }
    };
    const expected = [
      {name:photo.name,size:photo.size,lastModified:photo.lastModified},
      ...photoLinks.map(link=>({name:link && link.name,size:link && link.size,lastModified:link && link.lastModified}))
    ];
    const actualName = String(file.name || '');
    const actualSize = number(file.size), actualTime = number(file.lastModified);
    const metadataMatch = expected.some(spec=>{
      const expectedSize = number(spec.size), expectedTime = number(spec.lastModified);
      const nameMatch = normalizeName(spec.name) === normalizeName(actualName) ||
        (!!normalizeStem(spec.name) && normalizeStem(spec.name) === normalizeStem(actualName));
      return nameMatch && expectedSize > 0 && expectedSize === actualSize &&
        expectedTime > 0 && expectedTime === actualTime;
    });
    return {matched:metadataMatch,key:actualKey,fingerprint:actualFingerprint,method:metadataMatch?'legacy-metadata-fallback':'none'};
  };

  window.hasOriginalLink = function hasOriginalLinkR97(photo){
    if (!photo) return false;
    try {
      return window.photoLocations(photo).some(link =>
        link.verified === true && (
          (link.directFile === true && !!link.fileHandle) ||
          (Array.isArray(sources) && sources.some(source =>
            String(source.id) === String(link.sourceId) && !!source.handle))
        )
      );
    } catch (_) { return false; }
  };
  window.originalLinkCount = function originalLinkCountR97(photo){
    if (!photo) return 0;
    try {
      return window.photoLocations(photo).filter(link =>
        link.verified === true && (
          (link.directFile === true && !!link.fileHandle) ||
          (Array.isArray(sources) && sources.some(source =>
            String(source.id) === String(link.sourceId) && !!source.handle))
        )
      ).length;
    } catch (_) { return 0; }
  };

  async function fileHandlePermission(handle, ask){
    if (!handle || typeof handle.getFile !== 'function') return false;
    try {
      const current = await handle.queryPermission({mode:'read'});
      if (current === 'granted') return true;
      if (!ask || typeof handle.requestPermission !== 'function') return false;
      return await handle.requestPermission({mode:'read'}) === 'granted';
    } catch (_) { return false; }
  }

  /* Directly selected file handles are tried first. They remain local to the
     existing photo row and are never copied into OsRa's photo collection. */
  if (typeof originalFindOriginalFile === 'function') {
    window.findOriginalFile = async function findOriginalFileR97(photo, ask=true){
      if (photo) {
        for (const link of window.photoLocations(photo)) {
          if (link.directFile !== true || !link.fileHandle) continue;
          try {
            if (!(await fileHandlePermission(link.fileHandle, ask))) continue;
            const file = await link.fileHandle.getFile();
            if (!imageFile(file)) throw new Error('directly selected item is no longer an image');
            /* Use the same multi-signal verifier as folder matching. The old
               direct-file path rejected a valid file as soon as its saved
               contentKey differed, even when its saved fingerprint or exact
               legacy metadata still matched. */
            const identity = typeof window.verifyExactPhotoCandidate === 'function'
              ? await window.verifyExactPhotoCandidate(photo, file)
              : {matched: number(file.size) === number(link.size) &&
                  number(file.lastModified) === number(link.lastModified)};
            if (!identity || !identity.matched) throw new Error('direct file identity could not be verified');
            if (identity.key) link.contentKey = identity.key;
            if (identity.fingerprint) link.fingerprint = identity.fingerprint;
            link.verified = true;
            link.verifiedAt = number(link.verifiedAt) || Date.now();
            const source = {id:link.sourceId, name:`ملف مباشر: ${link.name || file.name}`, handle:null, directFile:true};
            return {file, source, link, direct:true};
          } catch (error) {
            link.verified = false;
            link.verifiedAt = 0;
            try { await savePhoto(photo); } catch (_) {}
            console.warn('[OsRa R97] direct-file source unavailable', photo.id, error);
          }
        }
      }
      return originalFindOriginalFile.call(this, photo, ask);
    };
  }

  function chooseOneImage(photoId){
    const photo = photos && photos.get(String(photoId));
    if (!photo || !window.isPhotoRecord(photo)) {
      notify('الصورة المطلوبة لم تعد موجودة في المكتبة.');
      return;
    }
    if (!window.isSecureContext || typeof window.showOpenFilePicker !== 'function') {
      window.openQuickLinkSourceChooser('', String(photoId), 'report');
      return;
    }
    /* showOpenFilePicker is called immediately within the original button's
       click gesture; no asynchronous work happens before the native picker. */
    (async () => {
      try {
        const handles = await window.showOpenFilePicker({
          id:'osra-original-photo-link', multiple:false,
          types:[{description:'ملف الصورة الأصلي', accept:{
            'image/*':['.jpg','.jpeg','.png','.webp','.gif','.avif','.heic','.heif','.bmp','.tif','.tiff']
          }}]
        });
        const handle = handles && handles[0];
        if (!handle) return;
        const file = await handle.getFile();
        if (!imageFile(file)) { notify('الملف الذي اخترته ليس صورة مدعومة. لم يتم حفظ أي تغيير.'); return; }
        const current = photos.get(String(photoId));
        if (!current || !window.isPhotoRecord(current)) { notify('الصورة الأصلية في OsRa لم تعد متاحة.'); return; }
        const key = await safeCall(window.contentKey, file) || '';
        const fp = await safeCall(window.fingerprint, file) || '';
        const url = URL.createObjectURL(file);
        pendingDirect = {photoId:String(photoId), handle, file, key, fingerprint:fp, url};
        window.modal(`<h2>تأكيد ربط ملف الصورة</h2>
          <p class="note">راجع الصورتين قبل الاعتماد. سيتم ربط الملف بالصورة الموجودة بالفعل في OsRa فقط؛ لن تُضاف صورة أو ذكرى أو ألبوم جديد، ولن يُنسخ الملف إلى التطبيق.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start">
            <div class="card" style="padding:8px"><b>الصورة الموجودة في OsRa</b><div style="height:190px;display:flex;align-items:center;justify-content:center;margin-top:8px"><img data-thumb="${esc(current.id)}" alt="الصورة المسجلة" style="max-width:100%;max-height:180px;object-fit:contain"></div><div class="meta">${esc(current.name || 'صورة')}</div></div>
            <div class="card" style="padding:8px"><b>الملف الذي اخترته</b><div style="height:190px;display:flex;align-items:center;justify-content:center;margin-top:8px"><img id="r97DirectCandidate" src="${url}" alt="الملف المختار" style="max-width:100%;max-height:180px;object-fit:contain"></div><div class="meta">${esc(file.name || 'ملف صورة')} • ${Math.round(file.size/1024).toLocaleString()} KB</div></div>
          </div>
          <div class="card" style="margin-top:10px"><b>تنبيه الخصوصية</b><p class="meta">OsRa سيحفظ إذن الوصول إلى هذا الملف فقط. الصورة لا تُنسخ ولا تُضاف إلى أي ألبوم. أنت تؤكد أن الصورتين تمثلان الصورة نفسها.</p></div>
          <div class="actions"><button class="btn primary" data-r97-action="confirm-direct">نعم، هذا هو الأصل الصحيح — اربطه</button><button class="btn" data-r97-action="cancel-direct">إلغاء دون حفظ</button></div>`);
        try { window.hydrate($('#modalBody')); } catch (_) {}
      } catch (error) {
        if (error && error.name === 'AbortError') return;
        console.error('[OsRa R97] direct file picker failed', error);
        notify('تعذر فتح ملف الصورة. لم يتم حفظ أي تغيير. جرّب اختيار مجلد المصدر.');
        window.openQuickLinkSourceChooser('', String(photoId), 'report');
      }
    })();
  }

  async function confirmDirectFile(){
    const pending = pendingDirect;
    if (!pending) return;
    const photo = photos && photos.get(pending.photoId);
    if (!photo || !window.isPhotoRecord(photo)) { cleanObjectUrl(); window.closeModal(); notify('الصورة لم تعد موجودة؛ لم يتم ربط أي ملف.'); return; }
    const oldLinks = Array.isArray(photo.sourceLinks) ? photo.sourceLinks.map(x => ({...x})) : null;
    try {
      const permission = await fileHandlePermission(pending.handle, true);
      if (!permission) throw new Error('file read permission is unavailable');
      const file = await pending.handle.getFile();
      if (!imageFile(file)) throw new Error('selected file is no longer an image');
      const key = await safeCall(window.contentKey, file) || pending.key || '';
      const fp = await safeCall(window.fingerprint, file) || pending.fingerprint || '';
      const sourceId = `direct-file:${String(photo.id)}`;
      const relPath = String(file.name || pending.file.name || 'original-image');
      const kept = window.photoLocations(photo).filter(link => link.directFile !== true);
      kept.push({
        sourceId, relPath, name:relPath, size:number(file.size),
        lastModified:number(file.lastModified), mimeType:file.type || 'image/*',
        contentKey:key, fingerprint:fp, verified:true, verifiedAt:Date.now(),
        directFile:true, fileHandle:pending.handle
      });
      photo.sourceLinks = kept;
      await savePhoto(photo);
      photos.set(String(photo.id), photo);
      cleanObjectUrl();
      window.closeModal();
      try { window.refreshLinkReportAfterManual(); } catch (_) {}
      try { window.renderNoAnim(); } catch (_) {}
      notify('تم ربط الملف الأصلي بالصورة الموجودة. لم تُضف أي صورة أو ألبوم جديد.');
      try { if (lastLinkReport) window.linkReportModal(lastLinkReport); } catch (_) {}
    } catch (error) {
      if (oldLinks) photo.sourceLinks = oldLinks;
      cleanObjectUrl();
      window.closeModal();
      console.error('[OsRa R97] could not persist direct file link', error);
      notify('لم يتم حفظ الربط؛ لم تتغير الصور أو الألبومات. تأكد من إذن قراءة الملف ثم أعد المحاولة.');
    }
  }

  /* Intercept only our two confirmation controls before the app's delegated
     click handler; all existing OsRa buttons keep their original behavior. */
  document.addEventListener('click', event => {
    const button = event.target && event.target.closest ? event.target.closest('[data-r97-action]') : null;
    if (!button) return;
    const action = button.getAttribute('data-r97-action');
    if (action !== 'confirm-direct' && action !== 'cancel-direct') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (action === 'confirm-direct') confirmDirectFile();
    else { cleanObjectUrl(); window.closeModal(); }
  }, true);
  window.addEventListener('pagehide', cleanObjectUrl);

  /* The old fast-link button selected a folder, then only indexed matching
     filenames; a duplicate filename was discarded as ambiguous and the user
     only saw a generic failure. R97 keeps every same-name candidate, checks
     each one, and if strict identity still fails it offers a visual side-by-side
     review from the SAME selected folder. No candidate is saved automatically. */
  if (typeof originalLinkSourceAutoAlbum === 'function') {
    window.linkSourceAutoAlbum = async function linkSourceAutoAlbumR97(focusPhotoId=null, sourceId=null){
      if (!focusPhotoId) return originalLinkSourceAutoAlbum.call(this, focusPhotoId, sourceId);
      const photo = photos && photos.get(String(focusPhotoId));
      if (!photo || !window.isPhotoRecord(photo) || window.hasOriginalLink(photo)) {
        notify('هذه الصورة ليست ضمن الصور الناقصة حاليًا.'); return;
      }
      const albums = window.visibleMemories().filter(memory => (memory.photoIds || []).some(id => String(id) === String(focusPhotoId)));
      if (!albums.length) { notify('الصورة لم تعد داخل ألبوم ظاهر. لم يتم تغيير أي شيء.'); return; }
      if (scanLock || busy) { notify('هناك عملية فحص أو ربط أخرى تعمل حاليًا.'); return; }
      if (!window.isSecureContext) { notify('اختيار المصدر يحتاج إلى HTTPS.'); return; }
      if (!sourceId && typeof window.showDirectoryPicker !== 'function') {
        window.openQuickLinkSourceChooser('', String(focusPhotoId), 'report'); return;
      }
      let chosen = null, source = null, baseRel = '';
      try {
        if (sourceId) {
          source = sources.find(item => String(item.id) === String(sourceId));
          if (!source || !source.handle) { notify('المجلد المحفوظ لم يعد متاحًا.'); return; }
          chosen = source.handle;
        } else {
          chosen = await window.showDirectoryPicker({mode:'read'});
          source = await window.getSourceByHandle(chosen);
          if (!source) {
            const containing = await window.findContainingSource(chosen);
            if (containing) { source = containing.source; baseRel = window.normalizeFolderRelPath(containing.relPath || ''); }
          }
        }
      } catch (error) {
        if (error && error.name === 'AbortError') return;
        console.error('[OsRa R97] source folder picker failed', error);
        notify('تعذر اختيار مجلد المصدر.'); return;
      }
      const tempSource = source || {id:id('src'),name:chosen.name || 'مجلد مصدر',handle:chosen,asAlbum:false,directAlbumFolder:false,mergeIntoMemoryId:'',createdAt:Date.now()};
      if (!(await window.ensureSourcePermission(tempSource, true))) { notify('لم يُمنح إذن قراءة المصدر. لم يتم حفظ شيء.'); return; }
      manualLinkSession = manualLinkSession || {cancelled:false,history:[]};
      manualLinkSession.cancelled = false;
      manualLinkSession.running = true;
      busy = true;
      window.modal(`<h2>⚡ البحث عن أصل الصورة</h2><p id="r97SourceStatus">جارٍ فحص أسماء الملفات داخل «${esc(chosen.name || 'المصدر')}»…</p><div class="progress"><i id="r97SourceBar" style="width:4%"></i></div><p class="meta">لن يتم الحفظ إلا بعد التحقق أو اختيارك الصريح للصورة الصحيحة.</p><div class="actions"><button class="btn danger" data-action="cancelManualLink">إلغاء البحث</button></div>`);
      const status = $('#r97SourceStatus'), bar = $('#r97SourceBar');
      const rows = [], exactCandidates = [];
      const expectedName = window.normalizeFileName(photo.name), expectedStem = window.normalizeFileStem(photo.name);
      const walk = async (directory, relative='') => {
        for await (const [name, entry] of directory.entries()) {
          if (manualLinkSession && manualLinkSession.cancelled) throw Object.assign(new Error('MANUAL_LINK_CANCELLED'), {name:'ManualLinkCancelled'});
          const rel = relative ? `${relative}/${name}` : name;
          if (entry.kind === 'directory') { await walk(entry, rel); continue; }
          if (!window.isImage(name)) continue;
          const row = {entry, name:String(name), relPath:window.normalizeFolderRelPath(rel)};
          rows.push(row);
          const normalized = window.normalizeFileName(name), stem = window.normalizeFileStem(name);
          if ((expectedName && normalized === expectedName) || (expectedStem && stem === expectedStem)) exactCandidates.push(row);
          if (rows.length % 80 === 0) {
            if (status) status.textContent = `فحص ${rows.length} صورة…`;
            if (bar) bar.style.width = '25%';
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      };
      try {
        await walk(chosen, '');
        if (manualLinkSession && manualLinkSession.cancelled) throw Object.assign(new Error('MANUAL_LINK_CANCELLED'), {name:'ManualLinkCancelled'});
        const matched = [];
        for (let i=0;i<exactCandidates.length;i++) {
          const row = exactCandidates[i];
          try {
            const file = await row.entry.getFile();
            const identity = await window.verifyExactPhotoCandidate(photo, file);
            if (identity && identity.matched) matched.push({p:photo,row,file,identity,rel:window.normalizeFolderRelPath([baseRel,row.relPath].filter(Boolean).join('/'))});
          } catch (_) {}
          if (status && i % 8 === 0) status.textContent = `التحقق من الاسم المتطابق ${i+1} / ${exactCandidates.length}…`;
        }
        if (matched.length > 1) {
          /* Multiple files can be byte-identical copies in different folders.
             Never silently bind the first one: show every verified location
             and let the user choose the intended source. */
          const rootRef = {id:String(tempSource.id),name:tempSource.name,handle:chosen,source:source || null,relPath:baseRel};
          const verifiedCandidates = [];
          for (const item of matched) {
            let sig = null;
            try { sig = await window.imageSignatureFromThumb(item.file); } catch (_) {}
            if (!sig) continue;
            verifiedCandidates.push({entry:item.row.entry,name:item.file.name,relPath:item.rel,sig,score:1,root:rootRef});
          }
          if (!verifiedCandidates.length) throw new Error('NO_TARGET_PREVIEW');
          visualLinkStopRequested = false;
          visualLinkSession = {
            albumId:albums[0].id, roots:[rootRef],
            results:[{photoId:String(photo.id),candidates:verifiedCandidates}],
            sourceRows:[],status:'ready',origin:'report',filterPhotoId:String(photo.id)
          };
          busy = false;
          manualLinkSession.running = false;
          window.visualResultsModal();
          return;
        }
        if (matched.length === 1) {
          const chosenMatch = matched[0];
          pendingAutoSourceAlbum = {
            source:tempSource, isNew:!source, staged:[chosenMatch],
            scores:albums.map(memory=>({m:memory,targets:1,missingBefore:1,matchedIds:[String(photo.id)]})),
            chosenName:chosen.name || 'مجلد مصدر', createdAt:Date.now()
          };
          const rowsHtml = albums.map(memory => `<div class="card"><b>📁 ${esc(memory.title || memory.album || 'ألبوم')}</b><p class="meta">تم التحقق من الملف «${esc(chosenMatch.file.name)}» ومطابقته للصورة الحالية.</p><button class="btn small primary" data-action="confirmAutoSourceAlbum" data-id="${esc(memory.id)}">ربط الصورة بهذا الألبوم</button></div>`).join('');
          window.modal(`<h2>✅ تم العثور على الملف الصحيح</h2><p>تم التحقق من هوية الملف قبل الحفظ. اختر الألبوم الذي توجد فيه الصورة؛ لن تضاف أي صورة جديدة.</p>${rowsHtml}<div class="actions"><button class="btn" data-action="closeModal">إلغاء دون حفظ</button></div>`);
          return;
        }
        /* Strict name/metadata matching did not pass. Use visual similarity as
           a REVIEW step, never as automatic authorization. */
        if (!rows.length) throw new Error('EMPTY_SOURCE');
        let thumb = await window.getThumbBlob(photo.id);
        if (!thumb && typeof window.resolveThumbFallbackBlob === 'function') {
          const fallback = await window.resolveThumbFallbackBlob(photo);
          thumb = fallback && fallback.blob ? fallback.blob : null;
        }
        const targetSig = await window.imageSignatureFromThumb(thumb);
        if (!targetSig) throw new Error('NO_TARGET_PREVIEW');
        const ranked = [];
        for (let i=0;i<rows.length;i++) {
          if (manualLinkSession && manualLinkSession.cancelled) throw Object.assign(new Error('MANUAL_LINK_CANCELLED'), {name:'ManualLinkCancelled'});
          try {
            const file = await rows[i].entry.getFile();
            const sig = await window.imageSignatureFromThumb(file);
            if (!sig) continue;
            const score = window.visualCandidateScore(targetSig, sig);
            if (score >= .80) ranked.push({...rows[i],sig,score,root:null});
          } catch (_) {}
          if (status && i % 20 === 0) status.textContent = `البحث البصري في ${i+1} من ${rows.length} صورة…`;
          if (bar) bar.style.width = `${25 + Math.round((i+1)*65/rows.length)}%`;
          if (i % 12 === 0) await new Promise(resolve => setTimeout(resolve, 0));
        }
        ranked.sort((a,b)=>b.score-a.score);
        const best = ranked.slice(0,5);
        if (!best.length) throw new Error('NO_VISUAL_CANDIDATE');
        const rootRef = {id:String(tempSource.id),name:tempSource.name,handle:chosen,source:source || null,relPath:baseRel};
        for (const candidate of best) {
          candidate.root = rootRef;
          candidate.relPath = window.normalizeFolderRelPath([baseRel,candidate.relPath].filter(Boolean).join('/'));
        }
        visualLinkStopRequested = false;
        visualLinkSession = {
          albumId:albums[0].id, roots:[rootRef], results:[{photoId:String(photo.id),candidates:best}],
          sourceRows:[], status:'ready', origin:'report', filterPhotoId:String(photo.id)
        };
        busy = false;
        manualLinkSession.running = false;
        window.visualResultsModal();
      } catch (error) {
        if (error && (error.name === 'ManualLinkCancelled' || error.message === 'MANUAL_LINK_CANCELLED')) {
          notify('تم إلغاء البحث دون حفظ أي رابط.');
        } else {
          console.warn('[OsRa R97] source matching did not produce a confirmed link', error);
          const message = error && error.message === 'EMPTY_SOURCE' ? 'المجلد لا يحتوي على صور.' :
            error && error.message === 'NO_TARGET_PREVIEW' ? 'تعذر قراءة معاينة الصورة الموجودة في OsRa.' :
            'لم أجد ملفًا مطابقًا بدرجة كافية. لم يتم حفظ أي رابط أو إضافة أي صورة.';
          window.modal(`<h2>لم يتم الربط</h2><p>${esc(message)}</p><p class="meta">لم تتغير المكتبة أو الألبومات. جرّب اختيار المجلد الذي يحتوي على الملف الأصلي مباشرة.</p><div class="actions"><button class="btn primary" data-action="linkSourceAutoAlbum" data-photo-id="${esc(String(focusPhotoId))}">اختيار مجلد آخر</button><button class="btn" data-action="closeModal">إغلاق</button></div>`);
        }
      } finally {
        busy = false;
        if (manualLinkSession) manualLinkSession.running = false;
      }
    };
  }

  /* Keep the visual route's accepted handle hashes so later lookups validate
     the chosen original itself. This commits links only; it adds no photo rows. */
  window.applyVisualLinks = async function applyVisualLinksR97(){
    const session = visualLinkSession;
    if (!session) return;
    const accepted = [...document.querySelectorAll('.visual-link-check:checked')]
      .map(input=>({row:Number(input.dataset.row),candidate:Number(input.dataset.candidate)}));
    if (!accepted.length) { notify('لم تعتمد أي نتيجة.'); return; }
    const album = state.memories.find(item=>String(item.id)===String(session.albumId));
    if (!album) return;
    let linked = 0;
    const createdSources = [];
    for (const pick of accepted) {
      const result = session.results[pick.row], candidate = result && result.candidates[pick.candidate];
      if (!result || !candidate) continue;
      let source = candidate.root && candidate.root.source;
      if (!source) {
        const root = session.roots.find(item=>String(item.id)===String(candidate.root && candidate.root.id));
        if (!root || !root.handle) continue;
        source = root.source;
        if (!source) {
          source = {id:id('src'),name:root.name || 'مجلد بصري',handle:root.handle,asAlbum:false,directAlbumFolder:false,mergeIntoMemoryId:'',createdAt:Date.now()};
          root.source = source;
          sources.push(source);
          createdSources.push(source);
        }
      }
      if (!source || !source.handle) continue;
      const photo = photos.get(String(result.photoId));
      if (!photo || !window.isPhotoRecord(photo)) continue;
      let file;
      try { file = await candidate.entry.getFile(); } catch (_) { continue; }
      if (!imageFile(file)) continue;
      if (candidate.sig) {
        const latest = await window.imageSignatureFromThumb(file);
        if (!latest || window.visualCandidateScore(candidate.sig, latest) < .94) continue;
      }
      let key = await safeCall(window.contentKey, file) || '';
      let fp = await safeCall(window.fingerprint, file) || '';
      const old = window.photoLocations(photo).some(link=>String(link.sourceId)===String(source.id)&&String(link.relPath)===String(candidate.relPath));
      window.markPhotoLinkVerified(photo, source.id, candidate.relPath);
      const link = window.photoLocations(photo).find(item=>String(item.sourceId)===String(source.id)&&String(item.relPath)===String(candidate.relPath));
      if (link) {
        link.name = file.name || candidate.name || photo.name;
        link.size = number(file.size); link.lastModified = number(file.lastModified);
        link.mimeType = file.type || link.mimeType || '';
        link.contentKey = key || link.contentKey || '';
        link.fingerprint = fp || link.fingerprint || '';
        link.verified = true; link.verifiedAt = Date.now();
      }
      await savePhoto(photo);
      photos.set(String(photo.id), photo);
      if (!old) linked++;
    }
    window.normalizeState();
    if (linked || createdSources.length) { await window.persistSources(); await save(); }
    window.refreshLinkReportAfterManual();
    const remaining = window.remainingPhotoIdsForAlbum(album).length;
    window.clearVisualPreviewUrls(); visualLinkSession = null; window.closeModal();
    notify(`تم ربط ${linked} ملفًا بالصورة الموجودة بعد مراجعتك. لم تتم إضافة صور جديدة.`);
    window.renderNoAnim();
    if (remaining) window.showManualLinkNext(album.id); else window.showAlbumLinkFinalReport(album.id);
  };

  /* In reports, the fast action now opens a one-file picker when available.
     On browsers without this API it falls back to the repaired folder flow. */
  window.quickLinkMissingPhoto = function quickLinkMissingPhotoR97(photoId){
    const id = String(photoId);
    const photo = photos && photos.get(id);
    const candidates = window.visibleMemories().filter(memory=>(memory.photoIds || []).some(pid=>String(pid)===id));
    if (!photo || !window.isPhotoRecord(photo) || !candidates.length || window.hasOriginalLink(photo)) {
      notify('هذه الصورة ليست ضمن الصور الناقصة حاليًا.'); return;
    }
    chooseOneImage(id);
  };

  /* Keep the existing settings simplification from R96, without touching other pages. */
  if (typeof originalPageSettings === 'function') {
    window.pageSettings = function pageSettingsR97(){
      let markup = originalPageSettings.apply(this, arguments);
      if (typeof markup !== 'string') return markup;
      /* R98 deliberately preserves the user's existing fast, batch/slow,
         and source-first controls. R97 hid two modes while the focused-photo
         path was being repaired; removing those controls also removed useful
         recovery routes. */
      return markup;
    };
  }

  window.__osraLinkRepairBuild = BUILD;
  console.info('[OsRa] link-only repair loaded:', BUILD);
})();
