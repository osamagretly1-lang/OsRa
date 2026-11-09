/* OsRa R96 — link-only repair. Load after app.js. No database migration or UI changes. */
(function installOsRaLinkRepair(){
  'use strict';
  const BUILD = 'osra122-20261109-r96-link-only-repair';
  if (window.__osraLinkRepairBuild === BUILD) return;

  const imageFile = file => {
    try { return typeof window.isImageFile === 'function' && window.isImageFile(file); }
    catch (_) { return false; }
  };
  const normalName = value => {
    try { return typeof window.normalizeFileName === 'function'
      ? window.normalizeFileName(value)
      : String(value || '').trim().toLocaleLowerCase(); }
    catch (_) { return String(value || '').trim().toLocaleLowerCase(); }
  };
  const normalStem = value => {
    try { return typeof window.normalizeFileStem === 'function'
      ? window.normalizeFileStem(value)
      : normalName(value).replace(/\.[^.\/]+$/, ''); }
    catch (_) { return normalName(value).replace(/\.[^.\/]+$/, ''); }
  };
  const sameName = (a, b) => {
    const an = normalName(a), bn = normalName(b);
    if (!an || !bn) return false;
    return an === bn || normalStem(an) === normalStem(bn);
  };
  const asNumber = value => Number(value) || 0;

  /*
   * R86 returned immediately when contentKey existed but differed. That blocked
   * the stored fingerprint and the exact legacy metadata fallback. This version
   * checks every available identity signal before rejecting a candidate.
   * Metadata fallback is deliberately narrow: same normalized filename/stem,
   * same byte size, and same last-modified timestamp. Duplicate-name index rules
   * in app.js remain unchanged, so ambiguous filename candidates still fail closed.
   */
  window.verifyExactPhotoCandidate = async function verifyExactPhotoCandidateR96(photo, file){
    if (!photo || !imageFile(file)) return { matched: false };

    let links = [];
    try {
      links = typeof window.photoLocations === 'function'
        ? window.photoLocations(photo)
        : (Array.isArray(photo.sourceLinks) ? photo.sourceLinks : []);
    } catch (_) {
      links = Array.isArray(photo.sourceLinks) ? photo.sourceLinks : [];
    }

    const expectedKeys = [photo.contentKey, ...links.map(x => x && x.contentKey)]
      .filter(x => typeof x === 'string' && x.length);
    const expectedFingerprints = [photo.fingerprint, ...links.map(x => x && x.fingerprint)]
      .filter(x => typeof x === 'string' && x.length);

    let key = '', fp = '';
    try {
      if (expectedKeys.length && typeof window.contentKey === 'function') {
        key = await window.contentKey(file) || '';
        if (key && expectedKeys.includes(key)) {
          return { matched: true, key, fingerprint: '', method: 'content-key' };
        }
      }
    } catch (_) { /* Continue to the independent fingerprint check. */ }
    try {
      if (expectedFingerprints.length && typeof window.fingerprint === 'function') {
        fp = await window.fingerprint(file) || '';
        if (fp && expectedFingerprints.includes(fp)) {
          return { matched: true, key, fingerprint: fp, method: 'fingerprint' };
        }
      }
    } catch (_) { /* Continue to the conservative metadata fallback. */ }

    const actualName = String(file.name || '');
    const fileSize = asNumber(file.size);
    const fileTime = asNumber(file.lastModified);
    const specs = [
      { name: photo.name, size: photo.size, lastModified: photo.lastModified },
      ...links.map(link => ({
        name: link && link.name,
        size: link && link.size,
        lastModified: link && link.lastModified
      }))
    ];
    const metadataMatch = specs.some(spec => {
      const expectedSize = asNumber(spec.size);
      const expectedTime = asNumber(spec.lastModified);
      return sameName(spec.name, actualName) &&
        expectedSize > 0 && expectedSize === fileSize &&
        expectedTime > 0 && expectedTime === fileTime;
    });

    if (metadataMatch) {
      return {
        matched: true,
        key,
        fingerprint: fp,
        method: 'legacy-metadata-fallback'
      };
    }
    return { matched: false, key, fingerprint: fp };
  };

  /*
   * Visual confirmation was already explicit in the UI. Persist the selected
   * file's own hashes on its source link so later original-file lookups validate
   * that exact approved file, rather than comparing it only with a stale
   * photo-level hash from another source or an older app build.
   */
  window.applyVisualLinks = async function applyVisualLinksR96(){
    const s = visualLinkSession;
    if (!s) return;
    const accepted = [...document.querySelectorAll('.visual-link-check:checked')]
      .map(x => ({ row: Number(x.dataset.row), candidate: Number(x.dataset.candidate) }));
    if (!accepted.length) { toast('لم تعتمد أي نتيجة.'); return; }
    const album = state.memories.find(x => x.id === s.albumId);
    if (!album) return;

    let linked = 0;
    const createdSources = [];
    for (const a of accepted) {
      const r = s.results[a.row], c = r && r.candidates && r.candidates[a.candidate];
      if (!r || !c) continue;
      let source = c.root && c.root.source;
      if (!source) {
        const root = s.roots.find(x => x.id === (c.root && c.root.id));
        if (!root) continue;
        source = root.source;
        if (!source) {
          source = {
            id: id('src'), name: root.name || 'مجلد بصري', handle: root.handle,
            asAlbum: false, directAlbumFolder: false, mergeIntoMemoryId: '', createdAt: Date.now()
          };
          root.source = source;
          sources.push(source);
          createdSources.push(source);
        }
      }
      if (!source || !source.handle) continue;
      const p = photos.get(r.photoId);
      if (!p) continue;

      let verifiedFile = null;
      try { verifiedFile = c.entry && await c.entry.getFile(); }
      catch (_) { verifiedFile = null; }
      if (!verifiedFile || !imageFile(verifiedFile)) {
        console.warn('Visual candidate changed or is no longer readable', c.relPath);
        continue;
      }
      if (c.sig) {
        const latestSig = await imageSignatureFromThumb(verifiedFile);
        if (!latestSig || visualCandidateScore(c.sig, latestSig) < .94) {
          console.warn('Visual candidate changed since preview', c.relPath);
          continue;
        }
      }

      let key = '', fp = '';
      try { key = await contentKey(verifiedFile) || ''; } catch (_) {}
      try { fp = await fingerprint(verifiedFile) || ''; } catch (_) {}

      const had = photoLocations(p).some(l =>
        String(l.sourceId) === String(source.id) && String(l.relPath) === String(c.relPath));
      markPhotoLinkVerified(p, source.id, c.relPath);
      const linkedRow = photoLocations(p).find(l =>
        String(l.sourceId) === String(source.id) && String(l.relPath) === String(c.relPath));
      if (linkedRow) {
        linkedRow.name = verifiedFile.name || c.name || p.name;
        linkedRow.size = asNumber(verifiedFile.size);
        linkedRow.lastModified = asNumber(verifiedFile.lastModified);
        linkedRow.mimeType = verifiedFile.type || linkedRow.mimeType || '';
        linkedRow.contentKey = key || linkedRow.contentKey || '';
        linkedRow.fingerprint = fp || linkedRow.fingerprint || '';
        linkedRow.verified = true;
        linkedRow.verifiedAt = Date.now();
      }
      await savePhoto(p);
      photos.set(p.id, p);
      if (!had) linked++;
    }

    normalizeState();
    if (linked || createdSources.length) {
      await persistSources();
      await save();
    }
    refreshLinkReportAfterManual();
    const remain = remainingPhotoIdsForAlbum(album).length;
    clearVisualPreviewUrls();
    visualLinkSession = null;
    closeModal();
    toast(`تم اعتماد ${linked} ربط بصري.${remain ? ` يتبقى ${remain} صورة.` : ' اكتمل الألبوم.'}`);
    renderNoAnim();
    if (remain) {
      if (s.origin === 'manual-exhausted') showAlbumLinkFinalReport(album.id);
      else showManualLinkNext(album.id);
    } else {
      showAlbumLinkFinalReport(album.id);
    }
  };

  /* Keep only the core linking entry points in Settings: fast bulk linking and
     source-first linking. Per-photo visual review remains available in the report. */
  if (typeof window.pageSettings === 'function') {
    const originalPageSettings = window.pageSettings;
    window.pageSettings = function pageSettingsR96(){
      let markup = originalPageSettings.apply(this, arguments);
      if (typeof markup !== 'string') return markup;
      markup = markup.replace(/<button\b[^>]*data-action="matchAlbumsByName"[^>]*>[\s\S]*?<\/button>/i, '');
      markup = markup.replace(/<button\b[^>]*data-action="linkSourceBatchAutoAlbums"[^>]*>[\s\S]*?<\/button>/i, '');
      return markup;
    };
  }

  window.__osraLinkRepairBuild = BUILD;
  console.info('[OsRa] link-only repair loaded:', BUILD);
})();
