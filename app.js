window.__osraBootAt=performance.now();
const OSRA_BUILD='OsRa v110 — 2026-10-08 — R34 BOOT HEARTS + CUSTOM SURPRISE MESSAGES + TIMING';
const DB='OsRaDB', VER=100, THUMB_VERSION=6, THUMB_MAX_BYTES=160*1024;
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const DEFAULT={settings:{startDate:'',engagementDate:'',birthdayRania:'',osamaPhone:'',raniaPhone:'',whatsappUrl:'',libraryName:'',soundEnabled:false,surprisesEnabled:true,dailyAlbumIds:null,albumOrderMode:'manual',albumMiniView:false,messagesOrder:'desc',hideScanProgressCard:false,countdowns:[],surpriseTiming:'10',surpriseSpeed:'normal',customSurpriseMessages:[]},memories:[],events:[],dreams:[],verses:[],prayers:[],messages:[],excludedPhotos:[]};
const thumbCache=new Map();const THUMB_CACHE_MAX=96;let thumbHydrateQueue=new Set(),thumbHydrateTimer=0;
let excludedCacheSource=null,excludedCacheSet=new Set();
let db,state=structuredClone(DEFAULT),libraryHandle=null,backupFileHandle=null,backupMeta={lastSavedAt:0,lastAutoFileAt:0},hqSourceHandle=null,hqSourceMeta={name:'',manifestVersion:1},hqIndex=new Map(),hqBuildCheckpoint=null,hqBuildSelection=null,hqBuildStopRequested=false,photos=new Map(),sources=[],activeSourceId=null,scanProgresses={},permissionCache=new Set(),permissionDeniedCache=new Set(),searchState={query:'',messageId:'',fromSection:'home'},section='home',busy=false,scanLock=false,scanStopRequested=false,scanCheckpoint=null,scanProgressWrite=Promise.resolve(),dragSelectMode=false,dragSelecting=false,dragSelectValue=true,dragVisited=new Set(),dragPointerId=null,dragScrollTimer=null,dragLastX=0,dragLastY=0,dragLongPressTimer=null,dragPending=false,dragPendingPhoto='',dragPendingItem=null,dragPendingX=0,dragPendingY=0,quickTapHandledUntil=0,reindexRestorePool=[],duplicateModalGroups=[],installEvent=null,soundOn=false,audioCtx=null,lb={ids:[],i:0,url:null,thumbUrl:null,loadToken:0,timer:null,touchX:null,touchY:null,zoom:1,panX:0,panY:0,dragX:null,dragY:null,dragPanX:0,dragPanY:0,pinchStart:0,pinchBase:1,lastTap:0,lastTapX:0,lastTapY:0,flipBusy:false,flipTimer:null,flipUrls:[]},currentMemoryId=null,selectedPhotos=new Set(),selectedMemories=new Set(),calendarDate=today(),calendarCursor=null,safetyTimer=null,recoveryCandidate=null,recoveryNoticeHidden=false,pendingFolderRoot=null,pendingFolderName='',albumBookIndex=0,albumBookBusy=false,albumBookTimer=null,albumBookToken=0;
let lastLinkReport=null,linkProgresses={},linkProgressTimer=null,linkRunStartedAt=0,albumReviewState=null,manualLinkSession=null,visualLinkSession=null,visualLinkStopRequested=false,romanticTickerTimer=null,romanticTickerCloseTimer=null,romanticDelightTimer=null,romanticKissTimer=null,romanticKissShownKey='',romanticLongBusy=false,occasionCelebrationBusy=false;
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=p=>p+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
function isImage(n){return /\.(jpe?g|png|webp|gif|avif|heic|heif|tif?f|bmp)$/i.test(String(n||''))}
function isImageFile(file){return !!file&&(isImage(file.name)||/^image\//i.test(file.type||''))}
function isPhotoRecord(p){return !!p&&!p.excluded&&(isImage(p.name)||/^image\//i.test(p.mimeType||''))}
const allPhotos=()=>[...photos.values()].filter(isPhotoRecord);
function toast(m){const t=$('#toast');if(!t)return;t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2800)}
function activeSource(){return sources.find(s=>s.id===activeSourceId)||sources[0]||null}
function sourceForPhoto(p){if(!p)return activeSource();return sources.find(s=>s.id===p.sourceId&&s.handle)||photoLocations(p).map(l=>sources.find(s=>s.id===l.sourceId&&s.handle)).find(Boolean)||sources[0]||null}
function photoPathKey(sourceId,rel){return `${sourceId||'legacy-main'}::${String(rel||'')}`}
function scanAlbumName(source,rel){const parts=String(rel||'').split('/').filter(Boolean);if(source?.mergeIntoMemoryId){const m=state.memories.find(x=>x.id===source.mergeIntoMemoryId);if(m)return m.album||m.title||source.name||'ألبوم مدموج'}return source?.asAlbum?(source.name||'ألبوم جديد'):(parts[0]||'صور')}
function sourceMergeLabel(s){if(!s?.mergeIntoMemoryId)return'';const m=state.memories.find(x=>x.id===s.mergeIntoMemoryId);return m?` • مدمج مع «${m.title||m.album||'ألبوم'}»`:''}
function sourceLabel(s){return s?.name||'مجلد الصور'}
function normalizePhotoLinks(p){
 const out=[],seen=new Set();
 const add=(x)=>{if(!x?.sourceId||!x?.relPath)return;const k=`${x.sourceId}::${x.relPath}`;if(seen.has(k))return;seen.add(k);out.push({sourceId:x.sourceId,relPath:String(x.relPath),name:x.name||p.name||'',size:Number(x.size??p.size??0),lastModified:Number(x.lastModified??p.lastModified??0),contentKey:x.contentKey||p.contentKey||'',fingerprint:x.fingerprint||p.fingerprint||'',mimeType:x.mimeType||p.mimeType||'',...(x.verified===true?{verified:true,verifiedAt:Number(x.verifiedAt)||0}:x.verified===false?{verified:false,verifiedAt:Number(x.verifiedAt)||0}:{})})};
 if(Array.isArray(p?.sourceLinks)){for(const x of p.sourceLinks)add(x);if(!p.sourceLinks.length)add({sourceId:p?.sourceId,relPath:p?.relPath,name:p?.name,size:p?.size,lastModified:p?.lastModified,contentKey:p?.contentKey,fingerprint:p?.fingerprint,mimeType:p?.mimeType})}
 else add({sourceId:p?.sourceId,relPath:p?.relPath,name:p?.name,size:p?.size,lastModified:p?.lastModified,contentKey:p?.contentKey,fingerprint:p?.fingerprint,mimeType:p?.mimeType});
 return out;
}
function normalizeAlbumLinkFolders(m){
 const out=[],seen=new Set();
 const add=(x)=>{if(!x?.sourceId)return;const folder=normalizeFolderRelPath(x.folderPath||'');const k=`${x.sourceId}::${folder}`;if(seen.has(k))return;seen.add(k);out.push({sourceId:String(x.sourceId),folderPath:folder,addedAt:Number(x.addedAt)||0,verified:x.verified!==false})};
 if(Array.isArray(m?.linkFolders))for(const x of m.linkFolders)add(x);
 if(m?.linkSourceId)add({sourceId:m.linkSourceId,folderPath:m.linkFolderPath||''});
 return out;
}
function albumHasLinkFolder(m,sourceId,folderPath){const key=`${sourceId}::${normalizeFolderRelPath(folderPath||'')}`;return normalizeAlbumLinkFolders(m).some(x=>`${x.sourceId}::${x.folderPath}`===key)}
function addAlbumLinkFolder(m,sourceId,folderPath,makePrimary=false){if(!m||!sourceId)return false;const folder=normalizeFolderRelPath(folderPath||'');const links=normalizeAlbumLinkFolders(m);const k=`${sourceId}::${folder}`;if(links.some(x=>`${x.sourceId}::${x.folderPath}`===k)){if(makePrimary||!m.linkSourceId){m.linkSourceId=String(sourceId);m.linkFolderPath=folder}m.linkFolders=links;return false}links.push({sourceId:String(sourceId),folderPath:folder,addedAt:Date.now(),verified:true});m.linkFolders=links;if(makePrimary||!m.linkSourceId){m.linkSourceId=String(sourceId);m.linkFolderPath=folder}return true}
function removeAlbumLinkFolder(m,sourceId,folderPath){if(!m)return false;const key=`${sourceId}::${normalizeFolderRelPath(folderPath||'')}`;const kept=normalizeAlbumLinkFolders(m).filter(x=>`${x.sourceId}::${x.folderPath}`!==key);m.linkFolders=kept;const first=kept[0];if(first){m.linkSourceId=first.sourceId;m.linkFolderPath=first.folderPath}else{m.linkSourceId='';m.linkFolderPath=''}return true}
function photoLocations(p){return normalizePhotoLinks(p)}
function syncPhotoPrimary(p,sourceId,relPath){const links=photoLocations(p);const first=links.find(x=>x.sourceId===sourceId&&x.relPath===relPath)||links.find(x=>sources.some(s=>s.id===x.sourceId))||links[0];if(first){p.sourceId=first.sourceId;p.relPath=first.relPath}p.sourceLinks=links;return p}
function addPhotoLink(p,source,f,relPath,fp='',ck=''){if(!p||!source||!relPath)return false;const links=photoLocations(p);const k=`${source.id}::${relPath}`;if(links.some(x=>`${x.sourceId}::${x.relPath}`===k)){syncPhotoPrimary(p,source.id,relPath);return false}links.push({sourceId:source.id,relPath:String(relPath),name:f?.name||p.name||'',size:Number(f?.size??p.size??0),lastModified:Number(f?.lastModified??p.lastModified??0),contentKey:ck||p.contentKey||'',fingerprint:fp||p.fingerprint||'',mimeType:f?.type||p.mimeType||''});p.sourceLinks=links;syncPhotoPrimary(p,source.id,relPath);return true}
function removePhotoLocation(p,sourceId,relPath){if(!p)return false;const kept=photoLocations(p).filter(l=>!(l.sourceId===sourceId&&l.relPath===relPath));p.sourceLinks=kept;if(kept.length)syncPhotoPrimary(p,kept[0].sourceId,kept[0].relPath);else{p.sourceId='';p.relPath=''}return true}
function hasOriginalLink(p){return photoLocations(p).some(l=>sources.some(s=>String(s.id)===String(l.sourceId)&&s.handle)&&l.verified===true)}
function originalLinkCount(p){return photoLocations(p).filter(l=>sources.some(s=>String(s.id)===String(l.sourceId)&&s.handle)&&l.verified===true).length}
function originalCoverage(m){const ps=photoFor(m);if(!ps.length)return 0;return Math.round(ps.filter(hasOriginalLink).length*100/ps.length)}
function originalBadge(p){return hasOriginalLink(p)?'<span class="original-linked" title="الأصل الأصلي مرتبط">✓</span>':''}
function albumOriginalBadge(m){const n=photoFor(m).length,c=originalCoverage(m);if(!n)return'';return `<span class="album-original-badge" style="--fill:${c}%" title="تم العثور على أصل ${c}% من صور هذا الألبوم وربطها" aria-label="الأصول المرتبطة ${c}%">♥</span>`}
async function findOriginalFile(p,ask=true){
 for(const link of photoLocations(p)){
  const source=sources.find(x=>x.id===link.sourceId);if(!source?.handle)continue;
  try{if(!(await ensureSourcePermission(source,ask)))continue;const fh=await resolve(source.handle,link.relPath),f=await fh.getFile();link.verified=true;link.verifiedAt=Date.now();return {file:f,source,link}}
  catch(e){try{link.verified=false;link.verifiedAt=0;const meta={...p,sourceLinks:photoLocations(p)};delete meta.thumbBlob;put('photos',meta).catch(()=>{})}catch{}console.warn('original link unavailable',p?.id,link,e)}
 }
 // Fallback uses the same album-source target saved for the photo. It does not read image pixels.
 const seen=new Set();
 for(const m of visibleMemories()){
  if(!m.photoIds?.includes(p.id))continue;
  const links=normalizeAlbumLinkFolders(m);
  const targets=links.length?links.map(x=>({sourceId:x.sourceId,folderPath:x.folderPath})):m.linkSourceId?[{sourceId:m.linkSourceId,folderPath:m.linkFolderPath||''}]:[];
  for(const t of targets){
   const source=sources.find(x=>String(x.id)===String(t.sourceId));if(!source?.handle||seen.has(source.id+'::'+normalizeFolderRelPath(t.folderPath||'')))continue;
   seen.add(source.id+'::'+normalizeFolderRelPath(t.folderPath||''));
   try{
    if(!(await ensureSourcePermission(source,ask)))continue;const dir=await resolveDirectory(source.handle,t.folderPath||'');
    try{const fh=await dir.getFileHandle(p.name,{create:false}),f=await fh.getFile(),rel=joinFolderRelPath(t.folderPath||'',p.name),link={sourceId:source.id,relPath:rel,name:f.name,size:f.size,lastModified:f.lastModified,mimeType:f.type||p.mimeType||'',contentKey:p.contentKey||'',fingerprint:p.fingerprint||'',verified:true,verifiedAt:Date.now()};return {file:f,source,link}}catch{}
    const stem=normalizeFileStem(p.name);if(!stem)continue;for await(const [name,entry] of dir.entries()){if(entry.kind!=='file'||!isImage(name)||normalizeFileStem(name)!==stem)continue;const f=await entry.getFile(),rel=joinFolderRelPath(t.folderPath||'',name),link={sourceId:source.id,relPath:rel,name:f.name,size:f.size,lastModified:f.lastModified,mimeType:f.type||p.mimeType||'',contentKey:p.contentKey||'',fingerprint:p.fingerprint||'',verified:true,verifiedAt:Date.now()};return {file:f,source,link}}
   }catch(e){console.warn('album target original lookup unavailable',p?.id,m?.title,e)}
  }
 }
 return null;
}

function pickCanonicalPhoto(list){return [...list].sort((a,b)=>{
  const av=hasOriginalLink(a)?1:0,bv=hasOriginalLink(b)?1:0;if(av!==bv)return bv-av;
  const am=a.manualAlbum||a.layoutLocked?1:0,bm=b.manualAlbum||b.layoutLocked?1:0;if(am!==bm)return bm-am;
  return (a.addedAt||0)-(b.addedAt||0);
 })[0]||null}
// ==================== Isolated duplicate review engine ====================
// لا يعمل هذا المحرك عند الإقلاع أو أثناء الفحص أو الربط أو HQ؛ يبدأ فقط بعد ضغط زر المراجعة.
let duplicateScanBusy=false,duplicateScanRun=0,duplicateStopRequested=false,duplicateSignatureCache=new Map(),duplicatePendingChoice=null;
const DUP_PHASH_MAX=8,DUP_DHASH_MAX=12,DUP_AHASH_MAX=12,DUP_ASPECT_MAX=.06,DUP_BRIGHT_MAX=.16;
const DUP_DCT_COS=(()=>{const a=Array.from({length:32},()=>new Float64Array(8));for(let x=0;x<32;x++)for(let u=0;u<8;u++)a[x][u]=Math.cos((2*x+1)*u*Math.PI/64);return a})();
function duplicateVisiblePhotoIds(){return [...visiblePhotoIds()].filter(pid=>{const p=photos.get(pid);return isPhotoRecord(p)&&!excludedIdSet().has(pid)})}
function duplicateHamming(a,b){if(typeof a!=='bigint'||typeof b!=='bigint')return 99;let x=a^b,n=0;while(x){x&=x-1n;n++}return n}
function duplicateBitsFromValues(values,mode='median'){const arr=values.filter(Number.isFinite);if(!arr.length)return 0n;const sorted=[...arr].sort((a,b)=>a-b),thr=mode==='mean'?arr.reduce((a,b)=>a+b,0)/arr.length:sorted[Math.floor(sorted.length/2)];let out=0n;for(let i=0;i<Math.min(64,arr.length);i++)if(arr[i]>=thr)out|=1n<<BigInt(i);return out}
async function imageSignatureFromThumb(blob){if(!blob)return null;let bitmap=null,url='';try{if(typeof createImageBitmap==='function')bitmap=await createImageBitmap(blob,{imageOrientation:'from-image'});else{url=URL.createObjectURL(blob);bitmap=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=url})}const c=document.createElement('canvas');c.width=32;c.height=32;const ctx=c.getContext('2d',{willReadFrequently:true,alpha:false});if(!ctx)return null;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(bitmap,0,0,32,32);const d=ctx.getImageData(0,0,32,32).data,gray=new Float64Array(1024);let sum=0,sum2=0;for(let i=0,p=0;i<1024;i++,p+=4){const g=.299*d[p]+.587*d[p+1]+.114*d[p+2];gray[i]=g;sum+=g;sum2+=g*g}const mean=sum/1024,std=Math.sqrt(Math.max(0,sum2/1024-mean*mean))||1;const aVals=[];for(let by=0;by<8;by++)for(let bx=0;bx<8;bx++){let q=0;for(let y=0;y<4;y++)for(let x=0;x<4;x++)q+=(gray[(by*4+y)*32+(bx*4+x)]-mean)/std;aVals.push(q/16)}const aHash=duplicateBitsFromValues(aVals,'mean');const dVals=[];for(let y=0;y<8;y++){const yy=Math.round(y*31/7);for(let x=0;x<8;x++){const xa=Math.round(x*31/8),xb=Math.round((x+1)*31/8);dVals.push(gray[yy*32+xb]-gray[yy*32+xa])}}const dHash=duplicateBitsFromValues(dVals,'mean');const coeff=[];for(let v=0;v<8;v++)for(let u=0;u<8;u++){let acc=0;for(let y=0;y<32;y++){const cy=DUP_DCT_COS[y][v];for(let x=0;x<32;x++)acc+=((gray[y*32+x]-mean)/std)*DUP_DCT_COS[x][u]*cy}coeff.push(acc)}const pHash=duplicateBitsFromValues(coeff.slice(1),'median'),w=bitmap.width||32,h=bitmap.height||32;return {pHash,dHash,aHash,aspect:h?Number(w/h):1,brightness:mean/255}}catch{return null}finally{try{bitmap?.close?.()}catch{}if(url)try{URL.revokeObjectURL(url)}catch{}}}
async function getThumbBlobsBatch(ids){const out=new Map(),uncached=[];for(const pid of ids){if(thumbCache.has(pid))out.set(pid,thumbCache.get(pid));else uncached.push(pid)}if(!uncached.length)return out;await new Promise((resolve,reject)=>{let tx;try{tx=db.transaction('thumbs','readonly')}catch(e){reject(e);return}const os=tx.objectStore('thumbs');for(const pid of uncached){const r=os.get(pid);r.onsuccess=()=>{const b=r.result?.blob;if(b){out.set(pid,b);thumbCache.set(pid,b);while(thumbCache.size>THUMB_CACHE_MAX){const first=thumbCache.keys().next().value;thumbCache.delete(first)}}};r.onerror=()=>{}}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('thumbnail batch read failed'));tx.onabort=()=>reject(tx.error||new Error('thumbnail batch read aborted'))});return out}
function duplicateExactGroups(ids){const groups=new Map();for(const pid of ids){const p=photos.get(pid);if(!p)continue;const key=p.contentKey?`ck:${p.contentKey}`:(p.sourceId&&p.relPath?`path:${p.sourceId}::${normalizeFolderRelPath(p.relPath)}`:'');if(!key)continue;const a=groups.get(key)||[];a.push(p);groups.set(key,a)}return [...groups.values()].filter(g=>g.length>1).sort((a,b)=>b.length-a.length).map(items=>({type:'exact',confidence:100,evidence:'تطابق محتوى/مسار قوي',items}))}
async function duplicateVisualGroups(signatures,excludedIds,statusEl){const usable=signatures.filter(x=>!excludedIds.has(x.id)),n=usable.length,parent=new Int32Array(n),rank=new Uint8Array(n);for(let i=0;i<n;i++)parent[i]=i;const buckets=new Map();for(let i=0;i<n;i++){const h=usable[i].pHash;for(let shift=0;shift<64;shift+=4){const key=`${shift}:${Number((h>>BigInt(shift))&15n)}`;const a=buckets.get(key)||[];a.push(i);buckets.set(key,a)}}const find=x=>{let r=x;while(parent[r]!==r)r=parent[r];while(parent[x]!==x){const q=parent[x];parent[x]=r;x=q}return r};const unite=(a,b)=>{a=find(a);b=find(b);if(a===b)return;if(rank[a]<rank[b])[a,b]=[b,a];parent[b]=a;if(rank[a]===rank[b])rank[a]++};let compared=0,matched=0;for(let i=0;i<n;i++){if(duplicateStopRequested)throw Object.assign(new Error('duplicate-scan-cancelled'),{name:'DuplicateScanCancelled'});const cand=new Set(),h=usable[i].pHash;for(let shift=0;shift<64;shift+=4)for(const j of buckets.get(`${shift}:${Number((h>>BigInt(shift))&15n)}`)||[])if(j>i)cand.add(j);for(const j of cand){const a=usable[i],b=usable[j];if(Math.abs(a.aspect-b.aspect)>DUP_ASPECT_MAX||Math.abs(a.brightness-b.brightness)>DUP_BRIGHT_MAX)continue;compared++;const pd=duplicateHamming(a.pHash,b.pHash),dd=duplicateHamming(a.dHash,b.dHash),ad=duplicateHamming(a.aHash,b.aHash);if(pd<=DUP_PHASH_MAX&&dd<=DUP_DHASH_MAX&&ad<=DUP_AHASH_MAX){unite(i,j);matched++}}if(statusEl&&i%24===0){statusEl.textContent=`مقارنة التشابه البصري ${i+1} / ${n}`;await new Promise(r=>setTimeout(r,0))}}const grouped=new Map();for(let i=0;i<n;i++){const r=find(i),a=grouped.get(r)||[];a.push(usable[i]);grouped.set(r,a)}return {groups:[...grouped.values()].filter(g=>g.length>1).map(items=>({type:'visual',confidence:95,evidence:'تطابق بصري قوي (pHash + dHash + aHash)',items})),compared,matched}}
async function buildDuplicateSignatures(ids,statusEl){const sigs=[],missing=[],BATCH=48,started=Date.now();for(let at=0;at<ids.length;at+=BATCH){if(duplicateStopRequested)throw Object.assign(new Error('duplicate-scan-cancelled'),{name:'DuplicateScanCancelled'});const chunk=ids.slice(at,Math.min(at+BATCH,ids.length)),blobs=await getThumbBlobsBatch(chunk);for(const pid of chunk){if(duplicateStopRequested)throw Object.assign(new Error('duplicate-scan-cancelled'),{name:'DuplicateScanCancelled'});const cached=duplicateSignatureCache.get(pid);if(cached){sigs.push({id:pid,...cached});continue}const sig=await imageSignatureFromThumb(blobs.get(pid));if(sig){duplicateSignatureCache.set(pid,sig);sigs.push({id:pid,...sig})}else missing.push(pid)}if(statusEl)statusEl.textContent=`تحليل المعاينات ${Math.min(at+BATCH,ids.length)} / ${ids.length} — ${Math.round((Date.now()-started)/1000)}ث`;await new Promise(r=>setTimeout(r,0))}return {sigs,missing}}
async function duplicateStartScan(){if(duplicateScanBusy){toast('مراجعة التكرارات جارية بالفعل.');return}if(scanLock||busy){toast('لا تبدأ مراجعة التكرارات أثناء عملية أخرى.');return}const ids=duplicateVisiblePhotoIds();if(ids.length<2){modal(`<h2>🔎 مراجعة التكرارات</h2><div class="empty">لا توجد صور ظاهرة كافية للمراجعة.</div><div class="actions"><button class="btn" data-action="closeModal">إغلاق</button></div>`);return}duplicateScanBusy=true;duplicateStopRequested=false;const prevBusy=busy,prevScanLock=scanLock;busy=true;scanLock=true;const run=++duplicateScanRun;modal(`<h2>🔎 مراجعة التكرارات</h2><p id="duplicateScanStatus">بدء تحليل ${ids.length} صورة…</p><p class="meta">هذه العملية معزولة ولا تعمل تلقائيًا. يمكنك إلغاؤها في أي لحظة، ولن يتم تعديل أي صورة أثناء التحليل.</p><div class="actions"><button class="btn danger" data-action="cancelDuplicateScan">إلغاء الفحص</button></div>`);const statusEl=$('#duplicateScanStatus');try{const exact=duplicateExactGroups(ids),exactIds=new Set(exact.flatMap(g=>g.items.map(p=>p.id)));if(duplicateStopRequested)throw Object.assign(new Error('duplicate-scan-cancelled'),{name:'DuplicateScanCancelled'});statusEl.textContent=`تم العثور على ${exact.length} مجموعة تطابق قوي. جارٍ الفحص البصري للباقي…`;const {sigs,missing}=await buildDuplicateSignatures(ids.filter(id=>!exactIds.has(id)),statusEl);if(run!==duplicateScanRun||duplicateStopRequested)throw Object.assign(new Error('duplicate-scan-cancelled'),{name:'DuplicateScanCancelled'});const visual=await duplicateVisualGroups(sigs,exactIds,statusEl);if(run!==duplicateScanRun||duplicateStopRequested)throw Object.assign(new Error('duplicate-scan-cancelled'),{name:'DuplicateScanCancelled'});duplicateModalGroups=[...exact,...visual.groups];duplicateResultsRender({total:ids.length,exactCount:exact.length,visualCount:visual.groups.length,missingCount:missing.length,compared:visual.compared})}catch(e){if(e?.name==='DuplicateScanCancelled'){duplicateModalGroups=[];if($('#modal')?.open)$('#modal').close();toast('تم إلغاء فحص التكرارات دون أي تعديل.')}else{console.error(e);modal(`<h2>🔎 مراجعة التكرارات</h2><div class="empty">تعذر إكمال التحليل. لم يتم تعديل أي صورة.</div><p class="meta">${esc(String(e?.message||e))}</p><div class="actions"><button class="btn" data-action="closeModal">إغلاق</button></div>`)}}finally{duplicateStopRequested=false;duplicateScanBusy=false;busy=prevBusy;scanLock=prevScanLock}}
function cancelDuplicateScan(){if(!duplicateScanBusy)return;duplicateStopRequested=true;duplicateScanRun++;duplicateSignatureCache.clear();if($('#modal')?.open)$('#modal').close()}
function duplicateManager(){duplicateStartScan()}
function normalizeAlbumKey(v){return String(v||'').trim().toLocaleLowerCase().replace(/\s+/g,' ')}
async function repairAutoDuplicateAlbums(){
 const groups=new Map();
 for(const m of state.memories){if(m.hidden||m.autoAlbum===false)continue;const key=normalizeAlbumKey(m.album||m.title);if(!key)continue;const a=groups.get(key)||[];a.push(m);groups.set(key,a)}
 let changed=false,hidden=0;
 for(const group of groups.values()){
  if(group.length<2)continue;
  group.sort((a,b)=>((a.userEdited?0:1)-(b.userEdited?0:1))||((a.order??0)-(b.order??0))||String(a.id).localeCompare(String(b.id)));
  const keep=group[0];if(!Array.isArray(keep.photoIds))keep.photoIds=[];const set=new Set(keep.photoIds);
  for(const dup of group.slice(1)){
   for(const pid of (dup.photoIds||[])){if(!set.has(pid)){keep.photoIds.push(pid);set.add(pid)}}
   dup.hidden=true;dup.duplicateOf=keep.id;hidden++;changed=true
  }
 }
 return {changed,hidden}
}
async function persistReindexPool(){await put('library',{key:'reindexRestorePool',value:structuredClone(reindexRestorePool)});}
function removeExcludedMatch(ck='',fp='',relPath='',sourceId=''){const before=state.excludedPhotos.length;state.excludedPhotos=state.excludedPhotos.filter(x=>!((ck&&x.contentKey&&x.contentKey===ck)||(fp&&x.fingerprint&&x.fingerprint===fp)||(sourceId&&x.sourceId===sourceId&&x.relPath===relPath)));return state.excludedPhotos.length!==before}
function normalizeFolderRelPath(v){return String(v||'').replace(/\\/g,'/').split('/').filter(Boolean).join('/')}
function joinFolderRelPath(a,b){const x=normalizeFolderRelPath(a),y=normalizeFolderRelPath(b);return x?(y?`${x}/${y}`:x):y}
async function persistSources(){await put('library',{key:'sources',items:sources.map(s=>({id:s.id,name:s.name,handle:s.handle,asAlbum:!!s.asAlbum,directAlbumFolder:!!s.directAlbumFolder,mergeIntoMemoryId:s.mergeIntoMemoryId||'',createdAt:s.createdAt||Date.now()}))});if(sources[0])await put('library',{key:'main',handle:sources[0].handle,name:sources[0].name||''})}
async function setActiveSource(source,save=true){if(!source)return false;activeSourceId=source.id;libraryHandle=source.handle;state.settings.libraryName=sources[0]?.name||source.name||'';scanCheckpoint=scanProgresses[source.id]||null;if(save)await put('library',{key:'activeSource',sourceId:source.id});return true}
async function getSourceByHandle(handle){if(!handle)return null;for(const source of sources){try{if(await source.handle.isSameEntry(handle))return source}catch{}}return null}
async function findContainingSource(handle){if(!handle)return null;for(const source of sources){if(!source?.handle)continue;try{if(await source.handle.isSameEntry(handle))return {source,relPath:''};if(typeof source.handle.resolve==='function'){const rel=await source.handle.resolve(handle);if(Array.isArray(rel))return {source,relPath:rel.join('/')};}}catch{}}return null}
async function ensureSourcePermission(source,ask=true){if(!source?.handle)return false;if(permissionCache.has(source.id))return true;try{const q=await source.handle.queryPermission({mode:'read'});if(q==='granted'){permissionDeniedCache.delete(source.id);permissionCache.add(source.id);return true}if(!ask||permissionDeniedCache.has(source.id))return false;const r=await source.handle.requestPermission({mode:'read'});if(r==='granted'){permissionDeniedCache.delete(source.id);permissionCache.add(source.id);return true}permissionDeniedCache.add(source.id)}catch{}return false}
async function permission(){return ensureSourcePermission(activeSource(),true)}
function dbOpen(){return new Promise((ok,no)=>{
 const r=indexedDB.open(DB,VER);
 r.onupgradeneeded=e=>{
  const d=r.result,tx=r.transaction,oldVersion=e.oldVersion;
  if(!d.objectStoreNames.contains('state'))d.createObjectStore('state',{keyPath:'key'});
  if(!d.objectStoreNames.contains('photos'))d.createObjectStore('photos',{keyPath:'id'});
  if(!d.objectStoreNames.contains('library'))d.createObjectStore('library',{keyPath:'key'});
  if(!d.objectStoreNames.contains('thumbs')) d.createObjectStore('thumbs',{keyPath:'id'});
  // Preserve any legacy thumbnails stored inside photos while upgrading an existing database.
  // Never clear or delete an object store; this runs only during IndexedDB schema upgrades.
  {
   const ts=tx.objectStore('thumbs');
   const ps=tx.objectStore('photos');
   ps.openCursor().onsuccess=ev=>{
    const c=ev.target.result;if(!c)return;
    const v=c.value;
    if(v?.thumbBlob){
      ts.put({id:v.id,blob:v.thumbBlob,version:v.thumbVersion||THUMB_VERSION});
      delete v.thumbBlob;c.update(v);
    }
    c.continue();
   };
  }
 };
 r.onsuccess=()=>{db=r.result;ok()};r.onerror=()=>no(r.error);
})}
const get=(s,k)=>new Promise((ok,no)=>{const r=db.transaction(s).objectStore(s).get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const put=(s,v)=>new Promise((ok,no)=>{const r=db.transaction(s,'readwrite').objectStore(s).put(v);r.onsuccess=()=>ok();r.onerror=()=>no(r.error)});
const putMany=(s,values)=>new Promise((ok,no)=>{const tx=db.transaction(s,'readwrite'),os=tx.objectStore(s);try{for(const v of values)os.put(v)}catch(e){no(e);return}tx.oncomplete=()=>ok();tx.onerror=()=>no(tx.error||new Error('IndexedDB bulk write failed'));tx.onabort=()=>no(tx.error||new Error('IndexedDB bulk write aborted'))});
const del=(s,k)=>new Promise((ok,no)=>{const r=db.transaction(s,'readwrite').objectStore(s).delete(k);r.onsuccess=()=>ok();r.onerror=()=>no(r.error)});
const getAll=s=>new Promise((ok,no)=>{const r=db.transaction(s).objectStore(s).getAll();r.onsuccess=()=>ok(r.result||[]);r.onerror=()=>no(r.error)});
async function savePhoto(p){if(!p?.id)return;const meta={...p};const blob=meta.thumbBlob;delete meta.thumbBlob;await put('photos',meta);if(blob && typeof blob.arrayBuffer==='function'){duplicateSignatureCache?.delete?.(p.id);await put('thumbs',{id:p.id,blob,version:p.thumbVersion||THUMB_VERSION});thumbCache.set(p.id,blob);while(thumbCache.size>THUMB_CACHE_MAX){const first=thumbCache.keys().next().value;thumbCache.delete(first)}}}
async function deletePhotoRecord(id){await del('photos',id);try{await del('thumbs',id)}catch{}}

function normalizeState(){
 state={...structuredClone(DEFAULT),...state,settings:{...DEFAULT.settings,...(state.settings||{})},excludedPhotos:Array.isArray(state.excludedPhotos)?state.excludedPhotos:[]};
 if(!(state.settings.dailyAlbumIds===null||Array.isArray(state.settings.dailyAlbumIds)))state.settings.dailyAlbumIds=null;
 if(!['manual','details','linked'].includes(state.settings.albumOrderMode))state.settings.albumOrderMode='manual';
 if(!['asc','desc'].includes(state.settings.messagesOrder))state.settings.messagesOrder='desc';
 const legacyTiming=String(state.settings.surpriseTiming||'10');
 if(['random-fast','random-slow'].includes(legacyTiming)){
  if(!state.settings.surpriseSpeed||state.settings.surpriseSpeed==='normal')state.settings.surpriseSpeed=legacyTiming==='random-fast'?'fast':'slow';
  state.settings.surpriseTiming=legacyTiming==='random-fast'?'5':'20';
 }
 if(!['3','5','10','20','30','60','180'].includes(String(state.settings.surpriseTiming||'')))state.settings.surpriseTiming='10';
 if(!['fast','normal','slow','random-all'].includes(String(state.settings.surpriseSpeed||'')))state.settings.surpriseSpeed='normal';
 if(!Array.isArray(state.settings.customSurpriseMessages))state.settings.customSurpriseMessages=[];
 state.settings.customSurpriseMessages=[...new Set(state.settings.customSurpriseMessages.map(x=>String(x||'').trim()).filter(Boolean))].slice(0,100);
 if(typeof state.settings.albumMiniView!=='boolean')state.settings.albumMiniView=false;
 if(typeof state.settings.surprisesEnabled!=='boolean')state.settings.surprisesEnabled=true;
 if(typeof state.settings.hideScanProgressCard!=='boolean')state.settings.hideScanProgressCard=false;
 if(!Array.isArray(state.settings.countdowns))state.settings.countdowns=[];
 state.settings.countdowns=state.settings.countdowns.map(x=>({...x,id:x.id||id('cnt'),title:String(x.title||'موعد مهم'),date:String(x.date||''),emoji:String(x.emoji||'⏳'),showHome:x.showHome!==false,annual:!!x.annual})).filter(x=>x.date&&/^\d{4}-\d{2}-\d{2}$/.test(x.date));if(!state.settings.countdownCelebrateOffOnDate||typeof state.settings.countdownCelebrateOffOnDate!=='object')state.settings.countdownCelebrateOffOnDate={};
 state.memories=(state.memories||[]).map((m,i)=>{const date=m.date||m.startDate||'',linkFolders=normalizeAlbumLinkFolders(m);const first=linkFolders[0];return {...m,date,endDate:m.endDate||date,order:Number.isFinite(m.order)?m.order:i,photoIds:Array.isArray(m.photoIds)?[...new Set(m.photoIds)]:[],linkSourceId:m.linkSourceId||first?.sourceId||'',linkFolderPath:normalizeFolderRelPath(m.linkFolderPath||first?.folderPath||''),linkFolders}});
 state.events=(state.events||[]).map(e=>({...e,date:e.date||''}));
 state.excludedPhotos=(state.excludedPhotos||[]).map(x=>({...x,fingerprint:x.fingerprint||'',contentKey:x.contentKey||'',sourceLinks:Array.isArray(x.sourceLinks)?x.sourceLinks:[],memoryRefs:Array.isArray(x.memoryRefs)?x.memoryRefs:[]}));
 // لا ندمج سجلات الاستبعاد المختلفة اعتمادًا على contentKey وحده؛ فقد تكون
 // الصورة نفسها مرتبطة بأكثر من ألبوم/مصدر، ويجب ألا تضيع مواضعها عند إعادة الفهرسة.
 const em=new Map();for(const x of state.excludedPhotos){const k=x.id||`${x.sourceId||''}|${x.relPath||''}|${x.size||0}|${x.lastModified||0}`;if(!em.has(k))em.set(k,x);else{const y=em.get(k);y.sourceLinks=[...(y.sourceLinks||[]),...(x.sourceLinks||[])].filter((l,i,a)=>a.findIndex(z=>z.sourceId===l.sourceId&&z.relPath===l.relPath)===i);y.memoryRefs=[...(y.memoryRefs||[]),...(x.memoryRefs||[])].filter((r,i,a)=>a.findIndex(z=>z.memoryId===r.memoryId&&z.index===r.index)===i);em.set(k,y)}}state.excludedPhotos=[...em.values()];invalidateExcludedCache();
}

function recoveryScore(x){if(!x||(x.app&&x.app!=='OsRa'))return 0;let n=0;for(const k of ['memories','events','dreams','verses','prayers','messages'])n+=Array.isArray(x[k])?x[k].length:0;n+=Array.isArray(x.photoManifest)?Math.min(100,x.photoManifest.length):0;const st=x.settings||{};for(const k of ['startDate','engagementDate','birthdayRania','osamaPhone','raniaPhone','whatsappUrl'])if(st[k])n++;n+=Array.isArray(st.countdowns)?Math.min(20,st.countdowns.length*2):0;return n}
function recoveryLabel(x){const d=x?.exportedAt?new Date(x.exportedAt):null;return d&&!isNaN(d)?d.toLocaleString('ar-EG'):'وقت غير معروف'}
function updateSoundButton(){const b=$('#soundBtn');if(!b)return;b.textContent=soundOn?'🔊':'🔇';b.classList.toggle('sound-on',soundOn);b.title=soundOn?'إيقاف صوت قلب الورق':'تفعيل صوت قلب الورق'}
function surprisesAreEnabled(){return state.settings.surprisesEnabled!==false}
function updateSurpriseButton(){const b=$('#surpriseBtn');if(!b)return;const on=surprisesAreEnabled();b.textContent=on?'🎉 احتفل 🥳':'🎉 احتفل nicht 😔';b.classList.toggle('surprises-on',on);b.classList.toggle('surprises-off',!on);b.setAttribute('aria-pressed',String(on));b.title=on?'إيقاف كل الرسائل العشوائية والاحتفالات':'تشغيل كل الرسائل العشوائية والاحتفالات'}
function surpriseTimingProfile(){
 const m=String(state.settings.surpriseTiming||'10');
 const map={'3':3000,'5':5000,'10':10000,'20':20000,'30':30000,'60':60000,'180':180000};
 const speedKey=String(state.settings.surpriseSpeed||'normal');
 const motionMap={fast:{factor:1.52,key:'fast'},normal:{factor:1,key:'normal'},slow:{factor:.73,key:'slow'}};
 let interval=map[m]||10000;
 let randomSpeedKey=speedKey;
 let randomTimingKey=m;
 if(speedKey==='random-all'){
  const timingKeys=['3','5','10','20','30','60','180'];
  randomTimingKey=timingKeys[Math.floor(Math.random()*timingKeys.length)];
  interval=map[randomTimingKey];
  const keys=['fast','normal','slow'];
  randomSpeedKey=keys[Math.floor(Math.random()*keys.length)];
 }
 const motion=motionMap[randomSpeedKey]||motionMap.normal;
 return {interval,speed:motion.factor,key:motion.key,timingKey:randomTimingKey,speedKey:randomSpeedKey,randomAll:speedKey==='random-all'};
}
function surpriseTimingLabel(){const m=String(state.settings.surpriseTiming||'10');return ({'3':'كل 3 ثوانٍ','5':'كل 5 ثوانٍ','10':'كل 10 ثوانٍ','20':'كل 20 ثانية','30':'كل 30 ثانية','60':'كل دقيقة','180':'كل 3 دقائق'})[m]||'كل 10 ثوانٍ'}
function surpriseSpeedLabel(){const m=String(state.settings.surpriseSpeed||'normal');return ({fast:'سريع',normal:'متوسط',slow:'بطيء','random-all':'عشوائي للكل'})[m]||'متوسط'}
function initBootRibbon(){
 const el=document.getElementById('bootJoyRibbon');
 if(el){
  const palettes=['red-purple','purple-red','rose-violet','violet-rose'];
  const palette=palettes[Math.floor(Math.random()*palettes.length)];
  el.classList.remove(...palettes);el.classList.add(palette);
  el.style.setProperty('--boot-ribbon-spin',`${Math.random()<.5?'left':'right'}`);
  const glyphSets=[
   ['♥','🌹','💕','✨','🌸','💋','💗','🎈','💐','♥'],
   ['❤️','🌷','💖','✨','🌹','💋','💞','🎈','🌸','❤️'],
   ['💜','🌸','💗','💐','😘','✨','💕','🌹','🎈','💜'],
   ['♥️','💐','🌷','💖','💋','🌸','✨','💗','🌹','♥️']
  ];
  el.querySelector('span').textContent=glyphSets[Math.floor(Math.random()*glyphSets.length)].join(' ');
 }
 const loader=document.getElementById('bootHeartLoader');
 if(loader){
  loader.innerHTML='';
  const glyphs=['♥','🌹','💗','🌸','💋','💕','✨','💐','🎈','❤️'];
  const colors=[
   ['#b71c1c','#e53935','#c62828','#7b3f8c','#8e44ad'],
   ['#7b3f8c','#9b59b6','#c2185b','#e91e63','#b71c1c'],
   ['#b71c1c','#6c4664','#e53935','#8e44ad','#ad1457']
  ][Math.floor(Math.random()*3)];
  const count=18;
  for(let i=0;i<count;i++){
   const s=document.createElement('span');
   s.className='boot-heart-loader-item';
   s.textContent=glyphs[Math.floor(Math.random()*glyphs.length)];
   s.style.setProperty('--i',String(i));
   s.style.color=colors[i%colors.length];
   s.style.animationDelay=`${(i*0.105).toFixed(2)}s`;
   loader.appendChild(s);
  }
 }
}
function clearSurpriseLayers(){['romanticSceneLayer','romanticMessageBubble','romanticLongLayer','romanticBalloonLayer','romanticEffectLayer','romanticFloatLayer','occasionCelebration'].forEach(id=>{const el=document.getElementById(id);if(el)el.remove()});const ticker=document.getElementById('romanticTicker');if(ticker){ticker.classList.remove('show');const tx=document.getElementById('romanticTickerText');if(tx)tx.textContent=''}clearTimeout(romanticTickerCloseTimer);clearTimeout(romanticKissTimer);romanticKissTimer=null;clearTimeout(romanticDelightTimer);romanticDelightTimer=null;occasionCelebrationBusy=false;romanticLongBusy=false}
async function toggleSurprises(){state.settings.surprisesEnabled=!surprisesAreEnabled();await save();if(!surprisesAreEnabled())clearSurpriseLayers();updateSurpriseButton();updateBirthdayUi();if(surprisesAreEnabled()){startRomanticTicker();maybeRunOccasionCelebrations();}renderNoAnim();}
function dataRecoveryCard(){if(!recoveryCandidate)return '';const score=recoveryScore(recoveryCandidate);if(score<=recoveryScore(state))return '';return `<div class="card recovery-card"><h3>🛟 نسخة أمان أفضل متاحة</h3><p>OsRa وجد نسخة أمان تحتوي، بحسب المقارنة الداخلية، على بيانات أكثر من الحالة الحالية.</p><div class="meta">تاريخ النسخة: ${esc(recoveryLabel(recoveryCandidate))}</div><div class="actions"><button class="btn primary" data-action="restoreLocalRecovery">استعادة النسخة</button><button class="btn" data-action="hideRecoveryNotice">إخفاء هذا التنبيه</button></div><p class="meta">لن يتم الاستبدال تلقائيًا. الاستعادة لا تحذف الصور الأصلية من الهاتف، ولا تتم إلا بعد ضغطك على زر الاستعادة.</p></div>`}
function scanProgressText(cp){if(!cp)return'';const n=cp.processed||cp.count||0,a=cp.added||0,u=cp.updated||0,m=cp.moved||0,e=cp.excluded||0;return `تم فحص ${n} صورة${a?` — ${a} جديدة`:''}${u?` — ${u} محدثة`:''}${m?` — ${m} منقولة`:''}${e?` — ${e} مستبعدة`:''}`}
function scanProgressCard(){const cp=scanCheckpoint;if(!cp||state.settings.hideScanProgressCard)return'';const running=cp.status==='running'||cp.status==='paused';if(!running)return'';const label=cp.lastRelPath?`آخر ملف وصل إليه الفحص: <b>${esc(cp.lastRelPath)}</b>`:'الفحص بدأ ولم يسجل أول صورة بعد.';return `<div class="card scan-progress-card"><h3>🔄 فحص الصور غير مكتمل</h3><p>${cp.status==='paused'?'الفحص متوقف ومحفوظ ويمكن استكماله.':'الفحص يعمل الآن، ويمكن إيقافه بأمان في أي لحظة.'}</p><div class="meta">${label}</div><div class="meta">${esc(scanProgressText(cp))}</div><div class="actions">${cp.status==='running'?`<button class="btn danger" data-action="stopScan">⏹ إيقاف الفحص</button>`:''}<button class="btn primary" data-action="resumeScan">استكمال الفحص</button><button class="btn" data-action="scanFresh">بدء فحص كامل</button><button class="btn" data-action="hideScanProgressCard">إخفاء القائمة</button></div></div>`}
async function persistScanProgress(patch={}){const sid=scanCheckpoint?.sourceId||activeSourceId;if(!sid)return;scanCheckpoint={...(scanCheckpoint||{}),...patch,sourceId:sid,updatedAt:Date.now()};scanProgresses[sid]=structuredClone(scanCheckpoint);scanProgressWrite=scanProgressWrite.then(async()=>{await put('library',{key:'scanProgresses',value:structuredClone(scanProgresses)});await put('library',{key:'scanProgress',value:structuredClone(scanCheckpoint)})}).catch(e=>{console.warn('scan progress save failed',e)});return scanProgressWrite}
async function clearScanProgress(sourceId=activeSourceId){if(!sourceId){scanCheckpoint=null;return}delete scanProgresses[sourceId];if(sourceId===activeSourceId)scanCheckpoint=null;scanProgressWrite=scanProgressWrite.then(async()=>{await put('library',{key:'scanProgresses',value:structuredClone(scanProgresses)});const a=activeSource();if(a&&a.id===sourceId)await del('library','scanProgress')}).catch(e=>{console.warn('scan progress clear failed',e)});return scanProgressWrite}
async function consolidateNestedSources(){
 if(sources.length<2)return false;
 const replacements=new Map();
 for(let i=0;i<sources.length;i++){
  const child=sources[i];if(!child?.handle)continue;let best=null;
  for(let j=0;j<sources.length;j++){
   if(i===j)continue;const parent=sources[j];if(!parent?.handle)continue;
   try{if(parent.handle.isSameEntry&&await parent.handle.isSameEntry(child.handle))continue;if(typeof parent.handle.resolve!=='function')continue;const rel=await parent.handle.resolve(child.handle);if(!Array.isArray(rel))continue;const candidate={parent,relPath:rel.join('/')};if(!best||candidate.relPath.split('/').length>best.relPath.split('/').length)best=candidate}catch{}
  }
  if(best)replacements.set(child.id,best);
 }
 if(!replacements.size)return false;
 const removeIds=new Set(),changedPhotos=[];
 for(const [childId,info] of replacements){
  const parent=info.parent,prefix=normalizeFolderRelPath(info.relPath);
  for(const m of state.memories){if(String(m.linkSourceId)===String(childId)){m.linkSourceId=parent.id;m.linkFolderPath=joinFolderRelPath(prefix,m.linkFolderPath||'')}if(Array.isArray(m.linkFolders)){m.linkFolders=m.linkFolders.map(x=>String(x.sourceId)===String(childId)?{...x,sourceId:parent.id,folderPath:joinFolderRelPath(prefix,x.folderPath||'')}:x)}}
  for(const p of photos.values()){
   let changed=false;const links=photoLocations(p).map(l=>{if(String(l.sourceId)!==String(childId))return l;changed=true;return {...l,sourceId:parent.id,relPath:joinFolderRelPath(prefix,l.relPath)}});const dedup=[...new Map(links.map(l=>[`${l.sourceId}::${l.relPath}`,l])).values()];
   if(changed||dedup.length!==links.length){p.sourceLinks=dedup;const primary=dedup.find(l=>String(l.sourceId)===String(parent.id))||dedup[0];if(primary){p.sourceId=primary.sourceId;p.relPath=primary.relPath}changedPhotos.push({...p,sourceLinks:dedup.map(l=>({...l}))})}
  }
  for(const x of state.excludedPhotos||[]){if(!Array.isArray(x.sourceLinks))continue;const links=x.sourceLinks.map(l=>String(l.sourceId)===String(childId)?{...l,sourceId:parent.id,relPath:joinFolderRelPath(prefix,l.relPath)}:l);x.sourceLinks=[...new Map(links.map(l=>[`${l.sourceId}::${l.relPath}`,l])).values()];if(String(x.sourceId)===String(childId)){x.sourceId=parent.id;x.relPath=joinFolderRelPath(prefix,x.relPath)}}
  removeIds.add(childId);if(activeSourceId===childId)activeSourceId=parent.id;
 }
 const uniq=[...new Map(changedPhotos.map(x=>[x.id,x])).values()].map(x=>{const m={...x};delete m.thumbBlob;return m});if(uniq.length)await putMany('photos',uniq);
 sources=sources.filter(s=>!removeIds.has(s.id));for(const sid of removeIds){delete scanProgresses[sid];delete linkProgresses[sid]}
 await persistSources();await put('library',{key:'scanProgresses',value:structuredClone(scanProgresses)});await put('library',{key:'linkProgresses',value:structuredClone(linkProgresses)});await saveMainExact();
 return true;
}

async function load(){
 const [st,safety,preRestore,main,sr,ar,b,hq,hqcp,hqsel,hqlast,rawPhotos,sp,legacy,rp,lr,lp,recoveryHidden]=await Promise.all([
  get('state','main'),get('state','safetyBackup'),get('state','preRestoreBackup'),get('library','main'),get('library','sources'),get('library','activeSource'),get('library','backup'),get('library','hqSource'),get('library','hqBuildProgress'),get('library','hqBuildSelection'),get('library','hqLastBuildReport'),getAll('photos'),get('library','scanProgresses'),get('library','scanProgress'),get('library','reindexRestorePool'),get('library','lastLinkReport'),get('library','linkProgresses'),get('library','recoveryNoticeHidden')
 ]);
 if(st)state={...structuredClone(DEFAULT),...st.value};normalizeState();
 recoveryNoticeHidden=recoveryHidden?.value===true;const candidates=[safety?.value,preRestore?.value].filter(x=>x&&recoveryScore(x)>0);const cur=recoveryScore(state);candidates.sort((a,b)=>recoveryScore(b)-recoveryScore(a));recoveryCandidate=!recoveryNoticeHidden&&candidates[0]&&recoveryScore(candidates[0])>cur?structuredClone(candidates[0]):null;hqBuildCheckpoint=hqcp?.value&&hqcp.value.status!=='done'?hqcp.value:null;hqBuildSelection=hqsel?.value||null;window.__osraHqLastBuildReport=hqlast?.value||null;
 if(Array.isArray(sr?.items))sources=sr.items.filter(x=>x?.handle).map((x,i)=>({id:x.id||`src-legacy-${i}`,name:x.name||x.handle.name||'مجلد الصور',handle:x.handle,asAlbum:!!x.asAlbum,directAlbumFolder:!!x.directAlbumFolder,mergeIntoMemoryId:x.mergeIntoMemoryId||'',createdAt:x.createdAt||Date.now()}));
 if(!sources.length&&main?.handle){sources=[{id:'src-main',name:main.name||main.handle.name||'مكتبة الصور',handle:main.handle,asAlbum:false,createdAt:Date.now()}];await persistSources()}
 activeSourceId=(ar?.sourceId&&sources.some(x=>x.id===ar.sourceId)?ar.sourceId:sources[0]?.id)||null;const active=activeSource();libraryHandle=active?.handle||main?.handle||null;if(active)state.settings.libraryName=sources[0]?.name||active.name||'';
 if(b?.handle){backupFileHandle=b.handle;backupMeta={lastSavedAt:+b.lastSavedAt||0,lastAutoFileAt:+b.lastAutoFileAt||0}}
 if(hq?.handle&&Array.isArray(hq.items)){hqSourceHandle=hq.handle;hqSourceMeta={name:hq.name||hq.handle.name||'OsRa_HQ_Source',manifestVersion:Number(hq.manifestVersion)||1};hqIndex=new Map(hq.items.filter(x=>x?.photoId&&x?.hqPath).map(x=>[x.photoId,x]));}
 photos=new Map();thumbCache.clear();let migratedData=false;const migratedExcluded=[...state.excludedPhotos],legacyExcludedIds=[];
 for(const x of rawPhotos){
  if(x?.excluded){migratedData=true;legacyExcludedIds.push(x.id);const memoryRefs=state.memories.filter(m=>Array.isArray(m.photoIds)&&m.photoIds.includes(x.id)).map(m=>({memoryId:m.id,index:m.photoIds.indexOf(x.id)}));migratedExcluded.push({id:x.id,key:exclusionKey(x.relPath,x.size,x.lastModified,x.fingerprint||''),relPath:x.relPath,sourceId:x.sourceId||'',sourceLinks:normalizePhotoLinks(x),size:x.size,lastModified:x.lastModified,name:x.name||'',fingerprint:x.fingerprint||'',contentKey:x.contentKey||'',album:x.album||'',manualAlbum:!!x.manualAlbum,autoAlbum:x.autoAlbum!==false,layoutLocked:!!x.layoutLocked,addedAt:x.addedAt||Date.now(),capturedAt:x.capturedAt||'',memoryRefs:Array.isArray(x.memoryRefs)&&x.memoryRefs.length?x.memoryRefs:memoryRefs});for(const m of state.memories)if(Array.isArray(m.photoIds)&&m.photoIds.includes(x.id))m.photoIds=m.photoIds.filter(pid=>pid!==x.id);continue}
  const p={...x,excluded:false};delete p.thumbBlob;const links=normalizePhotoLinks(p);if(JSON.stringify(links)!==JSON.stringify(p.sourceLinks||[])){p.sourceLinks=links;migratedData=true}photos.set(p.id,p);
 }
 state.excludedPhotos=migratedExcluded;normalizeState();window.__osraLegacyExcludedIds=legacyExcludedIds;window.__osraStartupMaintenanceNeeded=photos.size>1||state.memories.length>1||legacyExcludedIds.length>0;
 scanProgresses=(sp?.value&&typeof sp.value==='object'&&!Array.isArray(sp.value))?structuredClone(sp.value):{};
 if(legacy?.value&&sources[0]&&!scanProgresses[sources[0].id])scanProgresses[sources[0].id]={...structuredClone(legacy.value),sourceId:sources[0].id};
 reindexRestorePool=Array.isArray(rp?.value)?structuredClone(rp.value):[];lastLinkReport=lr?.value||null;linkProgresses=(lp?.value&&typeof lp.value==='object'&&!Array.isArray(lp.value))?structuredClone(lp.value):{};
 scanCheckpoint=activeSourceId?scanProgresses[activeSourceId]||null:null;soundOn=!!state.settings.soundEnabled;
 if(sources[0]){const missing=[...photos.values()].filter(p=>!p.sourceId);if(missing.length){const tx=db.transaction('photos','readwrite'),stx=tx.objectStore('photos');for(const p of missing){p.sourceId=sources[0].id;stx.put(p)}await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('source id batch write aborted'))})}}
 // المعاينات محفوظة في store مستقل ولا تُسحب عند التشغيل.
 // لا نكتب scanProgresses كل مرة عند بدء التطبيق؛ لا توجد فائدة من عملية كتابة إضافية.
}

async function blobToBase64(blob){if(!blob)return null;const buf=await blob.arrayBuffer(),bytes=new Uint8Array(buf);let out='';const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk){let part='';for(let j=i;j<Math.min(i+chunk,bytes.length);j++)part+=String.fromCharCode(bytes[j]);out+=btoa(part)}return out}
function base64ToBlob(x){if(!x?.data)return null;try{const bin=atob(x.data),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new Blob([bytes],{type:x.type||'image/webp'})}catch{return null}}
const HQ_MAX_DIM=2048,HQ_JPEG_QUALITY=.88,HQ_ZIP_PART_MAX=1800000000;
function hqBaseName(){return hqSourceMeta.name||'OsRa_HQ_Source'}
async function hqDatasetKey(){
 const ids=[...photos.values()].filter(isPhotoRecord).map(p=>p.id).filter(Boolean).sort();
 const raw=`OsRa-photo-set-v1|${ids.length}|${ids.join('\n')}`;
 try{
  if(window.crypto?.subtle){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('')}
 }catch(e){console.warn('HQ dataset digest unavailable',e)}
 let h=2166136261;for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619)}return `fnv1a-${(h>>>0).toString(16).padStart(8,'0')}-${ids.length}`;
}
function hqCoverageStats(photoIds=hqIncludedPhotos().map(p=>p.id)){
 const ids=[...new Set(photoIds)].filter(pid=>hqEligiblePhoto(photos.get(pid))),linked=ids.filter(pid=>hasOriginalLink(photos.get(pid))),missing=ids.length-linked.length;
 return {total:ids.length,linked:linked.length,missing,pct:ids.length?Math.round(linked.length*100/ids.length):0,missingIds:ids.filter(pid=>!hasOriginalLink(photos.get(pid)))};
}
function hqSanitizeName(v){return String(v||'').replace(/[\\/:*?"<>|]/g,'_').replace(/\s+/g,' ').trim()||'صور'}
function hqSwapExt(path,ext='.jpg'){const s=String(path||'');return /\.[^.\\/]+$/.test(s)?s.replace(/\.[^.\\/]+$/,ext):s+ext}
function hqIncludedPhotos(){const ids=new Set();for(const m of visibleMemories()){for(const pid of (m.photoIds||[]))if(hqEligiblePhoto(photos.get(pid)))ids.add(pid)}return [...ids].map(id=>photos.get(id)).filter(hqEligiblePhoto)}
async function hqPermission(ask=true){if(!hqSourceHandle)return false;try{const q=await hqSourceHandle.queryPermission({mode:'read'});if(q==='granted')return true;if(!ask)return false;return await hqSourceHandle.requestPermission({mode:'read'})==='granted'}catch{return false}}
async function findHQFile(p,ask=true){if(!p||!hqSourceHandle||!hqIndex.has(p.id))return null;if(!(await hqPermission(ask)))return null;const item=hqIndex.get(p.id);try{const fh=await resolve(hqSourceHandle,item.hqPath);return {file:await fh.getFile(),item}}catch(e){console.warn('hq source unavailable',p?.id,item,e);return null}}
async function getBestPhotoFile(p,ask=true){const original=await findOriginalFile(p,ask);if(original)return {...original,kind:'original'};const hq=await findHQFile(p,ask);if(hq)return {...hq,kind:'hq'};return null}
function hqProgressModal(title='إنشاء مصدر الصور عالي الجودة'){modal(`<h2>${title}</h2><div class="card"><b id="hqProgressTitle">بدء العمل…</b><div class="progress" style="margin-top:10px"><i id="hqProgressBar" style="width:0%"></i></div><div class="meta" id="hqProgressMeta" style="margin-top:8px">0%</div></div><div class="actions" style="margin-top:12px"><button class="btn" data-action="closeHQProgress">إخفاء النافذة</button></div>`)}
function updateHQProgress(done,total,label=''){const pct=total?Math.min(100,Math.round(done*100/total)):0;const b=document.getElementById('hqProgressBar'),m=document.getElementById('hqProgressMeta'),t=document.getElementById('hqProgressTitle');if(b)b.style.width=pct+'%';if(m)m.textContent=`${pct}% — ${done} من ${total}${label?' • '+label:''}`;if(t)t.textContent=label||'جارٍ تجهيز الصور…';}
function closeHQProgress(){if($('#modal')?.open)$('#modal').close()}
function timeDosDate(ms){const d=new Date(Number(ms)||Date.now()),year=Math.max(1980,Math.min(2107,d.getFullYear())),mon=d.getMonth()+1,day=d.getDate(),hr=d.getHours(),min=d.getMinutes(),sec=Math.floor(d.getSeconds()/2);return {time:(hr<<11)|(min<<5)|sec,date:((year-1980)<<9)|(mon<<5)|day}}
async function hqImageBlob(file){
 try{
  if(!file)return null;
  const b=await createImageBitmap(file,{imageOrientation:'from-image'});
  const side=Math.max(b.width,b.height);
  const isJpeg=/^image\/jpe?g$/i.test(file.type)||/\.jpe?g$/i.test(file.name);
  if(isJpeg&&side<=HQ_MAX_DIM){b.close?.();return file}
  const scale=Math.min(1,HQ_MAX_DIM/side),c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(b.width*scale));c.height=Math.max(1,Math.round(b.height*scale));
  const ctx=c.getContext('2d',{alpha:false,willReadFrequently:false});
  if(!ctx){b.close?.();return null}
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(b,0,0,c.width,c.height);
  const out=await new Promise(r=>c.toBlob(r,'image/jpeg',HQ_JPEG_QUALITY));b.close?.();return out||null;
 }catch{return null}
}
async function ensureDirPath(root,parts){let dir=root;for(const part of parts.filter(Boolean))dir=await dir.getDirectoryHandle(part,{create:true});return dir}
async function readHqManifest(root){try{const h=await root.getFileHandle('manifest.json',{create:false}),f=await h.getFile(),x=JSON.parse(await f.text());return x?.app==='OsRa'&&x?.format==='OsRa-HQ-Source'?x:null}catch{return null}}
async function writeTextFile(root,name,text){const h=await root.getFileHandle(name,{create:true}),w=await h.createWritable();await w.write(text);await w.close();return h}
async function removeHqPath(root,path){try{const parts=String(path||'').split('/').filter(Boolean);if(!parts.length)return;let dir=root;for(let i=0;i<parts.length-1;i++)dir=await dir.getDirectoryHandle(parts[i],{create:false});await dir.removeEntry(parts.at(-1));}catch{}}
async function chooseHQParent(){if(!window.showDirectoryPicker){toast('اختيار مجلد الحفظ غير مدعوم هنا. استخدم Chrome حديث على Android.');return null}return window.showDirectoryPicker({mode:'readwrite'})}
async function createOrOpenHqRoot(parent){let root,name='OsRa_HQ_Source';try{root=await parent.getDirectoryHandle(name,{create:false})}catch{root=null}if(!root)root=await parent.getDirectoryHandle(name,{create:true});const existing=await readHqManifest(root);if(existing&&existing.app==='OsRa')return {root,existing};if(existing===null){try{const h=await root.getFileHandle('manifest.json',{create:false});const f=await h.getFile();const txt=await f.text();if(txt.trim())throw new Error('not-osra-hq-folder')}catch(e){if(e?.message==='not-osra-hq-folder')throw e}}return {root,existing:null}}
function hqEligiblePhoto(p){return isPhotoRecord(p)&&!excludedIdSet().has(p.id)}
function hqAlbumGroups(){
 const groups=[];
 for(const m of visibleMemories()){
  const ids=[...new Set((m.photoIds||[]).filter(pid=>hqEligiblePhoto(photos.get(pid))))];
  if(ids.length)groups.push({id:m.id,title:m.title||'ألبوم بدون اسم',count:ids.length,photoIds:ids});
 }
 return groups;
}
function hqPhotoSelectionFromModal(){
 const scope=document.querySelector('input[name="hqScope"]:checked')?.value||'all';
 if(scope==='current'){
  const m=state.memories.find(x=>x.id===currentMemoryId&&!x.hidden),ids=m?new Set(m.photoIds||[]):new Set();
  return {scope,photoIds:[...selectedPhotos].filter(pid=>ids.has(pid)&&hqEligiblePhoto(photos.get(pid)))};
 }
 if(scope==='selected'){
  const albums=[...document.querySelectorAll('.hq-album-select:checked')].map(x=>x.dataset.memory).filter(Boolean),ids=new Set();
  for(const g of hqAlbumGroups())if(albums.includes(g.id))for(const pid of g.photoIds)ids.add(pid);
  return {scope,photoIds:[...ids].filter(pid=>hqEligiblePhoto(photos.get(pid)))};
 }
 return {scope:'all',photoIds:hqIncludedPhotos().map(p=>p.id)};
}
function hqLastBuildCard(){const r=window.__osraHqLastBuildReport;if(!r)return '';const failed=Number(r.failedIds?.length||0),requested=Number(r.requestedCount||0),built=Number(r.builtCount??Math.max(0,requested-failed));if(!failed&&(!requested||built>=requested))return '';return `<div class="card"><h3>🧾 آخر تقرير لمصدر HQ</h3><p>المطلوب: <b>${requested||'—'}</b> صورة • تم حفظها: <b>${built}</b> • تعذر الوصول إلى أصلها: <b>${failed}</b></p>${failed?'<div class="actions"><button class="btn small" data-action="retryHQSkipped">↻ إعادة محاولة المتخطاة</button></div>':''}<div class="meta">التقرير لا يغيّر الألبومات ولا يحذف أي ملف.</div></div>`}
function hqSelectionModal(forZip=false){
 const groups=hqAlbumGroups(),canCurrent=selectedPhotos.size>0,coverage=hqCoverageStats();
 modal(`<h2>🖼️ ${forZip?'إنشاء ZIP لمصدر الصور':'إنشاء / تحديث مصدر HQ'}</h2><p class="note">اختَر النطاق أولًا. النطاق المحدد هو الذي ستُعالج صوره فعلًا؛ الصور المخفية والمستبعدة خارج العملية.</p><div class="card"><h3>💛 حالة الأصول قبل النسخ</h3><p>${coverage.linked} من ${coverage.total} صورة لها رابط أصل محفوظ (${coverage.pct}%). المتبقي ${coverage.missing} صورة بلا أصل موثوق حاليًا؛ لن تُستبعد بصمت، وسيظهر لك تأكيد واضح قبل إنشاء HQ.</p><div class="meta">علامة القلب مؤشر على وجود رابط محفوظ، وليست فحصًا فعليًا لكل ملف في هذه اللحظة.</div></div><div class="cards"><label class="card" style="display:block;cursor:pointer"><input type="radio" name="hqScope" value="all" checked> <b>كل الألبومات الظاهرة</b><div class="meta">كل الصور الظاهرة حاليًا: ${hqIncludedPhotos().length} صورة. الصور المخفية والمستبعدة لا تدخل.</div></label><label class="card" style="display:block;cursor:pointer"><input type="radio" name="hqScope" value="selected"> <b>ألبومات أحددها</b><div class="meta">اختر ألبومًا أو أكثر؛ بمجرد تحديد أي ألبوم يتحول النطاق تلقائيًا إلى «ألبومات أحددها».</div></label>${groups.length?`<div class="cards" style="max-height:42vh;overflow:auto;margin-top:8px">${groups.map(g=>`<label class="card" style="display:block;cursor:pointer;padding:10px"><input class="hq-album-select" type="checkbox" data-memory="${g.id}"> <b>${esc(g.title)}</b><div class="meta">${g.count} صورة</div></label>`).join('')}</div>`:'<div class="empty">لا توجد ألبومات ظاهرة تحتوي صورًا.</div>'}${canCurrent?`<label class="card" style="display:block;cursor:pointer"><input type="radio" name="hqScope" value="current"> <b>الصور المحددة حاليًا</b><div class="meta">${selectedPhotos.size} صورة من الألبوم المفتوح حاليًا.</div></label>`:`<div class="card"><b>تحديد صور فردية</b><div class="meta">حدّد صورًا داخل ألبوم من «ذكرياتنا» أولًا، ثم استخدم هذا الخيار.</div></div>`}</div><div class="actions"><button class="btn small" data-action="hqSelectAllAlbums">☑ تحديد كل الألبومات</button><button class="btn small" data-action="hqClearAlbums">مسح اختيار الألبومات</button></div><div class="actions"><button class="btn primary" data-action="hqStartBuild" data-hq-zip="${forZip?'1':'0'}">${forZip?'📦 بدء إنشاء ZIP':'▶ بدء الإنشاء'}</button><button class="btn" data-action="closeModal">إلغاء</button></div>`);
const scopeSelected=document.querySelector('input[name="hqScope"][value="selected"]');document.querySelectorAll('.hq-album-select').forEach(cb=>cb.addEventListener('change',()=>{if(cb.checked&&scopeSelected)scopeSelected.checked=true;}));}

function hqBuildProgressCard(){const cp=hqBuildCheckpoint;if(!cp||!['running','paused','error'].includes(cp.status))return '';const done=Math.min(Number(cp.nextIndex)||0,Number(cp.total)||0),total=Number(cp.total)||0,pct=total?Math.round(done*100/total):0,status=cp.status==='paused'?'متوقف ومحفوظ — يمكن الاستكمال.':cp.status==='error'?'توقف بسبب خطأ — التقدم محفوظ ويمكن الاستكمال.':'الإنشاء جارٍ. يمكنك إيقافه بأمان والتكملة لاحقًا.';return `<div class="card scan-progress-card"><h3>🖼️ إنشاء مصدر HQ محفوظ</h3><p>${status}</p><div class="meta">${pct}% — ${done} من ${total} صورة${cp.lastName?' • آخر صورة: '+esc(cp.lastName):''}${(cp.failedIds||[]).length?' • تعذر مؤقتًا: '+cp.failedIds.length:''}</div><div class="actions">${cp.status==='running'?`<button class="btn danger" data-action="stopHQBuild">⏹ إيقاف وحفظ التقدم</button>`:''}<button class="btn primary" data-action="resumeHQBuild">▶ استكمال</button><button class="btn" data-action="discardHQBuild">إلغاء التقدم المحفوظ</button></div></div>`}
async function persistHQCheckpoint(cp){const slim=structuredClone(cp);delete slim.photoIds;hqBuildCheckpoint=slim;await put('library',{key:'hqBuildProgress',value:slim});}
async function persistHQSelection(scope,forZip,photoIds){hqBuildSelection={version:1,scope,forZip:!!forZip,photoIds:[...photoIds],createdAt:Date.now()};await put('library',{key:'hqBuildSelection',value:structuredClone(hqBuildSelection)});}
async function clearHQCheckpoint(){hqBuildCheckpoint=null;await del('library','hqBuildProgress');hqBuildSelection=null;await del('library','hqBuildSelection')}
function hqYield(){return new Promise(r=>setTimeout(r,0))}
async function hqWriteManifest(root,manifest){await writeTextFile(root,'manifest.json',JSON.stringify(manifest,null,2));await writeTextFile(root,'README.txt',`OsRa HQ Source\n\nمصدر صور مستقل عالي الجودة لـ OsRa.\nالمقاس الأقصى: ${HQ_MAX_DIM}px للضلع الأطول.\nJPEG quality: ${Math.round(HQ_JPEG_QUALITY*100)}.\nالربط يعتمد على photoId + هوية مجموعة الصور، وليس اسم الملف أو حجمه.\nالصور المخفية أو المستبعدة لا تُنسخ كملفات.\n`)}
async function readHqProgressManifest(root){try{const h=await root.getFileHandle('manifest.progress.json',{create:false}),f=await h.getFile(),x=JSON.parse(await f.text());return x?.app==='OsRa'&&x?.format==='OsRa-HQ-Progress'?x:null}catch{return null}}
async function writeHqProgressManifest(root,manifest,nextIndex){await writeTextFile(root,'manifest.progress.json',JSON.stringify({app:'OsRa',format:'OsRa-HQ-Progress',version:1,nextIndex,items:manifest.items||[]},null,2))}
async function removeHqProgressManifest(root){try{await root.removeEntry('manifest.progress.json')}catch{}}
function hqExpectedPath(p){
 const visible=state.memories.filter(m=>!m.hidden&&Array.isArray(m.photoIds)&&m.photoIds.includes(p?.id));
 const preferredIds=[];
 if(currentMemoryId&&visible.some(m=>m.id===currentMemoryId))preferredIds.push(visible.find(m=>m.id===currentMemoryId)?.linkSourceId||'');
 for(const m of visible)if(m.linkSourceId&&!preferredIds.includes(m.linkSourceId))preferredIds.push(m.linkSourceId);
 const links=photoLocations(p);
 const verifiedLinks=links.filter(l=>l.verified===true);
 let link=null;
 for(const sid of preferredIds){if(!sid)continue;link=verifiedLinks.find(l=>String(l.sourceId)===String(sid)&&sources.some(src=>String(src.id)===String(sid)&&src.handle));if(link)break}
 if(!link)link=verifiedLinks.find(l=>sources.some(src=>src.id===l.sourceId&&src.handle));
 if(!link)link=links.find(l=>sources.some(src=>src.id===l.sourceId&&src.handle));
 if(!link)return null;
 const source=sources.find(x=>x.id===link.sourceId);const srcName=hqSanitizeName(source?.name||'المصدر');const originalRel=String(link.relPath||p.relPath||p.name||'صورة');return {source,link,originalRel,outRel:`images/${srcName}/${hqSwapExt(originalRel,'.jpg')}`}
}
async function hqRecoverRecentItems(root,requested,fromIndex,toIndex,manifestMap,failed,memoryByPhoto){let firstMissing=-1;const progress=await readHqProgressManifest(root);if(progress?.items?.length)for(const x of progress.items)if(x?.photoId&&x?.hqPath)manifestMap.set(x.photoId,x);const base=Math.max(0,Number(progress?.nextIndex)||0);const begin=Math.min(fromIndex,base);for(let i=begin;i<toIndex;i++){const pid=requested[i];if(failed.has(pid)||manifestMap.has(pid))continue;const p=photos.get(pid);if(!p){firstMissing=firstMissing<0?i:firstMissing;continue}const ex=hqExpectedPath(p);if(!ex){firstMissing=firstMissing<0?i:firstMissing;continue}try{const parts=ex.outRel.split('/').filter(Boolean),fileName=parts.pop();let dir=root;for(const part of parts)dir=await dir.getDirectoryHandle(part,{create:false});const fh=await dir.getFileHandle(fileName,{create:false}),f=await fh.getFile();manifestMap.set(pid,{photoId:pid,sourceId:ex.source?.id||p.sourceId||'',originalRelPath:ex.originalRel,name:p.name||f.name||fileName,hqPath:ex.outRel,size:Number(p.size||0),hqSize:Number(f.size||0),originalSize:Number(p.size||0),originalLastModified:Number(p.lastModified||0),capturedAt:p.capturedAt||'',memoryIds:memoryByPhoto.get(pid)||[]})}catch{firstMissing=firstMissing<0?i:firstMissing}}
return firstMissing}
async function hqBuildCore({root,scope,photoIds,resume=false,forZip=false}){
 const requested=[...new Set(photoIds)].filter(pid=>hqEligiblePhoto(photos.get(pid)));if(!requested.length){toast('لا توجد صور صالحة في النطاق المحدد. الصور المستبعدة والمخفية خارج العملية.');return null}
 const datasetKey=await hqDatasetKey();
 const existing=await readHqManifest(root),existingItems=Array.isArray(existing?.items)?existing.items:[],progress=resume?await readHqProgressManifest(root):null;
 if(existing?.datasetKey&&existing.datasetKey!==datasetKey){const known=new Set(photos.keys()),knownIds=existingItems.filter(x=>x?.photoId),unknown=knownIds.filter(x=>!known.has(x.photoId)).length;if(unknown>Math.max(10,Math.ceil(Math.max(1,knownIds.length)*.02)))throw new Error('هذا المجلد يحتوي على مصدر HQ مختلف بدرجة كبيرة عن مكتبة OsRa الحالية؛ حفاظًا على الأمان لم يتم دمج أي ملف.')}
 let cp=resume&&hqBuildCheckpoint?structuredClone(hqBuildCheckpoint):null;
 const savedSelection=resume?(hqBuildSelection||((hqBuildCheckpoint?.photoIds||[]).length?{scope:hqBuildCheckpoint.scope,forZip:hqBuildCheckpoint.forZip,photoIds:hqBuildCheckpoint.photoIds}:null)):null;
 if(cp && savedSelection && (cp.scope!==scope||cp.forZip!==!!forZip||JSON.stringify(savedSelection.photoIds||[])!==JSON.stringify(requested))){cp=null}
 if(!cp||cp.status==='done'){
  cp={version:2,status:'running',scope,total:requested.length,nextIndex:0,failedIds:[],rootHandle:root,forZip:!!forZip,lastName:'',startedAt:Date.now(),updatedAt:Date.now(),datasetKey};
  await persistHQSelection(scope,forZip,requested);
 }else{cp.status='running';cp.rootHandle=root;cp.total=requested.length;cp.updatedAt=Date.now();cp.datasetKey=datasetKey;if(!hqBuildSelection?.photoIds?.length)await persistHQSelection(scope,forZip,requested)}
 const manifestMap=new Map(existingItems.filter(x=>x?.photoId&&x?.hqPath).map(x=>[x.photoId,x]));
 let failed=new Set(cp.failedIds||[]);
 const memoryByPhoto=new Map();for(const m of visibleMemories())for(const pid of (m.photoIds||[])){const a=memoryByPhoto.get(pid)||[];if(!a.includes(m.id))a.push(m.id);memoryByPhoto.set(pid,a)}
 let startIndex=Math.max(0,Math.min(requested.length,Number(cp.nextIndex)||0));
 if(resume&&startIndex>0){const missing=await hqRecoverRecentItems(root,requested,Number(progress?.nextIndex)||0,startIndex,manifestMap,failed,memoryByPhoto);if(missing>=0)startIndex=missing;}
 cp.nextIndex=startIndex;await persistHQCheckpoint({...cp,status:'running',nextIndex:startIndex,failedIds:[...failed],lastName:cp.lastName});
 window.__osraHqBusy=true;hqBuildStopRequested=false;hqProgressModal(forZip?'تجهيز مصدر الصور وZIP للمشاركة':'إنشاء مصدر الصور عالي الجودة');
 try{
  const dirCache=new Map();
  async function ensureCached(parts){let dir=root,key='';for(const part of parts.filter(Boolean)){key+=`/${part}`;if(dirCache.has(key)){dir=dirCache.get(key);continue}dir=await dir.getDirectoryHandle(part,{create:true});dirCache.set(key,dir)}return dir}
  for(let idx=startIndex;idx<requested.length;idx++){
   const pid=requested[idx];const p=photos.get(pid);if(!p){failed.add(pid);cp.nextIndex=idx+1;cp.lastName='';await persistHQCheckpoint({...cp,status:'running',nextIndex:cp.nextIndex,failedIds:[...failed]});continue}
   updateHQProgress(idx+1,requested.length,p.name||'تجهيز صورة');
   const ex0=hqExpectedPath(p),oldItem=manifestMap.get(pid);
   if(oldItem?.hqPath&&ex0?.originalRel===oldItem.originalRelPath&&Number(oldItem.originalSize||0)===Number(p.size||0)&&Number(oldItem.originalLastModified||0)===Number(p.lastModified||0)){
    try{const parts=oldItem.hqPath.split('/').filter(Boolean),fn=parts.pop();let odir=root;for(const part of parts)odir=await odir.getDirectoryHandle(part,{create:false});await (await odir.getFileHandle(fn,{create:false})).getFile();cp.nextIndex=idx+1;cp.lastName=p.name||'';updateHQProgress(cp.nextIndex,requested.length,`موجود بالفعل: ${p.name||''}`);continue}catch{}
   }
   const hit=await findOriginalFile(p,true);
   if(!hit){failed.add(pid);cp.nextIndex=idx+1;cp.lastName=p.name||'';await persistHQCheckpoint({...cp,status:'running',nextIndex:cp.nextIndex,failedIds:[...failed],lastName:cp.lastName});await hqYield();continue}
   const blob=await hqImageBlob(hit.file);
   if(!blob){failed.add(pid);cp.nextIndex=idx+1;cp.lastName=p.name||'';await persistHQCheckpoint({...cp,status:'running',nextIndex:cp.nextIndex,failedIds:[...failed],lastName:cp.lastName});await hqYield();continue}
   const srcName=hqSanitizeName(hit.source?.name||'المصدر'),originalRel=String(hit.link?.relPath||p.relPath||p.name||'صورة'),outRel=`images/${srcName}/${hqSwapExt(originalRel,'.jpg')}`,parts=outRel.split('/'),fileName=parts.pop(),dir=await ensureCached(parts),old=manifestMap.get(pid),fh=await dir.getFileHandle(fileName,{create:true}),w=await fh.createWritable();await w.write(blob);await w.close();
   if(old?.hqPath&&old.hqPath!==outRel&&!([...manifestMap.values()].some(item=>item?.hqPath===old.hqPath)))await removeHqPath(root,old.hqPath);
   manifestMap.set(pid,{photoId:pid,sourceId:hit.source?.id||p.sourceId||'',originalRelPath:originalRel,name:p.name||hit.file.name||fileName,hqPath:outRel,size:Number(hit.file.size||0),hqSize:Number(blob.size||0),originalSize:Number(hit.file.size||p.size||0),originalLastModified:Number(hit.file.lastModified||p.lastModified||0),capturedAt:p.capturedAt||'',memoryIds:memoryByPhoto.get(pid)||[]});
   cp.nextIndex=idx+1;cp.lastName=p.name||'';const doneCount=cp.nextIndex;updateHQProgress(doneCount,requested.length,p.name||'تم الحفظ');
   if(cp.nextIndex%12===0||cp.nextIndex===requested.length)await persistHQCheckpoint({...cp,status:'running',nextIndex:cp.nextIndex,failedIds:[...failed],lastName:cp.lastName});
   if(cp.nextIndex%24===0||cp.nextIndex===requested.length)await writeHqProgressManifest(root,{items:[...manifestMap.values()]},cp.nextIndex);
   if(hqBuildStopRequested){cp.status='paused';await persistHQCheckpoint({...cp,status:'paused',nextIndex:cp.nextIndex,failedIds:[...failed],lastName:cp.lastName});toast(`تم إيقاف إنشاء HQ وحفظ التقدم عند ${cp.nextIndex} من ${requested.length}.`);closeHQProgress();return {root,manifest:null,paused:true}}
   if(cp.nextIndex%6===0)await hqYield();
  }
  // Never delete existing HQ items because a later run is scoped to a subset.
  // Selected/current runs update only requested photos and preserve the rest.
  const manifest={app:'OsRa',format:'OsRa-HQ-Source',version:2,datasetKey,createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),maxDimension:HQ_MAX_DIM,jpegQuality:HQ_JPEG_QUALITY,photoCount:manifestMap.size,items:[...manifestMap.values()]};
  await hqWriteManifest(root,manifest);await removeHqProgressManifest(root);window.__osraHqLastBuildReport={version:2,at:Date.now(),datasetKey,scope,forZip:!!forZip,requestedCount:requested.length,builtCount:Math.max(0,requested.length-failed.size),failedIds:[...failed]};await put('library',{key:'hqLastBuildReport',value:structuredClone(window.__osraHqLastBuildReport)});await clearHQCheckpoint();hqSourceHandle=root;hqSourceMeta={name:root.name||'OsRa_HQ_Source',manifestVersion:2};hqIndex=new Map(manifest.items.map(x=>[x.photoId,x]));await put('library',{key:'hqSource',handle:root,name:hqSourceMeta.name,manifestVersion:2,items:manifest.items});closeHQProgress();
  const resultManifest=forZip?{...manifest,photoCount:requested.map(pid=>manifestMap.get(pid)).filter(Boolean).length,items:requested.map(pid=>manifestMap.get(pid)).filter(Boolean)}:manifest;
  toast(`تم تحديث مصدر HQ: ${manifest.photoCount} صورة${failed.size?`، وتم تخطي ${failed.size} صورة لعدم الوصول إلى الأصل`:''}.`);renderNoAnim();return {root,manifest:resultManifest,parent:null,failed:failed.size}
 }catch(e){console.error(e);cp.status='error';cp.nextIndex=Number(cp.nextIndex)||startIndex;cp.failedIds=[...failed];cp.error=String(e?.message||e);cp.datasetKey=datasetKey;await persistHQCheckpoint(cp);await persistHQSelection(scope,forZip,requested);try{await writeHqProgressManifest(root,{items:[...manifestMap.values()]},cp.nextIndex)}catch{}closeHQProgress();toast('توقف إنشاء مصدر HQ لكن التقدم محفوظ ويمكن استكماله من الإعدادات.');return {root,manifest:null,error:e,paused:true}}
 finally{window.__osraHqBusy=false}
}
async function buildHQSource({parent=null,forZip=false,selectedIds=null,scope='all',resume=false}={}){
 if(window.__osraHqBusy){toast('مصدر الصور عالي الجودة قيد الإنشاء بالفعل.');return null}
 const ids=selectedIds?[...new Set(selectedIds)]:hqIncludedPhotos().map(p=>p.id);if(!ids.length){toast('لا توجد صور ظاهرة داخل النطاق المحدد. الصور المخفية والمستبعدة خارج المصدر.');return null}
 if(!parent)parent=await chooseHQParent();if(!parent)return null;
 try{const {root}=await createOrOpenHqRoot(parent);return await hqBuildCore({root,scope,photoIds:ids,resume,forZip})}catch(e){console.error(e);toast(e?.message==='not-osra-hq-folder'?'المجلد موجود لكنه ليس مجلد OsRa HQ؛ اختر مكانًا آخر.':'تعذر فتح مجلد مصدر HQ.');return null}
}
async function startHQBuildFromModal(){const btn=document.querySelector('[data-action="hqStartBuild"]'),forZip=btn?.dataset.hqZip==='1',choice=hqPhotoSelectionFromModal();if((choice.scope==='selected'||choice.scope==='current')&&!choice.photoIds.length){toast('حدد صورًا أو ألبومًا واحدًا على الأقل.');return}const selected=choice.photoIds.map(idv=>photos.get(idv)).filter(isPhotoRecord);const missing=selected.filter(p=>!hasOriginalLink(p));if(missing.length&&!confirm(`⚠️ يوجد ${missing.length} صورة بدون أصل مرتبط.
سيتم إنشاء HQ للصور التي لها أصل فقط (${Math.max(0,selected.length-missing.length)} صورة)، ولن يتم تخطيها بصمت.
هل تريد المتابعة؟`))return;closeModal();const parent=await chooseHQParent();if(!parent)return;const built=await buildHQSource({parent,forZip,selectedIds:choice.photoIds,scope:choice.scope});if(forZip&&built?.manifest){window.__osraHqBusy=true;try{hqProgressModal('إنشاء ZIP لمشاركة مصدر الصور');const files=await createHQZip(parent,built.root,built.manifest);closeHQProgress();if(!files.length){toast('تعذر إنشاء ملف ZIP.');return}if(navigator.share&&navigator.canShare?.({files})){try{await navigator.share({title:'OsRa HQ Source',text:`مصدر صور OsRa — ${files.length} ملف ZIP`,files});toast('تم فتح المشاركة؛ اختر WhatsApp لإرسال ملف/ملفات المصدر.');return}catch(e){if(e?.name==='AbortError')return}}toast(`تم إنشاء ${files.length} ملف ZIP محليًا. اختره في واتساب كمستند، أو استخدم قائمة المشاركة.`);renderNoAnim()}catch(e){console.error(e);closeHQProgress();toast('تم إنشاء المصدر لكن تعذر إنشاء ZIP.')}finally{window.__osraHqBusy=false}}}
function hqBackupZip(){hqSelectionModal(true)}
async function retryHQSkipped(){const r=window.__osraHqLastBuildReport;if(!r?.failedIds?.length){toast('لا توجد صور متخطاة محفوظة لإعادة المحاولة.');return}const ids=r.failedIds.filter(pid=>isPhotoRecord(photos.get(pid)));if(!ids.length){toast('لم تعد الصور المتخطاة موجودة في مكتبة OsRa.');return}await buildHQSource({forZip:false,selectedIds:ids,scope:'retry'});}
async function resumeHQBuild(){if(window.__osraHqBusy||!hqBuildCheckpoint){toast('لا يوجد إنشاء HQ محفوظ للاستكمال.');return}const cp=hqBuildCheckpoint,root=cp.rootHandle;if(!root){toast('تعذر العثور على مجلد الاستكمال المحفوظ. ابدأ عملية جديدة.');return}try{let q=await root.queryPermission({mode:'readwrite'});if(q!=='granted')q=await root.requestPermission({mode:'readwrite'});if(q!=='granted'){toast('يحتاج OsRa إذن الكتابة إلى مجلد HQ لاستكمال العملية.');return}const ids=cp.photoIds?.length?cp.photoIds:(hqBuildSelection?.photoIds||[]);if(!ids.length){toast('لا توجد قائمة صور محفوظة للاستكمال. ابدأ العملية من جديد.');return}await hqBuildCore({root,scope:cp.scope||'all',photoIds:ids,resume:true,forZip:!!cp.forZip})}catch(e){console.error(e);toast('تعذر استكمال إنشاء مصدر HQ.')}}
async function stopHQBuild(){if(!hqBuildCheckpoint||hqBuildCheckpoint.status!=='running')return;hqBuildStopRequested=true;toast('سيتم إيقاف HQ بعد إكمال الصورة الحالية وحفظ التقدم.');}
async function discardHQBuild(){if(window.__osraHqBusy){toast('أوقف الإنشاء الحالي أولًا ثم ألغِ التقدم المحفوظ.');return}if(!hqBuildCheckpoint){toast('لا يوجد تقدم HQ محفوظ.');return}if(!confirm('إلغاء تقدم إنشاء مصدر HQ المحفوظ؟ الملفات التي تم إنشاؤها بالفعل داخل المجلد لن تُحذف.'))return;await clearHQCheckpoint();renderNoAnim();toast('تم إلغاء التقدم المحفوظ دون حذف ملفات HQ الموجودة.');}
async function linkHQSource(){if(!window.showDirectoryPicker){toast('اختيار مجلد المصدر غير مدعوم هنا. استخدم Chrome حديث على Android.');return false}try{const root=await window.showDirectoryPicker({mode:'read'});const mf=await readHqManifest(root);if(!mf){toast('هذا المجلد ليس مصدر OsRa HQ صالحًا أو ملف manifest غير موجود.');return false}if(mf.datasetKey){const currentKey=await hqDatasetKey();if(mf.datasetKey!==currentKey){toast('مصدر HQ لا يطابق نسخة OsRa الحالية. لم يتم ربط أي صورة.');return false}}else{toast('هذا مصدر HQ قديم بلا هوية نسخة؛ لم يتم ربطه تلقائيًا لحماية ترتيب الألبومات. أنشئ HQ جديدًا من النسخة الحالية.');return false}const items=(mf.items||[]).filter(x=>x?.photoId&&x?.hqPath),known=new Set(photos.keys()),bad=items.filter(x=>!known.has(x.photoId)).length;if(bad>Math.max(10,Math.ceil(items.length*.02))){toast(`مصدر HQ يحتوي ${bad} صورة غير موجودة في نسخة OsRa الحالية؛ لم يتم ربطه. هذا يحمي الألبومات من أي خلط.`);return false}hqSourceHandle=root;hqSourceMeta={name:root.name||'OsRa_HQ_Source',manifestVersion:Number(mf.version)||2};hqIndex=new Map(items.map(x=>[x.photoId,x]));await put('library',{key:'hqSource',handle:root,name:hqSourceMeta.name,manifestVersion:hqSourceMeta.manifestVersion,items});toast(`تم ربط مصدر HQ «${hqSourceMeta.name}» بسرعة: ${hqIndex.size} صورة، بالـphotoId فقط وبدون فحص بصري.`);renderNoAnim();return true}catch(e){if(e?.name==='AbortError')return false;console.error(e);toast('تعذر ربط مصدر HQ.');return false}}
function clearHQSource(){hqSourceHandle=null;hqSourceMeta={name:'',manifestVersion:1};hqIndex.clear();del('library','hqSource').catch(()=>{});renderNoAnim();toast('تم فصل مصدر HQ من OsRa دون حذف أي ملفات من الهاتف.')}
function crc32Update(state,bytes,table){let c=state>>>0;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return c>>>0}
function crc32Table(){const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0}return t}
class SimpleZipWriter{
 constructor(handle){this.handle=handle;this.stream=null;this.offset=0;this.entries=[];this.closed=false}
 async open(){this.stream=await this.handle.createWritable()}
 async write(bytes){await this.stream.write(bytes);this.offset+=bytes.byteLength}
 async addBlob(name,blob){const enc=new TextEncoder(),nb=enc.encode(name),table=crc32Table();let crc=0xffffffff,size=0;const reader1=blob.stream().getReader();while(true){const {done,value}=await reader1.read();if(done)break;crc=crc32Update(crc,value,table);size+=value.byteLength}crc=(crc^0xffffffff)>>>0;const {time,date}=timeDosDate(Date.now());const localOffset=this.offset,head=new Uint8Array(30+nb.length),dv=new DataView(head.buffer);dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(6,0x800,true);dv.setUint16(8,0,true);dv.setUint16(10,time,true);dv.setUint16(12,date,true);dv.setUint32(14,crc,true);dv.setUint32(18,size,true);dv.setUint32(22,size,true);dv.setUint16(26,nb.length,true);dv.setUint16(28,0,true);head.set(nb,30);await this.write(head);const reader2=blob.stream().getReader();while(true){const {done,value}=await reader2.read();if(done)break;await this.write(value)}this.entries.push({name,nb,crc,size,time,date,offset:localOffset});return 30+nb.length+size}
 async finalize(){const enc=new TextEncoder();const cdStart=this.offset;for(const e of this.entries){const h=new Uint8Array(46+e.nb.length),dv=new DataView(h.buffer);dv.setUint32(0,0x02014b50,true);dv.setUint16(4,20,true);dv.setUint16(6,20,true);dv.setUint16(8,0x800,true);dv.setUint16(10,0,true);dv.setUint16(12,e.time,true);dv.setUint16(14,e.date,true);dv.setUint32(16,e.crc,true);dv.setUint32(20,e.size,true);dv.setUint32(24,e.size,true);dv.setUint16(28,e.nb.length,true);dv.setUint16(30,0,true);dv.setUint16(32,0,true);dv.setUint16(34,0,true);dv.setUint16(36,0,true);dv.setUint32(38,0,true);dv.setUint32(42,e.offset,true);h.set(e.nb,46);await this.write(h)}const cdSize=this.offset-cdStart,tail=new Uint8Array(22),dv=new DataView(tail.buffer),n=this.entries.length;dv.setUint32(0,0x06054b50,true);dv.setUint16(8,n,true);dv.setUint16(10,n,true);dv.setUint32(12,cdSize,true);dv.setUint32(16,cdStart,true);dv.setUint16(20,0,true);await this.write(tail);await this.stream.close();this.closed=true;return this.offset}
 async abort(){try{await this.stream?.abort()}catch{}this.closed=true}
}
function zipNeedsPart(current,entryBytes){return current>0&&current+entryBytes+22>HQ_ZIP_PART_MAX}
async function createHQZip(parent,root,manifest){if(!parent||!root||!manifest)return [];
 const stamp=new Date().toISOString().replace(/[-:T]/g,'').slice(0,14),items=[{name:'manifest.json',blob:new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'})},{name:'README.txt',blob:new Blob([`OsRa HQ Source\n\n${manifest.photoCount||0} صورة عالية الجودة.\n`],{type:'text/plain;charset=utf-8'})}];for(const item of (manifest.items||[])){try{const parts=String(item.hqPath).split('/').filter(Boolean);let dir=root;for(let i=0;i<parts.length-1;i++)dir=await dir.getDirectoryHandle(parts[i],{create:false});const fh=await dir.getFileHandle(parts.at(-1),{create:false});items.push({name:item.hqPath,blob:await fh.getFile()})}catch(e){console.warn('hq zip source skipped',item?.photoId,e)}}
 const outs=[],files=[];let writer=null,part=0;const newPart=async()=>{part++;const h=await parent.getFileHandle(`OsRa_HQ_Source_${stamp}_part${String(part).padStart(2,'0')}.zip`,{create:true});const z=new SimpleZipWriter(h);await z.open();outs.push({handle:h,name:h.name});return z};writer=await newPart();let cur=0;for(let i=0;i<items.length;i++){const item=items[i],nb=new TextEncoder().encode(item.name);const size=Number(item.blob.size)||0,entryBytes=30+nb.length+size+46+nb.length;if(zipNeedsPart(cur,entryBytes)){cur=0;await writer.finalize();writer=await newPart()}await writer.addBlob(item.name,item.blob);cur+=entryBytes;const pct=Math.min(100,Math.round((i+1)*100/items.length));updateHQProgress(i+1,items.length,`تجهيز ZIP ${part} — ${pct}%`)}if(writer&&!writer.closed)await writer.finalize();for(const o of outs){try{files.push(await o.handle.getFile())}catch{}}return files}
async function backupPayloadForExport(){const payload=backupPayload();payload.photoManifest=await Promise.all(payload.photoManifest.map(async m=>{const b=await getThumbBlob(m.id);if(!b)return m;const data=await blobToBase64(b);return data?{...m,thumb:{type:b.type||'image/webp',data}}:m}));return payload}
function backupPayload(){return {app:'OsRa',version:27,exportedAt:new Date().toISOString(),settings:structuredClone(state.settings),memories:structuredClone(state.memories),events:structuredClone(state.events),dreams:structuredClone(state.dreams),verses:structuredClone(state.verses),prayers:structuredClone(state.prayers),messages:structuredClone(state.messages),excludedPhotos:structuredClone(state.excludedPhotos),photoManifest:[...photos.values()].map(p=>({id:p.id,relPath:p.relPath,name:p.name,album:p.album,manualAlbum:!!p.manualAlbum,autoAlbum:p.autoAlbum!==false,layoutLocked:!!p.layoutLocked,sourceId:p.sourceId||'',sourceLinks:photoLocations(p),mediaType:'image',mimeType:p.mimeType||'',excluded:false,size:p.size,lastModified:p.lastModified,addedAt:p.addedAt,capturedAt:p.capturedAt||'',fingerprint:p.fingerprint||'',contentKey:p.contentKey||''}))};}
async function saveSafetySnapshot(){try{await put('state',{key:'safetyBackup',value:backupPayload()})}catch(e){console.warn('safety backup failed',e)}}
function scheduleSafetySnapshot(){clearTimeout(safetyTimer);safetyTimer=setTimeout(()=>saveSafetySnapshot(),1200)}
const save=async()=>{await put('state',{key:'main',value:state});scheduleSafetySnapshot();};
function fmt(v){if(!v)return'بدون تاريخ';const d=new Date(v+'T00:00:00');return isNaN(d)?'بدون تاريخ':d.toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'})}
function rangeLabel(m){const a=m?.date||'';const b=m?.endDate||a;if(!a)return'بدون تاريخ';return b&&b!==a?`من ${fmt(a)} إلى ${fmt(b)}`:fmt(a)}
function duration(from){if(!from)return'لم نحدد التاريخ بعد';const a=new Date(from+'T00:00:00'),b=new Date(today()+'T00:00:00');if(a>b)return'لم يبدأ بعد';let y=b.getFullYear()-a.getFullYear(),m=b.getMonth()-a.getMonth(),d=b.getDate()-a.getDate();if(d<0){m--;d+=new Date(b.getFullYear(),b.getMonth(),0).getDate()}if(m<0){y--;m+=12}return [y&&`${y} سنة`,m&&`${m} شهر`,d&&`${d} يوم`].filter(Boolean).join(' و ')||'اليوم'}
function annual(v){if(!v)return null;const [y,m,d]=v.split('-').map(Number),n=new Date(),t=new Date(n.getFullYear(),m-1,d),z=new Date(n.getFullYear(),n.getMonth(),n.getDate());if(t<z)t.setFullYear(t.getFullYear()+1);return {date:t,days:Math.ceil((t-z)/86400000)}}
function dayLabel(n){return n===0?'اليوم ❤️':n===1?'غدًا':`بعد ${n} يومًا`}
function seed(){return [...today().replaceAll('-','')].reduce((a,c)=>a+c.charCodeAt(0),0)}
function setNav(){document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.section===section))}
function applyLbZoom(){const img=$('#lbImage');if(!img)return;img.style.transform=`translate3d(${lb.panX}px,${lb.panY}px,0) scale(${lb.zoom})`;img.classList.toggle('zoomed',lb.zoom>1);img.title=lb.zoom>1?'اسحب الصورة للتحرك — نقرتان للرجوع للحجم الطبيعي':'انقر مرتين للتكبير'}
function resetLbZoom(){lb.zoom=1;lb.panX=0;lb.panY=0;lb.dragX=null;lb.dragY=null;lb.pinchStart=0;lb.lastTap=0;lb.lastTapX=0;lb.lastTapY=0;applyLbZoom()}
function setLbZoom(z){lb.zoom=Math.min(6,Math.max(1,Number(z)||1));if(lb.zoom===1){lb.panX=0;lb.panY=0}applyLbZoom()}
function zoomIn(){setLbZoom(lb.zoom+.5)}
function zoomOut(){setLbZoom(lb.zoom-.5)}
function closeLB(){stopSlideshow();cleanupLbFlip();resetLbZoom();lb.loadToken++;const img=$('#lbImage');if(img)img.src='';if(lb.url)URL.revokeObjectURL(lb.url);if(lb.thumbUrl)URL.revokeObjectURL(lb.thumbUrl);lb.url=null;lb.thumbUrl=null;romanticHeartTransition('close');if($('#lightbox')?.open)$('#lightbox').close()}
function monthDay(v){return v?v.slice(5):''}
function mdInRange(md,start,end){if(!md||!start||!end)return false;return start<=end?md>=start&&md<=end:md>=start||md<=end}
function memoryOnCalendar(m,date){return memoryOnAnnualDay(m,date)}
function memoryOnAnnualDay(m,date=today()){const a=monthDay(m?.date||m?.startDate||''),b=monthDay(m?.endDate||m?.date||'');if(!a)return false;return mdInRange(monthDay(date),a,b||a)}
function visibleMemories(){return state.memories.filter(m=>!m.hidden)}
function visiblePhotoIds(){const ids=new Set();for(const m of visibleMemories())for(const pid of (m.photoIds||[])){const p=photos.get(pid);if(isPhotoRecord(p)&&!excludedIdSet().has(pid))ids.add(pid)}return ids}
function visiblePhotoCount(){return visiblePhotoIds().size}
function photoFor(m){return (m.photoIds||[]).map(x=>photos.get(x)).filter(isPhotoRecord).filter(p=>!excludedIdSet().has(p.id))}
function selectedDailyAlbumMemories(){const ms=visibleMemories().filter(m=>photoFor(m).length>0),ids=state.settings.dailyAlbumIds;if(ids===null)return ms;const set=new Set(ids);return ms.filter(m=>set.has(m.id))}
function photoOfDayPool(){const out=[],seen=new Set();for(const m of selectedDailyAlbumMemories()){for(const p of photoFor(m)){if(!seen.has(p.id)){seen.add(p.id);out.push(p)}}}return out}
function miniThumbs(m,max=5){const ps=photoFor(m).slice(0,max);return ps.length?`<div class="mini-gallery">${ps.map(p=>`<button class="mini-thumb" data-action="photo" data-id="${p.id}" aria-label="${esc(p.name)}"><img data-thumb="${p.id}" alt="">${originalBadge(p)}</button>`).join('')}</div>`:''}
function romanticMiniGallery(m,max=4){const ps=photoFor(m).slice(0,max);if(!ps.length)return `<div class="memory-cover-empty">♥<span>ذكرى بلا صور</span></div>`;return `<div class="romantic-cover-grid">${ps.map((p,i)=>`<button class="romantic-cover-photo r${i+1}" data-action="photo" data-id="${p.id}"><img data-thumb="${p.id}" alt="${esc(p.name)}">${originalBadge(p)}</button>`).join('')}</div>`}
function countdownInfo(x){
 const d=new Date(String(x.date||'')+'T00:00:00'),now=new Date(today()+'T00:00:00');if(isNaN(d))return null;
 if(x.annual){const target=new Date(now.getFullYear(),d.getMonth(),d.getDate());if(target<now)target.setFullYear(target.getFullYear()+1);return {date:target,days:Math.ceil((target-now)/86400000),elapsed:false}}
 const diff=Math.round((d-now)/86400000);return {date:d,days:Math.abs(diff),elapsed:diff<0};
}
function countdownCardData(x){const info=countdownInfo(x);if(!info)return null;let label;if(info.days===0)label='اليوم ❤️';else if(info.elapsed)label=`مرّ عليه ${info.days} يومًا`;else label=`بعد ${info.days} يومًا`;return {id:x.id,title:x.title,emoji:x.emoji,label,date:info.date}}
function countdownDateLabel(x){const info=countdownInfo(x);return info?`${info.elapsed&&!x.annual?'مرّ الموعد في':'الموعد'} ${fmt(x.date)}${x.annual?' • يتكرر سنويًا':''}`:'تاريخ غير صالح'}
function birthdayRaniaGreeting(){
 const d=$('#birthday-dog-dialog');
 if(!d||!surprisesAreEnabled())return;
 if(!isBirthdayRaniaToday()){toast('رسالة عيد الميلاد تظهر في يوم عيد ميلاد رانيا فقط.');return}
 if(!d.open)d.showModal();
} 
function isBirthdayRaniaToday(){const d=String(state.settings.birthdayRania||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;const now=today().slice(5);return d.slice(5)===now}
function birthdayUiIsActive(){return isBirthdayRaniaToday()&&surprisesAreEnabled()&&!$('#lightbox')?.open}
let birthdayEffectsTimer=0,birthdayClockTimer=0;
function stopBirthdayEffects(){
  clearInterval(birthdayEffectsTimer);birthdayEffectsTimer=0;
  const c=$('#birthday-effects');if(c)c.replaceChildren();
}
function spawnBirthdayEffect(){
  const c=$('#birthday-effects');
  if(!c||!birthdayUiIsActive())return;
  const item=document.createElement('span');
  const kinds=['❤️','💖','💕','🌹','🌷','💋','💗','🌸','💐','🥰','✨','🎈','🎀','⭐'];
  item.className='birthday-fall-item '+(Math.random()<.22?'birthday-balloon':'');
  item.textContent=kinds[Math.floor(Math.random()*kinds.length)];
  item.style.left=(2+Math.random()*96)+'vw';
  item.style.setProperty('--drift',((Math.random()-.5)*22).toFixed(1)+'vw');
  item.style.fontSize=(18+Math.random()*22).toFixed(0)+'px';
  item.style.animationDuration=(4.0+Math.random()*3.8).toFixed(2)+'s';
  item.style.animationDelay=(Math.random()*.5).toFixed(2)+'s';
  item.addEventListener('animationend',()=>item.remove(),{once:true});
  c.appendChild(item);
}
function spawnBirthdayBurst(){
  if(!birthdayUiIsActive())return;
  const c=$('#birthday-effects');if(!c)return;
  const burst=document.createElement('div');burst.className='birthday-burst';
  burst.style.left=(12+Math.random()*76)+'vw';burst.style.top=(12+Math.random()*46)+'vh';
  burst.innerHTML=['✨','💖','🌸','🎉','⭐'].map((x,i)=>`<span class="birthday-burst-spark s${i}">${x}</span>`).join('');
  c.appendChild(burst);setTimeout(()=>burst.remove(),1600);
}
function updateBirthdayUi(){
  const active=birthdayUiIsActive();
  const banner=$('#birthday-banner-container'),effects=$('#birthday-effects');
  document.body.classList.toggle('birthday-day',active);
  document.body.classList.toggle('birthday-lightbox-open',!!$('#lightbox')?.open);
  if(banner)banner.hidden=!active;
  if(effects)effects.hidden=!active;
  if(active){
    if(!birthdayEffectsTimer){
      for(let i=0;i<18;i++)setTimeout(spawnBirthdayEffect,i*110);
      birthdayEffectsTimer=setInterval(()=>{spawnBirthdayEffect();if(Math.random()<.28)spawnBirthdayBurst()},430);
    }
  }else stopBirthdayEffects();
}
function initBirthdayUi(){
  $('#birthdayDogClose')?.addEventListener('click',()=>$('#birthday-dog-dialog')?.close());
  $('#birthday-dog-dialog')?.addEventListener('click',e=>{if(e.target.id==='birthday-dog-dialog')e.target.close()});
  $('#lightbox')?.addEventListener('toggle',()=>{if($('#lightbox')?.open)stopBirthdayEffects();setTimeout(updateBirthdayUi,0)});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')updateBirthdayUi()});
  updateBirthdayUi();
  clearInterval(birthdayClockTimer);
  birthdayClockTimer=setInterval(updateBirthdayUi,60000);
}
function pageHome(){
 const p=photoOfDayPool();const daily=p.length?p[seed()%p.length]:null;
 const dailyAlbums=selectedDailyAlbumMemories();
 const same=visibleMemories().filter(m=>memoryOnAnnualDay(m)).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
 const birthdayInfo=annual(state.settings.birthdayRania);
 const visibleCountdowns=state.settings.countdowns.filter(x=>x.showHome).map(countdownCardData);
 const birthdayLabel=birthdayInfo?(birthdayInfo.days===0?'اليوم 🎉🎂':`باقي ${birthdayInfo.days} يوم${birthdayInfo.days===1?'':'ًا'}`):'أضف تاريخ عيد ميلاد رانيا من الإعدادات';
 return `<div class="inner">${scanProgressCard()}<div class="dedication"><div class="our">Our Story</div><div class="names">رانيا ♥ أسامة</div><div class="tag">قصتنا وصداقتنا</div><div class="line"></div><div class="small">من أول لحظة... إلى كل لحظة بعدها. ❤️</div><div class="feature card" style="width:min(640px,100%);margin-top:18px"><div class="memory-body"><b>📸 صورة اليوم</b><div class="meta">${state.settings.dailyAlbumIds===null?'من كل الألبومات الظاهرة':dailyAlbums.length?`من ${dailyAlbums.length} ألبوم محدد`:'لا توجد ألبومات محددة'}</div></div>${daily?`<button class="memory-cover" data-action="photo" data-id="${daily.id}"><img data-thumb="${daily.id}" alt=""></button>`:`<div class="memory-cover"><span style="font:50px Georgia;color:var(--rose)">♥</span></div>`}<div class="memory-body"><b>${daily?esc(daily.name):'اربط مجلد الصور للبدء'}</b></div></div></div><div class="stats"><div class="stat"><b>${visibleMemories().length}</b><small>ذكرى ظاهرة</small></div><div class="stat"><b>${visiblePhotoCount()}</b><small>صورة ظاهرة</small></div><div class="stat"><b>${state.dreams.length}</b><small>حلم</small></div><div class="stat"><b>${state.verses.length}</b><small>آية</small></div></div><div class="actions"><button class="btn primary" data-action="go" data-section="memories">فتح ذكرياتنا</button><button class="btn" data-action="go" data-section="calendar">التقويم</button><button class="btn" data-action="go" data-section="story">رحلتنا</button><button class="btn" data-action="go" data-section="messages">رسائلنا ⭐</button></div><div class="line"></div><div class="grid"><div class="card"><b>⏳ معًا منذ</b><p>${duration(state.settings.startDate)}</p></div><div class="card"><b>💍 منذ الخطوبة</b><p>${duration(state.settings.engagementDate)}</p></div><div class="card birthday-home-mini-card ${birthdayInfo?.days===0?'birthday-today':''}"><b>🎂 عيد ميلاد رانيا</b><p>${birthdayLabel}</p>${birthdayInfo?.days===0?`<button class="btn small primary birthday-home-button" data-action="birthdayRania">🎉 افتحي المفاجأة</button>`:''}</div></div>${visibleCountdowns.length?`<div class="line"></div><h3>⏳ عداداتنا</h3><div class="cards">${visibleCountdowns.map(x=>`<div class="card"><b>${esc(x.emoji)} ${esc(x.title)}</b><p>${esc(x.label)}</p></div>`).join('')}</div>`:''}${same.length?`<div class="line"></div><h3>في مثل هذا اليوم ✨</h3><p class="note">كل الذكريات التي تغطي تاريخ اليوم، حتى لو كانت من سنوات مختلفة.</p><div class="cards">${same.map(m=>`<article class="card today-memory"><div>${miniThumbs(m,6)}</div><div class="memory-body"><h3>${esc(m.title||'ذكرى')}</h3><div class="meta">${rangeLabel(m)}${m.place?' • '+esc(m.place):''}</div>${m.description?`<p>${esc(m.description)}</p>`:''}<button class="btn small primary" data-action="memory" data-id="${m.id}">فتح الذكرى والصور</button></div></article>`).join('')}</div>`:''}</div>`
}
function detailScore(m){const photoCount=photoFor(m).length;return (m.date?30:0)+(m.endDate&&m.endDate!==m.date?10:0)+(m.place?20:0)+(m.description?Math.min(25,5+Math.floor(String(m.description).length/60)*5):0)+(m.title?5:0)+Math.min(20,photoCount*2)}
function orderedMemories(ms){return [...ms].sort((a,b)=>state.settings.albumOrderMode==='details'?(detailScore(b)-detailScore(a)):state.settings.albumOrderMode==='linked'?(originalCoverage(b)-originalCoverage(a)):(a.order??0)-(b.order??0))}
function sourcesPanel(){const manual=new Map();for(const m of visibleMemories()){if(!m?.linkSourceId||!m?.linkFolderPath)continue;const s=sources.find(x=>String(x.id)===String(m.linkSourceId));if(!s)continue;const a=manual.get(s.id)||[];a.push(m);manual.set(s.id,a);for(const z of normalizeAlbumLinkFolders(m)){const ss=sources.find(x=>String(x.id)===String(z.sourceId));if(ss&&String(ss.id)!==String(s.id)){const aa=manual.get(ss.id)||[];if(!aa.some(x=>x.id===m.id))aa.push(m);manual.set(ss.id,aa)}}}return `<div class="card sources-panel"><h3>📁 مجلدات الصور الرئيسية</h3><p class="meta">تظهر هنا فقط المكتبات الرئيسية التي أضفتها. مجلدات الألبومات التي اخترتها يدويًا للربط السريع تظهر تحتها بشكل مختصر ولا تُعامل كمصادر مستقلة.</p>${sources.length?sources.map((x,i)=>{const cp=scanProgresses[x.id];const running=cp&&['running','paused'].includes(cp.status);const children=manual.get(x.id)||[];return `<div class="source-row ${x.id===activeSourceId?'active':''}"><div class="source-info"><b>${i===0?'⭐ ':''}${esc(sourceLabel(x))}</b><small>${i===0?'المكتبة الأساسية':'مكتبة رئيسية'}${sourceMergeLabel(x)}${cp?.status==='done'?' • آخر فحص مكتمل':''}${cp?.status==='paused'?' • فحص متوقف':''}${cp?.status==='running'?' • فحص جارٍ':''}${linkProgresses[x.id]?.status==='done'?` • ✅ الربط مكتمل (${linkProgresses[x.id].linked||0} جديد + ${linkProgresses[x.id].verified||0} محفوظ)`:linkProgresses[x.id]?.status==='running'?` • 🔗 ربط جارٍ ${linkProgresses[x.id].processed||0}/${linkProgresses[x.id].total||0}`:''}</small>${children.length?`<details class="source-manual-links"><summary class="source-manual-title">📎 مجلدات مربوطة يدويًا بالطريقة السريعة (${children.length})</summary><div class="source-manual-list">${children.map(m=>`<div class="source-manual-link"><b>${esc(m.title||m.album||'ألبوم')}</b><span>${esc(m.linkFolderPath)}</span></div>`).join('')}</div></details>`:''}</div><div class="actions"><button class="btn small" data-action="activateSource" data-id="${x.id}">${x.id===activeSourceId?'المحدد':'تحديد'}</button><button class="btn small" data-action="scanSource" data-id="${x.id}">↻ فحص هذا المجلد</button>${running?`<button class="btn small" data-action="resumeSource" data-id="${x.id}">▶ استكمال</button>`:''}</div></div>`}).join(''):`<div class="empty">لم تتم إضافة أي مجلد رئيسي بعد.</div>`}</div>`}
function memoryListForBook(){const q=(pageMemories.q||'').toLowerCase();return orderedMemories(visibleMemories().filter(m=>!q||[m.title,m.date,m.endDate,m.place,m.description,m.album].join(' ').toLowerCase().includes(q)))}
function albumMiniCard(m,idx){const sn=selectedIndex(selectedMemories,m.id),ps=photoFor(m);return `<article class="card album-mini-card album-tone-${idx%6}"><div class="album-mini-cover">${romanticMiniGallery(m,3)}${sn?`<span class="album-selection-number">#${sn}</span>`:''}</div><div class="album-mini-info"><div class="album-mini-title"><b>${esc(m.title||'ذكرى')}</b>${albumOriginalBadge(m)}</div><div class="meta">${ps.length} صورة${m.place?' • '+esc(m.place):''}${normalizeAlbumLinkFolders(m).length?` • 📁 ${normalizeAlbumLinkFolders(m).length} أصول`:(m.linkSourceId?` • 📁 ${esc(sourceLabel(sources.find(x=>x.id===m.linkSourceId)))}${m.linkFolderPath?' / '+esc(m.linkFolderPath):''}`:'')}</div><label class="photo-check"><input class="memory-select" type="checkbox" data-memory="${m.id}" ${selectedMemories.has(m.id)?'checked':''}> تحديد ${sn?`<span class="selection-badge">#${sn}</span>`:''}</label><div class="actions"><button class="btn small primary" data-action="memory" data-id="${m.id}">فتح</button><button class="icon-btn" data-action="moveMemoryUp" data-id="${m.id}" title="لأعلى">↑</button><button class="icon-btn" data-action="moveMemoryDown" data-id="${m.id}" title="لأسفل">↓</button></div></div></article>`}
function toggleAlbumMiniView(){state.settings.albumMiniView=!state.settings.albumMiniView;albumBookIndex=0;save().catch(()=>{});renderNoAnim(true)}
function fitAlbumBookStage(){
 const stage=document.querySelector('.album-book-stage');
 if(!stage)return;
 const leaf=stage.querySelector('.album-leaf'),under=stage.querySelector('.album-underlay');
 const h=Math.max(520,leaf?.scrollHeight||0,under?.scrollHeight||0);
 stage.style.minHeight=h+'px';
 stage.querySelectorAll('.album-underlay,.album-leaf').forEach(x=>x.style.minHeight=h+'px');
}

function pageMemoriesAt(idx){const old=albumBookIndex;albumBookIndex=idx;const html=pageMemories();albumBookIndex=old;return html}
function pageMemories(){const ms=memoryListForBook();if(albumBookIndex>=ms.length)albumBookIndex=Math.max(0,ms.length-1);const selectedVisible=ms.filter(m=>selectedMemories.has(m.id)).length;const m=ms[albumBookIndex];const prev=albumBookIndex>0?ms[albumBookIndex-1]:null,next=albumBookIndex<ms.length-1?ms[albumBookIndex+1]:null;return `<div class="inner memories-book-page"><div class="kicker">📸 ذكرياتنا</div><h1 class="title">ألبوماتنا</h1><p class="note">كل ألبوم له صفحة خاصة به داخل الكتاب. استخدم الأسهم أو اسحب الصفحة للتنقل بين الألبومات، بينما تبقى أدوات التحديد والترتيب كما هي.</p><div class="actions" style="margin:12px 0"><button class="btn primary" data-action="folder">📁 إضافة مجلد / ألبوم</button><button class="btn" data-action="scan">↻ فحص المجلد المحدد</button><button class="btn" data-action="addMemory">＋ ذكرى</button><button class="btn" data-action="newAlbum">＋ ألبوم</button><button class="btn" data-action="hiddenMemories">👁️ المخفي</button><button class="btn" data-action="dailyAlbums">✨ ألبومات صورة اليوم</button><button class="btn" data-action="go" data-section="calendar">📅 التقويم</button></div><div class="card bulk-tools"><div class="actions"><button class="btn small" data-action="selectAllMemories">☑ تحديد الكل</button><button class="btn small" data-action="clearMemorySelection">مسح التحديد</button><button class="btn small" data-action="commitMemoryOrder">✅ تثبيت ترتيب التحديد</button><button class="btn small" data-action="mergeSelectedMemories">📁 جمع المحدد في ألبوم واحد</button><button class="btn small" data-action="hideSelectedMemories">👁️ إخفاء المحدد</button></div><div class="meta">${selectedVisible} محددة من ${ms.length}. كل تحديد يأخذ رقمًا حسب ترتيب ضغطاتك.</div></div><div class="card album-order-bar" style="margin:10px 0"><div class="order-row"><b>ترتيب الألبومات</b><span class="album-book-count">${ms.length?`${albumBookIndex+1} / ${ms.length}`:'0 / 0'}</span></div><div class="actions" style="margin-top:8px"><button class="btn small" data-action="orderManual">↕ ترتيب يدوي</button><button class="btn small" data-action="orderDetails">✨ الأكثر تفاصيلًا أولًا</button><button class="btn small" data-action="orderLinked">💛 الأصول المكتشفة أولًا</button><button class="btn small ${state.settings.albumMiniView?'primary':''}" data-action="toggleAlbumMiniView">🗂️ ${state.settings.albumMiniView?'العودة إلى الكتاب':'عرض الألبومات مصغرة'}</button></div></div><div style="display:flex;gap:8px;margin-bottom:12px"><input id="searchMem" style="flex:1;padding:10px;border:1px solid var(--line);border-radius:12px;background:#fff8" placeholder="ابحث بالاسم أو المكان أو السنة" value="${esc(pageMemories.q||'')}"><button class="btn" data-action="search">بحث</button></div>${state.settings.albumMiniView?`<div class="album-mini-grid">${ms.length?ms.map(albumMiniCard).join(''):`<div class="empty">لا توجد ألبومات ظاهرة.</div>`}</div>`:`<><div class="memories-book-controls"><button class="round" data-action="albumPrev" ${prev?'':'disabled'} title="الألبوم السابق">‹</button><div class="book-control-center"><span>صفحة الألبوم</span><strong>${ms.length?`${albumBookIndex+1} من ${ms.length}`:'لا توجد ألبومات'}</strong></div><button class="round" data-action="albumNext" ${next?'':'disabled'} title="الألبوم التالي">›</button></div><div class="album-book-stage">${ms.length?`<div class="album-underlay">${next?memoryCard(next,albumBookIndex+1):memoryCard(m,albumBookIndex)}</div><div class="album-leaf">${memoryCard(m,albumBookIndex)}</div>`:`<div class="empty">لا توجد ألبومات ظاهرة.</div>`}</div></>`}</div>`}
function restoreAlbumScroll(top,left){const apply=()=>{const inner=$('#currentPage .inner');if(!inner)return;inner.scrollTop=top;inner.scrollLeft=left};requestAnimationFrame(()=>{apply();requestAnimationFrame(apply)});setTimeout(apply,60);setTimeout(apply,220);setTimeout(apply,500)}
function resetAlbumBookTurn(){albumBookToken++;if(albumBookTimer){clearTimeout(albumBookTimer);albumBookTimer=null}albumBookBusy=false;const stage=document.querySelector('.album-book-stage');if(stage)stage.classList.remove('turn-next','turn-prev')}
function turnAlbumPage(dir){const duration=760;if(albumBookBusy)return;const ms=memoryListForBook();const target=albumBookIndex+dir;if(target<0||target>=ms.length)return;const stage=document.querySelector('.album-book-stage');if(!stage)return;const leaf=stage.querySelector('.album-leaf'),under=stage.querySelector('.album-underlay');if(!leaf||!under)return;const targetMemory=ms[target],token=++albumBookToken;albumBookBusy=true;stage.classList.remove('turn-next','turn-prev');void leaf.offsetWidth;under.innerHTML=memoryCard(targetMemory,target);fitAlbumBookStage();hydrate(under);requestAnimationFrame(()=>{if(token!==albumBookToken||!document.contains(stage)){albumBookBusy=false;return}stage.classList.add(dir>0?'turn-next':'turn-prev');paperSound(duration);albumBookTimer=setTimeout(()=>{if(token!==albumBookToken||!document.contains(stage)){albumBookBusy=false;albumBookTimer=null;return}albumBookTimer=null;stage.classList.remove('turn-next','turn-prev');void leaf.offsetWidth;const fresh=memoryListForBook(),targetIndex=Math.max(0,fresh.findIndex(m=>m.id===targetMemory.id));const resolvedTarget=fresh[targetIndex]||targetMemory,nextMemory=fresh[targetIndex+dir]||null;leaf.innerHTML=memoryCard(resolvedTarget,targetIndex);under.innerHTML=nextMemory?memoryCard(nextMemory,targetIndex+dir):memoryCard(resolvedTarget,targetIndex);albumBookIndex=targetIndex;fitAlbumBookStage();albumBookBusy=false;const countEl=document.querySelector('.album-book-count'),pageEl=document.querySelector('.book-control-center strong'),prevBtn=document.querySelector('[data-action="albumPrev"]'),nextBtn=document.querySelector('[data-action="albumNext"]');if(countEl)countEl.textContent=fresh.length?`${targetIndex+1} / ${fresh.length}`:'0 / 0';if(pageEl)pageEl.textContent=fresh.length?`${targetIndex+1} من ${fresh.length}`:'لا توجد ألبومات';if(prevBtn)prevBtn.disabled=targetIndex<=0;if(nextBtn)nextBtn.disabled=targetIndex>=fresh.length-1;hydrate(stage)},duration+8)})}

function selectedIndex(set,id){const a=[...set],i=a.indexOf(id);return i<0?0:i+1}
function memoryCard(m,idx=0){const ps=photoFor(m),sn=selectedIndex(selectedMemories,m.id);return `<article class="card memory-card romantic-card album-tone-${idx%6}"><div class="romantic-card-cover">${romanticMiniGallery(m,4)}${sn?`<span class="album-selection-number">#${sn}</span>`:''}</div><div class="memory-body"><label class="photo-check"><input class="memory-select" type="checkbox" data-memory="${m.id}" ${selectedMemories.has(m.id)?'checked':''}> تحديد الألبوم ${sn?`<span class="selection-badge">#${sn}</span>`:''}</label><h3>${esc(m.title||'ذكرى')}${albumOriginalBadge(m)}</h3><div class="meta">${rangeLabel(m)}${m.place?' • '+esc(m.place):''} • ${ps.length} صورة${normalizeAlbumLinkFolders(m).length?` • 📁 ${normalizeAlbumLinkFolders(m).length} أصل`:(m.linkSourceId?` • 📁 مصدر الربط: ${esc(sourceLabel(sources.find(x=>x.id===m.linkSourceId)))}`:'')}</div><div class="actions album-card-actions"><button class="btn small primary" data-action="memory" data-id="${m.id}">فتح الألبوم</button><button class="btn small" data-action="editMemory" data-id="${m.id}">تعديل الألبوم</button><button class="btn small" data-action="hideMemory" data-id="${m.id}">إخفاء</button></div>${m.description?`<div class="album-notes"><b>ملاحظات الألبوم</b><p>${esc(m.description)}</p></div>`:''}</div></article>`}
function photoTile(p,idx,total){const sn=dragSelectMode?0:selectedIndex(selectedPhotos,p.id);return `<article class="photo-item romantic-photo-item"><label class="photo-check"><input class="photo-select" type="checkbox" data-photo="${p.id}" ${selectedPhotos.has(p.id)?'checked':''}> تحديد ${sn?`<span class="selection-badge">#${sn}</span>`:''}</label><button class="thumb romantic-thumb" data-action="photo" data-id="${p.id}"><img data-thumb="${p.id}" alt="${esc(p.name)}">${originalBadge(p)}${sn?`<span class="photo-number selection-number">#${sn}</span>`:''}</button><div class="photo-item-footer"><span class="meta" title="${esc(p.name)}">${esc(p.name)}</span></div></article>`}
function pageMemory(m){currentMemoryId=m.id;const ps=photoFor(m);selectedPhotos=new Set([...selectedPhotos].filter(id=>m.photoIds?.includes(id)));const hero=ps[0];return `<div class="inner memory-page"><div class="kicker">📖 ألبوم من القلب</div><div class="memory-heading"><div><h1 class="title">${esc(m.title||'ذكرى')}</h1><p class="note">${rangeLabel(m)}${m.place?' • '+esc(m.place):''}</p></div><div class="memory-heart">♥</div></div>${m.description?`<div class="quote romantic-quote">«${esc(m.description)}»</div>`:''}<div class="photo-toolbar"><span class="photo-count">📸 ${ps.length} صورة</span>${m.place?`<span class="photo-count">📍 ${esc(m.place)}</span>`:''}<span class="photo-count">📅 ${rangeLabel(m)}</span>${ps.length>1?`<span class="photo-count">✦ اسحب للتنقل</span>`:''}</div><section class="memory-feature">${hero?`<button class="memory-hero" data-action="photo" data-id="${hero.id}"><img data-thumb="${hero.id}" alt="${esc(hero.name)}"><span class="hero-shine"></span><span class="hero-open">اضغط لفتح الألبوم ♥</span></button>`:`<div class="memory-hero empty-hero">♥<span>ذكرى جميلة بلا صور</span></div>`}<div class="romantic-strip">${ps.slice(0,10).map((p,idx)=>`<button class="strip-thumb ${idx===0?'active':''}" data-action="photo" data-id="${p.id}"><img data-thumb="${p.id}" alt="${esc(p.name)}"><span>${idx+1}</span></button>`).join('')}</div></section>${ps.length?`<section class="photo-section"><div class="section-title-row"><h2>📸 الصور</h2><span class="meta">${ps.length}</span></div><div class="gallery managed-gallery romantic-gallery ${dragSelectMode?'drag-select-active':''}">${ps.map((p,idx)=>photoTile(p,idx,ps.length)).join('')}</div></section>`:''}<div class="actions memory-actions"><button class="btn primary" data-action="editMemory" data-id="${m.id}">✎ تعديل التفاصيل / مصدر الربط</button><button class="btn" data-action="pickAlbumLinkSource" data-id="${m.id}">📁 اختيار مجلد الألبوم نفسه — الأسرع</button><button class="btn" data-action="shareMemory" data-id="${m.id}">📤 مشاركة الصور</button><button class="btn" data-action="hideMemory" data-id="${m.id}">👁️ إخفاء الذكرى / المجلد</button><button class="btn" data-action="backMemories">↩ ألبوماتنا</button></div><div class="photo-manager card"><div class="manager-head"><b>إدارة الصور</b><span class="meta" id="selectionCount">${selectedPhotos.size} محددة</span></div><div class="actions"><button class="btn small" data-action="selectAllPhotos">تحديد الكل</button><button class="btn small" data-action="clearPhotoSelection">مسح التحديد</button><button class="btn small ${dragSelectMode?'primary':''}" data-action="toggleDragSelect">⚡ ${dragSelectMode?'إنهاء التحديد السريع':'تحديد سريع'}</button><button class="btn small" data-action="commitPhotoOrder">✅ تثبيت ترتيب التحديد</button><button class="btn small" data-action="moveSelected">نقل المحدد</button><button class="btn small" data-action="removeFromAlbum">إزالة من الألبوم</button><button class="btn small danger" data-action="excludeSelected">استبعاد من الفهرس</button></div><p class="meta">النظام المرقّم هو الأساس. «التحديد السريع» خيار إضافي: لمسة قصيرة للتحديد، سحب عادي للتمرير، وضغط مطوّل ثم سحب للتحديد المتواصل. إزالة الصورة من الألبوم/الفهرس لا تحذف الأصل من الجهاز.</p></div></div>`}
function pageStory(){const a=[...state.events.map(x=>({date:x.date,title:x.title,text:x.description,kind:'محطة'})),...visibleMemories().filter(x=>x.date).map(x=>({date:x.date,title:x.title,text:x.description,kind:'ذكرى',endDate:x.endDate}))].sort((x,y)=>(x.date||'').localeCompare(y.date||''));return `<div class="inner"><div class="kicker">◴ قصتنا</div><h1 class="title">رحلتنا</h1><p class="note">كل تاريخ وذكرى ومحطة يضيف صفحة جديدة.</p><button class="btn primary" data-action="event">＋ إضافة محطة</button><div class="timeline" style="margin-top:16px">${a.length?a.map(x=>`<div class="titem"><div class="tbox card"><div class="meta">${x.endDate&&x.endDate!==x.date?`من ${fmt(x.date)} إلى ${fmt(x.endDate)}`:fmt(x.date)} • ${x.kind}</div><h3>${esc(x.title)}</h3><p>${esc(x.text||'')}</p></div></div>`).join(''):`<div class="empty">لم نضف محطات بعد.</div>`}</div></div>`}
function pageDreams(){const avg=state.dreams.length?Math.round(state.dreams.reduce((a,d)=>a+(+d.progress||0),0)/state.dreams.length):0;return `<div class="inner"><div class="kicker">✦ أحلامنا</div><h1 class="title">ما نحلم به</h1><p class="note">حلم + نسبة إنجاز + موعد، ثم يوم نكتب فيه «تحقق».</p><div class="card"><b>متوسط الإنجاز</b><p>${avg}%</p><div class="progress"><i style="width:${avg}%"></i></div></div><button class="btn primary" data-action="dream" style="margin:12px 0">＋ حلم</button><div class="cards">${state.dreams.length?state.dreams.map(d=>`<div class="card"><h3>${d.done?'✅':'🌱'} ${esc(d.title)}</h3><div class="meta">${d.targetDate?fmt(d.targetDate):'بدون موعد'}</div><p>${esc(d.note||'')}</p><div class="progress"><i style="width:${Math.min(100,Math.max(0,d.progress||0))}%"></i></div><p>${+d.progress||0}%</p><button class="btn small" data-action="editDream" data-id="${d.id}">تعديل</button></div>`).join(''):`<div class="empty">اكتبوا أول حلم.</div>`}</div></div>`}
function pageSpiritual(){const vs=state.verses||[],ps=state.prayers||[],daily=vs.length?vs[seed()%vs.length]:null;return `<div class="inner"><div class="kicker">☼ روحياتنا</div><h1 class="title">ما نحفظه في القلب</h1>${daily?`<div class="quote">«${esc(daily.text)}»<div class="meta">— ${esc(daily.ref||'')}</div></div>`:`<div class="empty">أضيفوا أول آية مفضلة لتظهر «آية اليوم» هنا.</div>`}<div class="actions" style="margin:14px 0"><button class="btn primary" data-action="verse">＋ آية</button><button class="btn" data-action="prayer">＋ صلاة / أمنية</button></div><h3>آياتنا</h3><div class="cards">${vs.length?vs.map(v=>`<div class="card"><div class="meta">${v.favorite?'⭐ ':''}${esc(v.ref||'')}</div><p>«${esc(v.text)}»</p><div class="actions"><button class="btn small" data-action="favVerse" data-id="${v.id}">${v.favorite?'إزالة ⭐':'تمييز ⭐'}</button><button class="btn small" data-action="delVerse" data-id="${v.id}">حذف</button></div></div>`).join(''):`<div class="empty">لا توجد آيات.</div>`}</div><div class="line"></div><h3>صلوات وأمنيات</h3><div class="cards">${ps.length?ps.map(p=>`<div class="card"><h3>${p.done?'✅':'🙏'} ${esc(p.title)}</h3><p>${esc(p.text||'')}</p><div class="actions"><button class="btn small" data-action="togglePrayer" data-id="${p.id}">${p.done?'تراجع':'تحققت ♥'}</button><button class="btn small" data-action="editPrayer" data-id="${p.id}">تعديل</button><button class="btn small danger" data-action="deletePrayer" data-id="${p.id}">حذف</button></div></div>`).join(''):`<div class="empty">يمكنكم حفظ ما تصلّون أو تتمنون.</div>`}</div></div>`}
function pageMessages(){const ms=state.messages.filter(x=>x.starred).sort((a,b)=>(state.settings.messagesOrder==='asc'?(a.date||'').localeCompare(b.date||''):(b.date||'').localeCompare(a.date||''))),wa=state.settings.whatsappUrl||(state.settings.raniaPhone?`https://wa.me/${state.settings.raniaPhone.replace(/\D/g,'')}`:'');return `<div class="inner"><div class="kicker">✉ رسائلنا</div><h1 class="title">رسائل لا تُنسى ⭐</h1><p class="note">احفظ هنا ما يستحق البقاء؛ المحادثة الأصلية تبقى في واتساب.</p>${searchState.query?`<div class="notice">نتيجة البحث: <b>${esc(searchState.query)}</b>${searchState.messageId?' — تم تحديد الرسالة المطابقة.':''}</div>`:''}<div class="card"><b>📲 من واتساب إلى OsRa</b><p>جرّب مشاركة نص الرسالة إلى OsRa. إذا لم يظهر OsRa في قائمة المشاركة، أضف الرسالة يدويًا مؤقتًا.</p><button class="btn primary" data-action="message">＋ إضافة رسالة</button><div class="actions" style="margin-top:10px"><button class="btn small ${state.settings.messagesOrder==='desc'?'primary':''}" data-action="messagesSortDesc">الأحدث أولًا ↓</button><button class="btn small ${state.settings.messagesOrder==='asc'?'primary':''}" data-action="messagesSortAsc">الأقدم أولًا ↑</button></div></div><div class="cards" style="margin-top:12px">${ms.length?ms.map(mm=>messageCard(mm,searchState.query)).join(''):`<div class="empty">لا توجد رسائل مميزة بعد.</div>`}</div>${wa?`<div class="line"></div><a class="btn primary" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">فتح محادثتنا في واتساب ↗</a>`:''}</div>`}
function escapeRegExp(v){return String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function highlightSearchText(text,q){const raw=String(text||''),term=String(q||'').trim();if(!term)return esc(raw);const re=new RegExp(escapeRegExp(term),'gi');let out='',last=0,m;while((m=re.exec(raw))){out+=esc(raw.slice(last,m.index));out+='<mark class="search-hit">'+esc(m[0])+'</mark>';last=m.index+m[0].length;if(m[0].length===0)re.lastIndex++}out+=esc(raw.slice(last));return out}
function messageCard(m,q=''){const focus=searchState.messageId===m.id;return `<div id="message-card-${esc(m.id)}" class="card ${focus?'search-focus':''}"><div class="meta">⭐ ${fmt(m.date)} • ${esc(m.sender||'')}</div><p>«${highlightSearchText(m.text,q)}»</p><div class="actions"><button class="btn small" data-action="toggleMessage" data-id="${m.id}">${m.starred?'إزالة ⭐':'إضافة ⭐'}</button><button class="btn small" data-action="editMessage" data-id="${m.id}">تعديل</button><button class="btn small" data-action="delMessage" data-id="${m.id}">حذف</button></div></div>`}
function countdownCelebrateOff(id){const key=today();return String(state.settings.countdownCelebrateOffOnDate?.[id]||'')===key}function countdownCelebrateLabel(x){return `🎉 احتفل ${countdownCelebrateOff(x.id)?'nicht 😔':'🥳'}`}
function occasionCountdownsToday(){const out=[];const todayKey=today();const built=[{id:'startDate',title:'بداية قصتنا',date:state.settings.startDate,emoji:'♥'},{id:'engagementDate',title:'الخطوبة',date:state.settings.engagementDate,emoji:'💍'}];for(const x of built){if(String(x.date||'').slice(5)===todayKey.slice(5))out.push({...x,annual:true,synthetic:true})}for(const x of state.settings.countdowns||[]){const info=countdownInfo(x);if(info&&info.days===0)out.push(x)}return out}
async function toggleCountdownCelebrate(id){state.settings.countdownCelebrateOffOnDate=state.settings.countdownCelebrateOffOnDate||{};if(countdownCelebrateOff(id))delete state.settings.countdownCelebrateOffOnDate[id];else state.settings.countdownCelebrateOffOnDate[id]=today();await save();removeOccasionCelebration();renderNoAnim();if(!countdownCelebrateOff(id)&&occasionCountdownsToday().some(x=>x.id===id))setTimeout(()=>runOccasionCelebrationForId(id),120)}
function countdownsPanel(){const xs=state.settings.countdowns||[];return `<div class="card"><h3>⏳ عدادات ومواعيد مستقلة</h3><p class="meta">ميزة اختيارية تمامًا. لا علاقة لها بقائمة الأحلام. أضف موعدًا عند الحاجة واختر بنفسك هل يظهر في الرئيسية أم يظل داخل الإعدادات فقط.</p><div class="cards">${xs.length?xs.map(x=>{const info=countdownInfo(x);const todayNow=!!info&&info.days===0;return `<div class="card"><div class="memory-body"><b>${esc(x.emoji)} ${esc(x.title)}</b><div class="meta">${esc(countdownDateLabel(x))} • ${x.showHome?'يظهر في الرئيسية':'مخفي من الرئيسية'}</div></div><div class="actions">${todayNow?`<button class="btn small occasion-celebrate-btn" data-action="toggleCountdownCelebrate" data-id="${x.id}" title="هذا الزر يوقف الاحتفال لباقي اليوم فقط">${countdownCelebrateLabel(x)}</button>`:''}<button class="btn small" data-action="editCountdown" data-id="${x.id}">✎ تعديل</button><button class="btn small danger" data-action="deleteCountdown" data-id="${x.id}">حذف</button></div></div>`}).join(''):`<div class="empty">لا توجد عدادات مضافة. كل شيء يبقى كما هو دونها.</div>`}</div><button class="btn primary" data-action="countdown">＋ إضافة عداد / موعد</button></div>`}
function removeOccasionCelebration(){document.getElementById('occasionCelebration')?.remove();occasionCelebrationBusy=false}
function runOccasionCelebrationForId(idv){if(!surprisesAreEnabled())return;const list=occasionCountdownsToday().filter(x=>String(x.id)===String(idv));if(!list.length||countdownCelebrateOff(idv)||occasionCelebrationBusy)return;removeOccasionCelebration();occasionCelebrationBusy=true;const layer=document.createElement('div');layer.id='occasionCelebration';layer.className='occasion-celebration';layer.setAttribute('aria-hidden','true');const fireworks=['🎆','✨','💥','🎇','⭐'];const fall=['❤️','🫂','🌹','🌷','🌸','💋','💛','🥰','💖','🎀'];for(let i=0;i<26;i++){const s=document.createElement('span');s.className='occasion-spark';s.textContent=fireworks[i%fireworks.length];s.style.left=`${4+Math.random()*92}%`;s.style.animationDelay=`${(Math.random()*.85).toFixed(2)}s`;s.style.animationDuration=`${(2.0+Math.random()*1.35).toFixed(2)}s`;layer.appendChild(s)}for(let i=0;i<44;i++){const s=document.createElement('span');s.className='occasion-confetti';s.textContent=fall[i%fall.length];s.style.left=`${Math.random()*100}%`;s.style.animationDelay=`${(Math.random()*1.5).toFixed(2)}s`;s.style.animationDuration=`${(3.0+Math.random()*2.0).toFixed(2)}s`;layer.appendChild(s)}for(let i=0;i<7;i++){const s=document.createElement('span');s.className='occasion-balloon';s.textContent=['🎈','🎈','🎈','💖'][i%4];s.style.left=`${8+Math.random()*84}%`;s.style.animationDelay=`${(Math.random()*.8).toFixed(2)}s`;s.style.animationDuration=`${(3.2+Math.random()*1.7).toFixed(2)}s`;layer.appendChild(s)}document.body.appendChild(layer);setTimeout(()=>{const label=list[0]?.title||'';showRomanticScene(label,{occasion:true,style:romanticScenePickStyle()});layer.classList.add('occasion-celebration-out');setTimeout(()=>{layer.remove();occasionCelebrationBusy=false},800)},2200)}
function maybeRunOccasionCelebrations(){if(!surprisesAreEnabled()||section!=='home')return;const key=today();for(const x of occasionCountdownsToday()){if(countdownCelebrateOff(x.id))continue;const shownKey=`osra-occasion-shown-${String(x.id)}-${key}`;if(localStorage.getItem(shownKey))continue;localStorage.setItem(shownKey,'1');setTimeout(()=>runOccasionCelebrationForId(x.id),350);break}}
function renderRomanticTickerMessage(message,variant,duration=7200){const el=document.getElementById('romanticTicker');const tx=document.getElementById('romanticTickerText');if(!el||!tx)return;tx.textContent=message;tx.dataset.variant=String(variant||0);el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(romanticTickerCloseTimer);romanticTickerCloseTimer=setTimeout(()=>el.classList.remove('show'),Math.max(2800,duration))}
const ROMANTIC_TICKER_MESSAGES=['بحبك','👇انت مش لوحدك انا معاك🫂','🙏ربنا يخليك ليا🙏🤲','كلمتني النهاردة 🤔؟','بصليلك دايما🙏','واااااحشني 🙈🙊🫂','خد ورده 🌹','انت حلو😍🤩😘','😍❤️انت حبيبي 🥰💛','❤️😍🥰💛🌹ياروحي❤️😍🥰🌹♥️'];
const ROMANTIC_LONG_MESSAGE='حلو انت وقاعد مستني الرساله اللي جاية؟ طيب مفيش رسايل جاية وانا اصلا هاجي بطريقة محدش يتوقعني 😉😅 قوم ذاكر ولا شوف وراك إيه ولا كده هغير من التطبيق هياخدك مني🙊';
const ROMANTIC_FLOATS=['🎈','🌹','❤️','💛','💖','💕','🌷','🌸','💐','😘','🫂'];
const ROMANTIC_KISS_MESSAGES=['هات بوسه🙈🙊',...ROMANTIC_TICKER_MESSAGES];
function occasionJoyActive(){return surprisesAreEnabled()&&occasionCountdownsToday().some(x=>!countdownCelebrateOff(x.id))}
function showRomanticFloat(kind='random',profile=surpriseTimingProfile()){
 if(!surprisesAreEnabled())return;
 let layer=document.getElementById('romanticFloatLayer');
 if(!layer){layer=document.createElement('div');layer.id='romanticFloatLayer';layer.className='romantic-float-layer';document.body.appendChild(layer)}
 const pool=kind==='balloon'?['balloon','balloon','balloon','balloon']:kind==='rose'?['rose','rose','heart','flower']:kind==='heart'?['heart','heart','kiss','flower']:['heart','rose','kiss','flower','heart','balloon'];
 const count=3+Math.floor(Math.random()*3);
 for(let i=0;i<count;i++){
  const k=pool[Math.floor(Math.random()*pool.length)],el=document.createElement('span');
  el.className='romantic-float-item';
  if(k==='balloon'){el.classList.add('romantic-mini-balloon');el.innerHTML='<i></i>';el.style.setProperty('--balloon-hue',`${Math.floor(Math.random()*360)}deg`)}
  else{el.textContent=k==='rose'?'🌹':k==='heart'?'❤️':k==='kiss'?'💋':k==='flower'?'🌸':ROMANTIC_FLOATS[Math.floor(Math.random()*ROMANTIC_FLOATS.length)]}
  el.style.left=`${4+Math.random()*92}%`;
  el.style.top=`${8+Math.random()*72}%`;
  el.style.fontSize=`${24+Math.random()*24}px`;
  el.style.animationDuration=`${((4.1+Math.random()*2.8)/Math.max(.65,profile.speed)).toFixed(2)}s`;
  el.style.animationDelay=`${(Math.random()*.7).toFixed(2)}s`;
  el.style.setProperty('--sway',`${-12+Math.random()*24}vw`);
  el.style.setProperty('--driftX',`${-8+Math.random()*16}vw`);
  el.style.setProperty('--driftY',`${-35+Math.random()*70}vh`);
  layer.appendChild(el);
  setTimeout(()=>el.remove(),8500);
 }
}
function romanticWhiteDogSvg(){return `<svg class="romantic-white-dog" viewBox="0 0 96 72" aria-hidden="true"><ellipse cx="48" cy="57" rx="34" ry="9" fill="rgba(30,18,25,.14)"/><path d="M29 25c-8-11-1-20 8-11l7 7c4-3 11-4 17-1l7-8c9-9 16 0 8 12 4 5 6 11 4 20-3 13-16 20-32 20S18 57 18 44c0-7 4-14 11-19Z" fill="#fff" stroke="#e5d9df" stroke-width="2"/><circle cx="38" cy="38" r="2.7" fill="#392b31"/><circle cx="58" cy="38" r="2.7" fill="#392b31"/><ellipse cx="48" cy="46" rx="7" ry="5" fill="#392b31"/><path d="M42 52c4 4 8 4 12 0" fill="none" stroke="#392b31" stroke-width="2" stroke-linecap="round"/><path d="M24 28 16 19c-4-5-7 1-5 9l9 9" fill="#fff" stroke="#e5d9df" stroke-width="2"/><path d="M72 28 80 19c4-5 7 1 5 9l-9 9" fill="#fff" stroke="#e5d9df" stroke-width="2"/></svg>`}
function showRomanticLongMessage(){if(!surprisesAreEnabled()||romanticLongBusy)return;romanticLongBusy=true;renderRomanticTickerMessage(ROMANTIC_LONG_MESSAGE,Math.floor(Math.random()*5),10500);setTimeout(()=>{let layer=document.getElementById('romanticLongLayer');if(layer)layer.remove();layer=document.createElement('div');layer.id='romanticLongLayer';layer.className='romantic-long-layer';layer.innerHTML=`<div class="romantic-long-sign"><div class="romantic-sign-face">${esc(ROMANTIC_LONG_MESSAGE)}</div></div><div class="romantic-dog-target">${romanticWhiteDogSvg()}</div>`;document.body.appendChild(layer);setTimeout(()=>{layer.classList.add('landed')},4200);setTimeout(()=>{layer.classList.add('romantic-long-fade')},12800);setTimeout(()=>{layer.remove();romanticLongBusy=false},20000)},3900)}
function showRomanticBubble(message){if(!surprisesAreEnabled())return;

 const old=document.getElementById('romanticMessageBubble');if(old)old.remove();
 const layer=document.createElement('div');layer.id='romanticMessageBubble';layer.className='romantic-message-bubble';
 const side=Math.random()<.5?'from-left':'from-right';
 layer.classList.add(side);
 layer.innerHTML=`<div class="romantic-bubble-card"><span class="romantic-bubble-spark">✦</span><div class="romantic-bubble-text">${esc(message)}</div><span class="romantic-bubble-tail">♥</span></div>`;
 document.body.appendChild(layer);setTimeout(()=>layer.classList.add('settled'),70);setTimeout(()=>layer.classList.add('leaving'),4700);setTimeout(()=>layer.remove(),6000);
}
function showRomanticMessageTwice(message){if(!surprisesAreEnabled())return;renderRomanticTickerMessage(message,Math.floor(Math.random()*5),6200);setTimeout(()=>showRomanticBubble(message),3600)}

/* R28/R29-style romantic surprise engine: many full-screen presentation modes. */
const ROMANTIC_SCENE_STYLES=[
 'ribbon','spotlight','postcard','burst','neon','heartframe','flowerframe','balloons','orbit','stamp','sticker','cloud','shooting','curtain','split','bottomwave','topwave','giantcenter','sidecard','tiltcard','bubblefield','confetti','rain','ticket','polaroid','halo','bootribbon','dogsign'
];
let lastRomanticSceneStyle='',lastRomanticSceneMessage='';
const ROMANTIC_SCENE_EMOJIS=['❤️','💖','💕','💛','💗','🌹','🌷','🌸','💐','💋','😘','🥰','🫂','🎀','✨','⭐','🎈','💞','🌺','🩷'];
function romanticScenePickStyle(){
 const choices=ROMANTIC_SCENE_STYLES.filter(x=>x!==lastRomanticSceneStyle);
 const v=choices[Math.floor(Math.random()*choices.length)]||ROMANTIC_SCENE_STYLES[0];
 lastRomanticSceneStyle=v;return v;
}
let lastRomanticMotion='';
const ROMANTIC_MOTION_STYLES=['drop','rise','slide-left','slide-right','zoom','spin','bounce','float-left','float-right','soft'];
function romanticMotionPick(){
 const choices=ROMANTIC_MOTION_STYLES.filter(x=>x!==lastRomanticMotion);
 const v=choices[Math.floor(Math.random()*choices.length)]||'soft';
 lastRomanticMotion=v;return v;
}
function romanticSceneDecor(count=9){
 const out=[];
 for(let i=0;i<count;i++){
  const e=ROMANTIC_SCENE_EMOJIS[Math.floor(Math.random()*ROMANTIC_SCENE_EMOJIS.length)];
  const x=2+Math.random()*96,y=4+Math.random()*90,r=-28+Math.random()*56,sc=.72+Math.random()*.78,d=(1.2+Math.random()*2.8).toFixed(2),delay=(Math.random()*.55).toFixed(2);
  out.push(`<span class="rs-decor d${i%6}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;--r:${r.toFixed(1)}deg;--sc:${sc.toFixed(2)};--sd:${d}s;--delay:${delay}s">${e}</span>`);
 }
 return out.join('');
}
function fitRomanticSceneCard(layer){
 const card=layer?.querySelector('.rs-card');
 const msg=layer?.querySelector('.rs-message');
 if(!card||!msg)return;
 const vw=Math.max(280,window.innerWidth||360),vh=Math.max(420,window.innerHeight||640);
 const len=Array.from(msg.textContent||'').length;
 const target=Math.max(18,Math.min(46, len>150?19:len>110?21:len>85?23:len>60?26:len>40?30:len>24?34:40));
 msg.style.fontSize=`${target}px`;
 msg.style.lineHeight=len>90?'1.28':'1.22';
 msg.style.maxWidth='100%';
 const maxH=Math.max(210,Math.min(560,vh-105));
 card.style.maxWidth=`${Math.max(240,Math.min(760,vw-22))}px`;
 card.style.maxHeight='none';
 card.style.overflow='visible';
 // Fit the whole message into the viewport before placement; only very unusual text falls back to scrolling.
 let fs=target;
 for(let n=0;n<14;n++){
  msg.style.fontSize=`${fs}px`;
  if(card.scrollHeight<=maxH || fs<=16)break;
  fs-=1;
 }
 card.style.maxHeight=`${maxH}px`;
 // Keep the resting position completely on-screen, while preserving the chosen style/motion.
 const w=card.offsetWidth||Math.min(760,vw-22),h=card.offsetHeight||Math.min(560,vh-105);
 const initialX=vw*(.18+Math.random()*.64),initialY=vh*(.22+Math.random()*.56);
 const safeX=Math.max(w/2+11,Math.min(vw-w/2-11,initialX));
 const safeY=Math.max(h/2+54,Math.min(vh-h/2-16,initialY));
 card.style.left=`${safeX}px`;
 card.style.top=`${safeY}px`;
 card.dataset.ready='1';
}
function clampRomanticSceneCard(layer){
 const card=layer?.querySelector('.rs-card');
 if(!card)return;
 const vw=window.innerWidth||360,vh=window.innerHeight||640,rect=card.getBoundingClientRect();
 const marginX=10,topSafe=Math.min(74,vh*.12),bottomSafe=10;
 const dx=(rect.left<marginX?marginX-rect.left:rect.right>vw-marginX?vw-marginX-rect.right:0);
 const dy=(rect.top<topSafe?topSafe-rect.top:rect.bottom>vh-bottomSafe?vh-bottomSafe-rect.bottom:0);
 if(dx||dy){
  const curX=parseFloat(card.style.left)||vw/2,curY=parseFloat(card.style.top)||vh/2;
  card.style.left=`${curX+dx}px`;card.style.top=`${curY+dy}px`;
 }
}
function enableRomanticCardDrag(layer){
 const card=layer?.querySelector('.rs-card');
 if(!card||card.dataset.dragReady)return;
 card.dataset.dragReady='1';
 let dragging=false,startX=0,startY=0,startLeft=0,startTop=0,pid=null;
 const stop=()=>{dragging=false;pid=null;card.classList.remove('user-dragged')};
 card.addEventListener('pointerdown',e=>{if(!layer.classList.contains('is-visible'))return;dragging=true;pid=e.pointerId;startX=e.clientX;startY=e.clientY;startLeft=parseFloat(card.style.left)||window.innerWidth/2;startTop=parseFloat(card.style.top)||window.innerHeight/2;card.setPointerCapture?.(e.pointerId);card.classList.add('user-dragged');e.preventDefault()},{passive:false});
 card.addEventListener('pointermove',e=>{if(!dragging||pid!==e.pointerId)return;const w=card.offsetWidth||0,h=card.offsetHeight||0,vw=window.innerWidth,vh=window.innerHeight;let x=startLeft+e.clientX-startX,y=startTop+e.clientY-startY;x=Math.max(w/2+8,Math.min(vw-w/2-8,x));y=Math.max(h/2+48,Math.min(vh-h/2-8,y));card.style.left=`${x}px`;card.style.top=`${y}px`});
 ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>card.addEventListener(ev,stop));
}
function showRomanticScene(message,opts={}){
 if(!surprisesAreEnabled())return;
 const old=document.getElementById('romanticSceneLayer');if(old)old.remove();
 const style=opts.style||romanticScenePickStyle();
 const motion=opts.motion||romanticMotionPick();
 const prof=opts.profile||surpriseTimingProfile();
 const layer=document.createElement('div');layer.id='romanticSceneLayer';layer.className=`romantic-scene-layer scene-${style} motion-${motion} surprise-speed-${prof.key}${opts.occasion?' scene-occasion':''}`;
 layer.setAttribute('aria-hidden','true');layer.innerHTML=romanticSceneHtml(message,style,!!opts.occasion);document.body.appendChild(layer);
 requestAnimationFrame(()=>{fitRomanticSceneCard(layer);layer.classList.add('is-visible');enableRomanticCardDrag(layer);setTimeout(()=>{clampRomanticSceneCard(layer)},Math.max(90,Math.min(450,650/prof.speed)));setTimeout(()=>{clampRomanticSceneCard(layer)},Math.max(250,Math.min(900,1100/prof.speed)));});
 const baseLife=opts.occasion?9200:(style==='dogsign'?11800:7600);const life=Math.round(Math.max(4200,Math.min(12500,baseLife/prof.speed)));layer.style.setProperty('--surprise-speed',String(prof.speed));
 setTimeout(()=>layer.classList.add('is-leaving'),Math.max(4500,life-1800));
 setTimeout(()=>layer.remove(),life);
}
function showRomanticLongMessage(){
 if(romanticLongBusy)return;romanticLongBusy=true;
 const longStyle=Math.random()<.5?'dogsign':'polaroid';
 if(longStyle==='dogsign'){
  renderRomanticTickerMessage(ROMANTIC_LONG_MESSAGE,Math.floor(Math.random()*5),10500);
  setTimeout(()=>{let layer=document.getElementById('romanticLongLayer');if(layer)layer.remove();layer=document.createElement('div');layer.id='romanticLongLayer';layer.className='romantic-long-layer';layer.innerHTML=`<div class="romantic-long-sign"><div class="romantic-sign-face">${esc(ROMANTIC_LONG_MESSAGE)}</div></div><div class="romantic-dog-target">${romanticWhiteDogSvg()}</div>`;document.body.appendChild(layer);setTimeout(()=>{layer.classList.add('landed')},4200);setTimeout(()=>{layer.classList.add('romantic-long-fade')},12800);setTimeout(()=>{layer.remove();romanticLongBusy=false},20000)},3900);
 }else{
  showRomanticScene(ROMANTIC_LONG_MESSAGE,{style:'polaroid'});setTimeout(()=>{romanticLongBusy=false},8200);
 }
}
function showRomanticMessage(profile=surpriseTimingProfile()){
 if(!surprisesAreEnabled())return;
 if(Math.random()<0.10){showMessageBalloon(randomSurpriseMessage());return}
 if(Math.random()<0.12){showRomanticLongMessage();return}
 const pool=surpriseMessagePool();
 let message=randomSurpriseMessage();
 lastRomanticSceneMessage=message;
 showRomanticScene(message,{style:romanticScenePickStyle(),occasion:occasionJoyActive(),profile});
}
function showMessageBalloon(message){
 if(!surprisesAreEnabled())return;
 let layer=document.getElementById('romanticBalloonLayer');if(layer)layer.remove();layer=document.createElement('div');layer.id='romanticBalloonLayer';layer.className='romantic-balloon-layer';const sparks=['✨','💖','🌹','💕','🥰','🎀','💛','😘'];layer.innerHTML=`<div class="romantic-balloon-wrap"><div class="romantic-balloon"><span class="romantic-balloon-knot"></span><span class="romantic-balloon-text">${esc(message)}</span></div></div>${sparks.map((x,i)=>`<span class="balloon-pop-spark s${i}">${x}</span>`).join('')}`;document.body.appendChild(layer);setTimeout(()=>layer.classList.add('pop'),4200);setTimeout(()=>layer.classList.add('fade'),19000);setTimeout(()=>layer.remove(),33000)
}
function inKissWindow(){const d=new Date();const mins=d.getHours()*60+d.getMinutes();return mins>=23*60||mins<60}
function tryScheduleKissBalloon(){if(!surprisesAreEnabled())return;clearTimeout(romanticKissTimer);const key=`${today()}-kiss-balloon`;if(localStorage.getItem('osra-kiss-balloon-shown')===key)return;const d=new Date(),mins=d.getHours()*60+d.getMinutes();if(mins>=23*60||mins<60){const delay=5200+Math.random()*4200;romanticKissTimer=setTimeout(()=>{if(!inKissWindow()||localStorage.getItem('osra-kiss-balloon-shown')===key)return;localStorage.setItem('osra-kiss-balloon-shown',key);const msg=ROMANTIC_KISS_MESSAGES[Math.random()<0.55?0:1+Math.floor(Math.random()*(ROMANTIC_KISS_MESSAGES.length-1))];showRomanticScene(msg,{style:Math.random()<.55?'balloons':'giantcenter'});},delay);return}if(mins<23*60){const until23=(23*60-mins)*60000-d.getSeconds()*1000;romanticKissTimer=setTimeout(()=>tryScheduleKissBalloon(),Math.max(30000,until23));return}const tomorrow=new Date(d);tomorrow.setDate(tomorrow.getDate()+1);tomorrow.setHours(23,0,5,0);romanticKissTimer=setTimeout(()=>tryScheduleKissBalloon(),Math.max(60000,tomorrow-d))}
function showRomanticEffect(profile=surpriseTimingProfile()){
 if(!surprisesAreEnabled())return;
 const layer=document.getElementById('romanticEffectLayer')||(()=>{const x=document.createElement('div');x.id='romanticEffectLayer';x.className='romantic-effect-layer';document.body.appendChild(x);return x})();
 layer.classList.remove('surprise-speed-fast','surprise-speed-normal','surprise-speed-slow');layer.classList.add(`surprise-speed-${profile.key}`);
 const modes=['rain','fountain','swirl','edge','balloons'];const mode=modes[Math.floor(Math.random()*modes.length)];
 const sets={rain:['❤️','💖','🌹','🌸','💋','💕','✨'],fountain:['💗','💐','🌷','💖','⭐','😘'],swirl:['❤️','💛','💗','💞','🌸','🎀'],edge:['🌹','🌷','🌸','💖','💕','✨'],balloons:['🎈','🎈','🎈','💖','🎀']};
 const n=mode==='balloons'?8:20+Math.floor(Math.random()*10);
 const motionFactor=profile.speed;
 for(let i=0;i<n;i++){const s=document.createElement('span');s.className=`romantic-effect-item effect-${mode}`;s.textContent=sets[mode][Math.floor(Math.random()*sets[mode].length)];s.style.left=`${3+Math.random()*94}%`;s.style.top=`${3+Math.random()*90}%`;s.style.setProperty('--drift',`${-14+Math.random()*28}vw`);s.style.setProperty('--delay',`${(Math.random()*.6).toFixed(2)}s`);s.style.setProperty('--dur',`${((3+Math.random()*3.2)/motionFactor).toFixed(2)}s`);s.style.fontSize=`${28+Math.random()*34}px`;s.addEventListener('animationend',()=>s.remove(),{once:true});layer.appendChild(s)}
 setTimeout(()=>{if(layer&&!layer.children.length)layer.remove()},Math.round(7600/motionFactor))
}
function startRomanticTicker(){
 if(!surprisesAreEnabled())return;
 if(romanticTickerTimer)clearTimeout(romanticTickerTimer);if(romanticDelightTimer)clearTimeout(romanticDelightTimer);
 const schedule=delay=>{romanticDelightTimer=setTimeout(()=>{
   const prof=surpriseTimingProfile();
   const r=Math.random();
   if(r<0.58){showRomanticMessage(prof);localStorage.setItem('osra-romantic-day-message',today())}
   else if(r<0.78){showRomanticEffect(prof)}
   else{const kind=Math.random();showRomanticFloat(kind<.34?'balloon':kind<.62?'rose':'heart',prof)}
   // The selected timing is the actual trigger-to-trigger interval. No hidden 2-second addition.
   const next=Math.max(3000,Math.round(prof.interval));
   schedule(next);
 },Math.max(0,delay))};
 const first=Math.min(2500,Math.max(1200,2000));schedule(first);tryScheduleKissBalloon();
}
function countdownForm(existing=null){const x=existing||{title:'',date:'',emoji:'⏳',showHome:true,annual:false};modal(`<h2>${existing?'تعديل':'إضافة'} عداد / موعد</h2>${field('cTitle','اسم الموعد',x.title,'text')}${field('cDate','التاريخ',x.date,'date')}${field('cEmoji','الرمز (اختياري)',x.emoji,'text')}<label class="field" style="display:flex;align-items:center;gap:8px"><span><input id="cAnnual" type="checkbox" ${x.annual?'checked':''}> يتكرر سنويًا</span></label><label class="field" style="display:flex;align-items:center;gap:8px"><span><input id="cHome" type="checkbox" ${x.showHome?'checked':''}> إظهار العداد في الرئيسية</span></label><div class="actions"><button class="btn primary" data-action="saveCountdown" data-id="${existing?.id||''}">حفظ</button><button class="btn" data-action="closeModal">إلغاء</button></div>`)}
async function saveCountdown(i){const title=$('#cTitle').value.trim();const date=$('#cDate').value;const emoji=$('#cEmoji').value.trim()||'⏳';if(!title||!date){toast('اكتب اسم الموعد والتاريخ.');return}let x=i?state.settings.countdowns.find(v=>v.id===i):null;if(!x){x={id:id('cnt'),title:'',date:'',emoji:'⏳',showHome:true,annual:false};state.settings.countdowns.unshift(x)}x.title=title;x.date=date;x.emoji=emoji;x.annual=!!$('#cAnnual')?.checked;x.showHome=!!$('#cHome')?.checked;await save();closeModal();toast('تم حفظ العداد.');renderNoAnim()}
function editCountdown(i){const x=state.settings.countdowns.find(v=>v.id===i);if(x)countdownForm(x)}
async function deleteCountdown(i){const x=state.settings.countdowns.find(v=>v.id===i);if(!x)return;if(!confirm(`حذف العداد «${x.title}»؟`))return;state.settings.countdowns=state.settings.countdowns.filter(v=>v.id!==i);await save();toast('تم حذف العداد.');renderNoAnim()}
async function saveSettings(){
 state.settings.startDate=$('#setStart')?.value||'';
 state.settings.engagementDate=$('#setEng')?.value||'';
 state.settings.birthdayRania=$('#setBirth')?.value||'';
 state.settings.osamaPhone=$('#setOsama')?.value?.trim()||'';
 state.settings.raniaPhone=$('#setRania')?.value?.trim()||'';
 state.settings.whatsappUrl=$('#setWA')?.value?.trim()||'';
 const timingEl=document.getElementById('surpriseTimingSetting');const speedEl=document.getElementById('surpriseSpeedSetting');
 if(timingEl)state.settings.surpriseTiming=timingEl.value;
 if(speedEl)state.settings.surpriseSpeed=speedEl.value;
 normalizeState();await save();soundOn=!!state.settings.soundEnabled;updateSoundButton();updateSurpriseButton();toast('تم حفظ الإعدادات.');renderNoAnim(true);
}
function pageSettings(){const ex=state.excludedPhotos.length;return `<div class="inner">${scanProgressCard()}${linkProgressCard()}${hqBuildProgressCard()}${hqLastBuildCard()}${dataRecoveryCard()}${reindexRestorePool.length?`<div class="card scan-progress-card"><h3>↻ إعادة فهرسة مستبعدة معلقة</h3><p>هناك ${reindexRestorePool.length} صورة ما زالت في قائمة الاسترجاع الآمن. شغّل «السماح بها وإعادة فحصها» لإكمالها.</p></div>`:''}<div class="kicker">⚙ المزيد</div><h1 class="title">إعدادات OsRa</h1><div class="cards"><div class="card"><h3>📁 مكتبات الصور</h3><p>${sources.length?`تم ربط ${sources.length} مجلد${sources.length===1?'':'ات'} — المصدر الأساسي: ${esc(sourceLabel(sources[0]))}`:'غير مرتبطة'}</p><div class="actions"><button class="btn primary" data-action="folder">＋ إضافة مجلد / ألبوم</button><button class="btn" data-action="scan">↻ فحص المجلد المحدد</button><button class="btn" data-action="matchAlbumsByName">🔤 مطابقة الألبومات بالأسماء</button><button class="btn primary" data-action="linkAllSources">⚡ ربط كل المصادر — سريع وذكي + تقرير</button>${state.settings.hideScanProgressCard?`<button class="btn" data-action="showScanProgressCard">↶ إظهار قائمة متابعة الفحص</button>`:''}<button class="btn" data-action="diag">تشخيص</button><button class="btn" data-action="duplicateManager">🔎 مراجعة التكرارات عند الطلب</button>${lastLinkReport?`<button class="btn" data-action="linkReport">🧾 آخر تقرير ربط</button>`:''}</div><p class="meta">${visiblePhotoCount()} صورة داخل الألبومات الظاهرة — ${allPhotos().length} سجل صور محفوظ إجمالًا. «ربط كل المصادر — سريع وذكي + تقرير» يتحقق من الروابط الحالية أولًا ثم يربط الأصول الحقيقية مصدرًا بعد الآخر، ولا يحفظ مصدرًا جديدًا إذا ربط صفر صور، ويجعل الصور المتبقية هي هدف المصدر التالي فقط. لا ينشئ صورًا أو ألبومات ولا يولّد صورًا مصغرة، وعند انتهاء المصادر يدويًا يمكن استخدام المطابقة البصرية كحل أخير وبموافقة المستخدم فقط، ثم يعرض تقريرًا نهائيًا واضحًا لكل صورة بقيت بلا أصل.</p></div>${sourcesPanel()}<div class="card"><h3>🧹 الصور المستبعدة من الفهرس</h3><p>${ex} صورة مستبعدة حاليًا. الأصل يبقى في مجلد الهاتف ولا يُحذف.</p><p class="meta">إعادة الفحص العادي لا تعيد أي صورة مستبعدة. هذا الزر وحده هو الذي يرفع الاستبعاد، ثم يعيد إدخال الصور التي تجد أصولها مع محاولة استرجاع ترتيبها وألبوماتها السابقة.</p><button class="btn" data-action="restoreExcluded" ${ex||reindexRestorePool.length?'':'disabled'}>↻ السماح بها وإعادة فحصها</button></div><div class="card"><h3>📅 التواريخ</h3><div class="formgrid">${field('setStart','بداية قصتنا',state.settings.startDate,'date')}${field('setEng','تاريخ الخطوبة',state.settings.engagementDate,'date')}${field('setBirth','عيد ميلاد رانيا',state.settings.birthdayRania,'date')}</div></div>${countdownsPanel()}<div class="card surprise-settings-card"><h3>🎉 المفاجآت والاحتفالات</h3><p class="meta">وقت الظهور هو الفاصل الفعلي بين بداية كل مفاجأة والتي تليها. وسرعة الحركة إعداد مستقل.</p><label class="field"><span>وقت الظهور والفاصل الزمني</span><select id="surpriseTimingSetting" class="setting-select"><option value="3" ${state.settings.surpriseTiming==='3'?'selected':''}>كل 3 ثوانٍ</option><option value="5" ${state.settings.surpriseTiming==='5'?'selected':''}>كل 5 ثوانٍ</option><option value="10" ${state.settings.surpriseTiming==='10'?'selected':''}>كل 10 ثوانٍ</option><option value="20" ${state.settings.surpriseTiming==='20'?'selected':''}>كل 20 ثانية</option><option value="30" ${state.settings.surpriseTiming==='30'?'selected':''}>كل 30 ثانية</option><option value="60" ${state.settings.surpriseTiming==='60'?'selected':''}>كل دقيقة</option><option value="180" ${state.settings.surpriseTiming==='180'?'selected':''}>كل 3 دقائق</option></select></label><label class="field"><span>سرعة حركة المفاجأة</span><select id="surpriseSpeedSetting" class="setting-select"><option value="fast" ${state.settings.surpriseSpeed==='fast'?'selected':''}>سريع</option><option value="normal" ${state.settings.surpriseSpeed==='normal'?'selected':''}>متوسط</option><option value="slow" ${state.settings.surpriseSpeed==='slow'?'selected':''}>بطيء</option><option value="random-all" ${state.settings.surpriseSpeed==='random-all'?'selected':''}>عشوائي للكل</option></select></label><div class="meta" id="surpriseTimingHint">الفاصل: ${surpriseTimingLabel()} • الحركة: ${surpriseSpeedLabel()}</div></div><div class="card surprise-custom-messages-card"><h3>💌 رسائل المفاجآت العشوائية</h3><p class="meta">أي رسالة تضيفها هنا تدخل مباشرة في قائمة الرسائل التي تظهر عشوائيًا، وتُحفظ مع بيانات OsRa.</p><div class="actions" style="margin-bottom:10px"><button class="btn primary" data-action="addSurpriseMessage">＋ إضافة رسالة</button></div><div class="cards">${(state.settings.customSurpriseMessages||[]).length?(state.settings.customSurpriseMessages||[]).map((msg,idx)=>`<div class="card surprise-custom-message-item"><div style="flex:1;min-width:0"><b>💌</b> <span style="overflow-wrap:anywhere">${esc(msg)}</span></div><div class="actions"><button class="btn small" data-action="editSurpriseMessage" data-id="${idx}">تعديل</button><button class="btn small danger" data-action="deleteSurpriseMessage" data-id="${idx}">حذف</button></div></div>`).join(''):`<div class="empty">لم تضف رسائل مخصصة بعد.</div>`}</div></div><div class="card"><h3>📱 التواصل</h3><div class="formgrid">${field('setOsama','رقم أسامة',state.settings.osamaPhone,'tel')}${field('setRania','رقم رانيا',state.settings.raniaPhone,'tel')}${field('setWA','رابط واتساب',state.settings.whatsappUrl,'url')}</div><button class="btn primary" data-action="settingsSave" style="margin-top:10px">حفظ</button></div><div class="card"><h3>💾 النسخة الاحتياطية والأمان</h3><p>النسخة تحفظ بيانات OsRa ومراجع الصور وتواريخ التقاط EXIF والإخفاء والاستبعاد واختيار ألبومات صورة اليوم ومعاينات مصغرة خفيفة، وليست الملفات الأصلية.</p><p class="meta">نسخة البيانات القديمة تظل كما هي. مصدر الصور عالي الجودة منفصل عنها ولا يدخل في قاعدة OsRa اليومية.</p><div class="actions"><button class="btn primary" data-action="chooseBackup">📁 تحديد مكان الحفظ</button><button class="btn" data-action="backup">💾 حفظ نسخة الآن</button><button class="btn" data-action="restore">↩ استرجاع ملف كامل</button><button class="btn" data-action="restoreMerge">📦 استيراد ودمج نسخة</button><button class="btn" data-action="restoreSafety">🛟 استرجاع آخر نسخة أمان</button></div><div class="meta">${backupFileHandle?`ملف النسخة: ${esc(backupFileHandle.name||'محدد')}${backupMeta.lastSavedAt?' — آخر حفظ: '+new Date(backupMeta.lastSavedAt).toLocaleString('ar-EG'):''}`:'لم تحدد ملفًا ثابتًا بعد. عند الحفظ الأول سيطلب منك OsRa اختيار المكان.'}</div></div><div class="card"><h3>🖼️ مصدر الصور عالي الجودة</h3><p>ينشئ OsRa مجلدًا مستقلًا بصور حتى 2048px وجودة JPEG 88 تقريبًا. هذا المصدر بديل خفيف عن الأصل، ولا يغيّر الأصل ولا يحمّل الصور العالية داخل OsRa أثناء الاستخدام.</p><p class="meta">يدخل فقط الصور الموجودة في ألبومات ظاهرة. الصور المخفية أو التي أزلتها من الألبومات أو المستبعدة من الفهرس لا تُنسخ كملفات هنا؛ تبقى معلوماتها فقط داخل Backup البيانات.</p><div class="actions"><button class="btn primary" data-action="buildHQSource">🖼️ إنشاء / تحديث مصدر HQ</button><button class="btn" data-action="hqZip">📦 إنشاء ZIP للمشاركة</button><button class="btn" data-action="linkHQSource">🔗 ربط مصدر HQ موجود</button>${hqSourceHandle?`<button class="btn" data-action="clearHQSource">فصل مصدر HQ</button>`:''}</div><div class="meta">${hqSourceHandle?`مصدر HQ مرتبط: ${esc(hqSourceMeta.name||'OsRa_HQ_Source')} — ${hqIndex.size} صورة، والربط يقرأ manifest فقط بدون فحص الصور.`:'لا يوجد مصدر HQ مرتبط حاليًا.'}</div><div class="notice" style="margin-top:10px">جودة HQ الحالية ثابتة عند 2048px تقريبًا / JPEG 88؛ لم نضف جودة أعلى لأنها غالبًا تزيد الحجم أكثر من الفائدة على الهاتف.</div></div></div></div>`}
function field(id,l,v,t){return `<div class="field"><label>${l}</label><input id="${id}" type="${t}" value="${esc(v||'')}"></div>`}
function pageAbout(){return `<div class="inner"><div class="kicker">♥ عن OsRa</div><h1 class="title">عن البرنامج</h1><div class="card dedication-card"><div class="about-text"><p><b>إلى أحب إنسانة إلى قلبي</b> ♥️💛❤️</p><p>إلى تلك التي أضاءت سماء حياتي،<br>بل هي التي جعلت لحياتي سماء.</p><p>إهداء إلى جميلتي، وحبيبتي، وملاكي الصغير...<br>إلى القلب العجيب، والوجه الجميل، والابتسامة الرقيقة المنعشة،<br>يا من يسكنكِ كل شيء جميل.</p><p>يا من بها رقة وصفاء وطهارة السماء،<br>مع قوة وعنفوان ورهوان 😉 الأرض<br>التقيا وتلاقيا.</p><p>إهداء إلى تلك اليد الصغيرة،<br>التي تحمل حبًا كبيرًا،<br>وتتفتح بلمساتها أزهار سماوية،<br>مانحةً إياها الأبدية والحب والجمال.</p><p>إلى صوت همساتك،<br>وضحكاتك العفوية،<br>وإلى غمازة الخد اليمين...</p><p>أرسل قلبي وحبي، دائمًا وأبدًا،<br>لروحي... يا روحي، يا رنووووشي 😍😘</p><p>يا من أحببتها للمنتهى،<br>وأحبها، وسأحبها...</p><p><b>أحبك جدًا، وجداً، وجداًااا... ❤️</b></p><p><b>رانيا...<br>حبيبتي، ورفيقة دربي،<br>وأجمل ما أعطاني إِلهُ السَّمَاءِ.</b> ❤️</p></div></div><div class="security-note"><b>خصوصية OsRa</b><br>الصور الأصلية تبقى في مجلدكم المحلي. OsRa لا يرفع الصور إلى خادم، والمعاينات المخزنة هي داخل مساحة الموقع المحلية على الجهاز.</div></div>`}
function pageCalendar(){
 const d=new Date(calendarDate+'T00:00:00');if(!calendarCursor)calendarCursor=new Date(d.getFullYear(),d.getMonth(),1);const y=calendarCursor.getFullYear(),mon=calendarCursor.getMonth(),first=new Date(y,mon,1),days=new Date(y,mon+1,0).getDate(),start=(first.getDay()+6)%7;
 const visiblePics=[...visiblePhotoIds()].map(pid=>photos.get(pid)).filter(Boolean);const cells=[];for(let i=0;i<start;i++)cells.push('<div class="cal-day blank"></div>');for(let day=1;day<=days;day++){const ds=`${y}-${String(mon+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;const active=ds===calendarDate,mem=visibleMemories().some(m=>memoryOnAnnualDay(m,ds)),evt=state.events.some(e=>e.date===ds),pic=visiblePics.some(p=>p.capturedAt?.slice(0,10)===ds);cells.push(`<button class="cal-day ${active?'selected ':''}${mem?'has-memory ':''}${evt?'has-event ':''}${pic?'has-photo ':''}" data-action="calendarDay" data-date="${ds}"><b>${day}</b><span>${mem?'♥':''}${evt?' ◴':''}${pic?' 📷':''}</span></button>`)}
 const dayM=visibleMemories().filter(m=>memoryOnAnnualDay(m,calendarDate));const dayE=state.events.filter(e=>e.date===calendarDate);const dayP=visiblePics.filter(p=>p.capturedAt?.slice(0,10)===calendarDate);return `<div class="inner"><div class="kicker">📅 التقويم</div><h1 class="title">ذكرياتنا حسب التاريخ</h1><div class="calendar-head"><button class="btn" data-action="calendarPrev">‹ الشهر السابق</button><h3>${calendarCursor.toLocaleDateString('ar-EG',{year:'numeric',month:'long'})}</h3><button class="btn" data-action="calendarNext">الشهر التالي ›</button></div><div class="calendar-week">${['الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','الأحد'].map(x=>`<span>${x}</span>`).join('')}</div><div class="calendar-grid">${cells.join('')}</div><div class="line"></div><h3>📌 ${fmt(calendarDate)}</h3>${dayM.length?`<div class="cards">${dayM.map(m=>`<div class="card calendar-result"><div>${miniThumbs(m,6)}</div><div class="memory-body"><h3>${esc(m.title||'ذكرى')}</h3><div class="meta">${memoryOnAnnualDay(m,calendarDate)?'ضمن ذكرى متكررة سنويًا':'ضمن فترة الذكرى'} • ${rangeLabel(m)}</div><button class="btn small primary" data-action="memory" data-id="${m.id}">فتح الذكرى والصور</button></div></div>`).join('')}</div>`:`<div class="empty">لا توجد ذكريات مسجلة تغطي هذا اليوم.</div>`}${dayE.length?`<div class="line"></div><h3>◴ محطات في هذا اليوم</h3><div class="cards">${dayE.map(e=>`<div class="card"><b>${esc(e.title)}</b><p>${esc(e.description||'')}</p></div>`).join('')}</div>`:''}${dayP.length?`<div class="line"></div><h3>📷 صور التُقطت في هذا اليوم</h3><div class="gallery mini-calendar-gallery">${dayP.map(p=>`<button class="thumb" data-action="photo" data-id="${p.id}"><img data-thumb="${p.id}" alt="${esc(p.name)}"></button>`).join('')}</div>`:`${!dayM.length&&!dayE.length?'':'<div class="note">لا توجد صور لها تاريخ التقاط EXIF في هذا اليوم.</div>'}`}</div>`
}
function pageHTML(s){return s==='home'?pageHome():s==='memories'?pageMemories():s==='calendar'?pageCalendar():s==='story'?pageStory():s==='dreams'?pageDreams():s==='spiritual'?pageSpiritual():s==='messages'?pageMessages():s==='about'?pageAbout():pageSettings()}
function hideBootSplash(){const el=document.getElementById('bootSplash');if(!el||el.classList.contains('boot-done'))return;const elapsed=performance.now()-(window.__osraBootAt||performance.now());const wait=Math.max(0,3000-elapsed);setTimeout(()=>requestAnimationFrame(()=>el.classList.add('boot-done')),wait)}
function renderNoAnim(preserveScroll=false){resetAlbumBookTurn();const oldInner=$('#currentPage .inner');const scrollTop=preserveScroll?(oldInner?.scrollTop||0):0;const scrollLeft=preserveScroll?(oldInner?.scrollLeft||0):0;$('#currentPage').innerHTML=pageHTML(section);hydrate();setNav();updateSelectionCount();requestAnimationFrame(()=>{fitAlbumBookStage();if(preserveScroll){const inner=$('#currentPage .inner');if(inner){inner.scrollTop=scrollTop;inner.scrollLeft=scrollLeft}}if(section==='home')maybeRunOccasionCelebrations()})}
function navigate(to,dir=1){if(to===section||busy)return;resetAlbumBookTurn();busy=true;const book=$('#book'),current=$('#currentPage'),back=$('#backPage'),duration=760;back.innerHTML=pageHTML(to);hydrate();book.classList.remove('turn-next','turn-prev');requestAnimationFrame(()=>book.classList.add(dir>0?'turn-next':'turn-prev'));paperSound(duration);setTimeout(()=>{section=to;current.innerHTML=pageHTML(section);back.innerHTML='';book.classList.remove('turn-next','turn-prev');busy=false;hydrate();setNav();updateSelectionCount()},duration)}
const thumbObserver=('IntersectionObserver' in window)?new IntersectionObserver(entries=>{for(const ent of entries){if(!ent.isIntersecting)continue;thumbObserver.unobserve(ent.target);queueThumbHydrate(ent.target)}},{rootMargin:'800px 0px'}):null;
async function getThumbBlob(id){if(thumbCache.has(id))return thumbCache.get(id);let b=null;try{const rec=await get('thumbs',id);b=rec?.blob||null}catch{}if(!b){const legacy=await get('photos',id).catch(()=>null);b=legacy?.thumbBlob||null}if(b){thumbCache.set(id,b);while(thumbCache.size>THUMB_CACHE_MAX){const first=thumbCache.keys().next().value;thumbCache.delete(first)}}return b}
function setThumbElement(el,b){if(!el||!b)return false;const u=URL.createObjectURL(b);el.dataset.thumbBound='1';el.dataset.thumbQueued='';el.loading='eager';el.decoding='async';el.addEventListener('load',()=>URL.revokeObjectURL(u),{once:true});el.addEventListener('error',()=>URL.revokeObjectURL(u),{once:true});el.src=u;return true}
async function hydrateThumbBatch(elements){const els=[...elements].filter(el=>el&&el.dataset.thumbBound!=='1');if(!els.length)return;const unique=[],seen=new Set();for(const el of els){const p=photos.get(el.dataset.thumb);if(!p?.id||p.excluded)continue;const k=p.id;if(seen.has(k))continue;seen.add(k);unique.push({id:p.id,el})}if(!unique.length)return;const ids=unique.map(x=>x.id),batch=await getThumbBlobsBatch(ids),missing=[];for(const x of unique){const b=batch.get(x.id);if(b)setThumbElement(x.el,b);else missing.push(x)}if(missing.length){for(const x of missing){const b=await getThumbBlob(x.id);if(b)setThumbElement(x.el,b);else x.el.dataset.thumbQueued=''}}}
function queueThumbHydrate(el){if(!el||el.dataset.thumbBound==='1'||el.dataset.thumbQueued==='1')return;el.dataset.thumbQueued='1';thumbHydrateQueue.add(el);if(thumbHydrateTimer)return;thumbHydrateTimer=setTimeout(async()=>{thumbHydrateTimer=0;const batch=[...thumbHydrateQueue];thumbHydrateQueue.clear();await hydrateThumbBatch(batch)},0)}
function hydrate(root=document){const els=[...(root.querySelectorAll?.('[data-thumb]')||[])];if(!els.length)return;const first=els.slice(0,24),rest=els.slice(24);for(const el of first){el.loading='eager';el.decoding='async';if(el.dataset.thumbBound!=='1')queueThumbHydrate(el)}for(const el of rest){el.loading='eager';el.decoding='async';if(el.dataset.thumbBound==='1')continue;if(thumbObserver)thumbObserver.observe(el);else queueThumbHydrate(el)}}

function go(to){const order=['home','memories','calendar','story','dreams','spiritual','messages','settings','about'];if(to==='memories'&&section!=='memories')albumBookIndex=0;navigate(to,order.indexOf(to)>order.indexOf(section)?1:-1)}
async function resolve(root,relPath){const parts=String(relPath||'').split('/').filter(Boolean);if(!parts.length)throw new Error('مسار صورة فارغ');let dir=root;for(let i=0;i<parts.length-1;i++){dir=await dir.getDirectoryHandle(parts[i],{create:false})}return dir.getFileHandle(parts.at(-1),{create:false})}
let pendingFolderMatch=null;
async function manualLinkAlbumFromFolder(memoryId){
 closeModal();const m=state.memories.find(x=>x.id===memoryId);if(!m||!window.showDirectoryPicker){toast('اختيار مجلد المصدر غير متاح في هذا المتصفح.');return}if(!isSecureContext){toast('OsRa يحتاج إلى HTTPS لاختيار مجلد المصدر.');return}if(scanLock||busy){toast('أنهِ عملية الربط الحالية أولًا.');return}
 const missingBefore=(m.photoIds||[]).map(pid=>photos.get(pid)).filter(p=>isPhotoRecord(p)&&!hasOriginalLink(p));if(!missingBefore.length){toast('هذا الألبوم لا يحتوي صورًا ناقصة المصدر حاليًا.');return}
 try{
  const chosen=await window.showDirectoryPicker({mode:'read'});let source=await getSourceByHandle(chosen),relPath='';if(!source){const containing=await findContainingSource(chosen);if(containing){source=containing.source;relPath=normalizeFolderRelPath(containing.relPath)}}
  const tempSource=source||{id:id('src'),name:chosen.name||'مجلد مصدر',handle:chosen,asAlbum:false,directAlbumFolder:false,mergeIntoMemoryId:'',createdAt:Date.now()};if(!(await ensureSourcePermission(tempSource,true))){manualLinkSession.history.push({albumId:m.id,albumTitle:m.title||m.album||'ألبوم',sourceName:sourceLabel(tempSource),folderPath:relPath,filesScanned:0,matched:0,missingBefore:missingBefore.length,rejected:true,error:'لم يُمنح إذن قراءة المصدر.',createdAt:Date.now()});refreshLinkReportAfterManual();toast('لم يُمنح إذن قراءة المصدر. اختر مصدرًا آخر.');return}
  manualLinkSession=manualLinkSession||{cancelled:false,history:[]};manualLinkSession.cancelled=false;manualLinkSession.history=manualLinkSession.history||[];const statusId='manualLinkStatus';modal(`<h2>🔗 التحقق من مصدر «${esc(m.title||'الألبوم')}»</h2><p id="${statusId}">جارٍ فحص المجلد وكل ما بداخله…</p><p class="meta">لن يُحفظ المصدر إلا إذا تم ربط صورة واحدة على الأقل.</p><div class="actions"><button class="btn danger" data-action="cancelManualLink">إلغاء</button></div>`);
  const status=$('#'+statusId),wanted=missingBefore.map(p=>({photo:p,album:m,folderPath:''}));const fb=await buildRecursiveNameIndex(chosen,'',wanted,info=>{if(status)status.textContent=`فحص ${info.filesSeen||0} ملفًا… وجد ${info.candidates||0} مرشحًا`});if(manualLinkSession?.cancelled){manualLinkSession.cancelled=false;return}
  const staged=[];for(const p of missingBefore){const row=folderCandidate({photo:p},fb);if(!row)continue;const actualRel=relPath?normalizeFolderRelPath(relPath+'/'+row.relPath):normalizeFolderRelPath(row.relPath);staged.push({p,row,actualRel})}
  if(!staged.length){manualLinkSession.history.push({albumId:m.id,albumTitle:m.title||m.album||'ألبوم',sourceName:sourceLabel(tempSource),folderPath:relPath,filesScanned:fb.filesSeen||0,matched:0,missingBefore:missingBefore.length,rejected:true,createdAt:Date.now()});refreshLinkReportAfterManual();modal(`<h2>❌ اختيار غير مناسب</h2><p>لم يتم العثور على أي صورة من الصور المتبقية لهذا الألبوم داخل المصدر المختار.</p><p class="meta">لم يتم حفظ المصدر ولم يتم تعديل أي رابط. اختر مجلدًا آخر.</p><div class="actions"><button class="btn primary" data-action="retryManualLink" data-id="${m.id}">📁 اختيار مصدر آخر</button><button class="btn" data-action="closeModal">إغلاق</button></div>`);return}
  if(!source){sources.push(tempSource);source=tempSource}
  let linked=0;for(const x of staged){const had=photoLocations(x.p).some(l=>String(l.sourceId)===String(source.id)&&String(l.relPath)===String(x.actualRel));markPhotoLinkVerified(x.p,source.id,x.actualRel);await savePhoto(x.p);photos.set(x.p.id,x.p);if(!had)linked++}
  manualLinkSession.history.push({albumId:m.id,albumTitle:m.title||m.album||'ألبوم',sourceName:sourceLabel(source),folderPath:relPath,filesScanned:fb.filesSeen||0,matched:linked,missingBefore:missingBefore.length,createdAt:Date.now()});
  addAlbumLinkFolder(m,source.id,relPath,!normalizeAlbumLinkFolders(m).length);m.userEdited=true;normalizeState();await persistSources();await save();closeModal();const remaining=remainingPhotoIdsForAlbum(m).length;toast(`✅ تم ربط ${linked} صورة من هذا المصدر (${fb.filesSeen||0} صورة فُحصت).${remaining?` يتبقى ${remaining} صورة.`:' اكتمل الألبوم.'}`);renderNoAnim();
  if(remaining)showManualLinkNext(m.id);else showAlbumLinkFinalReport(m.id);
 }catch(e){if(e?.name==='AbortError')return;console.error(e);toast('تعذر التحقق من المجلد المختار.')}
}
function manualHistoryForAlbum(memoryId){return manualLinkSession?.history?.filter(x=>String(x.albumId)===String(memoryId))||[]}
function refreshLinkReportAfterManual(){
 const ids=[...visiblePhotoIds()],total=ids.length,linkedIds=ids.filter(pid=>hasOriginalLink(photos.get(pid))),missing=ids.filter(pid=>{const p=photos.get(pid);return isPhotoRecord(p)&&!hasOriginalLink(p)});
 const summaries=[...(lastLinkReport?.sourceSummaries||[])];for(const h of (manualLinkSession?.history||[])){const key=`manual::${h.sourceName}::${h.folderPath||''}::${h.albumId}`;if(!summaries.some(x=>x.key===key))summaries.push({key,name:h.sourceName,targets:h.missingBefore||0,matched:h.matched||0,linked:h.matched||0,verified:0,alreadyLinked:0,failed:h.rejected?Math.max(1,(h.matched||0)===0?1:0):0,filesScanned:h.filesScanned||0,manual:true,rejected:!!h.rejected,error:h.error||''})}
 lastLinkReport={...(lastLinkReport||{}),createdAt:Date.now(),sourcesCount:sources.length,totalPhotos:total,linkedPhotos:linkedIds.length,sourceSummaries:summaries,missing:missing.map(pid=>{const p=photos.get(pid);return {id:pid,name:p?.name||'',source:'',relPath:p?.relPath||'',albums:photoAlbumTitles(pid),reason:'ما زال بلا أصل مرتبط.'}})};
 put('library',{key:'lastLinkReport',value:structuredClone(lastLinkReport)}).catch(()=>{});
}
async function finishManualSources(){
 const incomplete=visibleMemories().map(m=>({m,missing:remainingPhotoIdsForAlbum(m).length})).filter(x=>x.missing);
 refreshLinkReportAfterManual();
 if(!incomplete.length){linkReportModal(lastLinkReport);return}
 modal(`<h2>🔍 انتهت المصادر اليدوية</h2><p class="note">كما طلبت، لم يعد هناك أي مجلد يدوي تريد تجربته. بقيت <b>${incomplete.reduce((n,x)=>n+x.missing,0)}</b> صورة بلا أصل. الآن فقط يمكنك تجربة المطابقة البصرية كحل أخير، وتحدد أنت نطاق البحث.</p><div class="cards">${incomplete.slice(0,80).map(({m,missing})=>`<div class="card"><b>📁 ${esc(m.title||'ألبوم')}</b><div class="meta">المتبقي: ${missing} صورة</div><div class="actions"><button class="btn small primary" data-action="startVisualFallback" data-id="${m.id}" data-exhausted="1">🔍 مطابقة بصرية لهذا الألبوم</button><button class="btn small" data-action="albumLinkFinalReport" data-id="${m.id}">🧾 تقرير</button></div></div>`).join('')}</div><div class="actions"><button class="btn" data-action="linkReport">🧾 التقرير الكامل الحالي</button><button class="btn" data-action="closeModal">إغلاق</button></div>`)
}
function showManualLinkNext(preferredId=''){
 const incomplete=visibleMemories().map(m=>({m,missing:remainingPhotoIdsForAlbum(m).length})).filter(x=>x.missing).sort((a,b)=>(a.m.id===preferredId?-1:0)-(b.m.id===preferredId?-1:0));
 if(!incomplete.length){showAlbumLinkFinalReport(preferredId);return}
 modal(`<h2>🔗 ربط الصور المتبقية</h2><p class="note">المصدر الذي يربط صفر صور يُرفض ولا يُحفظ. يمكنك إعطاء الألبوم أكثر من مصدر، وكل مصدر جديد يبحث في الصور المتبقية فقط.</p><p class="meta">اختر «📁 اختيار مصدر» لكل ألبوم يحتاج أصولًا. عندما تنتهي من كل المصادر التي تعرفها اضغط «✅ معنديش مصادر أخرى»؛ عندها فقط يظهر خيار المطابقة البصرية كحل أخير.</p><div class="cards">${incomplete.slice(0,80).map(({m,missing})=>`<div class="card"><b>📁 ${esc(m.title||'ألبوم')}</b><div class="meta">باقي ${missing} صورة بلا أصل</div><div class="actions"><button class="btn small primary" data-action="chooseManualLinkSource" data-id="${m.id}">📁 اختيار مصدر</button></div></div>`).join('')}</div><div class="actions"><button class="btn" data-action="finishManualSources">✅ معنديش مصادر أخرى</button></div>`);
}
function showAlbumLinkFinalReport(memoryId){
 const m=state.memories.find(x=>x.id===memoryId);if(!m){renderNoAnim();return}
 const total=(m.photoIds||[]).map(pid=>photos.get(pid)).filter(isPhotoRecord).length,linked=total-remainingPhotoIdsForAlbum(m).length,history=manualHistoryForAlbum(memoryId),sourceHtml=history.length?`<div class="line"></div><h3>📁 مصادر تم اختبارها</h3><div class="meta">${history.map(h=>`<div style="margin:5px 0"><b>${esc(h.sourceName||'مصدر')}</b> • فُحص ${h.filesScanned||0} صورة • ${h.rejected?'❌ رُفض — 0 صورة مرتبطة':`✅ ربط ${h.matched||0}`}</div>`).join('')}</div>`:'';
 modal(`<h2>🧾 تقرير «${esc(m.title||'الألبوم')}»</h2><div class="card"><p>إجمالي الصور: <b>${total}</b></p><p>الأصول المرتبطة: <b>${linked}</b></p><p>بدون أصل: <b>${Math.max(0,total-linked)}</b></p>${sourceHtml}</div><div class="actions">${total>linked?`<button class="btn primary" data-action="startVisualFallback" data-id="${m.id}">🔍 تجربة المطابقة البصرية</button>`:''}<button class="btn" data-action="linkReport">🧾 التقرير الكامل</button><button class="btn" data-action="closeModal">تم</button></div>`)
}
function remainingPhotoIdsForAlbum(m){return (m?.photoIds||[]).map(pid=>photos.get(pid)).filter(p=>isPhotoRecord(p)&&!hasOriginalLink(p)).map(p=>p.id)}
function showLinkWorkflow(){if(scanLock||busy){toast('هناك عملية ربط تعمل بالفعل.');return}if(!manualLinkSession||manualLinkSession.cancelled)manualLinkSession={cancelled:false,history:[]};showManualLinkNext()}
async function pickAlbumLinkSource(memoryId){return manualLinkAlbumFromFolder(memoryId)}

function visualCandidateScore(a,b){if(!a||!b)return 0;const pd=duplicateHamming(a.pHash,b.pHash),dd=duplicateHamming(a.dHash,b.dHash),ad=duplicateHamming(a.aHash,b.aHash);if(pd>18&&dd>22&&ad>22)return 0;const aspect=Math.min(1,Math.abs((a.aspect||1)-(b.aspect||1))/.12),bright=Math.min(1,Math.abs((a.brightness||0)-(b.brightness||0))/.25);return Math.max(0,1-(pd/64*.52+dd/64*.25+ad/64*.13+aspect*.05+bright*.05))}
async function openVisualFallbackForAlbum(memoryId,origin='album'){const m=state.memories.find(x=>x.id===memoryId);if(!m)return;visualLinkSession={albumId:m.id,roots:[],results:[],sourceRows:[],status:'idle',origin};await openVisualFallbackChooser()}
async function openVisualFallbackChooser(){
 const m=state.memories.find(x=>x.id===visualLinkSession?.albumId);if(!m){toast('لم نحدد ألبومًا للمطابقة البصرية.');return}const remain=remainingPhotoIdsForAlbum(m);if(!remain.length){toast('لا توجد صور متبقية لهذا الألبوم.');return}const roots=visualLinkSession.roots||[];
 modal(`<h2>🔍 المطابقة البصرية القوية</h2><div class="card"><b>الألبوم: ${esc(m.title||'ألبوم')}</b><p>المتبقي: <b>${remain.length}</b> صورة بدون أصل.</p><p class="meta">اختر مجلدًا واحدًا أو عدة مجلدات، أو مجلدًا رئيسيًا ليُبحث داخله مع كل المجلدات الفرعية. هذه اقتراحات فقط ولن يتم الربط دون موافقتك.</p></div><div class="cards">${roots.length?roots.map((r,i)=>`<div class="card"><b>📁 ${esc(r.name||'مجلد')}</b><div class="meta">${r.relPath?`داخل المصدر: ${esc(r.relPath)}`:'نطاق كامل للمجلد المختار'}${r.fileCount!=null?` • ${r.fileCount} صورة`:''}</div><button class="btn small" data-action="visualCancelRoot" data-id="${i}">إزالة النطاق</button></div>`).join(''):`<div class="empty">لم تضف نطاق بحث بعد.</div>`}</div><div class="actions"><button class="btn" data-action="visualAddRoot">＋ إضافة مجلد بحث</button>${roots.length?`<button class="btn primary" data-action="visualRun">🔎 ابدأ البحث البصري</button>`:''}<button class="btn" data-action="visualCancel">إلغاء</button></div>`);
}
async function visualAddRoot(){
 if(!visualLinkSession)return;if(!window.showDirectoryPicker){toast('اختيار المجلد غير مدعوم هنا.');return}try{const chosen=await window.showDirectoryPicker({mode:'read'});let source=await getSourceByHandle(chosen),relPath='';if(!source){const containing=await findContainingSource(chosen);if(containing){source=containing.source;relPath=normalizeFolderRelPath(containing.relPath)}}const tempId=id('vsrc');const root={id:tempId,name:chosen.name||'مجلد',handle:chosen,source,relPath};visualLinkSession.roots=visualLinkSession.roots||[];const dup=visualLinkSession.roots.some(r=>(r.source?.id&&source?.id&&String(r.source.id)===String(source.id)&&r.relPath===relPath)||(r.handle&&root.handle&&r.handle===root.handle));if(!dup)visualLinkSession.roots.push(root);openVisualFallbackChooser()}catch(e){if(e?.name!=='AbortError')toast('تعذر إضافة نطاق البحث.')}}

function visualCancelRoot(index){if(!visualLinkSession?.roots)return;const i=Number(index);if(!Number.isInteger(i)||i<0||i>=visualLinkSession.roots.length)return;visualLinkSession.roots.splice(i,1);openVisualFallbackChooser()}
function visualCancelFallback(){const aid=visualLinkSession?.albumId;visualLinkStopRequested=true;visualLinkSession=null;closeModal();if(aid)showAlbumLinkFinalReport(aid);else if(lastLinkReport)linkReportModal(lastLinkReport);else renderNoAnim()}
async function runVisualFallback(){
 if(!visualLinkSession||!visualLinkSession.roots?.length){toast('أضف مجلدًا أو أكثر للبحث أولًا.');return}const m=state.memories.find(x=>x.id===visualLinkSession.albumId);if(!m)return;const remain=remainingPhotoIdsForAlbum(m);if(!remain.length){toast('لا توجد صور متبقية.');return}visualLinkStopRequested=false;busy=true;scanLock=true;
 modal(`<h2>🔍 البحث البصري</h2><p id="visualStatus">بدء التحليل…</p><div class="progress"><i id="visualBar" style="width:0%"></i></div><div class="actions"><button class="btn danger" data-action="visualCancel">إلغاء</button></div>`);const status=$('#visualStatus'),bar=$('#visualBar');
 try{
  const targetSigs=[];const tb=await getThumbBlobsBatch(remain);for(let i=0;i<remain.length;i++){if(visualLinkStopRequested)throw new Error('visual-cancelled');const sig=await imageSignatureFromThumb(tb.get(remain[i]));if(sig)targetSigs.push({id:remain[i],sig});if(status)status.textContent=`تحليل صور OsRa ${i+1} / ${remain.length}`}
  const allFiles=[];for(const root of visualLinkSession.roots){let count=0;const walk=async(cur,base='')=>{for await(const [name,entry] of cur.entries()){if(visualLinkStopRequested)throw new Error('visual-cancelled');const rel=base?base+'/'+name:name;if(entry.kind==='directory'){await walk(entry,rel);continue}if(!isImage(name))continue;allFiles.push({entry,root,relPath:root.relPath?normalizeFolderRelPath(root.relPath+'/'+rel):normalizeFolderRelPath(rel),name});count++;if(count%16===0&&status)status.textContent=`جمع ملفات المصدر… ${allFiles.length}`}};await walk(root.handle,'');root.fileCount=count}
  const sourceSigs=[];const BATCH=4;for(let i=0;i<allFiles.length;i+=BATCH){for(const row of allFiles.slice(i,i+BATCH)){if(visualLinkStopRequested)throw new Error('visual-cancelled');try{const f=await row.entry.getFile(),sig=await imageSignatureFromThumb(f);if(sig)sourceSigs.push({...row,sig})}catch{}}if(bar)bar.style.width=Math.min(80,Math.round((Math.min(i+BATCH,allFiles.length)*80)/Math.max(1,allFiles.length)))+'%';if(status)status.textContent=`تحليل صور المصدر ${Math.min(i+BATCH,allFiles.length)} / ${allFiles.length}`;await new Promise(r=>setTimeout(r,0))}
  const buckets=new Map();for(const row of sourceSigs){for(let shift=0;shift<64;shift+=8){const key=`${shift}:${Number((row.sig.pHash>>BigInt(shift))&255n)}`;const a=buckets.get(key)||[];a.push(row);buckets.set(key,a)}}
  const results=[];for(let ti=0;ti<targetSigs.length;ti++){const t=targetSigs[ti],cand=new Set();for(let shift=0;shift<64;shift+=8){for(const row of buckets.get(`${shift}:${Number((t.sig.pHash>>BigInt(shift))&255n)}`)||[])cand.add(row)}const pool=cand.size?[...cand]:sourceSigs.slice();const ranked=pool.map(r=>({...r,score:visualCandidateScore(t.sig,r.sig)})).filter(r=>r.score>=.80).sort((a,b)=>b.score-a.score).slice(0,3);results.push({photoId:t.id,candidates:ranked});if(status)status.textContent=`ترشيح نتائج ${ti+1} / ${targetSigs.length}`;if(bar)bar.style.width=(80+Math.round((ti+1)*20/targetSigs.length))+'%';await new Promise(r=>setTimeout(r,0))}
  visualLinkSession.results=results;visualLinkSession.status='ready';busy=false;scanLock=false;visualLinkStopRequested=false;visualResultsModal();
 }catch(e){busy=false;scanLock=false;visualLinkStopRequested=false;if(e?.message==='visual-cancelled'){closeModal();toast('تم إلغاء البحث البصري دون تعديل.')}else{console.error(e);modal(`<h2>🔍 البحث البصري</h2><div class="empty">تعذر إكمال المطابقة. لم يتم تعديل أي رابط.</div><div class="actions"><button class="btn" data-action="closeModal">إغلاق</button></div>`)}}
}
function visualResultsModal(){const s=visualLinkSession,m=state.memories.find(x=>x.id===s?.albumId),rows=s?.results||[];if(!m)return;const html=rows.map((r,ri)=>{const p=photos.get(r.photoId);if(!p)return '';const cands=r.candidates||[];return `<div class="card visual-link-row"><h3>📷 ${esc(p.name||'صورة')}</h3>${cands.length?cands.map((c,ci)=>`<label class="card" style="display:block;margin:8px 0;cursor:pointer"><input type="radio" name="visual-${ri}" class="visual-link-radio" data-row="${ri}" data-candidate="${ci}"> <b>${esc(c.name||'ملف')}</b><div class="meta">${esc(c.relPath||'')} • تشابه ${(c.score*100).toFixed(1)}%</div></label>`).join(''):'<p class="meta">لم يوجد مرشح بصري قوي بما يكفي.</p>'}</div>`}).join('');modal(`<h2>🔍 مراجعة المطابقة البصرية</h2><p class="note">اختر أصلًا واحدًا فقط لكل صورة. هذه اقتراحات وليست ربطًا تلقائيًا.</p><div style="max-height:68vh;overflow:auto">${html||'<div class="empty">لا توجد اقتراحات بصرية.</div>'}</div><div class="actions"><button class="btn primary" data-action="applyVisualLinks">✅ اعتماد المختارات</button><button class="btn" data-action="startVisualFallback" data-id="${m.id}">↻ إعادة البحث بمصادر أخرى</button><button class="btn" data-action="visualCancel">إغلاق</button></div>`)}
async function applyVisualLinks(){const s=visualLinkSession;if(!s)return;const accepted=[...document.querySelectorAll('.visual-link-radio:checked')].map(x=>({row:Number(x.dataset.row),candidate:Number(x.dataset.candidate)}));if(!accepted.length){toast('لم تعتمد أي نتيجة.');return}const album=state.memories.find(x=>x.id===s.albumId);if(!album)return;let linked=0;const createdSources=[];for(const a of accepted){const r=s.results[a.row],c=r?.candidates?.[a.candidate];if(!r||!c)continue;let source=c.root?.source;if(!source){const root=s.roots.find(x=>x.id===c.root?.id);if(!root)continue;source=root.source;if(!source){source={id:id('src'),name:root.name||'مجلد بصري',handle:root.handle,asAlbum:false,directAlbumFolder:false,mergeIntoMemoryId:'',createdAt:Date.now()};root.source=source;sources.push(source);createdSources.push(source)}}if(!source?.handle)continue;const p=photos.get(r.photoId);if(!p)continue;const had=photoLocations(p).some(l=>String(l.sourceId)===String(source.id)&&String(l.relPath)===String(c.relPath));markPhotoLinkVerified(p,source.id,c.relPath);await savePhoto(p);photos.set(p.id,p);if(!had)linked++;/* Visual roots are temporary search scopes; persist the exact photo source link only. */}
 normalizeState();if(linked||createdSources.length){await persistSources();await save()}refreshLinkReportAfterManual();const remain=remainingPhotoIdsForAlbum(album).length;visualLinkSession=null;closeModal();toast(`تم اعتماد ${linked} ربط بصري.${remain?` يتبقى ${remain} صورة.`:' اكتمل الألبوم.'}`);renderNoAnim();if(remain){if(s.origin==='manual-exhausted')showAlbumLinkFinalReport(album.id);else showManualLinkNext(album.id)}else showAlbumLinkFinalReport(album.id)}

function duplicateFolderModal(existing){pendingFolderMatch=existing;modal(`<h2>📁 يوجد مجلد بالاسم نفسه</h2><p>المجلد الجديد اسمه «${esc(pendingFolderName)}»، ويوجد مصدر مرتبط بالفعل بالاسم نفسه: «${esc(sourceLabel(existing))}».</p><p class="note">اختر بنفسك: دمج الصور في ألبوم واحد، أو إبقاء المجلدين منفصلين. الاختيار لا يحذف أي صورة أصلية.</p><div class="actions"><button class="btn primary" data-action="mergeFolder">🔗 دمج الألبومين</button><button class="btn" data-action="separateFolder">📁 إبقاؤهما منفصلين</button><button class="btn" data-action="cancelFolderChoice">إلغاء</button></div>`)}
async function addPendingFolder(mode){const root=pendingFolderRoot,existing=pendingFolderMatch,name=pendingFolderName;if(!root)return closeModal();try{let targetMemory=null;if(mode==='merge'&&existing){targetMemory=state.memories.find(m=>m.id===existing.mergeIntoMemoryId)||state.memories.find(m=>m.sourceId===existing.id&&m.album===existing.name)||state.memories.find(m=>m.sourceId===existing.id&&m.autoAlbum!==false)||state.memories.find(m=>(m.title===existing.name||m.album===existing.name)&&!m.hidden);if(!targetMemory){targetMemory={id:id('mem'),title:name,date:'',endDate:'',place:'',description:'',album:name,photoIds:[],autoAlbum:true,sourceId:existing.id};state.memories.push(targetMemory);await save()}}const source={id:id('src'),name,handle:root,asAlbum:true,mergeIntoMemoryId:targetMemory?.id||'',createdAt:Date.now()};if(!(await ensureSourcePermission(source,true))){toast('لم يُمنح إذن قراءة المجلد.');return}sources.push(source);await persistSources();await setActiveSource(source);scanProgresses[source.id]=null;await put('library',{key:'scanProgresses',value:structuredClone(scanProgresses)});closeModal();toast(mode==='merge'?`تم اختيار الدمج. سيُفحص «${name}» وحده ويضاف للألبوم المدموج.`:`تمت إضافة «${name}» كمجلد مستقل؛ سيُفحص وحده.`);await scan(root,true,{source,fresh:true});}catch(e){if(e?.name==='AbortError')toast('تم إلغاء العملية.');else{console.error(e);toast('تعذر إضافة المجلد الجديد.')}}finally{pendingFolderRoot=null;pendingFolderMatch=null;pendingFolderName=''}}
async function chooseFolder(){
 if(!window.showDirectoryPicker){toast('اختيار المجلد غير مدعوم في هذا المتصفح. افتح OsRa في Chrome على Android أو متصفح Chromium حديث.');return}
 if(!isSecureContext){toast('OsRa يحتاج إلى اتصال HTTPS لربط مجلد الصور.');return}
 try{
  const root=await window.showDirectoryPicker({mode:'read'});let source=await getSourceByHandle(root);
  if(source){await setActiveSource(source);if(!(await ensureSourcePermission(source,true))){toast('لم يُمنح إذن هذا المجلد.');return}toast(`المجلد «${sourceLabel(source)}» مرتبط بالفعل؛ سيُفحص هذا المجلد وحده.`);await scan(source.handle,false,{source,fresh:false});return}
  const containing=await findContainingSource(root);
  if(containing){
   await ensureSourcePermission(containing.source,true);await persistSources();
   toast(`هذا المجلد جزء من «${sourceLabel(containing.source)}»؛ لم يُنشأ كمصدر مستقل. لربطه بألبوم محدد، افتح الألبوم واختر «مجلد الألبوم نفسه».`);return;
  }
  const sameName=sources.find(s=>String(s.name||'').trim().toLocaleLowerCase()===String(root.name||'').trim().toLocaleLowerCase());
  if(sameName){pendingFolderRoot=root;pendingFolderName=root.name||'مجلد صور';duplicateFolderModal(sameName);return}
  source={id:id('src'),name:root.name||'مجلد الصور',handle:root,asAlbum:sources.length>0,mergeIntoMemoryId:'',createdAt:Date.now()};
  if(!(await ensureSourcePermission(source,true))){toast('لم يُمنح إذن قراءة المجلد.');return}
  sources.push(source);await persistSources();await setActiveSource(source);scanProgresses[source.id]=null;await put('library',{key:'scanProgresses',value:structuredClone(scanProgresses)});
  toast(sources.length===1?`تم ربط «${sourceLabel(source)}»، جارٍ فحص المكتبة…`:`تمت إضافة «${sourceLabel(source)}» كمكتبة مستقلة؛ جارٍ فحصها وحدها…`);
  await scan(source.handle,true,{source,fresh:true});
 }catch(e){if(e?.name==='AbortError')toast('تم إلغاء اختيار مجلد الصور.');else{console.error(e);toast('تعذر ربط مجلد الصور. افتح التشخيص لمعرفة السبب.')}}
}

async function thumb(file){try{if(/heic|heif/i.test(file.name))return null;const b=await createImageBitmap(file,{imageOrientation:'from-image'});let max=Math.min(360,Math.max(b.width,b.height)),quality=.80;for(let attempt=0;attempt<7;attempt++){const scale=Math.min(1,max/Math.max(b.width,b.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(b.width*scale));c.height=Math.max(1,Math.round(b.height*scale));const ctx=c.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(b,0,0,c.width,c.height);const blob=await new Promise(r=>c.toBlob(r,'image/webp',quality));if(blob&&blob.size<=THUMB_MAX_BYTES){b.close?.();return blob}if(quality>.68)quality=Math.max(.68,quality-.04);else max=Math.max(256,Math.round(max*.9))}b.close?.();return null}catch{return null}}
function tiffString(view,offset,count){if(offset<0||count<1||offset+count>view.byteLength)return'';const bytes=new Uint8Array(view.buffer,view.byteOffset+offset,count);return new TextDecoder().decode(bytes).replace(/\0+$/,'').trim()}
function readIFD(view,base,ifdOffset,little){
 if(ifdOffset<=0||base+ifdOffset+2>view.byteLength)return{};
 const at=base+ifdOffset,n=view.getUint16(at,little),out={};let pos=at+2;
 for(let i=0;i<n&&pos+12<=view.byteLength;i++,pos+=12){
  const tag=view.getUint16(pos,little),type=view.getUint16(pos+2,little),count=view.getUint32(pos+4,little);
  const unit=type===1||type===2||type===7?1:type===3?2:type===4||type===9?4:type===5||type===10?8:0,total=unit*count;if(!unit)continue;
  let off;if(total<=4)off=pos+8;else{const rel=view.getUint32(pos+8,little);off=base+rel}
  if(tag===0x8769&&type===4&&total>=4&&off+4<=view.byteLength)out.exifOffset=view.getUint32(off,little);
  else if(tag===0x9003&&type===2)out.dateTimeOriginal=tiffString(view,off,count);
 }
 return out
}
async function exifCaptureDate(file){
 try{
  if(!/^image\/jpe?g$/i.test(file.type)&&!/\.jpe?g$/i.test(file.name))return'';
  const buf=await file.arrayBuffer(),view=new DataView(buf);
  if(view.byteLength<12||view.getUint16(0,false)!==0xFFD8)return'';
  let p=2;
  while(p+4<=view.byteLength){
   if(view.getUint8(p)!==0xFF){p++;continue}
   let marker=view.getUint8(p+1);while(marker===0xFF&&p+2<view.byteLength){p++;marker=view.getUint8(p+1)}
   if(marker===0xDA||marker===0xD9)break;
   if(p+4>view.byteLength)break;
   const len=view.getUint16(p+2,false);if(len<2||p+2+len>view.byteLength)break;
   if(marker===0xE1&&len>=8){
    const sig=new TextDecoder().decode(new Uint8Array(view.buffer,view.byteOffset+p+4,6));
    if(sig==='Exif\0\0'){
     const base=p+10;if(base+8>view.byteLength)return'';
     const endian=new TextDecoder().decode(new Uint8Array(view.buffer,view.byteOffset+base,2));
     const little=endian==='II';if(!little&&endian!=='MM')return'';
     if(view.getUint16(base+2,little)!==42)return'';
     const ifd0=view.getUint32(base+4,little),a=readIFD(view,base,ifd0,little);
     let raw='';
     if(typeof a.exifOffset==='number'){const ex=readIFD(view,base,a.exifOffset,little);raw=ex.dateTimeOriginal||''}
     const m=String(raw).match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
     return m?`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`:'';
    }
   }
   p+=2+len;
  }
 }catch{}
 return''
}
async function contentKey(file){
 try{
  const n=file.size,max=65536,a=await file.slice(0,Math.min(max,n)).arrayBuffer(),b=await file.slice(Math.max(0,n-max),n).arrayBuffer();
  const x=new Uint8Array(a.byteLength+b.byteLength+8),dv=new DataView(x.buffer);dv.setBigUint64(0,BigInt(n));x.set(new Uint8Array(a),8);x.set(new Uint8Array(b),8+a.byteLength);
  if(globalThis.crypto?.subtle){const h=await crypto.subtle.digest('SHA-256',x);return [...new Uint8Array(h)].map(v=>v.toString(16).padStart(2,'0')).join('')}
  let h1=2166136261;for(const v of x){h1^=v;h1=Math.imul(h1,16777619)}return `${h1>>>0}-${n}`;
 }catch{return `${file.size}-${file.name}`}
}
async function fingerprint(file){
 try{
  const n=file.size,max=65536,a=await file.slice(0,Math.min(max,n)).arrayBuffer(),b=await file.slice(Math.max(0,n-max),n).arrayBuffer();
  const x=new Uint8Array(a.byteLength+b.byteLength+16),dv=new DataView(x.buffer);dv.setBigUint64(0,BigInt(n));dv.setBigUint64(8,BigInt(Number(file.lastModified)||0));x.set(new Uint8Array(a),16);x.set(new Uint8Array(b),16+a.byteLength);
  if(globalThis.crypto?.subtle){const h=await crypto.subtle.digest('SHA-256',x);return [...new Uint8Array(h)].map(v=>v.toString(16).padStart(2,'0')).join('')}
  let h1=2166136261;for(const v of x){h1^=v;h1=Math.imul(h1,16777619)}return `${h1>>>0}-${n}-${file.lastModified}`;
 }catch{return `${file.size}-${file.lastModified}-${file.name}`}
}
function exclusionKey(relPath,size,lastModified,fingerprint=''){return `${fingerprint||''}|${relPath}|${size}|${lastModified}`}
function isExcluded(relPath,size,lastModified,fingerprint='',contentKey='',sourceId=''){return state.excludedPhotos.some(x=>(contentKey&&x.contentKey&&x.contentKey===contentKey)||(fingerprint&&x.fingerprint&&x.fingerprint===fingerprint)||(x.key===exclusionKey(relPath,size,lastModified,fingerprint))||(sourceId&&x.sourceId&&x.sourceId===sourceId&&x.relPath===relPath&&x.size===size&&x.lastModified===lastModified))}
function removeFromAutoAlbum(pid,album,sourceId=''){if(!album)return;const m=state.memories.find(x=>x.album===album&&x.autoAlbum!==false&&(!sourceId||x.sourceId===sourceId||(!x.sourceId&&sourceId===sources[0]?.id)));if(m)m.photoIds=(m.photoIds||[]).filter(x=>x!==pid)}
function ensureMemory(album,pid,sourceId=''){if(!album)return;const key=normalizeAlbumKey(album);let m=state.memories.find(x=>!x.hidden&&x.autoAlbum!==false&&normalizeAlbumKey(x.album||x.title)===key)||state.memories.find(x=>!x.hidden&&normalizeAlbumKey(x.album||x.title)===key);if(!m){m={id:id('mem'),title:album,date:'',endDate:'',place:'',description:'',album,autoAlbum:true,photoIds:[],sourceId:sourceId||'',linkSourceId:sourceId||''};state.memories.push(m)}else{if(sourceId&&!m.sourceId)m.sourceId=sourceId;if(sourceId&&!m.linkSourceId)m.linkSourceId=sourceId}if(!Array.isArray(m.photoIds))m.photoIds=[];if(!m.photoIds.includes(pid))m.photoIds.push(pid)}

async function stopScan(){if(!scanLock||!scanCheckpoint?.sourceId)return;scanStopRequested=true;await save();await persistScanProgress({status:'paused'});toast('جاري إيقاف الفحص بأمان… سيتم حفظ آخر نقطة.')}
function takeReindexMatch(ck,fp){const matches=reindexRestorePool.filter(x=>(ck&&x.contentKey&&x.contentKey===ck)||(fp&&x.fingerprint&&x.fingerprint===fp));if(!matches.length)return null;const ids=new Set(matches.map(x=>x.id));reindexRestorePool=reindexRestorePool.filter(x=>!ids.has(x.id));const base=structuredClone(matches[0]);for(const x of matches.slice(1)){base.sourceLinks=[...(base.sourceLinks||[]),...(x.sourceLinks||[])];base.memoryRefs=[...(base.memoryRefs||[]),...(x.memoryRefs||[])];base.manualAlbum=!!(base.manualAlbum||x.manualAlbum);base.layoutLocked=!!(base.layoutLocked||x.layoutLocked);base.autoAlbum=base.autoAlbum!==false&&x.autoAlbum!==false;base.album=base.album||x.album||'';base.name=base.name||x.name||'';base.capturedAt=base.capturedAt||x.capturedAt||'';base.addedAt=Math.min(base.addedAt||Date.now(),x.addedAt||Date.now())}base.sourceLinks=(base.sourceLinks||[]).filter((l,i,a)=>l?.sourceId&&l?.relPath&&a.findIndex(z=>z.sourceId===l.sourceId&&z.relPath===l.relPath)===i);base.memoryRefs=(base.memoryRefs||[]).filter((r,i,a)=>r?.memoryId&&a.findIndex(z=>z.memoryId===r.memoryId&&z.index===r.index)===i);return base}
async function scan(root=libraryHandle,fromPicker=false,options={}){
 if(!root)return chooseFolder();
 if(scanLock){toast('الفحص جارٍ بالفعل.');return}
 const source=options.source||await getSourceByHandle(root)||activeSource();
 if(!source){toast('هذا المجلد غير مسجل في OsRa.');return}
 await setActiveSource(source);
 if(!fromPicker&&!await ensureSourcePermission(source,true)){toast('إذن الوصول غير متاح لهذا المجلد. استخدم «منح الإذن» لهذا المجلد.');return}
 scanStopRequested=false;scanLock=true;
 const matchOnly=!!options.matchOnly,reindexMode=!!options.reindex;
 const saved=!fromPicker&&!options.fresh?scanProgresses[source.id]:null;
 const canResume=!!saved&&['running','paused'].includes(saved.status)&&saved.sourceId===source.id&&!!(saved.lastCompletedRelPath||saved.lastRelPath);
 const resumeAfter=canResume?(saved.lastCompletedRelPath||saved.lastRelPath):'';
 let resumePending=!!resumeAfter,resumeFound=!resumePending;
 let count=canResume?(saved.processed||saved.count||0):0,added=canResume?(saved.added||0):0,updated=canResume?(saved.updated||0):0,moved=canResume?(saved.moved||0):0,excluded=canResume?(saved.excluded||0):0;
 const byPath=new Map(),byFingerprint=new Map(),byContentKey=new Map();
 for(const p of photos.values()){
  if(p.excluded)continue;
  for(const l of photoLocations(p))byPath.set(photoPathKey(l.sourceId,l.relPath),p);
  if(p.fingerprint){const a=byFingerprint.get(p.fingerprint)||[];a.push(p);byFingerprint.set(p.fingerprint,a)}
  if(p.contentKey){const a=byContentKey.get(p.contentKey)||[];a.push(p);byContentKey.set(p.contentKey,a)}
 }
 const startedAt=canResume?(saved.startedAt||Date.now()):Date.now();
 let lastCheckpointWrite=Date.now();
 scanCheckpoint={status:'running',sourceId:source.id,libraryName:sourceLabel(source),lastRelPath:canResume?(saved.lastCompletedRelPath||saved.lastRelPath):'',lastCompletedRelPath:canResume?(saved.lastCompletedRelPath||saved.lastRelPath):'',processed:count,count,added,updated,moved,excluded,startedAt};
 await persistScanProgress(scanCheckpoint);renderNoAnim(true);
 toast(canResume?`استكمال «${sourceLabel(source)}» بعد: ${resumeAfter}`:`جارٍ فحص «${sourceLabel(source)}»…`);
 const checkpoint=async(force=false)=>{
  scanCheckpoint={...scanCheckpoint,status:'running',sourceId:source.id,libraryName:sourceLabel(source),lastRelPath:scanCheckpoint.lastCompletedRelPath||'',lastCompletedRelPath:scanCheckpoint.lastCompletedRelPath||'',processed:count,count,added,updated,moved,excluded,startedAt};
  if(force||count===0||count%5===0||Date.now()-lastCheckpointWrite>1500){lastCheckpointWrite=Date.now();await save();await persistScanProgress(scanCheckpoint);if(reindexMode)await persistReindexPool()}
 };
 const markCompleted=async(rel,force=false)=>{scanCheckpoint.lastCompletedRelPath=rel;scanCheckpoint.lastRelPath=rel;await checkpoint(force)};
 function mergeRestoredPlacement(target,restored){
  if(!target||!restored)return;
  const links=[...photoLocations(target),...(Array.isArray(restored.sourceLinks)?restored.sourceLinks:[])],seenLinks=new Set();
  target.sourceLinks=links.filter(l=>l?.sourceId&&l?.relPath&&!seenLinks.has(`${l.sourceId}::${l.relPath}`)&&(seenLinks.add(`${l.sourceId}::${l.relPath}`),true));
  syncPhotoPrimary(target,target.sourceId,target.relPath);
  target.manualAlbum=!!(target.manualAlbum||restored.manualAlbum);target.layoutLocked=!!(target.layoutLocked||restored.layoutLocked);target.autoAlbum=target.autoAlbum!==false&&restored.autoAlbum!==false;target.album=target.album||restored.album||'';target.name=target.name||restored.name||'';target.capturedAt=target.capturedAt||restored.capturedAt||'';target.addedAt=Math.min(target.addedAt||Date.now(),restored.addedAt||Date.now());
  for(const ref of (restored.memoryRefs||[])){
   const mem=state.memories.find(m=>m.id===ref.memoryId);if(!mem)continue;if(!Array.isArray(mem.photoIds))mem.photoIds=[];if(mem.photoIds.includes(target.id))continue;const at=Math.max(0,Math.min(Number(ref.index)||0,mem.photoIds.length));mem.photoIds.splice(at,0,target.id);
  }
 }
 async function walk(dir,path=''){
  const entries=[];for await(const entry of dir.entries())entries.push(entry);entries.sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true,sensitivity:'base'}));
  for(const [name,e] of entries){
   if(scanStopRequested)throw Object.assign(new Error('SCAN_STOPPED'),{name:'ScanStopped'});
   const rel=path?path+'/'+name:name;
   if(e.kind==='directory'){await walk(e,rel);continue}
   if(resumePending){if(rel===resumeAfter){resumePending=false;resumeFound=true;continue}else continue}
   let f;try{f=await e.getFile()}catch{continue}
   if(!isImageFile(f))continue;
   count++;scanCheckpoint.currentRelPath=rel;
   const mimeType=f.type||'',key=photoPathKey(source.id,rel);
   let p=byPath.get(key),fp='',ck='';
   fp=await fingerprint(f);ck=await contentKey(f);
   const excludedHere=!reindexMode&&isExcluded(rel,f.size,f.lastModified,fp,ck,source.id);
   if(excludedHere){excluded++;await markCompleted(rel);if(count%12===0)await new Promise(r=>setTimeout(r,0));continue}
   if(p&&p.contentKey&&ck&&p.contentKey!==ck){removePhotoLocation(p,source.id,rel);await savePhoto(p);photos.set(p.id,p);byPath.delete(key);p=null}
   let restored=null;
   if(!p){
    const contentCand=(byContentKey.get(ck)||[]).filter(x=>!x.excluded),fpCand=(byFingerprint.get(fp)||[]).filter(x=>!x.excluded);
    const same=contentCand.length?contentCand:(fpCand.length===1?fpCand:[]);
    if(same.length){p=pickCanonicalPhoto(same);if(reindexMode)restored=takeReindexMatch(ck,fp);if(restored)mergeRestoredPlacement(p,restored);const oldLinked=hasOriginalLink(p),addedLink=addPhotoLink(p,source,f,rel,fp,ck);p.name=p.name||name;p.fingerprint=p.fingerprint||fp;p.contentKey=p.contentKey||ck;p.lastModified=p.lastModified||f.lastModified;p.size=p.size||f.size;p.mediaType='image';p.mimeType=mimeType;if(!p.thumbBlob||p.thumbVersion!==THUMB_VERSION){p.thumbVersion=THUMB_VERSION;p.thumbBlob=await thumb(f)}p.capturedAt=p.capturedAt||await exifCaptureDate(f);if(source.mergeIntoMemoryId){for(const mem of state.memories){if(mem.id!==source.mergeIntoMemoryId&&mem.autoAlbum!==false&&mem.photoIds?.includes(p.id))mem.photoIds=(mem.photoIds||[]).filter(x=>x!==p.id)}}if(!p.manualAlbum&&!p.layoutLocked){if(source.mergeIntoMemoryId)ensurePhotoMemory(p,source);else ensureMemory(scanAlbumName(source,rel),p.id,source.id)}await savePhoto(p);photos.set(p.id,p);byPath.set(key,p);moved+=addedLink?1:0;if(!oldLinked&&hasOriginalLink(p))updated++;if(reindexMode){removeExcludedMatch(ck,fp,rel,source.id);await persistReindexPool()}}
   }
   if(!p&&matchOnly){await markCompleted(rel);if(count%12===0)await new Promise(r=>setTimeout(r,0));continue}
   if(!p){restored=reindexMode?(restored||takeReindexMatch(ck,fp)):null;const album=restored?.album||scanAlbumName(source,rel);p={id:restored?.id||id('ph'),sourceId:source.id,relPath:rel,sourceLinks:Array.isArray(restored?.sourceLinks)&&restored.sourceLinks.length?[...restored.sourceLinks,{sourceId:source.id,relPath:rel,name,size:f.size,lastModified:f.lastModified,fingerprint:fp,contentKey:ck,mimeType}]:[{sourceId:source.id,relPath:rel,name,size:f.size,lastModified:f.lastModified,fingerprint:fp,contentKey:ck,mimeType}],name:restored?.name||name,album,size:f.size,lastModified:f.lastModified,fingerprint:fp,contentKey:ck,addedAt:restored?.addedAt||Date.now(),thumbVersion:THUMB_VERSION,thumbBlob:await thumb(f),capturedAt:restored?.capturedAt||await exifCaptureDate(f),manualAlbum:!!restored?.manualAlbum,autoAlbum:restored?.autoAlbum!==false,layoutLocked:!!restored?.layoutLocked,excluded:false,mediaType:'image',mimeType};photos.set(p.id,p);byPath.set(key,p);normalizePhotoLinks(p);if(Array.isArray(restored?.memoryRefs)&&restored.memoryRefs.length){for(const ref of restored.memoryRefs){const mem=state.memories.find(m=>m.id===ref.memoryId);if(!mem)continue;if(!Array.isArray(mem.photoIds))mem.photoIds=[];if(mem.photoIds.includes(p.id))continue;const at=Math.max(0,Math.min(Number(ref.index)||0,mem.photoIds.length));mem.photoIds.splice(at,0,p.id)}}else ensurePhotoMemory(p,source);added++;await savePhoto(p);byContentKey.set(ck,[...(byContentKey.get(ck)||[]),p]);byFingerprint.set(fp,[...(byFingerprint.get(fp)||[]),p]);if(reindexMode){removeExcludedMatch(ck,fp,rel,source.id);await persistReindexPool()}}
   else {const currentLink=photoLocations(p).some(l=>l.sourceId===source.id&&l.relPath===rel);const verified=!!(p.contentKey&&ck&&p.contentKey===ck);if(matchOnly&&!verified){await markCompleted(rel);if(count%12===0)await new Promise(r=>setTimeout(r,0));continue}const addedLink=currentLink?false:addPhotoLink(p,source,f,rel,fp,ck);const changed=addedLink||p.size!==f.size||p.lastModified!==f.lastModified||p.contentKey!==ck||p.thumbVersion!==THUMB_VERSION||!hasOriginalLink(p);if(changed){p.name=p.name||name;p.fingerprint=p.fingerprint||fp;p.contentKey=p.contentKey||ck;p.size=f.size;p.lastModified=f.lastModified;p.mediaType='image';p.mimeType=mimeType;if(!matchOnly||!p.thumbBlob){p.thumbVersion=THUMB_VERSION;p.thumbBlob=p.thumbBlob||await thumb(f)}p.capturedAt=p.capturedAt||await exifCaptureDate(f);await savePhoto(p);photos.set(p.id,p);byPath.set(key,p);updated++}if(reindexMode){const r=restored||takeReindexMatch(ck,fp);if(r){mergeRestoredPlacement(p,r);await savePhoto(p);removeExcludedMatch(ck,fp,rel,source.id);await persistReindexPool()}}if(p&&!p.manualAlbum&&!p.layoutLocked&&!matchOnly){if(source.mergeIntoMemoryId)ensurePhotoMemory(p,source);else ensureMemory(scanAlbumName(source,rel),p.id,source.id)}}
   await markCompleted(rel);if(count%12===0)await new Promise(r=>setTimeout(r,0));
  }
 }
 try{
  await walk(root);
  if(!resumeFound){await persistScanProgress({status:'paused',sourceId:source.id,libraryName:sourceLabel(source),lastRelPath:'',lastCompletedRelPath:'',processed:0,count:0,added:0,updated:0,moved:0,excluded:0,startedAt:Date.now()});toast('نقطة التوقف القديمة لم تعد موجودة؛ بدأ فحص كامل لهذا المجلد فقط.');scanLock=false;await clearScanProgress(source.id);return await scan(root,false,{source,fresh:true,reindex:reindexMode,matchOnly})}
  if(reindexMode)await persistReindexPool();let linked=0;for(const p of photos.values()){if(!isPhotoRecord(p)||!p.album)continue;const has=state.memories.some(m=>(m.photoIds||[]).includes(p.id));if(!has){ensurePhotoMemory(p,source);linked++}}const removed=cleanupEmptyAutoAlbums();await save();await persistScanProgress({status:'done',sourceId:source.id,libraryName:sourceLabel(source),lastRelPath:scanCheckpoint.lastCompletedRelPath||'',lastCompletedRelPath:scanCheckpoint.lastCompletedRelPath||'',processed:count,count,added,updated,moved,excluded,linked,removed,startedAt,finishedAt:Date.now()});toast(`تم فحص «${sourceLabel(source)}»: ${count} صورة، ${added} جديدة، ${updated} محدثة${moved?'، '+moved+' أصول إضافية رُبطت':''}${linked?'، وربط '+linked+' صور بألبوماتها':''}${removed?'، وتنظيف '+removed+' ألبوم آلي':''}.`);renderNoAnim(true);
 }catch(e){
  if(e?.name==='ScanStopped'){await persistScanProgress({status:'paused',sourceId:source.id,libraryName:sourceLabel(source),lastRelPath:scanCheckpoint?.lastCompletedRelPath||'',lastCompletedRelPath:scanCheckpoint?.lastCompletedRelPath||'',processed:count,count,added,updated,moved,excluded,startedAt});await save();if(reindexMode)await persistReindexPool();toast(`تم إيقاف فحص «${sourceLabel(source)}» بأمان عند: ${scanCheckpoint?.lastCompletedRelPath||'بداية الفحص'}. لم تضِع النتائج.`);renderNoAnim(true)}
  else{console.error(e);await save();if(reindexMode)await persistReindexPool();await persistScanProgress({status:'paused',sourceId:source.id,libraryName:sourceLabel(source),lastRelPath:scanCheckpoint?.lastCompletedRelPath||'',lastCompletedRelPath:scanCheckpoint?.lastCompletedRelPath||'',processed:count,count,added,updated,moved,excluded,startedAt,error:String(e?.message||e)});toast(`توقف فحص «${sourceLabel(source)}» عند: ${scanCheckpoint?.lastCompletedRelPath||'بداية الفحص'}. يمكنك استكماله لاحقًا.`)}
 }finally{scanStopRequested=false;scanLock=false}
}
async function openPhoto(pid){const p=photos.get(pid);if(!isPhotoRecord(p))return;const hit=await getBestPhotoFile(p,true);if(!hit){toast('الأصل غير متاح حاليًا، ومصدر HQ غير مرتبط بهذه الصورة.');return}const m=state.memories.find(x=>x.photoIds?.includes(pid));lb.ids=m?photoFor(m).map(x=>x.id):[pid];lb.i=Math.max(0,lb.ids.indexOf(pid));lb.slideIds=null;stopSlideshow();resetLbZoom();romanticHeartTransition('open');$('#lightbox').showModal();await showPhoto()}
function cleanupLbFlip(){const el=$('#lbFlip');if(el){el.classList.remove('play-next','play-prev');el.hidden=true}for(const u of lb.flipUrls.splice(0)){try{URL.revokeObjectURL(u)}catch{}}lb.flipBusy=false;if(lb.flipTimer){clearTimeout(lb.flipTimer);lb.flipTimer=null}}
async function playLbFlip(nextIndex,dir){if(lb.flipBusy||nextIndex<0||nextIndex>=lb.ids.length||nextIndex===lb.i)return;const target=photos.get(lb.ids[nextIndex]),img=$('#lbImage');if(!isPhotoRecord(target)||!img)return;lb.flipBusy=true;let nextUrl=null;try{nextUrl=await getOriginalUrlForPhoto(target);const token=++lb.loadToken;const oldUrl=lb.url;lb.i=nextIndex;updateLbMeta();resetLbZoom();if(token!==lb.loadToken){URL.revokeObjectURL(nextUrl);return}img.style.opacity='1';img.hidden=false;img.src=nextUrl;lb.url=nextUrl;if(oldUrl&&oldUrl!==nextUrl){try{URL.revokeObjectURL(oldUrl)}catch{}}nextUrl=null;$('#lbStatus').textContent='';cleanupLbFlip();lb.flipBusy=false}catch(e){if(nextUrl)try{URL.revokeObjectURL(nextUrl)}catch{}lb.flipBusy=false;$('#lbStatus').textContent='';toast('تعذر فتح الصورة التالية. احتفظت بالصورة الحالية.')}}
function stopSlideshow(){if(lb.timer){clearInterval(lb.timer);lb.timer=null}lb.slideIds=null;const b=$('#lbPlay');if(b)b.textContent='▶ عرض الصور'}
function toggleSlideshow(){const imageIds=lb.ids;if(imageIds.length<2){toast('العرض التلقائي يحتاج صورتين على الأقل.');return}if(lb.timer){stopSlideshow();toast('توقف العرض التلقائي.');return}lb.slideIds=imageIds;lb.timer=setInterval(async()=>{if(!$('#lightbox')?.open){stopSlideshow();return}const ni=(lb.i+1)%lb.ids.length;await playLbFlip(ni,1)},4200);$('#lbPlay').textContent='⏸ إيقاف العرض';toast('بدأ عرض الصور بهدوء ♥')}
function renderLbStrip(){const wrap=$('#lbStrip');if(!wrap)return;const total=lb.ids.length,half=20,start=Math.max(0,Math.min(lb.i-half,Math.max(0,total-(half*2+1)))),end=Math.min(total,start+half*2+1);wrap.innerHTML=lb.ids.slice(start,end).map((id,local)=>{const idx=start+local,p=photos.get(id);return `<button class="lb-thumb ${idx===lb.i?'active':''}" data-lb-index="${idx}"><img data-thumb="${id}" alt="${esc(p?.name||'')}"><span>${idx+1}</span></button>`}).join('');hydrate()}
async function getOriginalUrlForPhoto(p){const hit=await getBestPhotoFile(p,true);if(!hit)throw new Error('photo-source-not-found');const u=URL.createObjectURL(hit.file);const probe=new Image();probe.src=u;try{await probe.decode()}catch{}return u}
function updateLbMeta(){const p=photos.get(lb.ids[lb.i]);if(!p)return;$('#lbTitle').textContent=p.name;if($('#lbCounter'))$('#lbCounter').textContent=`${lb.i+1} / ${lb.ids.length}`;if($('#lbMeta'))$('#lbMeta').textContent=p.capturedAt?new Date(p.capturedAt).toLocaleString('ar-EG'):'بدون تاريخ التقاط مسجل';if($('#lbPrev'))$('#lbPrev').disabled=lb.i===0;if($('#lbNext'))$('#lbNext').disabled=lb.i===lb.ids.length-1;renderLbStrip()}
async function showPhoto(keepCurrent=false,preloadedUrl=null){const p=photos.get(lb.ids[lb.i]);if(!isPhotoRecord(p))return;const img=$('#lbImage');const token=++lb.loadToken;resetLbZoom();const oldUrl=lb.url;const oldThumbUrl=lb.thumbUrl;const hadCurrent=!!(img?.src&&img.src!=='');if(oldThumbUrl&&!keepCurrent){try{URL.revokeObjectURL(oldThumbUrl)}catch{}lb.thumbUrl=null}updateLbMeta();$('#lbStatus').textContent='جارٍ تحميل الصورة…';try{const u=preloadedUrl||await getOriginalUrlForPhoto(p);if(token!==lb.loadToken){if(!preloadedUrl)URL.revokeObjectURL(u);return}if(img){img.hidden=false;img.src=u}if(oldUrl&&oldUrl!==u){try{URL.revokeObjectURL(oldUrl)}catch{}}lb.url=u;$('#lbStatus').textContent='';}catch{if(token!==lb.loadToken)return;if(!hadCurrent&&!keepCurrent&&img){const b=await getThumbBlob(p.id);if(b){lb.thumbUrl=URL.createObjectURL(b);img.hidden=false;img.src=lb.thumbUrl}}$('#lbStatus').textContent=hadCurrent?'تعذر تحميل الأصل؛ احتفظت بالصورة الحالية لتجنب الوميض.':'تعذر فتح الصورة الأصلية.'}}
function modal(html){$('#modalBody').innerHTML=html;$('#modal').showModal()}function closeModal(){if(duplicateScanBusy){duplicateStopRequested=true;duplicateScanRun++}if($('#modal').open)$('#modal').close()}
function memoryForm(m){const start=m.date||'',end=m.endDate||m.date||'',ls=m.linkSourceId||'',links=normalizeAlbumLinkFolders(m);modal(`<h2>تفاصيل الذكرى</h2>${field('mTitle','اسم الذكرى',m.title,'text')}<div class="field"><label>من تاريخ</label><input id="mDate" type="date" value="${esc(start)}"></div><div class="field"><label>إلى تاريخ</label><input id="mEndDate" type="date" value="${esc(end)}"><small class="meta">النهاية تبدأ تلقائيًا مثل البداية. غيّرها فقط إذا كانت الذكرى تمتد لأكثر من يوم.</small></div>${field('mPlace','المكان',m.place,'text')}<div class="field"><label>مصدر الأصول لهذا الألبوم</label><select id="mLinkSource"><option value="">تلقائي — استخدم المصادر المرتبطة بالصور</option>${sources.map(x=>`<option value="${esc(x.id)}" ${ls===x.id?'selected':''}>${esc(sourceLabel(x))}</option>`).join('')}</select><small class="meta">يمكن للألبوم أن يرتبط بأكثر من مجلد أصل؛ كل مجلد يحتفظ بصوره ومكانه، ولا يحدث دمج للملفات.</small>${links.length?`<div class="meta" style="margin-top:8px"><b>الأصول المرتبطة حاليًا (${links.length})</b><br>${links.slice(0,12).map(x=>{const s=sources.find(z=>String(z.id)===String(x.sourceId));return `📁 ${esc(sourceLabel(s))}${x.folderPath?' / '+esc(x.folderPath):''}`}).join('<br>')}</div>`:''}<div class="actions" style="margin-top:8px"><button class="btn small" data-action="pickAlbumLinkSource" data-id="${m.id}">📁 إضافة أصل/مجلد آخر — الأسرع</button></div></div><div class="field"><label>الوصف</label><textarea id="mDesc">${esc(m.description||'')}</textarea></div><div class="actions"><button class="btn primary" data-action="saveMemory" data-id="${m.id}">حفظ</button><button class="btn" data-action="closeModal">إلغاء</button></div>`);const sd=$('#mDate'),ed=$('#mEndDate');if(ed)ed.dataset.auto=(!!start&&end===start)||(!start&&!end)?'1':'0';sd?.addEventListener('change',()=>{if(ed&&(ed.dataset.auto==='1'||!ed.value)) {ed.value=sd.value;ed.dataset.auto='1';}});ed?.addEventListener('input',()=>{if(ed.value!==sd?.value)ed.dataset.auto='0';});}
function editMemory(i){const m=state.memories.find(x=>x.id===i);if(m)memoryForm(m)}
function addMemory(){const m={id:id('mem'),title:'',date:'',endDate:'',place:'',description:'',album:'',photoIds:[],userEdited:true};state.memories.unshift(m);memoryForm(m)}
function albumForm(){modal(`<h2>ألبوم جديد</h2>${field('albumTitle','اسم الألبوم','','text')}<p class="meta">يمكنك بعد إنشائه تحديد صور من أي ذكرى ونقلها إليه، بدون حذف الصور الأصلية.</p><div class="actions"><button class="btn primary" data-action="saveAlbum">إنشاء</button><button class="btn" data-action="closeModal">إلغاء</button></div>`)}
function newAlbum(){albumForm()}
function dreamForm(d){modal(`<h2>${d?'تعديل الحلم':'حلم جديد'}</h2>${field('dTitle','الحلم',d?.title||'','text')}${field('dDate','الموعد المستهدف',d?.targetDate||'','date')}${field('dProgress','نسبة الإنجاز',d?.progress??0,'number')}<div class="field"><label>التفاصيل</label><textarea id="dNote">${esc(d?.note||'')}</textarea></div><div class="actions"><button class="btn primary" data-action="saveDream" data-id="${d?.id||''}">حفظ</button><button class="btn" data-action="closeModal">إلغاء</button></div>`)}
function verseForm(){modal(`<h2>آية مفضلة</h2>${field('vRef','المرجع','','text')}<div class="field"><label>نص الآية</label><textarea id="vText"></textarea></div><button class="btn primary" data-action="saveVerse">حفظ</button>`)}
function prayerForm(p=null){modal(`<h2>${p?'تعديل':'إضافة'} صلاة / أمنية</h2>${field('pTitle','العنوان',p?.title||'','text')}<div class="field"><label>التفاصيل</label><textarea id="pText">${esc(p?.text||'')}</textarea></div><div class="actions"><button class="btn primary" data-action="savePrayer" data-id="${p?.id||''}">حفظ</button><button class="btn" data-action="closeModal">إلغاء</button></div>`)}
function editPrayer(i){const p=state.prayers.find(x=>x.id===i);if(p)prayerForm(p)}
async function deletePrayer(i){const p=state.prayers.find(x=>x.id===i);if(!p)return;if(!confirm(`حذف «${p.title||'هذه الأمنية'}»؟`))return;state.prayers=state.prayers.filter(x=>x.id!==i);await save();toast('تم حذف الصلاة / الأمنية.');renderNoAnim()}
function msgForm(m=null){modal(`<h2>${m?'تعديل الرسالة':'رسالة مميزة ⭐'}</h2>${field('msgDate','التاريخ',m?.date||today(),'date')}${field('msgSender','من',m?.sender||'رانيا','text')}<div class="field"><label>نص الرسالة</label><textarea id="msgText">${esc(m?.text||'')}</textarea></div><button class="btn primary" data-action="saveMessage" data-id="${m?.id||''}">حفظ</button>`)}
async function saveMessage(i){
 const date=$('#msgDate')?.value||today(),sender=$('#msgSender')?.value.trim()||'رانيا',text=$('#msgText')?.value.trim()||'';
 if(!text){toast('اكتب نص الرسالة.');return}
 if(i){const m=state.messages.find(x=>x.id===i);if(!m)return;m.date=date;m.sender=sender;m.text=text;m.starred=m.starred!==false}else state.messages.unshift({id:id('msg'),date,sender,text,starred:true});
 await save();closeModal();toast('تم حفظ الرسالة.');renderNoAnim();
}
function surpriseMessagePool(){const custom=Array.isArray(state.settings.customSurpriseMessages)?state.settings.customSurpriseMessages:[];return [...ROMANTIC_TICKER_MESSAGES,...custom].map(x=>String(x||'').trim()).filter(Boolean)}
function surpriseMessageForm(existingIndex=-1){
 const value=existingIndex>=0?(state.settings.customSurpriseMessages?.[existingIndex]||''):'';
 modal(`<h2>${existingIndex>=0?'تعديل رسالة المفاجآت':'إضافة رسالة للمفاجآت'}</h2><div class=\"field\"><label>نص الرسالة</label><textarea id=\"surpriseMsgText\" maxlength=500 placeholder=\"اكتب الرسالة التي تريد ظهورها ضمن المفاجآت العشوائية…\">${esc(value)}</textarea></div><div class=\"actions\"><button class=\"btn primary\" data-action=\"saveSurpriseMessage\" data-id=\"${existingIndex}\">حفظ الرسالة</button><button class=\"btn\" data-action=\"closeModal\">إلغاء</button></div>`);
}
async function saveSurpriseMessage(i){
 const text=$('#surpriseMsgText')?.value.trim()||'';
 if(!text){toast('اكتب الرسالة أولًا.');return}
 if(!Array.isArray(state.settings.customSurpriseMessages))state.settings.customSurpriseMessages=[];
 const n=Number(i);
 if(Number.isInteger(n)&&n>=0&&n<state.settings.customSurpriseMessages.length)state.settings.customSurpriseMessages[n]=text;
 else state.settings.customSurpriseMessages.unshift(text);
 normalizeState();await save();closeModal();toast('تمت إضافة الرسالة وستظهر ضمن المفاجآت العشوائية.');renderNoAnim();
}
async function deleteSurpriseMessage(i){
 const n=Number(i);if(!Number.isInteger(n)||n<0||n>=state.settings.customSurpriseMessages.length)return;
 state.settings.customSurpriseMessages.splice(n,1);await save();toast('تم حذف الرسالة من المفاجآت العشوائية.');renderNoAnim();
}
function randomSurpriseMessage(){const pool=surpriseMessagePool();let message=pool[Math.floor(Math.random()*pool.length)]||ROMANTIC_TICKER_MESSAGES[0];let guard=0;while(pool.length>1&&message===lastRomanticSceneMessage&&guard++<12)message=pool[Math.floor(Math.random()*pool.length)];return message}
function eventForm(){modal(`<h2>محطة في قصتنا</h2>${field('eTitle','العنوان','','text')}${field('eDate','التاريخ',today(),'date')}<div class="field"><label>ماذا حدث؟</label><textarea id="eDesc"></textarea></div><button class="btn primary" data-action="saveEvent">حفظ</button>`)}
async function saveEvent(){const title=$('#eTitle')?.value.trim(),date=$('#eDate')?.value,description=$('#eDesc')?.value.trim()||'';if(!title||!date){toast('اكتب عنوان المحطة والتاريخ.');return}state.events.unshift({id:id('evt'),title,date,description});await save();closeModal();toast('تم حفظ المحطة.');renderNoAnim()}
async function saveMemory(i){const m=state.memories.find(x=>x.id===i);if(!m)return;const start=$('#mDate').value,end=$('#mEndDate').value||start;if(start&&end&&end<start){toast('تاريخ النهاية لا يمكن أن يكون قبل البداية.');return}m.title=$('#mTitle').value.trim()||'ذكرى بدون اسم';m.date=start;m.endDate=start?end:'';m.place=$('#mPlace').value.trim();m.description=$('#mDesc').value.trim();const nextSource=$('#mLinkSource')?.value||'',oldSource=m.linkSourceId||'';if(nextSource){const links=normalizeAlbumLinkFolders(m),same=links.find(x=>String(x.sourceId)===String(nextSource));if(same){m.linkSourceId=same.sourceId;m.linkFolderPath=same.folderPath}else{m.linkSourceId=String(nextSource);m.linkFolderPath='';m.linkFolders=links}}else if(oldSource&&normalizeAlbumLinkFolders(m).length===0){m.linkSourceId='';m.linkFolderPath=''}m.userEdited=true;normalizeState();await save();closeModal();toast('تم حفظ الذكرى.');if(section==='memories'||section==='home'||section==='calendar')renderNoAnim()}
async function saveAlbum(){const title=$('#albumTitle').value.trim();if(!title){toast('اكتب اسم الألبوم.');return}if(state.memories.some(m=>String(m.title||'').trim()===title)){toast('يوجد ألبوم بهذا الاسم بالفعل.');return}state.memories.unshift({id:id('mem'),title,date:'',endDate:'',place:'',description:'',album:title,photoIds:[],userEdited:true});await save();closeModal();toast('تم إنشاء الألبوم.');renderNoAnim()}
function rerenderCurrentMemory(){const m=state.memories.find(x=>x.id===currentMemoryId);if(!m){renderNoAnim(true);return}const oldInner=$('#currentPage .inner'),scrollTop=oldInner?.scrollTop||0,scrollLeft=oldInner?.scrollLeft||0;$('#currentPage').innerHTML=pageMemory(m);hydrate();setNav();updateSelectionCount();requestAnimationFrame(()=>{const inner=$('#currentPage .inner');if(inner){inner.scrollTop=scrollTop;inner.scrollLeft=scrollLeft}})}
function updateSelectionCount(){const el=$('#selectionCount');if(el)el.textContent=`${selectedPhotos.size} محددة`}
function selectAllPhotos(){const m=state.memories.find(x=>x.id===currentMemoryId);if(!m)return;selectedPhotos=new Set(photoFor(m).map(p=>p.id));rerenderCurrentMemory();toast(`تم تحديد ${selectedPhotos.size} صورة. اضغط «تثبيت ترتيب التحديد» لحفظ الترتيب.`)}
function clearPhotoSelection(){selectedPhotos.clear();rerenderCurrentMemory()}
function clearDragAutoScroll(){if(dragScrollTimer){clearInterval(dragScrollTimer);dragScrollTimer=null}}
function clearDragLongPress(){if(dragLongPressTimer){clearTimeout(dragLongPressTimer);dragLongPressTimer=null}dragPending=false;dragPendingPhoto='';dragPendingItem=null}
function updateDragAutoScroll(x,y){dragLastX=x;dragLastY=y;const inner=$('#currentPage .inner');if(!inner||!dragSelecting){clearDragAutoScroll();return}const r=inner.getBoundingClientRect(),edge=Math.min(110,Math.max(72,r.height*.18));let delta=0;if(y<r.top+edge)delta=-Math.round(4+10*(1-(y-r.top)/edge));else if(y>r.bottom-edge)delta=Math.round(4+10*(1-(r.bottom-y)/edge));if(!delta){clearDragAutoScroll();return}if(dragScrollTimer)return;dragScrollTimer=setInterval(()=>{if(!dragSelecting){clearDragAutoScroll();return}const el=$('#currentPage .inner');if(!el)return;const rr=el.getBoundingClientRect(),ee=Math.min(110,Math.max(72,rr.height*.18));let d=0;if(dragLastY<rr.top+ee)d=-Math.round(4+10*(1-(dragLastY-rr.top)/ee));else if(dragLastY>rr.bottom-ee)d=Math.round(4+10*(1-(rr.bottom-dragLastY)/ee));if(!d){clearDragAutoScroll();return}const before=el.scrollTop;el.scrollTop+=d;if(el.scrollTop!==before)dragSelectAtPoint(dragLastX,dragLastY)},24)}
function toggleDragSelect(){dragSelectMode=!dragSelectMode;dragSelecting=false;clearDragAutoScroll();clearDragLongPress();dragVisited.clear();dragPointerId=null;rerenderCurrentMemory();toast(dragSelectMode?'التحديد السريع مفعّل: اضغط على «تحديد سريع» أولًا، ثم لمسة قصيرة للصورة = تحديد. للتمرير اسحب عاديًا، ولتحديد متواصل اضغط مطولًا 0.4 ثانية ثم اسحب.':'تم إيقاف التحديد السريع.')}
function dragSelectAtPoint(x,y){if(!dragSelecting)return;const el=document.elementFromPoint(x,y)?.closest?.('.photo-item');if(!el)return;const cb=el.querySelector('.photo-select');if(!cb?.dataset.photo||dragVisited.has(cb.dataset.photo))return;dragVisited.add(cb.dataset.photo);if(dragSelectValue)selectedPhotos.add(cb.dataset.photo);else selectedPhotos.delete(cb.dataset.photo);cb.checked=selectedPhotos.has(cb.dataset.photo)}
function quickTapSelect(item){const cb=item?.querySelector('.photo-select');if(!cb?.dataset.photo)return;const id=cb.dataset.photo;if(selectedPhotos.has(id))selectedPhotos.delete(id);else selectedPhotos.add(id);cb.checked=selectedPhotos.has(id);updateSelectionCount()}

async function commitPhotoOrder(){const m=state.memories.find(x=>x.id===currentMemoryId);if(!m||!selectedPhotos.size){toast('حدد صورة واحدة على الأقل.');return}const arr=[...new Set(m.photoIds||[])],selected=[...selectedPhotos].filter(pid=>arr.includes(pid)),rest=arr.filter(pid=>!selectedPhotos.has(pid));if(!selected.length){toast('التحديد لا ينتمي للذكرى الحالية.');return}m.photoIds=[...selected,...rest];await save();toast(`تم تثبيت ترتيب ${selected.length} صورة حسب ترتيب ضغطاتك.`);rerenderCurrentMemory()}
function requireSelection(){if(!selectedPhotos.size){toast('حدد صورة واحدة على الأقل.');return false}return true}
async function removeFromAlbum(){if(!requireSelection())return;const m=state.memories.find(x=>x.id===currentMemoryId);if(!m)return;m.photoIds=m.photoIds.filter(pid=>!selectedPhotos.has(pid));for(const pid of selectedPhotos){const p=photos.get(pid);if(p){p.manualAlbum=true;p.layoutLocked=true;p.album='غير مصنف';await savePhoto(p)}}selectedPhotos.clear();await save();toast('تمت إزالة الصور من هذا الألبوم دون حذف الأصل.');renderNoAnim()}
function moveSelected(){if(!requireSelection())return;const m=state.memories.find(x=>x.id===currentMemoryId);if(!m)return;const targets=visibleMemories().filter(x=>x.id!==m.id);modal(`<h2>نقل الصور المحددة</h2><p class="meta">${selectedPhotos.size} صورة سيتم نقلها من «${esc(m.title||'الذكرى الحالية')}».</p><div class="cards">${targets.length?targets.map(t=>`<button class="card selectable-card" data-action="moveToAlbum" data-id="${t.id}"><b>📁 ${esc(t.title||'ألبوم')}</b><small class="meta">${photoFor(t).length} صورة</small></button>`).join(''):`<div class="empty">أنشئ ألبومًا أولًا.</div>`}</div><div class="actions"><button class="btn primary" data-action="createAlbumAndMove">＋ إنشاء ألبوم ونقل</button><button class="btn" data-action="closeModal">إلغاء</button></div>`) }
async function moveToAlbum(targetId){const m=state.memories.find(x=>x.id===currentMemoryId),t=state.memories.find(x=>x.id===targetId);if(!m||!t||t.hidden)return;if(t.id===m.id)return;t.album=t.album||t.title||'';m.photoIds=m.photoIds.filter(pid=>!selectedPhotos.has(pid));for(const pid of selectedPhotos){if(!t.photoIds.includes(pid))t.photoIds.push(pid);const p=photos.get(pid);if(p){p.manualAlbum=true;p.layoutLocked=true;p.album=t.album||t.title||'غير مصنف';await savePhoto(p)}}selectedPhotos.clear();await save();closeModal();toast(`تم نقل الصور إلى «${t.title||'الألبوم'}».`);renderNoAnim()}
function createAlbumAndMove(){const ids=[...selectedPhotos],from=currentMemoryId;modal(`<h2>إنشاء ألبوم ونقل الصور</h2>${field('albumTitle2','اسم الألبوم','','text')}<div class="actions"><button class="btn primary" data-action="saveAlbumMove" data-from="${from}" data-ids="${esc(JSON.stringify(ids))}">إنشاء ونقل</button><button class="btn" data-action="closeModal">إلغاء</button></div>`)}
async function saveAlbumMove(from,ids){const title=$('#albumTitle2').value.trim();if(!title){toast('اكتب اسم الألبوم.');return}if(state.memories.some(m=>String(m.title||'').trim()===title)){toast('يوجد ألبوم بهذا الاسم بالفعل.');return}const t={id:id('mem'),title,date:'',endDate:'',place:'',description:'',album:title,photoIds:[]};state.memories.unshift(t);const m=state.memories.find(x=>x.id===from);for(const pid of ids){if(m)m.photoIds=m.photoIds.filter(x=>x!==pid);t.photoIds.push(pid);const p=photos.get(pid);if(p){p.manualAlbum=true;p.layoutLocked=true;p.album=title;await savePhoto(p)}}selectedPhotos.clear();await save();closeModal();toast(`تم إنشاء «${title}» ونقل الصور إليه.`);renderNoAnim()}
async function excludeSelected(){if(!requireSelection())return;const current=state.memories.find(x=>x.id===currentMemoryId);const ids=[...selectedPhotos];if(!current)return;if(!confirm('استبعاد الصور من فهرس OsRa؟ الصور الأصلية لن تُحذف من الجهاز.'))return;const refs=new Map();for(const pid of ids){refs.set(pid,state.memories.filter(m=>Array.isArray(m.photoIds)&&m.photoIds.includes(pid)).map(m=>({memoryId:m.id,index:m.photoIds.indexOf(pid)})))}for(const pid of ids){const p=photos.get(pid);if(!p)continue;state.excludedPhotos.push({id:p.id,key:exclusionKey(p.relPath,p.size,p.lastModified,p.fingerprint||''),relPath:p.relPath,sourceId:p.sourceId||'',sourceLinks:photoLocations(p),size:p.size,lastModified:p.lastModified,name:p.name,fingerprint:p.fingerprint||'',contentKey:p.contentKey||'',album:p.album||'',manualAlbum:!!p.manualAlbum,autoAlbum:p.autoAlbum!==false,layoutLocked:!!p.layoutLocked,addedAt:p.addedAt||Date.now(),capturedAt:p.capturedAt||'',memoryRefs:refs.get(pid)||[]});photos.delete(pid);await deletePhotoRecord(pid)}for(const mem of state.memories)mem.photoIds=(mem.photoIds||[]).filter(pid=>!selectedPhotos.has(pid));state.excludedPhotos=[...new Map(state.excludedPhotos.map(x=>[x.contentKey||x.fingerprint||x.key,x])).values()];invalidateExcludedCache();selectedPhotos.clear();await save();toast('تم استبعاد الصور من فهرس OsRa دون حذف الأصل أو الاحتفاظ بنسخة المصغرة داخل الفهرس.');renderNoAnim()}
async function reorderPhoto(pid,dir){const m=state.memories.find(x=>x.id===currentMemoryId);if(!m)return;const arr=m.photoIds||[],p=photos.get(pid);if(!isPhotoRecord(p))return;const slots=arr.map((x,i)=>isPhotoRecord(photos.get(x))?i:-1).filter(i=>i>=0),at=slots.indexOf(arr.indexOf(pid)),to=at+dir;if(at<0||to<0||to>=slots.length)return;const next=[...arr],a=slots[at],b=slots[to];[next[a],next[b]]=[next[b],next[a]];m.photoIds=next;await save();renderNoAnim()}
async function restoreExcluded(){if(!state.excludedPhotos.length&&!reindexRestorePool.length){toast('لا توجد صور مستبعدة حاليًا لإعادة فهرستها.');return}if(scanLock){toast('أوقف الفحص الحالي قبل إعادة فهرسة الصور المستبعدة.');return}const pool=reindexRestorePool.length?[...reindexRestorePool]:structuredClone(state.excludedPhotos);reindexRestorePool=[...pool];await persistReindexPool();const sourceIds=new Set(pool.flatMap(x=>Array.isArray(x.sourceLinks)?x.sourceLinks.map(l=>l.sourceId):[x.sourceId]).filter(Boolean));toast('تم تجهيز إعادة الفهرسة الآمنة. الصور المستبعدة ستظل مستبعدة أمام الفحص العادي حتى تُعاد من هنا فقط.');await persistReindexPool();for(const sid of sourceIds){const s=sources.find(x=>x.id===sid);if(!s)continue;try{await setActiveSource(s);if(await ensureSourcePermission(s,true)){await clearScanProgress(s.id);await scan(s.handle,false,{source:s,fresh:true,reindex:true})}}catch(e){console.warn('reindex excluded source failed',e)}}await persistReindexPool();await save();toast(reindexRestorePool.length?`توقفت إعادة الفهرسة مع بقاء ${reindexRestorePool.length} صورة لم تُعثر على أصلها بعد؛ يمكنك المتابعة لاحقًا.`:(state.excludedPhotos.length?'اكتملت إعادة الفهرسة لما وُجد. الصور التي لم تُعثر عليها بقيت مستبعدة.':'اكتملت إعادة الفهرسة بنجاح.'));renderNoAnim()}
async function saveDream(i){let d=i?state.dreams.find(x=>x.id===i):null;if(!d){d={id:id('dream')};state.dreams.unshift(d)}d.title=$('#dTitle').value.trim()||'حلم';d.targetDate=$('#dDate').value;d.progress=Math.max(0,Math.min(100,Number($('#dProgress').value||0)));d.note=$('#dNote').value.trim();d.done=d.progress>=100;await save();closeModal();renderNoAnim()}
function photoAlbumTitles(photoId){
 const seen=new Set();
 for(const m of state.memories){
  if(m.hidden||!Array.isArray(m.photoIds)||!m.photoIds.includes(photoId))continue;
  const t=String(m.title||m.album||'').trim();if(t&&!seen.has(t))seen.add(t);
 }
 return [...seen];
}
function linkReportModal(report){
 const total=Number(report?.totalPhotos||0),linked=Number(report?.linkedPhotos||0),missing=Number(report?.missing?.length||0),shown=Math.min(missing,300),pct=total?Math.round(linked*100/total):0;
 const shownRows=(report?.missing||[]).slice(0,shown).map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.name||'—')}</td><td>${esc(x.source||'—')}</td><td>${esc((x.albums||[]).join('، ')||'—')}</td><td dir="ltr" style="text-align:left;word-break:break-all">${esc(x.relPath||'—')}</td></tr>`).join('');
 const sourceRows=(report?.sourceSummaries||[]).map(x=>`<tr><td>${esc(x.name||'مصدر')}</td><td>${x.filesScanned||0}</td><td>${x.targets||0}</td><td>${x.linked||0}</td><td>${x.alreadyLinked||0}</td><td>${x.failed||0}</td></tr>`).join('');
 modal(`<h2>♥ تقرير ربط الأصول</h2><div class="card"><b>النتيجة النهائية</b><p>تم ربط أصل حقيقي لـ <b>${linked}</b> من <b>${total}</b> صورة (${pct}%).</p><p>${missing?`لم يُعثر على الأصل لـ <b>${missing}</b> صورة.`:'✅ تم العثور على الأصل لكل الصور.'}</p>${(report?.sourceErrors||[]).length?`<p>⚠️ تعذر الوصول إلى <b>${report.sourceErrors.length}</b> مصدر، وتم تخطيه ومواصلة بقية المصادر.</p>`:''}<p class="meta">لا تُنشأ صور أو ألبومات ولا تُنسخ الصور أثناء الربط.</p></div>${sourceRows?`<div class="card" style="overflow:auto"><h3>📁 ملخص المصادر</h3><table class="data-table"><thead><tr><th>المصدر</th><th>صور فُحصت</th><th>صور مطلوبة</th><th>ربط جديد</th><th>أصل موجود مسبقًا</th><th>تعذر</th></tr></thead><tbody>${sourceRows}</tbody></table></div>`:''}${missing?`<div class="card" style="overflow:auto;max-height:58vh"><h3>الصور غير المرتبطة</h3>${missing>shown?`<p class="meta">يعرض الجدول أول ${shown} فقط من ${missing}. التقرير الكامل محفوظ داخل OsRa.</p>`:''}<table class="data-table"><thead><tr><th>#</th><th>الصورة</th><th>المصدر/المحاولة</th><th>الألبوم</th><th>المسار</th></tr></thead><tbody>${shownRows}</tbody></table></div>`:''}<div class="actions"><button class="btn primary" data-action="closeModal">تم</button></div>`);
}
function albumReviewModal(review){
 albumReviewState=review||null;const groups=review?.groups||[];const albums=visibleMemories();
 if(!groups.length){modal(`<h2>🔤 مراجعة ربط الألبومات</h2><div class="empty">لا توجد مطابقات تحتاج اختيارًا يدويًا.</div><div class="actions"><button class="btn primary" data-action="closeModal">تم</button></div>`);return}
 const albumOpts=(selected)=>albums.map(m=>`<option value="${esc(m.id)}" ${String(m.id)===String(selected)?'selected':''}>${esc(m.title||m.album||'ألبوم')}</option>`).join('');
 const html=groups.map((g,gi)=>{const candidates=g.candidates||[];return `<div class="card"><h3>📁 ${esc(g.albumTitle||'ألبوم')}</h3><p class="meta">${g.kind==='exact'?'وجدت أكثر من مجلد بالاسم نفسه.':'لم أجد اسمًا مطابقًا تمامًا، لكن وجدت مجلدات قريبة في الاسم.'} اختر ما تراه صحيحًا. يمكن ربط أكثر من مجلد بالألبوم الواحد، ويمكن أيضًا إسناد المجلد إلى ألبوم مختلف.</p><div class="album-review-candidates">${candidates.map((c,ci)=>`<label class="card" style="display:block;padding:10px;margin:8px 0"><div><input class="album-review-check" type="checkbox" data-group="${gi}" data-candidate="${ci}"> <b>${esc(sourceLabel(c.source))}</b>${c.folderPath?` <span class="meta">/ ${esc(c.folderPath)}</span>`:''}</div>${c.score!=null?`<div class="meta">درجة التشابه: ${Math.round(c.score*100)}%</div>`:''}<div class="field" style="margin-top:7px"><label>إسناد هذا المجلد إلى</label><select class="album-review-target">${albumOpts(g.albumId)}</select></div></label>`).join('')}</div></div>`}).join('');
 modal(`<h2>🔤 تأكيد ربط الألبومات</h2><p>لن يتم اتخاذ قرار نهائي للأسماء المتشابهة تلقائيًا. علّم المجلدات الصحيحة، واختر الألبوم المستهدف لكل مجلد عند الحاجة. بعد التأكيد يبدأ الربط الفعلي.</p><div style="max-height:68vh;overflow:auto">${html}</div><div class="actions"><button class="btn primary" data-action="confirmAlbumReviews">✅ تأكيد الاختيارات وبدء الربط</button><button class="btn" data-action="closeModal">إلغاء</button></div>`);
}
async function confirmAlbumReviews(){
 const review=albumReviewState;if(!review)return;
 const selected=[];for(const b of document.querySelectorAll('.album-review-check:checked')){const gi=Number(b.dataset.group),ci=Number(b.dataset.candidate),g=review.groups[gi],c=g?.candidates?.[ci],label=b.closest('label'),targetId=label?.querySelector('.album-review-target')?.value||g?.albumId;if(c&&targetId)selected.push({c,targetId})}
 if(!selected.length){toast('لم يتم اختيار أي مجلد.');return}
 toast('جارٍ التحقق من الاختيارات قبل حفظها…');let accepted=0,rejected=0;
 for(const {c,targetId} of selected){const m=state.memories.find(x=>String(x.id)===String(targetId));if(!m||!c?.source?.handle){rejected++;continue}const check=await verifyAlbumFolderCandidate(m,c);if(check.matched>0){if(addAlbumLinkFolder(m,c.source.id,c.folderPath,!normalizeAlbumLinkFolders(m).length))accepted++;else accepted++}else{rejected++}}
 normalizeState();if(accepted){await persistSources();await save()}albumReviewState=null;closeModal();toast(`${accepted?`✅ تم قبول ${accepted} ربطًا بعد التحقق.`:''}${rejected?` ❌ رُفض ${rejected} اختيار بلا أي تطابق.`:''}${accepted?' جارٍ استكمال الربط…':''}`);if(accepted)await linkAllSources(true);else showManualLinkNext();
}
function excludedIdSet(){if(excludedCacheSource!==state.excludedPhotos){excludedCacheSource=state.excludedPhotos;excludedCacheSet=new Set((state.excludedPhotos||[]).map(x=>x?.id).filter(Boolean))}return excludedCacheSet}
function invalidateExcludedCache(){excludedCacheSource=null}
function linkMatchesTargetFolder(link,folderPath){const rel=normalizeFolderRelPath(link?.relPath);const base=normalizeFolderRelPath(folderPath||'');if(!rel)return false;if(!base)return true;return rel===base||rel.startsWith(base+'/')}
function normalizeFileName(v){return String(v||'').trim().toLocaleLowerCase()}
function normalizeFileStem(v){const n=normalizeFileName(v);return n.replace(/\.[^.\/]+$/,'')}
function normalizeAlbumNameKey(v){return String(v||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase();}
async function listDirectAlbumNameCandidates(source,keys){
 const out=[];if(!source?.handle)return out;
 if(!(await ensureSourcePermission(source,true)))return out;
 try{
  const seenPaths=new Set();const add=(folderPath,name)=>{const key=normalizeAlbumNameKey(name),path=normalizeFolderRelPath(folderPath||'');if(!key||seenPaths.has(path))return false;seenPaths.add(path);out.push({source,folderPath:path,name:String(name||''),exact:keys?.has(key)===true});return true};
  if(source.asAlbum)add('',source.name||'');
  const direct=[];for await(const [name,entry] of source.handle.entries())if(entry.kind==='directory')direct.push([name,entry]);
  direct.sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true,sensitivity:'base'}));
  // Always collect directory names, but do not touch image files here. This keeps matching cheap.
  for(const [name] of direct)add(name,name);
  const walk=async(list,base='',depth=0)=>{
   if(depth>8)return;
   for(const [name,entry] of list){if(entry.kind!=='directory')continue;const rel=base?base+'/'+name:name;add(rel,name);const children=[];for await(const x of entry.entries())if(x[1].kind==='directory')children.push(x);children.sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true,sensitivity:'base'}));if(children.length)await walk(children,rel,depth+1)}
  };
  await walk(direct,'',0);
 }catch(e){console.warn('album name mapping unavailable',sourceLabel(source),e)}
 return out;
}

function albumNameSimilarity(a,b){
 const x=normalizeAlbumNameKey(a),y=normalizeAlbumNameKey(b);if(!x||!y)return 0;if(x===y)return 1;if(x.includes(y)||y.includes(x))return Math.min(0.96,0.72+Math.min(0.24,Math.min(x.length,y.length)/Math.max(x.length,y.length)*0.24));
 const ax=[...new Set(x.split(' ').filter(Boolean))],ay=[...new Set(y.split(' ').filter(Boolean))],setY=new Set(ay),inter=ax.filter(t=>setY.has(t)).length,union=new Set([...ax,...ay]).size,jacc=union?inter/union:0;
 const m=x.length,n=y.length,prev=new Array(n+1);for(let j=0;j<=n;j++)prev[j]=j;for(let i=1;i<=m;i++){let cur=new Array(n+1);cur[0]=i;for(let j=1;j<=n;j++){const cost=x[i-1]===y[j-1]?0:1;cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+cost)}for(let j=0;j<=n;j++)prev[j]=cur[j]}const edit=1-prev[n]/Math.max(m,n);return Math.max(edit,jacc*0.9)}
async function verifyAlbumFolderCandidate(m,c){
 const target=(m?.photoIds||[]).map(pid=>photos.get(pid)).filter(isPhotoRecord);
 if(!target.length||!c?.source?.handle)return {matched:0,indexed:0,error:true};
 try{
  const dir=await resolveDirectory(c.source.handle,c.folderPath||'');
  const index=await buildDirectFolderIndex(dir,c.folderPath||'');
  let matched=0;
  for(const p of target){if(folderCandidate({photo:p},index)){matched++;break}}
  if(!matched){
   const wanted=target.map(p=>({photo:p,album:m,folderPath:c.folderPath||''}));
   const fb=await buildRecursiveNameIndex(dir,c.folderPath||'',wanted,()=>{});
   for(const p of target){if(folderCandidate({photo:p},fb)){matched++;break}}
  }
  return {matched,indexed:index.filesSeen||0,error:false};
 }catch{return {matched:0,indexed:0,error:true}}
}
async function matchAlbumsByName(showReport=true,autoLink=true){
 const albums=visibleMemories().filter(m=>Array.isArray(m.photoIds)&&m.photoIds.some(pid=>isPhotoRecord(photos.get(pid))));
 if(!albums.length){if(showReport)toast('لا توجد ألبومات ظاهرة تحتوي صورًا للمطابقة.');return {matched:0,missing:0,ambiguous:0,errors:0,needsReview:false,groups:[]};}
 const keys=new Set(albums.map(m=>normalizeAlbumNameKey(m.title||m.album)).filter(Boolean)),candidates=[];
 for(const source of sources){if(!source?.handle)continue;const rows=await listDirectAlbumNameCandidates(source,keys);candidates.push(...rows)}
 const byKey=new Map();for(const row of candidates){const key=normalizeAlbumNameKey(row.name),arr=byKey.get(key)||[],sig=`${row.source.id}::${row.folderPath}`;if(!arr.some(x=>`${x.source.id}::${x.folderPath}`===sig))arr.push(row);byKey.set(key,arr)}
 let matched=0,missing=0,ambiguous=0,errors=0;const matchedRows=[],groups=[];
 for(const m of albums){const title=m.title||m.album||'',key=normalizeAlbumNameKey(title),arr=byKey.get(key)||[],existing=normalizeAlbumLinkFolders(m),existingKeys=new Set(existing.map(x=>`${x.sourceId}::${x.folderPath}`));
  const freshExact=arr.filter(c=>!existingKeys.has(`${c.source.id}::${normalizeFolderRelPath(c.folderPath||'')}`));
  if(freshExact.length===1&&autoLink){const hit=freshExact[0],check=await verifyAlbumFolderCandidate(m,hit);if(check.matched>0){addAlbumLinkFolder(m,hit.source.id,hit.folderPath,!existing.length);m.linkAutoByName=true;matched++;matchedRows.push(`${title} ← ${sourceLabel(hit.source)}${hit.folderPath?` / ${hit.folderPath}`:''} • تحقق فعلي`);}else{errors++;missing++;matchedRows.push(`${title} ← ${sourceLabel(hit.source)} • رُفض: 0 تطابق`) }continue}
  if(freshExact.length>1){ambiguous++;groups.push({albumId:m.id,albumTitle:title,kind:'exact',candidates:freshExact.map(c=>({...c,score:1}))});continue}
  if(!arr.length){const fuzzy=candidates.map(c=>({...c,score:albumNameSimilarity(title,c.name)})).filter(c=>c.score>=0.58&&!existingKeys.has(`${c.source.id}::${normalizeFolderRelPath(c.folderPath||'')}`)).sort((a,b)=>b.score-a.score);const top=[],seen=new Set();for(const c of fuzzy){const sig=`${c.source.id}::${c.folderPath}`;if(seen.has(sig))continue;seen.add(sig);top.push(c);if(top.length>=5)break}if(top.length){ambiguous++;groups.push({albumId:m.id,albumTitle:title,kind:'fuzzy',candidates:top});}else missing++}else if(freshExact.length===0){matchedRows.push(`${title} ← الروابط الحالية محفوظة`)}
 }
 if(matched){normalizeState();await persistSources();await save()}
 const result={matched,missing,ambiguous,errors,needsReview:groups.length>0,groups};
 if(groups.length){if(showReport)albumReviewModal(result);return result}
 if(showReport){modal(`<h2>🔤 مطابقة الألبومات بالأسماء</h2><div class="card"><p>تمت مطابقة <b>${matched}</b> ألبومًا بعد التحقق الفعلي.${missing?`<br>غير مكتمل/غير موجود: <b>${missing}</b>`:''}${errors?`<br>رُفضت اختيارات بلا أي تطابق: <b>${errors}</b>`:''}</p><p class="meta">المجلد لا يُحفظ كرابط إلا إذا أثبت وجود تطابق فعلي. ويمكن للألبوم الواحد الاحتفاظ بعدة مصادر.</p>${matchedRows.length?`<details open><summary>النتائج (${matchedRows.length})</summary><div class="meta" style="margin-top:8px">${matchedRows.slice(0,200).map(esc).join('<br>')}</div></details>`:''}</div><div class="actions"><button class="btn primary" data-action="closeModal">تم</button></div>`)}
 return result;
}

function inferAlbumFolderPath(m){
 if(!m||m.linkFolderPath)return normalizeFolderRelPath(m.linkFolderPath||'');
 const sid=String(m.linkSourceId||'');if(!sid||!Array.isArray(m.photoIds)||!m.photoIds.length)return '';
 const counts=new Map();let usable=0;
 for(const pid of m.photoIds){const p=photos.get(pid);if(!isPhotoRecord(p))continue;const link=photoLocations(p).find(l=>String(l.sourceId)===sid&&l.relPath&&l.verified!==false);if(!link)continue;const rel=normalizeFolderRelPath(link.relPath),parts=rel.split('/').filter(Boolean);if(parts.length<2)continue;const folder=parts.slice(0,-1).join('/');counts.set(folder,(counts.get(folder)||0)+1);usable++}
 if(!usable)return '';
 let best='',bestCount=0;for(const [folder,count] of counts){if(count>bestCount){best=folder;bestCount=count}}
 return bestCount>=2&&bestCount/usable>=0.85?best:'';
}
function buildLinkTargetMap(photoIds=null){
 const excluded=excludedIdSet(),allow=photoIds?new Set(photoIds):null,bySource=new Map(),seenBySource=new Map();
 for(const m of visibleMemories()){
  if(!Array.isArray(m.photoIds))continue;
  const albumLinks=normalizeAlbumLinkFolders(m),mappedSourceId=String(m.linkSourceId||''),mappedFolder=normalizeFolderRelPath(m.linkFolderPath||''),inferredFolder=inferAlbumFolderPath(m);
  for(const pid of m.photoIds){
   if(allow&&!allow.has(pid))continue;const p=photos.get(pid);if(!isPhotoRecord(p)||excluded.has(pid))continue;
   const sourceIds=[...new Set([...albumLinks.map(x=>x.sourceId),p.sourceId,...photoLocations(p).map(l=>l.sourceId),mappedSourceId].filter(Boolean).map(String))];
   for(const sid of sourceIds){const s=sources.find(x=>String(x.id)===sid&&x?.handle);if(!s)continue;const arr=bySource.get(s.id)||[],seen=seenBySource.get(s.id)||new Map();let t=seen.get(pid);if(!t){t={photo:p,albums:[],album:m,folderPath:'',candidates:[]};arr.push(t);seen.set(pid,t)}if(!t.albums.some(x=>x.id===m.id))t.albums.push(m);
    const folders=[];for(const x of albumLinks)if(String(x.sourceId)===String(s.id))folders.push(x.folderPath);if(mappedSourceId===String(s.id)&&mappedFolder)folders.push(mappedFolder);if(!folders.length&&String(p.sourceId)===String(s.id)&&inferredFolder)folders.push(inferredFolder);const unique=[...new Set(folders.map(normalizeFolderRelPath))];if(!unique.length)unique.push('');
    for(const folderPath of unique){const ck=`${String(s.id)}::${folderPath}`;if(!t.candidates.some(c=>c.key===ck))t.candidates.push({key:ck,album:m,folderPath})}
    const deepest=unique.slice().sort((a,b)=>b.split('/').length-a.split('/').length)[0]||'';if(!t.folderPath||deepest.split('/').length>t.folderPath.split('/').length)t.folderPath=deepest;bySource.set(s.id,arr);seenBySource.set(s.id,seen);
   }
  }
 }
 const targetIds=new Set();for(const arr of bySource.values())for(const t of arr)targetIds.add(t.photo.id);return {bySource,eligibleIds:[...targetIds]};
}
function sourceTargets(source,targetMap=null){const arr=(targetMap||buildLinkTargetMap()).bySource.get(source?.id)||[];return [...arr].sort((a,b)=>(b.folderPath||'').split('/').length-(a.folderPath||'').split('/').length)}

function formatElapsed(sec){sec=Math.max(0,Math.floor(sec||0));const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function ensureLinkLiveBar(){const existing=document.getElementById('linkLiveBar');if(existing)return existing;const el=document.createElement('div');el.id='linkLiveBar';el.className='link-live-bar';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.appendChild(el);return el}
function removeLinkLiveBar(){document.getElementById('linkLiveBar')?.remove()}
function updateLinkProgressDom(sourceId){
 const p=linkProgresses[sourceId];if(!p)return;const el=ensureLinkLiveBar();const pct=p.total?Math.min(100,Math.round((p.processed||0)*100/p.total)):0;const elapsed=formatElapsed((((p.status==='done'&&p.finishedAt)?p.finishedAt:Date.now())-(p.runStartedAt||Date.now()))/1000);const remaining=Math.max(0,(p.total||0)-(p.processed||0));
 el.textContent=`${p.status==='running'?'🔗':''} ${p.sourceIndex||1}/${p.sourceCount||sources.length} • ${p.lastName||'بدء…'} • ${p.processed||0}/${p.total||0} (${pct}%) • باقي ${remaining} • ربط ${p.linked||0} • متحقق ${p.verified||0} • تعذر ${p.failed||0} • ${elapsed}`;el.hidden=false;
}
function linkProgressCard(){return ''}
async function persistLinkProgresses(){try{await put('library',{key:'linkProgresses',value:structuredClone(linkProgresses)})}catch(e){console.warn('link progress save failed',e)}}
function markPhotoLinkVerified(p,sourceId,relPath){
 if(!p||!sourceId||!relPath)return false;if(!Array.isArray(p.sourceLinks))p.sourceLinks=photoLocations(p);
 let link=p.sourceLinks.find(x=>String(x.sourceId)===String(sourceId)&&String(x.relPath)===String(relPath));if(!link){link={sourceId:String(sourceId),relPath:String(relPath),name:p.name||'',size:Number(p.size)||0,lastModified:Number(p.lastModified)||0,contentKey:p.contentKey||'',fingerprint:p.fingerprint||'',mimeType:p.mimeType||''};p.sourceLinks.push(link)}
 link.verified=true;link.verifiedAt=Date.now();p.sourceLinks=[...new Map(p.sourceLinks.filter(x=>x?.sourceId&&x?.relPath).map(x=>[`${x.sourceId}::${x.relPath}`,x])).values()];syncPhotoPrimary(p,sourceId,relPath);return true;
}
async function buildDirectFolderIndex(dir,pathBase=''){
 const byName=new Map(),byStem=new Map();let filesSeen=0;
 for await(const [name,entry] of dir.entries()){
  if(entry.kind!=='file'||!isImage(name))continue;filesSeen++;const row={entry,relPath:pathBase?`${pathBase}/${name}`:String(name),name:String(name)};
  const nk=normalizeFileName(name);if(byName.has(nk))byName.set(nk,null);else byName.set(nk,row);
  const sk=normalizeFileStem(name);if(sk){if(byStem.has(sk))byStem.set(sk,null);else byStem.set(sk,row)}
 }
 return {byName,byStem,filesSeen,dir};
}
async function buildRecursiveNameIndex(dir,pathBase,wanted,onProgress){
 const wantedNames=new Set(),wantedStems=new Set(),byName=new Map(),byStem=new Map();for(const t of wanted){const n=normalizeFileName(t.photo?.name),s=normalizeFileStem(t.photo?.name);if(n)wantedNames.add(n);if(s)wantedStems.add(s)}let filesSeen=0;
 async function walk(cur,base=''){
  for await(const [name,entry] of cur.entries()){
   const rel=base?base+'/'+name:name;
   if(entry.kind==='directory'){await walk(entry,rel);continue}
   if(!isImage(name))continue;filesSeen++;const nk=normalizeFileName(name),sk=normalizeFileStem(name);if(!wantedNames.has(nk)&&!wantedStems.has(sk))continue;const row={entry,relPath:pathBase?`${pathBase}/${rel}`:rel,name:String(name)};
   if(byName.has(nk))byName.set(nk,null);else byName.set(nk,row);if(sk){if(byStem.has(sk))byStem.set(sk,null);else byStem.set(sk,row)}
  }
  onProgress?.({filesSeen,candidates:[...new Set([...byName.values(),...byStem.values()].filter(Boolean).map(x=>x.relPath))].length});
 }
 await walk(dir,'');return {byName,byStem,filesSeen};
}
function folderCandidate(target,index){const p=target?.photo;if(!p)return null;const exact=index.byName.get(normalizeFileName(p.name));if(exact)return exact;return index.byStem.get(normalizeFileStem(p.name))||null}
async function resolveDirectory(root,relPath){let dir=root;for(const part of normalizeFolderRelPath(relPath).split('/').filter(Boolean))dir=await dir.getDirectoryHandle(part,{create:false});return dir}
function targetRelVariants(target){const p=target?.photo,out=[],seen=new Set();const add=v=>{v=String(v||'').replace(/^\/+/, '');if(v&&!seen.has(v)){seen.add(v);out.push(v)}};for(const l of photoLocations(p))add(l.relPath);add(p?.relPath);add(p?.name);return out}
async function trySavedPathMatch(target,source){for(const rel of targetRelVariants(target)){try{await resolve(source.handle,rel);return {relPath:normalizeFolderRelPath(rel)}}catch{}}return null}
async function linkTargetAtFolder(target,source,folderPath,indexCache){
 const p=target?.photo;if(!p||!source?.handle)return {hit:null,indexed:0};
 const path=normalizeFolderRelPath(folderPath||'');
 try{
  let dir=indexCache.get(path)?.dir;if(!dir)dir=await resolveDirectory(source.handle,path);
  let entry=indexCache.get(path);
  if(!entry){entry={dir,index:await buildDirectFolderIndex(dir,path)};indexCache.set(path,entry)}
  return {hit:folderCandidate(target,entry.index),indexed:entry.index.filesSeen||0};
 }catch{return {hit:null,indexed:0,error:true}}
}
async function fastLinkOneSource(source,sourceIndex=1,sourceCount=sources.length,targetMap=null,runDone=new Set()){
 if(!source?.handle)return {ok:false,linked:0,verified:0,alreadyLinked:0,failed:0,total:0,missing:[]};
 if(!(await ensureSourcePermission(source,true)))return {ok:false,linked:0,verified:0,alreadyLinked:0,failed:0,total:0,missing:[],permissionDenied:true};
 const targets=sourceTargets(source,targetMap).filter(t=>!runDone.has(t.photo.id));const targetTotal=targets.length;let linked=0,verified=0,alreadyLinked=0,failed=0,processed=0,changed=[],missing=[];
 const stateProgress=linkProgresses[source.id]={...(linkProgresses[source.id]||{}),status:'running',name:sourceLabel(source),sourceIndex,sourceCount,total:targetTotal,processed:0,linked:0,verified:0,failed:0,lastName:'',phase:'prepare',runStartedAt:linkRunStartedAt||Date.now()};await persistLinkProgresses();updateLinkProgressDom(source.id);
 const writeChanged=async(force=false)=>{if(!force&&changed.length<64)return;if(!changed.length)return;const clean=[...new Map(changed.map(x=>[x.id,x])).values()].map(x=>{const m={...x};delete m.thumbBlob;return m});changed=[];await putMany('photos',clean)};
 const publish=async(force=false)=>{stateProgress.processed=processed;stateProgress.linked=linked;stateProgress.verified=verified;stateProgress.failed=failed;stateProgress.updatedAt=Date.now();updateLinkProgressDom(source.id);if(force||processed%128===0)await persistLinkProgresses()};
 const excluded=excludedIdSet(),wanted=[];
 for(const t of targets){const p=t.photo;if(!isPhotoRecord(p)||excluded.has(p.id))continue;const existing=photoLocations(p).find(l=>String(l.sourceId)===String(source.id)&&l.relPath);if(existing?.verified===true&&linkMatchesTargetFolder(existing,t.folderPath)){runDone.add(p.id);processed++;verified++;continue}if(hasOriginalLink(p)){runDone.add(p.id);processed++;alreadyLinked++;continue}wanted.push(t)}
 await publish(true);if(!wanted.length){stateProgress.status='done';stateProgress.phase='done';stateProgress.finishedAt=Date.now();await persistLinkProgresses();updateLinkProgressDom(source.id);return {ok:true,linked,verified,alreadyLinked,failed,total:targetTotal,missing:[],indexedFiles:0,materialized:0};}
 try{
  const groups=new Map();for(const t of wanted){const k=normalizeFolderRelPath(t.folderPath||'');const arr=groups.get(k)||[];arr.push(t);groups.set(k,arr)}
  let indexedFiles=0;
  for(const [folderPath,group] of groups){
   if(scanStopRequested){throw Object.assign(new Error('LINK_STOPPED'),{name:'LinkStopped'})}
   let dir;
   try{dir=await resolveDirectory(source.handle,folderPath)}catch(e){for(const t of group){const p=t.photo;failed++;processed++;missing.push({id:p.id,name:p.name||'',source:sourceLabel(source),folderPath,relPath:p.relPath||'',albums:photoAlbumTitles(p.id),reason:'تعذر الوصول إلى مجلد الألبوم المحدد.'});stateProgress.lastName=p.name||''}await writeChanged();await publish(true);continue}
   stateProgress.folderPath=folderPath;
   let unresolved=[];
   if(!folderPath){
    stateProgress.phase='saved-path';updateLinkProgressDom(source.id);
    const pending=[];for(let i=0;i<group.length;i+=48){
     const chunk=group.slice(i,i+48);
     const hits=await Promise.all(chunk.map(async t=>({t,hit:await trySavedPathMatch(t,source)})));
     for(const {t,hit} of hits){const p=t.photo;if(!isPhotoRecord(p)||excluded.has(p.id))continue;if(hit){const rel=hit.relPath,had=photoLocations(p).some(l=>String(l.sourceId)===String(source.id)&&String(l.relPath)===rel);markPhotoLinkVerified(p,source.id,rel);if(had)verified++;else linked++;runDone.add(p.id);changed.push({...p,sourceLinks:photoLocations(p).map(l=>({...l}))});}else pending.push(t);processed++;stateProgress.lastName=p.name||'';}
     await writeChanged();await publish(true);
    }
    unresolved=pending;
   }else unresolved=[...group];
   if(unresolved.length){
    stateProgress.phase=folderPath?'index-album-folder':'index-source-folder';
    updateLinkProgressDom(source.id);
    const index=await buildDirectFolderIndex(dir,folderPath);indexedFiles+=index.filesSeen;stateProgress.indexedFiles=indexedFiles;
    const folderIndexes=new Map([[normalizeFolderRelPath(folderPath||''),{dir,index}]]);
    const stillUnresolved=[];
    for(const t of unresolved){const p=t.photo;if(!isPhotoRecord(p)||excluded.has(p.id))continue;const row=folderCandidate(t,index);if(row){const rel=String(row.relPath),had=photoLocations(p).some(l=>String(l.sourceId)===String(source.id)&&String(l.relPath)===rel);markPhotoLinkVerified(p,source.id,rel);if(had)verified++;else linked++;runDone.add(p.id);changed.push({...p,sourceLinks:photoLocations(p).map(l=>({...l}))});continue}
      let found=null;for(const c of (t.candidates||[])){const alt=normalizeFolderRelPath(c.folderPath||'');if(alt===normalizeFolderRelPath(folderPath||''))continue;if(runDone.has(p.id))break;const got=await linkTargetAtFolder(t,source,alt,folderIndexes);indexedFiles+=got.indexed;if(got.hit){found=got.hit;const rel=String(got.hit.relPath),had=photoLocations(p).some(l=>String(l.sourceId)===String(source.id)&&String(l.relPath)===rel);markPhotoLinkVerified(p,source.id,rel);if(had)verified++;else linked++;runDone.add(p.id);changed.push({...p,sourceLinks:photoLocations(p).map(l=>({...l}))});break}}
      if(!found)stillUnresolved.push(t);processed++;stateProgress.lastName=p.name||'';if(processed%128===0){await writeChanged();await publish(false)}}
    unresolved=stillUnresolved;
   }
   // Only unresolved names in the best selected folder get a recursive name search.
   if(unresolved.length){
    stateProgress.phase='fallback-subfolders';
    updateLinkProgressDom(source.id);
    try{
     const fb=await buildRecursiveNameIndex(dir,folderPath,unresolved,info=>{
      stateProgress.indexedFiles=indexedFiles+(info.filesSeen||0);
      stateProgress.candidateFiles=info.candidates||0;
      updateLinkProgressDom(source.id);
     });
     for(const t of unresolved){
      const p=t.photo;
      if(!isPhotoRecord(p)||excluded.has(p.id))continue;
      const row=folderCandidate(t,fb);
      if(row){
       const rel=String(row.relPath);
       const had=photoLocations(p).some(l=>String(l.sourceId)===String(source.id)&&String(l.relPath)===rel);
       markPhotoLinkVerified(p,source.id,rel);
       if(had)verified++;else linked++;
       changed.push({...p,sourceLinks:photoLocations(p).map(l=>({...l}))});
      }else{
       failed++;
       missing.push({id:p.id,name:p.name||'',source:sourceLabel(source),folderPath,relPath:p.relPath||'',albums:photoAlbumTitles(p.id),reason:'لم يُعثر على ملف بنفس الاسم أو باسم الملف نفسه مع امتداد مختلف.'});
      }
     }
    }catch(e){
     for(const t of unresolved){
      const p=t.photo;
      if(!isPhotoRecord(p)||excluded.has(p.id))continue;
      failed++;
      missing.push({id:p.id,name:p.name||'',source:sourceLabel(source),folderPath,relPath:p.relPath||'',albums:photoAlbumTitles(p.id),reason:'تعذر استكمال البحث الاحتياطي داخل مجلد الألبوم.'});
     }
    }
   }
   await writeChanged();await publish(false);
  }
  await writeChanged(true);await publish(true);stateProgress.status='done';stateProgress.phase='done';stateProgress.finishedAt=Date.now();stateProgress.processed=processed;stateProgress.linked=linked;stateProgress.verified=verified;stateProgress.failed=failed;stateProgress.indexedFiles=indexedFiles;await persistLinkProgresses();updateLinkProgressDom(source.id);return {ok:true,linked,verified,alreadyLinked,failed,total:targetTotal,missing,indexedFiles,materialized:0};
 }catch(e){stateProgress.status=e?.name==='LinkStopped'?'paused':'error';stateProgress.phase=stateProgress.status;stateProgress.error=String(e?.message||e);stateProgress.finishedAt=Date.now();await writeChanged(true).catch(()=>{});await persistLinkProgresses().catch(()=>{});updateLinkProgressDom(source.id);if(e?.name==='LinkStopped'){return {ok:false,stopped:true,linked,verified,alreadyLinked,failed,total:targetTotal,missing}}throw e}
}

let linkWakeLock=null,linkWakeLockVisibilityHandler=null;
async function acquireLinkWakeLock(){try{if(navigator.wakeLock?.request){if(linkWakeLock?.released===false)return linkWakeLock;linkWakeLock=await navigator.wakeLock.request('screen');return linkWakeLock}return null}catch{return null}}

async function linkAllSources(skipMatch=false){
 if(scanLock||busy){toast('هناك عملية أخرى تعمل حاليًا.');return}
 manualLinkSession={cancelled:false,history:[]};
 if(!skipMatch){const match=await matchAlbumsByName(false,true);if(match.needsReview){albumReviewModal(match);return}}
 const targetMap=buildLinkTargetMap(),workSources=sources.filter(s=>s?.handle&&(targetMap.bySource.get(s.id)||[]).length);
 if(!workSources.length){showManualLinkNext();return}
 scanLock=true;busy=true;linkRunStartedAt=Date.now();const allMissing=[],runDone=new Set();let done=0,totalLinked=0,totalVerified=0,totalAlreadyLinked=0,totalFailed=0,totalTargets=0,sourceErrors=[],sourceSummaries=[];
 linkWakeLockVisibilityHandler=async()=>{if(document.visibilityState==='visible'&&scanLock){try{linkWakeLock=await acquireLinkWakeLock()}catch{}}};document.addEventListener('visibilitychange',linkWakeLockVisibilityHandler);try{linkWakeLock=await acquireLinkWakeLock()}catch{}
 try{
  for(let i=0;i<workSources.length;i++){const source=workSources[i];try{const r=await fastLinkOneSource(source,i+1,workSources.length,targetMap,runDone);if(r.stopped){toast('تم إيقاف الربط بعد حفظ ما تم إنجازه.');break}if(r.ok){done++;totalLinked+=r.linked;totalVerified+=r.verified;totalAlreadyLinked+=r.alreadyLinked||0;totalFailed+=r.failed;totalTargets+=r.total;allMissing.push(...r.missing);sourceSummaries.push({id:source.id,name:sourceLabel(source),targets:r.total||0,matched:(r.linked||0)+(r.verified||0),linked:r.linked||0,verified:r.verified||0,alreadyLinked:r.alreadyLinked||0,failed:r.failed||0,filesScanned:r.indexedFiles||0})}else if(r.permissionDenied){sourceErrors.push({id:source.id,name:sourceLabel(source),error:'لم يُمنح إذن قراءة المصدر.'});sourceSummaries.push({id:source.id,name:sourceLabel(source),targets:0,matched:0,linked:0,verified:0,alreadyLinked:0,failed:0,filesScanned:0,error:'لم يُمنح إذن قراءة المصدر.'})}}catch(e){sourceErrors.push({id:source.id,name:sourceLabel(source),error:String(e?.message||e)});sourceSummaries.push({id:source.id,name:sourceLabel(source),targets:0,matched:0,linked:0,verified:0,alreadyLinked:0,failed:0,filesScanned:0,error:String(e?.message||e)});toast(`⚠️ تعذر «${sourceLabel(source)}»؛ تم تخطيه والانتقال للمصدر التالي.`)}}
  const eligibleIds=new Set(targetMap.eligibleIds.filter(pid=>isPhotoRecord(photos.get(pid))&&!excludedIdSet().has(pid))),missingMap=new Map();for(const x of allMissing)missingMap.set(x.id||`${x.source}|${x.relPath}|${x.folderPath||''}`,x);
  for(const pid of eligibleIds){const p=photos.get(pid);if(isPhotoRecord(p)&&!hasOriginalLink(p)){const loc=photoLocations(p)[0]||{};missingMap.set(pid,{id:pid,name:p.name||'',source:sourceLabel(sources.find(s=>s.id===loc.sourceId)),relPath:p.relPath||loc.relPath||'',albums:photoAlbumTitles(pid),reason:'لم يُربط أصل متاح من الأهداف الحالية.'})}}
  const missing=[...missingMap.values()].filter(x=>{const p=photos.get(x.id);return !p||!hasOriginalLink(p)}),totalPhotos=eligibleIds.size,linkedPhotos=totalPhotos-missing.length;
  lastLinkReport={createdAt:Date.now(),sourcesCount:sources.length,doneSources:done,totalPhotos,linkedPhotos,newlyLinked:totalLinked,verified:totalVerified,alreadyLinked:totalAlreadyLinked,failed:totalFailed,totalTargets,sourceErrors,sourceSummaries,missing};await put('library',{key:'lastLinkReport',value:structuredClone(lastLinkReport)});await persistLinkProgresses();renderNoAnim(true);removeLinkLiveBar();
  if(missing.length){showManualLinkNext();}else{linkReportModal(lastLinkReport)}
 }catch(e){console.error(e);toast('حدث خطأ في تقرير الربط؛ النتائج المحفوظة لا تضيع.');await persistLinkProgresses().catch(()=>{})}
 finally{if(linkWakeLockVisibilityHandler){document.removeEventListener('visibilitychange',linkWakeLockVisibilityHandler);linkWakeLockVisibilityHandler=null}try{await linkWakeLock?.release?.()}catch{}linkWakeLock=null;scanLock=false;busy=false;linkRunStartedAt=0;setTimeout(removeLinkLiveBar,700)}
}

async function orderLinked(){const ms=[...visibleMemories()].sort((a,b)=>originalCoverage(b)-originalCoverage(a));ms.forEach((m,i)=>m.order=i);state.settings.albumOrderMode='linked';albumBookIndex=0;await save();renderNoAnim();toast('تم ترتيب الألبومات حسب نسبة الأصول الأصلية المكتشفة.')}
function hasUserWrittenContent(m){return !!(m?.date||m?.endDate||m?.place||m?.description||m?.userEdited||(m?.title&&m?.album&&m.title!==m.album))}
function cleanupEmptyAutoAlbums(){const before=state.memories.length;state.memories=state.memories.filter(m=>{const hasPhoto=(m.photoIds||[]).some(pid=>isPhotoRecord(photos.get(pid))); if(m.autoAlbum===true&&!hasPhoto&&!hasUserWrittenContent(m))return false;return true});return before-state.memories.length}

async function hideMemory(i){const m=state.memories.find(x=>x.id===i);if(!m)return;if(!confirm(`إخفاء «${m.title||'هذه الذكرى'}»؟
لن تُحذف الذكرى أو صورها الأصلية.`))return;m.hidden=true;await save();selectedPhotos.clear();currentMemoryId=null;toast('تم إخفاء الذكرى/المجلد دون حذف أي بيانات.');renderNoAnim()}
function selectAllMemories(){const q=(pageMemories.q||'').toLowerCase();for(const m of visibleMemories()){if(!q||[m.title,m.date,m.endDate,m.place,m.description,m.album].join(' ').toLowerCase().includes(q))selectedMemories.add(m.id)}renderNoAnim()}
function clearMemorySelection(){selectedMemories.clear();renderNoAnim()}
async function hideSelectedMemories(){const ms=state.memories.filter(m=>selectedMemories.has(m.id)&&!m.hidden);if(!ms.length){toast('حدد ألبومًا أو ذكرى واحدة على الأقل.');return}if(!confirm(`إخفاء ${ms.length} ألبوم/ذكرى محددة؟\nلن تُحذف أي بيانات أو صور أصلية.`))return;for(const m of ms)m.hidden=true;selectedMemories.clear();await save();toast(`تم إخفاء ${ms.length} ألبوم/ذكرى دون حذفها.`);renderNoAnim()}
async function mergeSelectedMemories(){const ms=state.memories.filter(m=>selectedMemories.has(m.id)&&!m.hidden);if(!ms.length){toast('حدد ألبومًا أو ذكرى واحدة على الأقل.');return}const ids=[...new Set(ms.flatMap(m=>m.photoIds||[]))].filter(pid=>isPhotoRecord(photos.get(pid)));if(!ids.length){toast('الذكريات المحددة لا تحتوي صورًا ظاهرة.');return}const suggested=ms.length===1?(ms[0].album||ms[0].title||'ألبوم جديد'):`ألبوم ${today()}`;const title=prompt('اسم الألبوم الواحد الجديد:',suggested);if(!title?.trim())return;const clean=title.trim();if(state.memories.some(m=>!selectedMemories.has(m.id)&&String(m.title||'').trim()===clean&&!m.hidden)){toast('يوجد ألبوم ظاهر بهذا الاسم بالفعل.');return}const t={id:id('mem'),title:clean,date:'',endDate:'',place:'',description:'',album:clean,autoAlbum:false,photoIds:ids};state.memories.unshift(t);for(const m of ms)m.hidden=true;for(const pid of ids){const p=photos.get(pid);if(p){p.manualAlbum=true;p.autoAlbum=false;p.layoutLocked=true;p.album=clean;await savePhoto(p)}}selectedMemories.clear();await save();toast(`تم جمع ${ids.length} صورة في ألبوم «${clean}». الذكريات الأصلية أُخفيت فقط ولم تُحذف.`);renderNoAnim()}
async function unhideMemory(i){const m=state.memories.find(x=>x.id===i);if(!m)return;m.hidden=false;await save();toast('تم إظهار الذكرى/المجلد مرة أخرى.');renderNoAnim()}
function hiddenMemories(){const hs=state.memories.filter(m=>m.hidden);modal(`<h2>الذكريات والمجلدات المخفية</h2>${hs.length?`<div class="cards">${hs.map(m=>`<div class="card"><h3>${esc(m.title||'ذكرى')}</h3><div class="meta">${esc(rangeLabel(m))}${m.album?' • مجلد: '+esc(m.album):''}</div><div class="actions"><button class="btn small primary" data-action="unhideMemory" data-id="${m.id}">إظهار</button></div></div>`).join('')}</div>`:`<div class="empty">لا توجد ذكريات أو مجلدات مخفية.</div>`}<div class="actions"><button class="btn" data-action="closeModal">إغلاق</button></div>`)}
async function shareMemory(i){const m=state.memories.find(x=>x.id===i);if(!m)return;if(!navigator.share||!navigator.canShare){toast('مشاركة الملفات غير مدعومة في هذا المتصفح. استخدم Chrome على Android.');return}const ids=selectedPhotos.size?[...selectedPhotos]:photoFor(m).map(p=>p.id);if(!ids.length){try{await navigator.share({title:m.title||'ذكرى من OsRa',text:rangeLabel(m)+(m.description?'\n'+m.description:'')})}catch(e){if(e?.name!=='AbortError')toast('تعذر فتح المشاركة.')}return}toast(`جارٍ تجهيز ${ids.length} صورة للمشاركة…`);const files=[];for(const pid of ids){const p=photos.get(pid);if(!p)continue;try{const hit=await findOriginalFile(p,true);if(!hit)continue;const f=hit.file;files.push(new File([f],p.name||f.name,{type:f.type||'application/octet-stream',lastModified:f.lastModified}))}catch(e){console.warn('share file skipped',pid,e)}}if(!files.length){toast('تعذر فتح الصور الأصلية من المجلدات المرتبطة. تحقق من إذن المجلد ثم أعد المحاولة.');return}const data={files,title:m.title||'ذكرى من OsRa',text:rangeLabel(m)};if(!navigator.canShare({files})){toast('الجهاز لا يقبل مشاركة هذه المجموعة كاملة. جرّب تحديد عدد أقل من الصور.');return}try{await navigator.share(data);toast('تم إرسال الصور إلى قائمة المشاركة.')}catch(e){if(e?.name!=='AbortError')toast('تعذر إتمام المشاركة.')}}
function duplicateResultsRender(info){const groups=duplicateModalGroups;const html=groups.map((g,gi)=>`<div class="card duplicate-group"><div class="meta">مجموعة ${gi+1} • ${g.items.length} صور • ${esc(g.evidence)}</div><div class="duplicate-grid">${g.items.map(p=>{const al=photoVisibleAlbums(p.id).map(a=>a.title).join('، ');return `<div class="duplicate-item"><div class="duplicate-preview"><img data-thumb="${p.id}" alt="${esc(p.name)}">${hasOriginalLink(p)?'<span class="original-linked">✓</span>':''}</div><b>${esc(p.name||'صورة')}</b><small class="meta">${esc(al||'بدون ألبوم')} • ${Math.round((p.size||0)/1024)} KB • ${originalLinkCount(p)} أصل</small><button class="btn small primary" data-action="chooseDuplicateKeeper" data-group="${gi}" data-keeper="${p.id}">⭐ الاحتفاظ بهذه النسخة</button></div>`}).join('')}</div><p class="meta">لا يوجد حذف تلقائي. اختر النسخة التي ستبقى ثم حدّد الألبوم/الألبومات الظاهرة التي ستبقى فيها.</p></div>`).join('');modal(`<h2>🔎 نتيجة مراجعة التكرارات</h2><p>حلّل OsRa <b>${info.total}</b> صورة: <b>${info.exactCount}</b> مجموعة تطابق قوي + <b>${info.visualCount}</b> مجموعة تطابق بصري قوي.${info.missingCount?` لم تتوفر مصغرات لـ <b>${info.missingCount}</b> صورة، لذلك لم تدخل الفحص البصري.`:''}</p>${groups.length?html:`<div class="empty">لم يجد OsRa تكرارات قوية بالمعايير الحالية.</div>`}<div class="actions"><button class="btn" data-action="closeModal">إغلاق دون تعديل</button></div>`);hydrate()}
function duplicateChoiceModal(groupIndex,keeperId){const group=duplicateModalGroups[groupIndex],keeper=group?.items?.find(p=>p.id===keeperId);if(!keeper)return;const albums=duplicateGroupAlbums(group),keepIds=new Set(photoVisibleAlbums(keeper.id).map(a=>a.id)),choices=albums.map(a=>`<label class="card" style="display:block;cursor:pointer"><input class="dup-album-target" type="checkbox" data-album="${esc(a.id)}" ${keepIds.has(a.id)?'checked':''}> <b>📁 ${esc(a.title)}</b></label>`).join('');duplicatePendingChoice={groupIndex,keeperId};modal(`<h2>اختيار النسخة والألبوم</h2><p>النسخة المحتفظ بها: <b>${esc(keeper.name||'الصورة')}</b>. لن يُحذف أي أصل من الهاتف.</p><p class="meta">اختر الألبومات الظاهرة التي يجب أن تبقى فيها هذه النسخة. العضويات داخل ألبومات مخفية تُحافظ عليها OsRa.</p><div class="duplicate-choice-grid">${choices||'<div class="empty">لا توجد ألبومات ظاهرة لهذه المجموعة.</div>'}</div><div class="actions"><button class="btn primary" data-action="applyDuplicateChoice">⭐ الاحتفاظ بهذه وتنفيذ الدمج</button><button class="btn" data-action="closeModal">إلغاء</button></div>`)}
function duplicateGroupAlbums(group){const seen=new Map();for(const p of group.items)for(const a of photoVisibleAlbums(p.id))if(!seen.has(a.id))seen.set(a.id,a);return [...seen.values()]}
function photoVisibleAlbums(pid){const out=[];for(const m of state.memories){if(m.hidden||!Array.isArray(m.photoIds)||!m.photoIds.includes(pid))continue;out.push({id:m.id,title:m.title||m.album||'ألبوم'})}return out}
async function setDuplicateVisibleAlbums(keeperId,albumIds){const allowed=new Set(albumIds);for(const m of state.memories){if(m.hidden||!Array.isArray(m.photoIds))continue;const has=m.photoIds.includes(keeperId),want=allowed.has(m.id);if(want&&!has)m.photoIds.push(keeperId);else if(!want&&has)m.photoIds=m.photoIds.filter(pid=>pid!==keeperId)}}
async function applyDuplicateChoice(){const pending=duplicatePendingChoice;if(!pending)return;const sel=[...document.querySelectorAll('.dup-album-target:checked')].map(x=>x.dataset.album).filter(Boolean),group=duplicateModalGroups[pending.groupIndex],keep=group?.items?.find(p=>p.id===pending.keeperId),live=group?.items?.map(x=>photos.get(x.id)).filter(Boolean).filter(x=>x.id!==pending.keeperId)||[];if(!keep||!live.length){toast('المجموعة لم تعد كما ظهرت. أعد المراجعة.');return}if(duplicateGroupAlbums(group).length&&!sel.length){toast('اختر ألبومًا واحدًا على الأقل، أو ألغِ العملية.');return}if(!confirm(`الاحتفاظ بـ «${keep.name||'الصورة'}» ودمج ${live.length} سجل؟\nلن يُحذف أي أصل من الهاتف.`))return;await mergeDuplicateRecords(live,keep);await setDuplicateVisibleAlbums(keep.id,sel);await save();duplicatePendingChoice=null;toast(`تم دمج ${live.length} سجل مع النسخة المختارة دون حذف الأصول الأصلية.`);await duplicateStartScan()}
async function mergeDuplicateRecords(dups,keep){if(!Array.isArray(dups)||!keep)return;for(const dup of dups){const links=[...photoLocations(keep),...photoLocations(dup)],seen=new Set();keep.sourceLinks=links.filter(l=>{const k=`${l.sourceId}::${l.relPath}`;if(seen.has(k))return false;seen.add(k);return true});syncPhotoPrimary(keep,keep.sourceId,keep.relPath);if(!keep.thumbBlob){const dbThumb=await getThumbBlob(dup.id);if(dbThumb){keep.thumbBlob=dbThumb;keep.thumbVersion=dup.thumbVersion||THUMB_VERSION}}keep.capturedAt=keep.capturedAt||dup.capturedAt;keep.fingerprint=keep.fingerprint||dup.fingerprint;keep.contentKey=keep.contentKey||dup.contentKey;keep.manualAlbum=keep.manualAlbum||dup.manualAlbum;keep.autoAlbum=keep.autoAlbum&&dup.autoAlbum;keep.layoutLocked=keep.layoutLocked||dup.layoutLocked;for(const m of state.memories){if(!Array.isArray(m.photoIds)||!m.photoIds.includes(dup.id))continue;const idx=m.photoIds.indexOf(dup.id);if(m.hidden&&!m.photoIds.includes(keep.id))m.photoIds.splice(Math.max(0,Math.min(idx,m.photoIds.length)),0,keep.id);m.photoIds=m.photoIds.filter((pid,i,a)=>pid!==dup.id&&a.indexOf(pid)===i)}await savePhoto(keep);photos.set(keep.id,keep);photos.delete(dup.id);duplicateSignatureCache.delete(dup.id);await deletePhotoRecord(dup.id)}}
async function mergeDuplicate(duplicateId,keeperId){const dup=photos.get(duplicateId),keep=photos.get(keeperId);if(!dup||!keep)return;if(!confirm(`دمج السجل الزائد في الصورة المحتفظ بها؟\nلن يُحذف الأصل من الهاتف.`))return;await mergeDuplicateRecords([dup],keep);await save();toast('تم دمج السجلين داخل صورة واحدة دون حذف الأصل من الهاتف.');await duplicateStartScan()}
function dailyAlbumsManager(){const ms=visibleMemories().filter(m=>photoFor(m).length>0),current=state.settings.dailyAlbumIds,checked=current===null?new Set(ms.map(m=>m.id)):new Set(current);modal(`<h2>ألبومات صورة اليوم ✨</h2><p class="note">اختر الألبومات الظاهرة التي تأتي منها صورة اليوم العشوائية. المخفي والمستبعد لا يدخلان.</p><div class="actions"><button class="btn small" data-action="dailySelectAll">☑ تحديد الكل</button><button class="btn small" data-action="dailyClearAll">مسح الكل</button></div><div class="cards" style="margin-top:12px">${ms.length?ms.map(m=>`<label class="card" style="display:block;cursor:pointer"><input class="daily-album-select" type="checkbox" data-memory="${m.id}" ${checked.has(m.id)?'checked':''}> <b>${esc(m.title||'ذكرى بدون اسم')}</b><div class="meta">${photoFor(m).length} صورة</div></label>`).join(''):`<div class="empty">لا توجد ألبومات ظاهرة بها صور بعد.</div>`}</div><div class="actions"><button class="btn primary" data-action="saveDailyAlbums">حفظ الاختيار</button><button class="btn" data-action="closeModal">إلغاء</button></div>`)}
function dailySelectAll(){document.querySelectorAll('.daily-album-select').forEach(x=>x.checked=true)}
function dailyClearAll(){document.querySelectorAll('.daily-album-select').forEach(x=>x.checked=false)}
async function saveDailyAlbums(){const ids=[...document.querySelectorAll('.daily-album-select:checked')].map(x=>x.dataset.memory).filter(Boolean);state.settings.dailyAlbumIds=ids;await save();closeModal();toast(ids.length?`تم تحديد ${ids.length} ألبوم لصورة اليوم.`:'تم تعطيل صورة اليوم حتى تختار ألبومات.');renderNoAnim()}
function romanticHeartTransition(kind='open'){const layer=document.createElement('div');layer.className='heart-burst heart-gate '+(kind==='close'?'is-closing':'');const left=document.createElement('div'),right=document.createElement('div'),spark=document.createElement('div');left.className='heart-half heart-half-left';right.className='heart-half heart-half-right';left.innerHTML='♥';right.innerHTML='♥';spark.className='heart-spark';spark.textContent='✦';layer.append(left,right,spark);for(let i=0;i<8;i++){const h=document.createElement('span');h.textContent=['·','♥','✦','·'][i%4];h.className='burst-heart side-'+(i%2?'right':'left');h.style.setProperty('--i',i);h.style.setProperty('--delay',`${i*22}ms`);layer.appendChild(h)}document.body.appendChild(layer);setTimeout(()=>layer.remove(),1350)}

async function chooseBackup(){if(!window.showSaveFilePicker){toast('اختيار مكان ثابت غير مدعوم في هذا المتصفح؛ استخدم Chrome حديث على Android وسيظهر التنزيل العادي كبديل.');return false}try{const h=await window.showSaveFilePicker({suggestedName:`OsRa_Backup_${today()}.json`,types:[{description:'OsRa Backup',accept:{'application/json':['.json']}}],excludeAcceptAllOption:false});backupFileHandle=h;const text=JSON.stringify(await backupPayloadForExport(),null,2);const w=await h.createWritable();await w.write(text);await w.close();backupMeta={lastSavedAt:Date.now(),lastAutoFileAt:Date.now()};await put('library',{key:'backup',handle:h,name:h.name,lastSavedAt:backupMeta.lastSavedAt,lastAutoFileAt:backupMeta.lastAutoFileAt});toast('تم تحديد مكان النسخة وحفظها بنجاح.');renderNoAnim();return true}catch(e){if(e?.name==='AbortError')toast('تم إلغاء اختيار مكان النسخة الاحتياطية.');else{console.error(e);toast('تعذر حفظ النسخة في الملف المحدد.')}return false}}
async function replacePhotoSnapshot(manifest){
 const list=Array.isArray(manifest)?manifest:[],old=new Map(photos),rebuilt=new Map(),keepThumbIds=new Set(list.map(x=>x.id));
 await new Promise((resolve,reject)=>{const tx=db.transaction(['photos','thumbs'],'readwrite'),st=tx.objectStore('photos'),ts=tx.objectStore('thumbs');for(const id of old.keys())if(!keepThumbIds.has(id))ts.delete(id);st.clear();for(const p0 of list){const p=old.get(p0.id)||{},blob=p0.thumb?base64ToBlob(p0.thumb):null,merged={...p0,excluded:false,layoutLocked:!!p0.layoutLocked,thumbBlob:null,thumbVersion:p0.thumbVersion||THUMB_VERSION};merged.sourceLinks=Array.isArray(p0.sourceLinks)?p0.sourceLinks:normalizePhotoLinks(merged);delete merged.thumb;delete merged.thumbBlob;st.put(merged);if(blob)ts.put({id:merged.id,blob,version:merged.thumbVersion});rebuilt.set(merged.id,merged)}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('photo snapshot restore failed'));tx.onabort=()=>reject(tx.error||new Error('photo snapshot restore aborted'))});
 photos=rebuilt;
}
function applyBackupPayload(x){const incoming=x||{},arrayKeys=['memories','events','dreams','verses','prayers','messages','excludedPhotos'],next=structuredClone(state);for(const k of arrayKeys)if(Array.isArray(incoming[k]))next[k]=structuredClone(incoming[k]);if(incoming.settings&&typeof incoming.settings==='object')next.settings={...structuredClone(next.settings||DEFAULT.settings),...structuredClone(incoming.settings)};state=next;normalizeState()}
async function restoreLocalRecovery(){if(!recoveryCandidate)return;if(scanLock){toast('أوقف الفحص الحالي قبل الاسترجاع ثم أعد المحاولة.');return}if(!confirm(`استعادة نسخة الأمان المحلية بتاريخ ${recoveryLabel(recoveryCandidate)}؟\nلن تُحذف الصور الأصلية من الجهاز.`))return;try{clearTimeout(safetyTimer);await clearScanProgress();await snapshotBeforeRestore();const x=structuredClone(recoveryCandidate);applyBackupPayload(x);if(Array.isArray(x.photoManifest))await replacePhotoSnapshot(x.photoManifest);await saveMainExact();await del('library','recoveryNoticeHidden');soundOn=!!state.settings.soundEnabled;recoveryCandidate=null;updateSoundButton();toast('تمت استعادة بيانات OsRa من النسخة المحلية.');renderNoAnim()}catch(e){console.error(e);toast('تعذرت استعادة النسخة المحلية.')}}
async function saveMainExact(){await put('state',{key:'main',value:state})}
async function snapshotBeforeRestore(){await put('state',{key:'preRestoreBackup',value:backupPayload(),savedAt:Date.now()})}
async function writeBackupToHandle(forcePrompt=false){if(!backupFileHandle)return false;try{let q=await backupFileHandle.queryPermission({mode:'readwrite'});if(q!=='granted'&&forcePrompt)q=await backupFileHandle.requestPermission({mode:'readwrite'});if(q!=='granted')return false;const w=await backupFileHandle.createWritable();await w.write(JSON.stringify(await backupPayloadForExport(),null,2));await w.close();backupMeta.lastSavedAt=Date.now();backupMeta.lastAutoFileAt=Date.now();await put('library',{key:'backup',handle:backupFileHandle,name:backupFileHandle.name,lastSavedAt:backupMeta.lastSavedAt,lastAutoFileAt:backupMeta.lastAutoFileAt});return true}catch(e){console.warn('file backup failed',e);return false}}
async function backup(){if(window.showSaveFilePicker){if(await writeBackupToHandle(true)){toast('تم تحديث النسخة الاحتياطية في مكانها المحفوظ.');renderNoAnim();return}if(await chooseBackup())return}const payload=await backupPayloadForExport(),a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.href=u;a.download='OsRa_Backup_'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);toast('تم تنزيل ملف النسخة الاحتياطية.')}
async function maybeAutoFileBackup(){if(!backupFileHandle)return;const week=7*24*60*60*1000;if(Date.now()-(backupMeta.lastAutoFileAt||0)<week)return;const ok=await writeBackupToHandle(false);if(ok){toast('تم تحديث النسخة الاحتياطية الدورية تلقائيًا.')}else{console.info('Automatic file backup skipped: permission needs user action.')}}
async function restoreSafety(){try{if(scanLock){toast('أوقف الفحص الحالي قبل الاسترجاع ثم أعد المحاولة.');return}const s=await get('state','safetyBackup');if(!s?.value){toast('لا توجد نسخة أمان محلية بعد.');return}if(!confirm('استرجاع آخر نسخة أمان محلية؟\nسيعود OsRa إلى تلك اللحظة، ولن تُحذف الصور الأصلية من الجهاز.'))return;clearTimeout(safetyTimer);await clearScanProgress();const x=s.value;if(x.app!=='OsRa')throw 0;await snapshotBeforeRestore();applyBackupPayload(x);if(Array.isArray(x.photoManifest))await replacePhotoSnapshot(x.photoManifest);await saveMainExact();soundOn=!!state.settings.soundEnabled;updateSoundButton();toast('تم استرجاع نسخة الأمان المحلية بالكامل.');renderNoAnim()}catch(e){console.error(e);toast('تعذر استرجاع نسخة الأمان المحلية.')}}
async function mergeBackupPayload(x){
 if(scanLock){toast('أوقف الفحص الحالي قبل دمج النسخة الاحتياطية ثم أعد المحاولة.');return}
 if(x?.app!=='OsRa'||!Array.isArray(x.memories))throw new Error('invalid backup');
 await clearScanProgress();await snapshotBeforeRestore();
 const mergeArray=(local,incoming)=>{const map=new Map((local||[]).map(v=>[v.id,v]));for(const v of (incoming||[])){if(v?.id)map.set(v.id,structuredClone(v));}return [...map.values()]};
 state.settings={...state.settings,...(x.settings||{})};
 state.memories=mergeArray(state.memories,x.memories);state.events=mergeArray(state.events,x.events);state.dreams=mergeArray(state.dreams,x.dreams);state.verses=mergeArray(state.verses,x.verses);state.prayers=mergeArray(state.prayers,x.prayers);state.messages=mergeArray(state.messages,x.messages);state.excludedPhotos=mergeArray(state.excludedPhotos,x.excludedPhotos);normalizeState();
 const manifest=Array.isArray(x.photoManifest)?x.photoManifest:[],byContent=new Map(),byFingerprint=new Map();
 for(const p of photos.values()){if(p.contentKey){const a=byContent.get(p.contentKey)||[];a.push(p);byContent.set(p.contentKey,a)}if(p.fingerprint){const a=byFingerprint.get(p.fingerprint)||[];a.push(p);byFingerprint.set(p.fingerprint,a)}}
 const idRemap=new Map();
 for(const p0 of manifest){
  let target=photos.get(p0.id)||null;
  if(target&&p0.contentKey&&target.contentKey&&target.contentKey!==p0.contentKey)target=null;
  if(!target&&p0.contentKey){const c=byContent.get(p0.contentKey)||[];target=c.length?pickCanonicalPhoto(c):null}
  if(!target&&p0.fingerprint){const c=(byFingerprint.get(p0.fingerprint)||[]);if(c.length===1)target=c[0]}
  let finalId=target?.id||p0.id;
  if(!target&&photos.has(finalId)){finalId=id('ph')}
  const old=target||{};
  const importedThumb=base64ToBlob(p0.thumb);
  const merged={...p0,...old,id:finalId,excluded:false,layoutLocked:!!(old.layoutLocked||p0.layoutLocked),thumbBlob:old.thumbBlob||importedThumb||p0.thumbBlob||null,thumbVersion:old.thumbVersion||p0.thumbVersion||THUMB_VERSION,name:old.name||p0.name||'',album:old.album||p0.album||'',manualAlbum:!!(old.manualAlbum||p0.manualAlbum),autoAlbum:old.autoAlbum===undefined?(p0.autoAlbum!==false):old.autoAlbum,addedAt:old.addedAt||p0.addedAt||Date.now(),capturedAt:old.capturedAt||p0.capturedAt||'',contentKey:old.contentKey||p0.contentKey||'',fingerprint:old.fingerprint||p0.fingerprint||'',sourceId:old.sourceId||p0.sourceId||'',relPath:old.relPath||p0.relPath||''};
  const links=[...photoLocations(old),...(Array.isArray(p0.sourceLinks)?p0.sourceLinks:normalizePhotoLinks(p0))],seen=new Set();merged.sourceLinks=links.filter(l=>{const k=`${l.sourceId}::${l.relPath}`;if(!l.sourceId||!l.relPath||seen.has(k))return false;seen.add(k);return true});if(!merged.sourceLinks.length)merged.sourceLinks=normalizePhotoLinks(merged);syncPhotoPrimary(merged,merged.sourceId,merged.relPath);delete merged.thumb;
  photos.set(finalId,merged);await savePhoto(merged);idRemap.set(p0.id,finalId);
  if(merged.contentKey){const a=byContent.get(merged.contentKey)||[];if(!a.some(p=>p.id===finalId))a.push(merged);byContent.set(merged.contentKey,a)}
  if(merged.fingerprint){const a=byFingerprint.get(merged.fingerprint)||[];if(!a.some(p=>p.id===finalId))a.push(merged);byFingerprint.set(merged.fingerprint,a)}
 }
 if(idRemap.size){for(const m of state.memories){if(!Array.isArray(m.photoIds))continue;m.photoIds=[...new Set(m.photoIds.map(pid=>idRemap.get(pid)||pid))]}}
 normalizeState();await saveMainExact();toast('تم دمج النسخة الاحتياطية مع حفظ الذكريات والألبومات والمعاينات. اربط/أضف مجلدات الصور ثم استخدم «ربط الأصول في كل المجلدات» لبحث الأصول داخل المجلدات المسموح بها دون إضافة صور جديدة.');renderNoAnim();
}
function restoreMerge(){const i=document.createElement('input');i.type='file';i.accept='.json,application/json';i.onchange=async()=>{try{const f=i.files?.[0];if(!f)return;const x=JSON.parse(await f.text());const stamp=x.exportedAt?new Date(x.exportedAt):null;const when=stamp&&!isNaN(stamp)?stamp.toLocaleString('ar-EG'):'وقت غير معروف';const n=Array.isArray(x.photoManifest)?x.photoManifest.length:0;if(!confirm(`دمج نسخة OsRa المحفوظة في:
${when}

سيتم الاحتفاظ بكل ما هو موجود على هذا الجهاز، وإضافة/تحديث بيانات النسخة فقط.
سجلات الصور: ${n}

لن تُحذف الصور الأصلية من الجهاز.`))return;await mergeBackupPayload(x)}catch(e){console.error(e);toast('ملف النسخة الاحتياطية غير صالح أو تالف.')}};i.click()}
function restore(){const i=document.createElement('input');i.type='file';i.accept='.json,application/json';i.onchange=async()=>{try{const f=i.files?.[0];if(!f)return;const x=JSON.parse(await f.text());if(x.app!=='OsRa'||!Array.isArray(x.memories))throw 0;const stamp=x.exportedAt?new Date(x.exportedAt):null;const when=stamp&&!isNaN(stamp)?stamp.toLocaleString('ar-EG'):'وقت غير معروف';const photoCount=Array.isArray(x.photoManifest)?x.photoManifest.length:0;if(!confirm(`استرجاع نسخة OsRa المحفوظة في:\n${when}

الذكريات: ${x.memories.length}
سجلات الصور في تلك اللحظة: ${photoCount}

سيتم إعادة OsRa إلى هذه اللحظة فقط. سجلات الصور التي أُضيفت بعد النسخة ستختفي من فهرس OsRa، لكن الصور الأصلية نفسها لن تُحذف من الجهاز.
ستُحفظ نسخة أمان من الحالة الحالية قبل الاسترجاع.`))return;if(scanLock){toast('أوقف الفحص الحالي قبل الاسترجاع ثم أعد المحاولة.');return}clearTimeout(safetyTimer);await clearScanProgress();await snapshotBeforeRestore();applyBackupPayload(x);if(Array.isArray(x.photoManifest))await replacePhotoSnapshot(x.photoManifest);await saveMainExact();soundOn=!!state.settings.soundEnabled;updateSoundButton();selectedMemories.clear();selectedPhotos.clear();toast(`تم الاسترجاع كما كان في ${when}، وتم الحفاظ على ترتيب الألبومات. على الهاتف الآخر اربط مجلد الصور أو مصدر HQ من الإعدادات.`);renderNoAnim()}catch(e){console.error(e);toast('ملف النسخة الاحتياطية غير صالح أو تالف.')}};i.click()}
async function diagnostic(){const secure=!!isSecureContext,picker=!!window.showDirectoryPicker;let activePerm='لا يوجد مجلد';const active=activeSource();if(active)try{activePerm=await active.handle.queryPermission({mode:'read'})}catch{}const e=await navigator.storage?.estimate?.();const rows=sources.map((x,i)=>{const cp=scanProgresses[x.id];return `<div class="card"><b>${i===0?'⭐ ':''}${esc(sourceLabel(x))}</b><div class="meta">${i===0?'المكتبة الأساسية':'مكتبة مصدر'}${sourceMergeLabel(x)}${cp?.status==='done'?' • آخر فحص مكتمل':''}${cp?.status==='paused'?' • فحص متوقف':''}</div><div class="actions"><button class="btn small" data-action="activateSource" data-id="${x.id}">تحديد</button><button class="btn small" data-action="grantSourcePermission" data-id="${x.id}">منح الإذن</button><button class="btn small" data-action="scanSource" data-id="${x.id}">↻ فحص هذا المجلد</button></div></div>`}).join('');modal(`<h2>تشخيص OsRa</h2><div class="cards"><div class="card">HTTPS/secure: <b>${secure?'نعم':'لا'}</b></div><div class="card">اختيار المجلد: <b>${picker?'متاح':'غير متاح'}</b></div><div class="card">المصادر المرتبطة: <b>${sources.length}</b></div><div class="card">المصدر النشط: <b>${esc(sourceLabel(active))}</b></div><div class="card">إذن المصدر النشط: <b>${esc(activePerm)}</b></div>${rows||'<div class="empty">لا توجد مكتبات مرتبطة.</div>'}<div class="card">الصور داخل الألبومات الظاهرة: <b>${visiblePhotoCount()}</b></div><div class="card">سجلات الصور الكلية: <b>${allPhotos().length}</b></div><div class="card">الذكريات الظاهرة: <b>${visibleMemories().length}</b></div><div class="card">الذكريات المخفية: <b>${state.memories.length-visibleMemories().length}</b></div><div class="card">التخزين المستخدم: <b>${e?.usage?Math.round(e.usage/1024/1024)+' MB':'غير معروف'}</b></div><div class="actions">${active?`<button class="btn" data-action="grantPermission">منح إذن المصدر النشط</button>`:''}<button class="btn primary" data-action="folder">＋ إضافة مجلد / ألبوم</button></div></div>`)}
function paperSound(duration=720){if(!soundOn)return;try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const dur=Math.max(.32,Math.min(1.05,Number(duration)/1000)),sr=audioCtx.sampleRate,len=Math.floor(sr*dur),buf=audioCtx.createBuffer(1,len,sr),data=buf.getChannelData(0);for(let i=0;i<len;i++){const x=i/len,a=Math.min(1,x/.11),r=Math.max(0,1-(x-.54)/.46),s=Math.sin(Math.PI*Math.min(1,x/.82));data[i]=(Math.random()*2-1)*(0.026+0.17*a*r*s)}const src=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();src.buffer=buf;filter.type='bandpass';filter.frequency.setValueAtTime(1500,audioCtx.currentTime);filter.frequency.exponentialRampToValueAtTime(3600,audioCtx.currentTime+dur*.56);filter.frequency.exponentialRampToValueAtTime(2000,audioCtx.currentTime+dur);filter.Q.value=.65;gain.gain.setValueAtTime(.0001,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.05,audioCtx.currentTime+dur*.12);gain.gain.exponentialRampToValueAtTime(.16,audioCtx.currentTime+dur*.48);gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur*.98);src.connect(filter).connect(gain).connect(audioCtx.destination);src.start();src.stop(audioCtx.currentTime+dur+.02)}catch{}}
async function setSound(){soundOn=!soundOn;state.settings.soundEnabled=soundOn;await save();updateSoundButton();if(soundOn)paperSound()}
$('#nav')?.addEventListener('click',e=>{const b=e.target.closest('[data-section]');if(b)go(b.dataset.section)});
document.addEventListener('change',e=>{const x=e.target.closest('.photo-select');if(x){if(x.checked)selectedPhotos.add(x.dataset.photo);else selectedPhotos.delete(x.dataset.photo);if(!dragSelectMode||!dragSelecting)rerenderCurrentMemory();return}const m=e.target.closest('.memory-select');if(m){const mid=m.dataset.memory;if(m.checked)selectedMemories.add(mid);else selectedMemories.delete(mid);renderNoAnim(true)}});document.addEventListener('pointerdown',e=>{
 if(!dragSelectMode||e.pointerType==='mouse'&&e.button!==0)return;
 const item=e.target.closest('.photo-item');if(!item||e.target.closest('.photo-check'))return;
 const cb=item.querySelector('.photo-select');if(!cb?.dataset.photo)return;
 clearDragLongPress();dragPointerId=e.pointerId;dragLastX=e.clientX;dragLastY=e.clientY;dragPending=true;dragPendingPhoto=cb.dataset.photo;dragPendingItem=item;dragPendingX=e.clientX;dragPendingY=e.clientY;
 dragLongPressTimer=setTimeout(()=>{if(!dragPending||dragPendingPhoto!==cb.dataset.photo)return;dragPending=false;dragSelecting=true;dragSelectValue=!selectedPhotos.has(cb.dataset.photo);dragVisited.clear();dragVisited.add(cb.dataset.photo);if(dragSelectValue)selectedPhotos.add(cb.dataset.photo);else selectedPhotos.delete(cb.dataset.photo);cb.checked=selectedPhotos.has(cb.dataset.photo);item.setPointerCapture?.(e.pointerId);updateDragAutoScroll(e.clientX,e.clientY)},400);
},{passive:true});
document.addEventListener('pointermove',e=>{
 if(!dragSelectMode||e.pointerId!==dragPointerId)return;
 const dx=e.clientX-dragPendingX,dy=e.clientY-dragPendingY;
 if(dragPending&&Math.hypot(dx,dy)>12){clearDragLongPress();dragPointerId=null;return}
 if(!dragSelecting)return;e.preventDefault();dragLastX=e.clientX;dragLastY=e.clientY;dragSelectAtPoint(e.clientX,e.clientY);updateDragAutoScroll(e.clientX,e.clientY)
},{passive:false});
document.addEventListener('pointerup',e=>{
 if(!dragSelectMode||e.pointerId!==dragPointerId)return;
 const pending=dragPending,item=dragPendingItem;clearDragLongPress();
 if(dragSelecting){dragSelecting=false;dragPointerId=null;clearDragAutoScroll();dragVisited.clear();toast(`تم تحديد ${selectedPhotos.size} صورة.`);return}
 dragPointerId=null;if(pending&&item&&!e.target.closest('.photo-check')){quickTapSelect(item);quickTapHandledUntil=Date.now()+450}
},{passive:true});
document.addEventListener('pointercancel',e=>{if(e.pointerId!==dragPointerId)return;clearDragLongPress();dragSelecting=false;dragPointerId=null;clearDragAutoScroll();dragVisited.clear()},{passive:true});

document.addEventListener('change',e=>{const t=e.target;if(t?.matches?.('.hq-album-select')){const r=document.querySelector('input[name="hqScope"][value="selected"]');if(r)r.checked=true}});
document.addEventListener('click',async e=>{if(dragSelectMode&&quickTapHandledUntil>Date.now()&&e.target.closest('.photo-item')&&!e.target.closest('.photo-check')){e.preventDefault();e.stopPropagation();return}const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,i=b.dataset.id;try{
 if(a==='searchResult'){const type=b.dataset.type,rid=b.dataset.id,q=b.dataset.query||searchState.query||'';closeModal();searchState={query:q,messageId:type==='message'?rid:'',fromSection:'home'};if(type==='memory'){searchState.messageId='';section='memories';renderNoAnim();setTimeout(()=>{const mm=state.memories.find(x=>x.id===rid);if(mm){currentMemoryId=mm.id;$('#currentPage').innerHTML=pageMemory(mm);hydrate()}},20)}else if(type==='message'){section='messages';renderNoAnim();setTimeout(()=>{const el=document.getElementById('message-card-'+rid);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.remove('search-focus-pulse');void el.offsetWidth;el.classList.add('search-focus-pulse')}},40)}else go(type==='dream'?'dreams':'spiritual');return}
 if(a==='go')go(b.dataset.section);else if(a==='addSurpriseMessage')surpriseMessageForm();else if(a==='editSurpriseMessage')surpriseMessageForm(Number(i));else if(a==='saveSurpriseMessage')await saveSurpriseMessage(i);else if(a==='deleteSurpriseMessage')await deleteSurpriseMessage(i);else if(a==='folder')await chooseFolder();else if(a==='pickAlbumLinkSource')await pickAlbumLinkSource(i);else if(a==='chooseManualLinkSource')await pickAlbumLinkSource(i);else if(a==='retryManualLink')await pickAlbumLinkSource(i);else if(a==='cancelManualLink'){if(manualLinkSession)manualLinkSession.cancelled=true;closeModal();toast('تم إلغاء فحص المصدر دون حفظه.')}else if(a==='finishManualSources')await finishManualSources();else if(a==='albumLinkFinalReport')showAlbumLinkFinalReport(i);else if(a==='startVisualFallback'){if(visualLinkSession?.albumId===i)await openVisualFallbackChooser();else await openVisualFallbackForAlbum(i,b.dataset.exhausted==='1'?'manual-exhausted':'album')}else if(a==='visualAddRoot')await visualAddRoot();else if(a==='visualCancelRoot')visualCancelRoot(i);else if(a==='visualRun')await runVisualFallback();else if(a==='applyVisualLinks')await applyVisualLinks();else if(a==='visualCancel')visualCancelFallback();else if(a==='activateSource'){const x=sources.find(x=>x.id===b.dataset.id);if(x){await setActiveSource(x);renderNoAnim();toast(`تم تحديد «${sourceLabel(x)}».`)}}else if(a==='scanSource'){const x=sources.find(x=>x.id===b.dataset.id);if(x){await setActiveSource(x);await scan(x.handle,false,{source:x})}}else if(a==='resumeSource'){const x=sources.find(x=>x.id===b.dataset.id);if(x){await setActiveSource(x);await scan(x.handle,false,{source:x,resume:true})}}else if(a==='grantSourcePermission'){const x=sources.find(x=>x.id===b.dataset.id);if(x){permissionDeniedCache.delete(x.id);const ok=await ensureSourcePermission(x,true);toast(ok?'تم منح إذن هذا المجلد.':'لم يتم منح الإذن.')}}else if(a==='grantPermission'){const ok=await permission();toast(ok?'تم منح إذن قراءة المجلد المحدد.':'لم يتم منح الإذن.');await diagnostic()}else if(a==='mergeFolder')await addPendingFolder('merge');else if(a==='separateFolder')await addPendingFolder('separate');else if(a==='cancelFolderChoice'){pendingFolderRoot=null;pendingFolderMatch=null;pendingFolderName='';closeModal()}else if(a==='birthdayRania'){if(isBirthdayRaniaToday())birthdayRaniaGreeting();else toast('رسالة عيد الميلاد تظهر في يوم عيد ميلاد رانيا فقط.')}else if(a==='countdown')countdownForm();else if(a==='editCountdown')editCountdown(i);else if(a==='saveCountdown')await saveCountdown(i);else if(a==='deleteCountdown')await deleteCountdown(i);else if(a==='toggleCountdownCelebrate')await toggleCountdownCelebrate(i);else if(a==='scan')await scan();else if(a==='linkAllSources')await linkAllSources();else if(a==='matchAlbumsByName')await matchAlbumsByName(true,true);else if(a==='confirmAlbumReviews')await confirmAlbumReviews();else if(a==='hideScanProgressCard'){state.settings.hideScanProgressCard=true;await save();renderNoAnim();toast('تم إخفاء قائمة استمرار الفحص دون حذف التقدم المحفوظ.')}else if(a==='showScanProgressCard'){state.settings.hideScanProgressCard=false;await save();renderNoAnim();toast('تم إظهار قائمة متابعة الفحص.')}else if(a==='linkReport'){if(lastLinkReport)linkReportModal(lastLinkReport);else toast('لا يوجد تقرير ربط محفوظ بعد.');}else if(a==='stopScan')await stopScan();else if(a==='resumeScan')await scan(libraryHandle,false,{resume:true,source:activeSource()});else if(a==='scanFresh')await scan(libraryHandle,false,{fresh:true,source:activeSource()});else if(a==='albumPrev'){turnAlbumPage(-1)}else if(a==='albumNext'){turnAlbumPage(1)}else if(a==='toggleAlbumMiniView'){toggleAlbumMiniView()}else if(a==='search'){pageMemories.q=$('#searchMem').value;albumBookIndex=0;renderNoAnim()}else if(a==='addMemory')addMemory();else if(a==='newAlbum')newAlbum();else if(a==='saveAlbum')await saveAlbum();else if(a==='memory'){const m=state.memories.find(x=>x.id===i);if(m){currentMemoryId=m.id;section='memories';romanticHeartTransition('open');$('#currentPage').innerHTML=pageMemory(m);hydrate();setNav()}}else if(a==='shareMemory')await shareMemory(i);else if(a==='hideMemory')await hideMemory(i);else if(a==='unhideMemory')await unhideMemory(i);else if(a==='hiddenMemories')hiddenMemories();else if(a==='dailyAlbums')dailyAlbumsManager();else if(a==='dailySelectAll')dailySelectAll();else if(a==='dailyClearAll')dailyClearAll();else if(a==='saveDailyAlbums')await saveDailyAlbums();else if(a==='selectAllMemories')selectAllMemories();else if(a==='clearMemorySelection')clearMemorySelection();else if(a==='commitMemoryOrder')await commitMemoryOrder();else if(a==='orderManual')await orderManual();else if(a==='orderDetails')await orderDetails();else if(a==='orderLinked')await orderLinked();else if(a==='moveMemoryUp')await moveMemory(i,-1);else if(a==='moveMemoryDown')await moveMemory(i,1);else if(a==='hideSelectedMemories')await hideSelectedMemories();else if(a==='mergeSelectedMemories')await mergeSelectedMemories();else if(a==='backMemories'){currentMemoryId=null;selectedPhotos.clear();dragSelectMode=false;dragSelecting=false;clearDragAutoScroll();clearDragLongPress();dragVisited.clear();romanticHeartTransition('close');renderNoAnim()}else if(a==='editMemory')editMemory(i);else if(a==='saveMemory')await saveMemory(i);else if(a==='photo')await openPhoto(i);else if(a==='selectAllPhotos')selectAllPhotos();else if(a==='toggleDragSelect')toggleDragSelect();else if(a==='commitPhotoOrder')await commitPhotoOrder();else if(a==='clearPhotoSelection')clearPhotoSelection();else if(a==='removeFromAlbum')await removeFromAlbum();else if(a==='moveSelected')moveSelected();else if(a==='moveToAlbum')await moveToAlbum(i);else if(a==='createAlbumAndMove')createAlbumAndMove();else if(a==='saveAlbumMove')await saveAlbumMove(b.dataset.from,JSON.parse(b.dataset.ids||'[]'));else if(a==='excludeSelected')await excludeSelected();else if(a==='movePhotoUp')await reorderPhoto(i,-1);else if(a==='movePhotoDown')await reorderPhoto(i,1);else if(a==='restoreExcluded')await restoreExcluded();else if(a==='calendarDay'){calendarDate=b.dataset.date;calendarCursor=new Date(calendarDate+'T00:00:00');calendarCursor.setDate(1);renderNoAnim()}else if(a==='calendarPrev'){calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()-1,1);renderNoAnim()}else if(a==='calendarNext'){calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,1);renderNoAnim()}else if(a==='dream')dreamForm();else if(a==='editDream')dreamForm(state.dreams.find(x=>x.id===i));else if(a==='saveDream')await saveDream(i);else if(a==='verse')verseForm();else if(a==='saveVerse')await saveVerse();else if(a==='favVerse'){const x=state.verses.find(v=>v.id===i);if(x){x.favorite=!x.favorite;await save();renderNoAnim()}}else if(a==='delVerse'){state.verses=state.verses.filter(v=>v.id!==i);await save();renderNoAnim()}else if(a==='prayer')prayerForm();else if(a==='editPrayer')editPrayer(i);else if(a==='deletePrayer')await deletePrayer(i);else if(a==='savePrayer')await savePrayer(i);else if(a==='togglePrayer'){const x=state.prayers.find(v=>v.id===i);if(x){x.done=!x.done;await save();renderNoAnim()}}else if(a==='message')msgForm();else if(a==='editMessage'){const mm=state.messages.find(v=>v.id===i);if(mm)msgForm(mm)}else if(a==='saveMessage')await saveMessage(i);else if(a==='messagesSortDesc'){state.settings.messagesOrder='desc';await save();renderNoAnim()}else if(a==='messagesSortAsc'){state.settings.messagesOrder='asc';await save();renderNoAnim()}else if(a==='toggleMessage'){const x=state.messages.find(v=>v.id===i);if(x){x.starred=!x.starred;await save();renderNoAnim()}}else if(a==='delMessage'){state.messages=state.messages.filter(v=>v.id!==i);await save();renderNoAnim()}else if(a==='event')eventForm();else if(a==='saveEvent')await saveEvent();else if(a==='settingsSave')await saveSettings();else if(a==='chooseBackup')await chooseBackup();else if(a==='backup')await backup();else if(a==='buildHQSource'){hqSelectionModal(false)}else if(a==='hqZip'){hqBackupZip()}else if(a==='hqStartBuild'){await startHQBuildFromModal()}else if(a==='hqSelectAllAlbums'){document.querySelectorAll('.hq-album-select').forEach(x=>x.checked=true);const r=document.querySelector('input[name="hqScope"][value="selected"]');if(r)r.checked=true}else if(a==='hqClearAlbums'){document.querySelectorAll('.hq-album-select').forEach(x=>x.checked=false);const r=document.querySelector('input[name="hqScope"][value="selected"]');if(r)r.checked=true}else if(a==='resumeHQBuild'){await resumeHQBuild()}else if(a==='retryHQSkipped'){await retryHQSkipped()}else if(a==='stopHQBuild'){await stopHQBuild()}else if(a==='discardHQBuild'){await discardHQBuild()}else if(a==='linkHQSource'){await linkHQSource()}else if(a==='clearHQSource'){clearHQSource()}else if(a==='closeHQProgress'){closeHQProgress()}else if(a==='restore')restore();else if(a==='restoreMerge')restoreMerge();else if(a==='restoreLocalRecovery')await restoreLocalRecovery();else if(a==='hideRecoveryNotice'){recoveryNoticeHidden=true;recoveryCandidate=null;await put('library',{key:'recoveryNoticeHidden',value:true});renderNoAnim();toast('تم إخفاء تنبيه نسخة الأمان. يمكنك الاستعادة يدويًا من الإعدادات.')} else if(a==='restoreSafety')await restoreSafety();else if(a==='diag')await diagnostic();else if(a==='duplicateManager')duplicateManager();else if(a==='cancelDuplicateScan')cancelDuplicateScan();else if(a==='chooseDuplicateKeeper')duplicateChoiceModal(Number(b.dataset.group),b.dataset.keeper);else if(a==='applyDuplicateChoice')await applyDuplicateChoice();else if(a==='mergeDuplicate')await mergeDuplicate(b.dataset.id,b.dataset.keeper);else if(a==='closeModal')closeModal();
 }catch(err){console.error(err);toast('حدث خطأ. استخدم التشخيص إذا استمر.')}});
$('#modalClose')?.addEventListener('click',closeModal);$('#lbClose')?.addEventListener('click',closeLB);$('#lbPrev')?.addEventListener('click',async()=>{if(lb.i>0)await playLbFlip(lb.i-1,-1)});$('#lbNext')?.addEventListener('click',async()=>{if(lb.i<lb.ids.length-1)await playLbFlip(lb.i+1,1)});$('#lbPlay')?.addEventListener('click',toggleSlideshow);document.addEventListener('click',async e=>{const b=e.target.closest('[data-lb-index]');if(!b)return;const n=Number(b.dataset.lbIndex);if(!Number.isInteger(n)||n<0||n>=lb.ids.length)return;lb.i=n;await showPhoto()});
const lbImage=$('#lbImage');
lbImage?.addEventListener('touchstart',e=>{const ts=e.touches;if(ts.length===2){e.preventDefault();const dx=ts[0].clientX-ts[1].clientX,dy=ts[0].clientY-ts[1].clientY;lb.pinchStart=Math.hypot(dx,dy);lb.pinchBase=lb.zoom;lb.dragX=null;lb.dragY=null}else if(ts.length===1&&lb.zoom>1){lb.dragX=ts[0].clientX;lb.dragY=ts[0].clientY;lb.dragPanX=lb.panX;lb.dragPanY=lb.panY}}, {passive:false});
lbImage?.addEventListener('touchmove',e=>{const ts=e.touches;if(ts.length===2&&lb.pinchStart>0){e.preventDefault();const dx=ts[0].clientX-ts[1].clientX,dy=ts[0].clientY-ts[1].clientY;setLbZoom(lb.pinchBase*(Math.hypot(dx,dy)/lb.pinchStart))}else if(ts.length===1&&lb.zoom>1&&lb.dragX!==null){e.preventDefault();lb.panX=lb.dragPanX+(ts[0].clientX-lb.dragX);lb.panY=lb.dragPanY+(ts[0].clientY-lb.dragY);applyLbZoom()}}, {passive:false});
lbImage?.addEventListener('touchend',e=>{const now=Date.now();if(e.touches.length===0){lb.pinchStart=0;lb.dragX=null;lb.dragY=null;const touch=e.changedTouches[0];if(touch){const moved=Math.hypot((touch.clientX-(lb.lastTapX||touch.clientX)),(touch.clientY-(lb.lastTapY||touch.clientY)));if(now-lb.lastTap<320&&moved<28){setLbZoom(lb.zoom>1?1:2);lb.lastTap=0}else{lb.lastTap=now;lb.lastTapX=touch.clientX;lb.lastTapY=touch.clientY}}}}, {passive:false});
lbImage?.addEventListener('dblclick',()=>setLbZoom(lb.zoom>1?1:2));
$('#lbZoomIn')?.addEventListener('click',zoomIn);$('#lbZoomOut')?.addEventListener('click',zoomOut);$('#lbZoomReset')?.addEventListener('click',resetLbZoom);$('#lightbox')?.addEventListener('close',()=>{cleanupLbFlip();resetLbZoom();lb.loadToken++;if(lb.url)URL.revokeObjectURL(lb.url);if(lb.thumbUrl)URL.revokeObjectURL(lb.thumbUrl);lb.url=null;lb.thumbUrl=null;});
$('#lightbox')?.addEventListener('touchstart',e=>{if(lb.zoom>1)return;const t=e.changedTouches[0];lb.touchX=t.clientX;lb.touchY=t.clientY},{passive:true});$('#lightbox')?.addEventListener('touchend',async e=>{if(lb.zoom>1)return;const t=e.changedTouches[0];if(lb.touchX==null)return;const dx=t.clientX-lb.touchX,dy=t.clientY-(lb.touchY||t.clientY);lb.touchX=null;lb.touchY=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.15){if(dx<0&&lb.i<lb.ids.length-1){await playLbFlip(lb.i+1,1)}else if(dx>0&&lb.i>0){await playLbFlip(lb.i-1,-1)}}},{passive:true});
$('#book')?.addEventListener('touchstart',e=>{const t=e.changedTouches[0];$('#book').dataset.x=t.clientX;$('#book').dataset.y=t.clientY;$('#book').dataset.albumSwipe=!!e.target.closest('.album-book-stage')},{passive:true});$('#book')?.addEventListener('touchend',e=>{const t=e.changedTouches[0],x=+( $('#book').dataset.x||t.clientX),y=+( $('#book').dataset.y||t.clientY),dx=t.clientX-x,dy=t.clientY-y,isAlbum=$('#book').dataset.albumSwipe==='true';$('#book').dataset.albumSwipe='';if(isAlbum){if(Math.abs(dx)>52&&Math.abs(dx)>Math.abs(dy)*1.15){turnAlbumPage(dx<0?1:-1)}return}if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.2){const order=['home','memories','calendar','story','dreams','spiritual','messages','settings','about'],j=order.indexOf(section)+(dx<0?1:-1);if(j>=0&&j<order.length)navigate(order[j],dx<0?1:-1)}},{passive:true});
$('#searchBtn')?.addEventListener('click',()=>modal(`<h2>بحث في OsRa</h2><div class="field"><label>كلمة البحث</label><input id="globalQ"></div><button class="btn primary" id="runGlobal">بحث</button><div id="globalOut" style="margin-top:12px"></div>`));

document.addEventListener('click',e=>{if(e.target.id==='runGlobal'){
 const raw=($('#globalQ').value||'').trim(),q=raw.toLocaleLowerCase();searchState={query:raw,messageId:'',fromSection:section};const o=[];if(!q){$('#globalOut').innerHTML='<div class="empty">اكتب كلمة للبحث.</div>';return}
 const albumSeen=new Set();
 for(const mm of visibleMemories()){
  const ps=photoFor(mm),nameHit=ps.some(pp=>String(pp.name||'').toLocaleLowerCase().includes(q)),metaHit=[mm.title,mm.album,mm.date,mm.endDate,mm.place,mm.description].join(' ').toLocaleLowerCase().includes(q);
  if((nameHit||metaHit)&&!albumSeen.has(mm.id)){albumSeen.add(mm.id);o.push({type:'memory',id:mm.id,icon:'📁',label:mm.title||mm.album||'ألبوم',meta:`${ps.length} صورة${nameHit?' • تطابق داخل اسم صورة':''}`})}
 }
 for(const mm of state.messages.filter(x=>x.starred&& (String(x.text||'').toLocaleLowerCase().includes(q)||String(x.sender||'').toLocaleLowerCase().includes(q))))o.push({type:'message',id:mm.id,query:raw,icon:'✉',label:'رسالة'+(mm.sender?' من '+mm.sender:''),meta:fmt(mm.date),snippet:highlightSearchText(mm.text,raw)});
 for(const d of state.dreams.filter(x=>[x.title,x.note,x.targetDate].join(' ').toLocaleLowerCase().includes(q)))o.push({type:'dream',id:d.id,icon:'🌱',label:d.title||'حلم',meta:''});
 for(const v of state.verses.filter(x=>[x.text,x.ref].join(' ').toLocaleLowerCase().includes(q)))o.push({type:'verse',id:v.id,icon:'☼',label:v.ref||'آية',meta:''});
 $('#globalOut').innerHTML=o.length?o.map(x=>`<button class="card search-result" data-action="searchResult" data-type="${x.type}" data-id="${x.id}" data-query="${esc(x.query||raw)}" style="width:100%;text-align:right;border:0;cursor:pointer"><b>${x.icon} ${esc(x.label)}</b>${x.meta?`<small class="meta">${esc(x.meta)}</small>`:''}${x.snippet?`<div class="search-snippet">${x.snippet}</div>`:''}<div class="meta">اضغط لفتح النتيجة</div></button>`).join(''):`<div class="empty">لا توجد نتائج.</div>`
 }});
document.addEventListener('change',async e=>{
 if(e.target?.id==='surpriseTimingSetting'||e.target?.id==='surpriseSpeedSetting'){
  if(e.target.id==='surpriseTimingSetting')state.settings.surpriseTiming=e.target.value;
  if(e.target.id==='surpriseSpeedSetting')state.settings.surpriseSpeed=e.target.value;
  normalizeState();await save();if(surprisesAreEnabled())startRomanticTicker();
  const h=document.getElementById('surpriseTimingHint');if(h)h.textContent='الفاصل: '+surpriseTimingLabel()+' • الحركة: '+surpriseSpeedLabel();
  toast('تم ضبط المفاجآت: '+surpriseTimingLabel()+' • '+surpriseSpeedLabel());
 }
});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('#installBtn').hidden=false});window.addEventListener('appinstalled',()=>{installEvent=null;$('#installBtn').hidden=true});$('#installBtn').onclick=async()=>{if(!installEvent){toast('التثبيت غير متاح حاليًا من هذا المتصفح.');return}const e=installEvent;installEvent=null;await e.prompt();try{const r=await e.userChoice;$('#installBtn').hidden=r.outcome==='accepted'}catch{$('#installBtn').hidden=false}};
$('#soundBtn')?.addEventListener('click',setSound);
$('#surpriseBtn')?.addEventListener('click',toggleSurprises);
async function shareTarget(){const q=new URLSearchParams(location.search),text=(q.get('text')||'').trim(),title=(q.get('title')||'').trim(),url=(q.get('url')||'').trim();if(!(text||title||url))return;history.replaceState({},document.title,location.pathname);const body=[text,url].filter(Boolean).join('\n')||title;setTimeout(()=>{msgForm();setTimeout(()=>{if($('#msgText'))$('#msgText').value=body;if($('#msgSender'))$('#msgSender').value='واتساب'},30)},250)}
async function runDeferredStartupMaintenance(){
 if(!window.__osraStartupMaintenanceNeeded||busy||scanLock)return;
 window.__osraStartupMaintenanceNeeded=false;
 try{
  const legacyIds=Array.isArray(window.__osraLegacyExcludedIds)?window.__osraLegacyExcludedIds:[];
  if(legacyIds.length){
   const tx=db.transaction('photos','readwrite'),stx=tx.objectStore('photos');
   for(const pid of legacyIds)stx.delete(pid);
   await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('legacy excluded cleanup aborted'))});
   window.__osraLegacyExcludedIds=[];
  }
  if(sources.length>1){const changed=await consolidateNestedSources();if(changed)renderNoAnim(true)}
 }catch(e){console.warn('deferred startup maintenance failed',e)}
}
async function maybeResumeInterruptedScan(){if(scanLock)return;for(const source of sources){const cp=scanProgresses[source.id];if(!cp||cp.status!=='running')continue;try{const q=await source.handle.queryPermission({mode:'read'});if(q==='granted'){permissionCache.add(source.id);await setActiveSource(source,false);toast(`استكمال «${sourceLabel(source)}» من: ${cp.lastRelPath||'البداية'}`);await scan(source.handle,false,{resume:true,source});return}}catch(e){console.warn('resume scan check failed',e)}}}
async function ensureLatestOsRa(){
  if(!('serviceWorker' in navigator)) return;
  let reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(reloading) return;
    reloading=true;
    location.reload();
  },{once:true});
  try{
    const reg=await navigator.serviceWorker.register('./sw.js?build=osra110-20261008-r34-boot-hearts-custom-messages',{updateViaCache:'none'});
    await reg.update().catch(()=>{});
    if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
  }catch(e){console.warn('OsRa service worker update skipped',e)}
}
(async()=>{try{initBootRibbon();ensureLatestOsRa().catch(()=>{});await dbOpen();await load();renderNoAnim();updateSoundButton();updateSurpriseButton();initBirthdayUi();hideBootSplash();startRomanticTicker();if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});setTimeout(async()=>{await runDeferredStartupMaintenance();await shareTarget();await maybeAutoFileBackup();},500);setInterval(()=>{maybeAutoFileBackup().catch(()=>{})},6*60*60*1000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&scanCheckpoint?.status==='running')persistScanProgress();if(document.visibilityState==='visible'){setTimeout(()=>{maybeAutoFileBackup().catch(()=>{})},120)}})}catch(e){console.error(e);hideBootSplash();toast('تعذر تشغيل OsRa.')}})();
