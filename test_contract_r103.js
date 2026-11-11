const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const source = fs.readFileSync(path.join(root, 'link-fix.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
assert(source.includes("const BUILD = 'osra122-20261111-r103-clean-restore-fast-index'"));
assert(source.includes('buildCompleteImageIndexR103'));
assert(source.includes('buildRecursiveNameIndexR103'));
assert(source.includes('filesSeen % 250 === 0'));
assert(source.includes('photoLinksOmitted:true'));

let keyCalls = 0, fingerprintCalls = 0, yielded = 0;
const quick = function originalQuickLinkMissingPhoto() {};
const fast = async function originalLinkSourceAutoAlbum() {};
const backup = async () => ({
  app:'OsRa',
  memories:[{id:'m1',title:'رحلتنا',description:'وصف محفوظ',sourceId:'album-identity',linkSourceId:'old',linkFolderPath:'DCIM',linkFolders:[{sourceId:'old',folderPath:'DCIM'}]}],
  photoManifest:[{id:'p1',name:'IMG_1.jpg',album:'رحلتنا',size:123,lastModified:456,sourceId:'old',relPath:'DCIM/IMG_1.jpg',sourceLinks:[{sourceId:'old',relPath:'DCIM/IMG_1.jpg'}],contentKey:'old-key',fingerprint:'old-fp',thumb:{type:'image/webp',data:'thumb-data'}}],
  excludedPhotos:[{id:'e1',name:'IMG_2.jpg',sourceLinks:[{sourceId:'old',relPath:'DCIM/IMG_2.jpg'}],contentKey:'keep-for-reindex',fingerprint:'keep-fp',memoryRefs:[{memoryId:'m1',index:2}]}],
  messages:[{id:'msg1',text:'رسالة لا تُحذف'}]
});
const window = {
  normalizePhotoLinks(){return[]}, findOriginalFile(){}, linkSourceAutoAlbum:fast,
  quickLinkMissingPhoto:quick, applyVisualLinks(){}, visualResultsModal(){}, pageSettings(){},
  backupPayloadForExport:backup, toast(){}, addEventListener(){},
  isImageFile(file){return !!file && /^image\//.test(file.type||'')},
  isImage(name){return /\.(jpg|jpeg|png|webp)$/i.test(String(name||''))},
  normalizeFileName(name){return String(name||'').trim().toLowerCase()},
  normalizeFileStem(name){return String(name||'').trim().toLowerCase().replace(/\.[^.]+$/,'')},
  photoLocations(){return[]},
  contentKey:async()=>{keyCalls++;return 'a'.repeat(64)},
  fingerprint:async()=>{fingerprintCalls++;return 'b'.repeat(64)},
  __osraLinkRepairBuild:null
};
const document = {addEventListener(){},querySelector(){return null},querySelectorAll(){return[]}};
const ctx = {
  window, document, console, manualLinkSession:null, sources:[], photos:new Map(),
  URL:{revokeObjectURL(){}}, setTimeout:(fn,ms)=>{if(ms===0)yielded++;return setTimeout(fn,ms)}, clearTimeout
};
vm.runInNewContext(source,ctx,{timeout:5000});
assert.strictEqual(window.quickLinkMissingPhoto,quick,'base quick action remains the source-first workflow');
assert.strictEqual(window.linkSourceAutoAlbum,fast,'base fast source linker is restored');

(async()=>{
  const exported = await window.backupPayloadForExport();
  assert.strictEqual(exported.photoLinksOmitted,true);
  assert.strictEqual('sourceId' in exported.photoManifest[0],false);
  assert.strictEqual('relPath' in exported.photoManifest[0],false);
  assert.strictEqual('sourceLinks' in exported.photoManifest[0],false);
  assert.strictEqual('contentKey' in exported.photoManifest[0],false);
  assert.strictEqual('fingerprint' in exported.photoManifest[0],false);
  assert.strictEqual(exported.photoManifest[0].name,'IMG_1.jpg');
  assert.strictEqual(exported.photoManifest[0].album,'رحلتنا');
  assert.strictEqual(exported.photoManifest[0].thumb.data,'thumb-data');
  assert.strictEqual(exported.memories[0].description,'وصف محفوظ');
  assert.strictEqual(exported.memories[0].sourceId,'album-identity');
  assert.strictEqual('linkSourceId' in exported.memories[0],false);
  assert.strictEqual('linkFolderPath' in exported.memories[0],false);
  assert.strictEqual('linkFolders' in exported.memories[0],false);
  assert.strictEqual('sourceLinks' in exported.excludedPhotos[0],false);
  assert.strictEqual(exported.excludedPhotos[0].contentKey,'keep-for-reindex');
  assert.strictEqual(exported.excludedPhotos[0].memoryRefs[0].index,2);
  assert.strictEqual(exported.messages[0].text,'رسالة لا تُحذف');

  // Exact legacy metadata should not calculate either hash.
  const exact = await window.verifyExactPhotoCandidate(
    {name:'IMG_1.jpg',size:123,lastModified:456},
    {name:'IMG_1.jpg',size:123,lastModified:456,type:'image/jpeg'}
  );
  assert.strictEqual(exact.matched,true);
  assert.strictEqual(exact.method,'legacy-metadata');
  assert.strictEqual(keyCalls,0,'metadata match avoids content hash cost');
  assert.strictEqual(fingerprintCalls,0,'metadata match avoids fingerprint cost');

  // Stored content key matches without doing a redundant fingerprint digest.
  const hashed = await window.verifyExactPhotoCandidate(
    {name:'IMG_1.jpg',size:123,lastModified:456,contentKey:'a'.repeat(64)},
    {name:'IMG_1.jpg',size:999,lastModified:999,type:'image/jpeg'}
  );
  assert.strictEqual(hashed.matched,true);
  assert.strictEqual(hashed.method,'content-key');
  assert.strictEqual(keyCalls,1);
  assert.strictEqual(fingerprintCalls,0);

  // Recursive indexing yields periodically and keeps all duplicate paths.
  const fakeDir = {async *entries(){for(let i=0;i<520;i++)yield [`IMG_${i}.jpg`,{kind:'file',name:`IMG_${i}.jpg`}];}};
  const target = [{photo:{name:'IMG_17.jpg'}}];
  const index = await window.buildRecursiveNameIndex(fakeDir,'',target,()=>{});
  assert.strictEqual(index.filesSeen,520);
  assert.ok(index.byName.get('img_17.jpg'));
  assert.ok(yielded>=2,'recursive index yields to the UI during large folders');

  // Full restore index keeps exact/stem matches and remains duplicate-aware.
  const fullIndex = await window.buildCompleteImageIndex(fakeDir,()=>{});
  assert.strictEqual(fullIndex.filesSeen,520);
  assert.strictEqual(fullIndex.byName.get('img_17.jpg').length,1);

  // Import sanitization is present in both user import routes and Drive merge.
  const a = app.indexOf('function cleanExternalBackupPayload(payload){');
  const b = app.indexOf('\nfunction restoreMerge(){',a);
  assert.ok(a>=0 && b>a,'external backup sanitizer exists in app.js');
  const helper = app.slice(a,b);
  const cleanFn = vm.runInNewContext(`${helper}; cleanExternalBackupPayload`,{structuredClone});
  const oldBackup = {
    memories:[{id:'m',title:'ألبوم',description:'يبقى',linkSourceId:'old',linkFolderPath:'DCIM',linkFolders:[1],sourceId:'album-id'}],
    photoManifest:[{id:'p',name:'one.jpg',album:'ألبوم',size:10,lastModified:20,sourceId:'old',relPath:'DCIM/one.jpg',sourceLinks:[1],contentKey:'old',fingerprint:'old',thumb:{data:'thumb'}}],
    excludedPhotos:[{id:'e',sourceLinks:[1],contentKey:'keep',memoryRefs:[{index:1}]}],
    messages:[{id:'m1',text:'hello'}]
  };
  const clean = cleanFn(oldBackup);
  assert.strictEqual(clean.photoLinksOmitted,true);
  assert.strictEqual('linkSourceId' in clean.memories[0],false);
  assert.strictEqual(clean.memories[0].sourceId,'album-id');
  assert.strictEqual(clean.memories[0].description,'يبقى');
  assert.strictEqual('sourceId' in clean.photoManifest[0],false);
  assert.strictEqual('sourceLinks' in clean.photoManifest[0],false);
  assert.strictEqual(clean.photoManifest[0].thumb.data,'thumb');
  assert.strictEqual('sourceLinks' in clean.excludedPhotos[0],false);
  assert.strictEqual(clean.excludedPhotos[0].contentKey,'keep');
  assert.strictEqual(clean.messages[0].text,'hello');
  assert.match(app,/mergeBackupPayload\(x\)\{\s*x=cleanExternalBackupPayload\(x\)/);
  assert.match(app,/const x=cleanExternalBackupPayload\(JSON\.parse\(await f\.text\(\)\)\)/);
  assert.match(app,/photoLinksOmitted/);
  console.log('PASS R103: portable backup export/import cleanup, preserved album/text/thumb data, zero-hash legacy fast match, lazy hash verification, source-first handlers, and yielding duplicate-safe indexes.');
})().catch(err=>{console.error(err);process.exit(1)});
