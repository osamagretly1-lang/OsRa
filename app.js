const DB_NAME = "OsRa_DB";
const DB_VERSION = 2;
let db;
let state = {
  settings: {
    startDate: "",
    engagementDate: "",
    birthdayRania: "",
    osamaPhone: "",
    raniaPhone: "",
    whatsappUrl: ""
  },
  memories: [],
  events: [],
  dreams: [],
  verses: [],
  prayers: [],
  messages: []
};
let photoStore = new Map();
let libraryHandle = null;
let activeSection = "home";
let installPrompt = null;
let lightbox = {photoIds:[], index:0, objectUrl:null};
const thumbUrlCache = new Map();

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const uid = p => p + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,8);
const todayISO = () => new Date().toISOString().slice(0,10);

function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = ()=>{
      const d=req.result;
      if(!d.objectStoreNames.contains("state")) d.createObjectStore("state",{keyPath:"key"});
      if(!d.objectStoreNames.contains("photos")) d.createObjectStore("photos",{keyPath:"id"});
      if(!d.objectStoreNames.contains("library")) d.createObjectStore("library",{keyPath:"key"});
    };
    req.onsuccess=()=>{db=req.result;resolve(db)};
    req.onerror=()=>reject(req.error);
  });
}
function tx(store, mode="readonly"){
  return db.transaction(store,mode).objectStore(store);
}
function getRec(store,key){
  return new Promise((res,rej)=>{
    const r=tx(store).get(key); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
  });
}
function putRec(store,val){
  return new Promise((res,rej)=>{
    const r=tx(store,"readwrite").put(val); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
  });
}
function delRec(store,key){
  return new Promise((res,rej)=>{
    const r=tx(store,"readwrite").delete(key); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error);
  });
}
function getAll(store){
  return new Promise((res,rej)=>{
    const r=tx(store).getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>rej(r.error);
  });
}
async function persist(){
  await putRec("state",{key:"main", value:state});
}
function normalizeState(raw){
  const s = raw?.value || raw || {};
  state = {
    settings:{...state.settings,...(s.settings||{})},
    memories:Array.isArray(s.memories)?s.memories:[],
    events:Array.isArray(s.events)?s.events:[],
    dreams:Array.isArray(s.dreams)?s.dreams:[],
    verses:Array.isArray(s.verses)?s.verses:[],
    prayers:Array.isArray(s.prayers)?s.prayers:[],
    messages:Array.isArray(s.messages)?s.messages:[]
  };
}
async function loadState(){
  const rec=await getRec("state","main");
  if(rec) normalizeState(rec);
  const lib=await getRec("library","main");
  if(lib?.handle) libraryHandle=lib.handle;
  if(lib?.name) state.settings.libraryName=lib.name;
}
async function loadPhotoMeta(){
  photoStore.clear();
  const all=await getAll("photos");
  for(const p of all) photoStore.set(p.id,p);
}
function allPhotos(){return [...photoStore.values()]}
function activePhotos(){return allPhotos().filter(p=>!p.missing)}
function countPhotos(){return activePhotos().length}

function formatDate(v){
  if(!v) return "بدون تاريخ";
  const d=new Date(v+"T00:00:00");
  if(isNaN(d)) return esc(v);
  return d.toLocaleDateString("ar-EG",{year:"numeric",month:"long",day:"numeric"});
}
function daysBetween(a,b){
  return Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/86400000);
}
function exactDuration(from,to=todayISO()){
  if(!from) return "—";
  let s = new Date(from+"T00:00:00"), e = new Date(to+"T00:00:00");
  if(s>e) return "لم يبدأ بعد";
  let y=e.getFullYear()-s.getFullYear(), m=e.getMonth()-s.getMonth(), d=e.getDate()-s.getDate();
  if(d<0){m--; const prev=new Date(e.getFullYear(),e.getMonth(),0); d += prev.getDate();}
  if(m<0){y--;m+=12;}
  const p=[];
  if(y)p.push(`${y} ${y===1?"سنة":y===2?"سنتان":y<11?"سنوات":"سنة"}`);
  if(m)p.push(`${m} ${m===1?"شهر":m===2?"شهران":"أشهر"}`);
  if(d)p.push(`${d} ${d===1?"يوم":"أيام"}`);
  return p.join(" و ") || "اليوم";
}
function nextAnnual(dateStr){
  if(!dateStr) return null;
  const [y,m,d]=dateStr.split("-").map(Number);
  const now=new Date(); const start=new Date(now.getFullYear(),m-1,d);
  if(m===2&&d===29 && start.getMonth()!==1){start.setMonth(1);start.setDate(28);}
  if(start<new Date(now.getFullYear(),now.getMonth(),now.getDate())) start.setFullYear(now.getFullYear()+1);
  return {date:start, days:Math.ceil((start-new Date(now.getFullYear(),now.getMonth(),now.getDate()))/86400000)};
}
function formatDays(n){
  if(n===0)return "اليوم ❤️";
  if(n===1)return "غدًا";
  return `بعد ${n} يومًا`;
}
function dateSeed(){
  const s=todayISO().replaceAll("-","");
  return [...s].reduce((a,c)=>a+c.charCodeAt(0),0);
}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h+=((h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24));}return Math.abs(h>>>0);}

function templateHome(){
  const photos=activePhotos().sort((a,b)=>String(a.relPath).localeCompare(String(b.relPath)));
  const daily=photos.length?photos[dateSeed()%photos.length]:null;
  const onThis=state.memories.filter(m=>m.date && m.date.slice(5)===todayISO().slice(5));
  const upcoming=[
    {label:"ذكرى البداية",d:nextAnnual(state.settings.startDate), icon:"♥"},
    {label:"ذكرى الخطوبة",d:nextAnnual(state.settings.engagementDate), icon:"💍"},
    {label:"عيد ميلاد رانيا",d:nextAnnual(state.settings.birthdayRania), icon:"🎂"}
  ].filter(x=>x.d).sort((a,b)=>a.d.date-b.d.date);
  const dailyHtml=daily ? `<button class="memory-cover" data-action="openPhoto" data-id="${esc(daily.id)}" style="border:0;width:100%;padding:0"><img id="dailyImg" alt="${esc(daily.name)}"></button>`:
    `<div class="memory-cover" style="display:grid;place-items:center"><div style="font-size:42px">♥</div></div>`;
  return `<div class="page-inner">
    <div class="dedication">
      <div class="page-kicker">Our Story</div>
      <div class="huge">رانيا ♥ أسامة</div>
      <div class="sub">قصتنا وصداقتنا</div>
      <div class="small">من أول لحظة... إلى كل لحظة بعدها. ❤️</div>
      <div style="margin:18px auto 8px;width:min(560px,100%)">
        <div class="card memory-card">
          ${dailyHtml}
          <div class="memory-body"><b>📖 صورة اليوم</b><p>${daily?esc(daily.name):"اربط مكتبة الصور لنبدأ الحكاية."}</p></div>
        </div>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><b>${state.memories.length}</b><span>ذكرى</span></div>
      <div class="stat"><b>${countPhotos()}</b><span>صورة مفهرسة</span></div>
      <div class="stat"><b>${state.dreams.length}</b><span>حلم</span></div>
      <div class="stat"><b>${state.verses.length}</b><span>آية</span></div>
    </div>
    <div class="action-row">
      <button class="btn primary" data-action="go" data-section="memories">افتح ذكرياتنا</button>
      <button class="btn" data-action="go" data-section="story">تتبّع قصتنا</button>
      <button class="btn" data-action="go" data-section="messages">رسائلنا ⭐</button>
      <button class="btn" data-action="go" data-section="closing">إلى آخر صفحة ❦</button>
    </div>
    <div class="paper-divider"></div>
    <div class="grid">
      <div class="card"><b>⏳ معًا منذ</b><p>${exactDuration(state.settings.startDate)}</p></div>
      <div class="card"><b>💍 منذ الخطوبة</b><p>${exactDuration(state.settings.engagementDate)}</p></div>
      <div class="card"><b>✨ القادم</b><p>${upcoming[0]?`${upcoming[0].label} — ${formatDays(upcoming[0].d.days)}`:"أضف التواريخ من الإعدادات."}</p></div>
    </div>
    ${onThis.length?`<div class="paper-divider"></div><h3>في مثل هذا اليوم ✨</h3><div class="cards">${onThis.slice(0,4).map(m=>`<div class="card"><b>${esc(m.title)}</b><p>${formatDate(m.date)}${m.place?" • "+esc(m.place):""}</p></div>`).join("")}</div>`:""}
  </div>`;
}

function templateMemories(query=""){
  const q=query.trim().toLowerCase();
  let ms=state.memories.filter(m=>!q || [m.title,m.date,m.place,m.description,m.album].join(" ").toLowerCase().includes(q));
  return `<div class="page-inner">
    <div class="page-kicker">📸 ذكرياتنا</div><h1 class="page-title">ألبوماتنا</h1>
    <p class="page-note">المجلدات تصبح ذكريات تلقائيًا، والصور الأصلية تظل في مجلد OsRa Photos.</p>
    <div class="notice" style="margin-bottom:12px">${libraryHandle?"مكتبة مرتبطة: "+esc(state.settings.libraryName||libraryHandle.name):"لم يتم ربط مكتبة الصور بعد."}</div>
    <div class="search-strip"><input id="memorySearch" placeholder="ابحث بالاسم أو التاريخ أو المكان..." value="${esc(query)}"><button class="btn" data-action="searchMem">بحث</button></div>
    <div class="action-row" style="margin-bottom:14px">
      <button class="btn primary" data-action="chooseFolder">📁 ربط / استيراد OsRa Photos</button>
      <button class="btn" data-action="rescan">↻ فحص وتحديث المكتبة</button>
    </div>
    <div class="grid">${ms.length?ms.map(m=>memoryCard(m)).join(""):`<div class="empty" style="grid-column:1/-1">لا توجد ذكريات مطابقة بعد.</div>`}</div>
  </div>`;
}
function memoryCard(m){
  const imgs=(m.photoIds||[]).slice(0,1);
  const p=imgs[0]?photoStore.get(imgs[0]):null;
  return `<div class="card memory-card">
    <div class="memory-cover">${p?`<img data-thumb="${esc(p.id)}" alt="${esc(m.title)}">`:`<div style="height:100%;display:grid;place-items:center;font-size:36px;color:var(--rose)">♡</div>`}</div>
    <div class="memory-body">
      <h3>${esc(m.title)}</h3>
      <div class="meta">${m.date?formatDate(m.date):"بدون تاريخ"}${m.place?` • ${esc(m.place)}`:""}</div>
      <p>${esc(m.description||"")}</p>
      <div class="memory-actions"><button class="btn small primary" data-action="openMemory" data-id="${m.id}">فتح الألبوم</button><button class="btn small" data-action="editMemory" data-id="${m.id}">تعديل</button></div>
    </div>
  </div>`;
}

function templateMemory(m){
  const ids=m.photoIds||[];
  return `<div class="page-inner">
    <div class="page-kicker">📖 ذكرى</div><h1 class="page-title">${esc(m.title)}</h1>
    <p class="page-note">${m.date?formatDate(m.date):"بدون تاريخ"}${m.place?` • ${esc(m.place)}`:""}</p>
    ${m.description?`<div class="quote">«${esc(m.description)}»</div>`:""}
    <div class="action-row"><button class="btn" data-action="editMemory" data-id="${m.id}">✎ تعديل الذكرى</button><button class="btn" data-action="backToMemories">↩ ألبوماتنا</button></div>
    <div class="gallery">${ids.map(id=>`<button class="thumb" data-action="openPhoto" data-id="${esc(id)}"><img data-thumb="${esc(id)}" alt="${esc(m.title)}"></button>`).join("")}</div>
    ${ids.length?`<div class="paper-divider"></div><p class="page-note">${ids.length} صورة في هذه الذكرى.</p>`:`<div class="empty">لا توجد صور في هذه الذكرى.</div>`}
  </div>`;
}

function templateStory(){
  const items=[
    ...state.events.map(e=>({date:e.date,title:e.title,desc:e.description,type:"event"})),
    ...state.memories.map(m=>({date:m.date,title:m.title,desc:m.description,type:"memory"}))
  ].filter(x=>x.date).sort((a,b)=>a.date.localeCompare(b.date));
  return `<div class="page-inner">
    <div class="page-kicker">◴ قصتنا</div><h1 class="page-title">رحلة رانيا وأسامة</h1>
    <p class="page-note">كل محطة تضيف صفحة جديدة.</p>
    <div class="action-row" style="margin-bottom:16px"><button class="btn primary" data-action="addEvent">＋ إضافة محطة</button></div>
    <div class="timeline">${items.length?items.map(x=>`<div class="t-item"><div class="t-box card"><div class="meta">${formatDate(x.date)} • ${x.type==="memory"?"📸 ذكرى":"♥ محطة"}</div><h3>${esc(x.title)}</h3><p>${esc(x.desc||"")}</p></div></div>`).join(""):`<div class="empty">لم نكتب محطات القصة بعد.</div>`}</div>
  </div>`;
}

function templateDreams(){
  const avg=state.dreams.length?Math.round(state.dreams.reduce((a,d)=>a+(+d.progress||0),0)/state.dreams.length):0;
  return `<div class="page-inner">
    <div class="page-kicker">✦ أحلامنا</div><h1 class="page-title">الأشياء التي نحلم بها</h1>
    <p class="page-note">حلم، نسبة، موعد... ثم يوم نضع بجانبه ❤️ «تحقق».</p>
    <div class="card"><b>متوسط التقدم</b><p>${avg}%</p><div class="progress"><i style="width:${avg}%"></i></div></div>
    <div class="action-row" style="margin:14px 0"><button class="btn primary" data-action="addDream">＋ إضافة حلم</button></div>
    <div class="cards">${state.dreams.length?state.dreams.map(d=>`<div class="card">
      <h3>${d.done?"✅ ":""}${esc(d.title)}</h3><div class="meta">${d.targetDate?formatDate(d.targetDate):"من دون موعد"}</div>
      <p>${esc(d.note||"")}</p><div class="progress"><i style="width:${Math.max(0,Math.min(100,d.progress||0))}%"></i></div><div class="action-row" style="margin-top:8px"><span class="meta">${+d.progress||0}%</span><button class="btn small" data-action="editDream" data-id="${d.id}">تعديل</button></div>
    </div>`).join(""):`<div class="empty">أضف أول حلم من أحلامكم.</div>`}</div>
  </div>`;
}

function templateSpiritual(){
  const verses=state.verses||[];
  const prayers=state.prayers||[];
  const daily=verses.length?verses[dateSeed()%verses.length]:null;
  return `<div class="page-inner">
    <div class="page-kicker">☼ روحياتنا</div><h1 class="page-title">ما نحفظه في القلب</h1>
    ${daily?`<div class="quote">«${esc(daily.text)}»<div class="meta">— ${esc(daily.ref||"")}</div></div>`:`<div class="empty">أضف آياتكم المفضلة لتظهر «آية اليوم» هنا.</div>`}
    <div class="action-row" style="margin:14px 0"><button class="btn primary" data-action="addVerse">＋ آية</button><button class="btn" data-action="addPrayer">＋ أمنية/صلاة</button></div>
    <h3>آياتنا</h3><div class="cards">${verses.length?verses.map(v=>`<div class="card"><div class="meta">${v.favorite?"⭐ ":""}${esc(v.ref||"")}</div><p>«${esc(v.text)}»</p><div class="action-row"><button class="btn small" data-action="toggleVerse" data-id="${v.id}">${v.favorite?"إزالة النجمة":"تمييز ⭐"}</button><button class="btn small" data-action="deleteVerse" data-id="${v.id}">حذف</button></div></div>`).join(""):`<div class="empty">لا توجد آيات محفوظة.</div>`}</div>
    <div class="paper-divider"></div><h3>صلوات وأمنيات</h3><div class="cards">${prayers.length?prayers.map(p=>`<div class="card"><h3>${p.done?"✅ ":""}${esc(p.title)}</h3><p>${esc(p.text||"")}</p><div class="action-row"><button class="btn small" data-action="togglePrayer" data-id="${p.id}">${p.done?"تمت":"تحققت"} ♥</button></div></div>`).join(""):`<div class="empty">يمكن أن تحفظوا هنا أشياء تتمنونها أو تصلّون من أجلها.</div>`}</div>
  </div>`;
}

function templateMessages(){
  const starred=state.messages.filter(m=>m.starred).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  return `<div class="page-inner">
    <div class="page-kicker">✉ رسائلنا</div><h1 class="page-title">رسائل لا تُنسى ⭐</h1>
    <p class="page-note">كل رسالة تحفظها هنا تبقى ذكرى صغيرة، ويمكن الرجوع للمحادثة الأصلية من واتساب.</p>
    <div class="card" style="margin-bottom:13px">
      <b>📲 إدخال رسالة من واتساب</b>
      <p>من واتساب اختر مشاركة الرسالة ثم اختر OsRa من قائمة المشاركة. عند تثبيت OsRa سيحاول استقبال النص مباشرة.</p>
      <button class="btn primary" data-action="addMessage">＋ إضافة يدويًا</button>
    </div>
    <div class="cards">${starred.length?starred.map(m=>messageCard(m)).join(""):`<div class="empty">لا توجد رسائل مميزة بعد. استخدم ⭐ على ما يستحق أن يبقى هنا، ثم شارك النص إلى OsRa أو أضفه يدويًا.</div>`}</div>
    ${state.messages.some(m=>!m.starred)?`<div class="paper-divider"></div><h3>كل الرسائل المحفوظة</h3><div class="cards">${state.messages.filter(m=>!m.starred).map(m=>messageCard(m)).join("")}</div>`:""}
  </div>`;
}
function messageCard(m){
  const wa=state.settings.whatsappUrl || (state.settings.raniaPhone?`https://wa.me/${state.settings.raniaPhone.replace(/\\D/g,"")}`:"");
  return `<div class="card"><div class="meta">${m.starred?"⭐ ":""}${formatDate(m.date)} • ${esc(m.sender||"")}</div><p>«${esc(m.text)}»</p><div class="action-row"><button class="btn small" data-action="toggleMessage" data-id="${m.id}">${m.starred?"إزالة ⭐":"تمييز ⭐"}</button>${wa?`<a class="btn small" href="${esc(wa)}" target="_blank" rel="noopener">فتح واتساب ↗</a>`:""}<button class="btn small" data-action="deleteMessage" data-id="${m.id}">حذف</button></div></div>`;
}


function templateClosing(){
  return `<div class="page-inner dedication-page"><div class="dedication-copy">
    <div class="page-kicker" style="text-align:center">❦ الصفحة الأخيرة</div>
    <h1>إهداء ❤️</h1>
    <p><strong>إلى أحب إنسانة إلى قلبي</strong> ♥️💛❤️</p>
    <p>إلى تلك التي أضاءت سماء حياتي،<br>بل هي التي جعلت لحياتي سماء.</p>
    <p>إهداء إلى جميلتي، وحبيبتي، وملاكي الصغير...<br>إلى القلب العجيب، والوجه الجميل، والابتسامة الرقيقة المنعشة،<br>يا من يسكنكِ كل شيء جميل.</p>
    <p>يا من بها رقة وصفاء وطهارة السماء،<br>مع قوة وعنفوان ورهوان 😉 الأرض<br>التقيا وتلاقيا.</p>
    <p>إهداء إلى تلك اليد الصغيرة،<br>التي تحمل حبًا كبيرًا،<br>وتتفتح بلمساتها أزهار سماوية،<br>مانحةً إياها الأبدية والحب والجمال.</p>
    <p>إلى صوت همساتك،<br>وضحكاتك العفوية،<br>وإلى غمازة الخد اليمين...</p>
    <p>أرسل قلبي وحبي، دائمًا وأبدًا،<br>لروحي... يا روحي، يا رنووووشي 😍😘</p>
    <p>يا من أحببتها للمنتهى،<br>وأحبها، وسأحبها...</p>
    <p style="text-align:center;font-size:24px"><strong>أحبك جدًا، وجداً، وجداًااا... ❤️</strong></p>
    <div class="paper-divider"></div>
    <p style="text-align:center;font-size:22px"><strong>رانيا...<br>حبيبتي، ورفيقة دربي،<br>وأجمل ما أعطاني إِلهُ السَّمَاءِ.</strong> ❤️</p>
  </div></div>`;
}

function templateSettings(){
  return `<div class="page-inner">
    <div class="page-kicker">⚙ الإعدادات</div><h1 class="page-title">حفظ القصة بأمان</h1>
    <div class="setting-grid">
      <div class="status ${libraryHandle?"good":"warn"}"><b>${libraryHandle?"📁 المكتبة مرتبطة":"⚠️ لم يتم ربط مكتبة الصور"}</b><p>${libraryHandle?esc(state.settings.libraryName||libraryHandle.name):"اختر مجلد OsRa Photos. يجب أن يكون الوصول من HTTPS أو localhost في المتصفحات الداعمة."}</p></div>
      <div class="card">
        <h3>التواريخ والأشخاص</h3>
        <div class="form-grid">
          ${field("startDate","بدأنا معًا",state.settings.startDate,"date")}
          ${field("engagementDate","تاريخ الخطوبة",state.settings.engagementDate,"date")}
          ${field("birthdayRania","عيد ميلاد رانيا",state.settings.birthdayRania,"date")}
          ${field("osamaPhone","رقم أسامة",state.settings.osamaPhone,"tel")}
          ${field("raniaPhone","رقم رانيا",state.settings.raniaPhone,"tel")}
          ${field("whatsappUrl","رابط المحادثة إن وجد",state.settings.whatsappUrl,"url")}
        </div>
        <button class="btn primary" data-action="saveSettings" style="margin-top:11px">حفظ الإعدادات</button>
      </div>
      <div class="card"><h3>النسخ الاحتياطي</h3><p>النسخة الخفيفة تحفظ بيانات OsRa ومسارات الصور، ولا تنسخ الـ2000 صورة الأصلية داخل ملف JSON.</p><div class="action-row"><button class="btn primary" data-action="backup">تصدير نسخة احتياطية</button><button class="btn" data-action="restore">استرجاع نسخة</button></div></div>
      <div class="card"><h3>المكتبة والصور</h3><div class="action-row"><button class="btn" data-action="chooseFolder">📁 اختيار / إعادة ربط المجلد</button><button class="btn" data-action="rescan">↻ فحص المكتبة</button><button class="btn" data-action="diagnostic">تشخيص</button></div><p id="libraryDiag" class="meta">عدد الصور المفهرسة: ${countPhotos()}</p></div>
      <div class="card"><h3>التطبيق</h3><p>OsRa يعمل محليًا بعد تحميل التطبيق، لكن فتح الصور الأصلية يعتمد على إذن المتصفح للمجلد المرتبط.</p><div class="action-row"><button class="btn" data-action="go" data-section="home">العودة للبداية</button></div></div>
    </div>
  </div>`;
}
function field(id,label,value,type){
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(value||"")}"></div>`;
}
function renderSection(section, direction=1, preserveInner=false){
  activeSection=section;
  let html;
  if(section==="home") html=templateHome();
  if(section==="memories") html=templateMemories($("#memorySearch")?.value||"");
  if(section==="story") html=templateStory();
  if(section==="dreams") html=templateDreams();
  if(section==="spiritual") html=templateSpiritual();
  if(section==="messages") html=templateMessages();
  if(section==="settings") html=templateSettings();
  if(section==="closing") html=templateClosing();
  $("#flipPage").innerHTML=html;
  $("#flipPage").className="page flip-page";
  $("#mainPage").innerHTML=html;
  document.querySelectorAll(".section-nav button").forEach(b=>b.classList.toggle("active",b.dataset.section===section));
  hydrateImages();
  setTimeout(bindSharedFormState,0);
}
let flipping=false;
function navigate(section,dir=1){
  if(flipping || section===activeSection) return;
  flipping=true;
  const nextHTML = (()=> {
    if(section==="home")return templateHome();
    if(section==="memories")return templateMemories();
    if(section==="story")return templateStory();
    if(section==="dreams")return templateDreams();
    if(section==="spiritual")return templateSpiritual();
    if(section==="messages")return templateMessages();
    if(section==="closing")return templateClosing();
    return templateSettings();
  })();
  $("#flipPage").innerHTML=nextHTML;
  $("#underPage").innerHTML="";
  $("#book").classList?.remove;
  const book=document.querySelector(".book");
  book.classList.remove("is-next","is-prev");
  void book.offsetWidth;
  book.classList.add(dir>0?"is-next":"is-prev");
  setTimeout(()=>{
    $("#mainPage").innerHTML=nextHTML;
    book.classList.remove("is-next","is-prev");
    activeSection=section;
    document.querySelectorAll(".section-nav button").forEach(b=>b.classList.toggle("active",b.dataset.section===section));
    hydrateImages();
    bindSharedFormState();
    flipping=false;
  },620);
}
function bindSharedFormState(){}
async function hydrateImages(){
  document.querySelectorAll("[data-thumb]").forEach(el=>{
    const id=el.dataset.thumb; const p=photoStore.get(id);
    if(!p?.thumbBlob)return;
    let url=thumbUrlCache.get(id);
    if(!url){ url=URL.createObjectURL(p.thumbBlob); thumbUrlCache.set(id,url); }
    el.src=url;
  });
  const daily=$("#dailyImg"); if(daily){
    const photos=activePhotos().sort((a,b)=>String(a.relPath).localeCompare(String(b.relPath)));
    const p=photos.length?photos[dateSeed()%photos.length]:null;
    if(p?.thumbBlob){
      let url=thumbUrlCache.get(p.id);
      if(!url){ url=URL.createObjectURL(p.thumbBlob); thumbUrlCache.set(p.id,url); }
      daily.src=url;
    }
  }
}

async function chooseFolder(){
  if(!window.showDirectoryPicker){
    toast("هذا المتصفح لا يدعم اختيار المجلدات؛ استخدم Chrome حديثًا.");
    return;
  }
  try{
    const handle=await window.showDirectoryPicker({id:"OsRaPhotos",mode:"read"});
    libraryHandle=handle;
    state.settings.libraryName=handle.name;
    await putRec("library",{key:"main",handle,name:handle.name});
    await persist();
    toast("تم ربط مكتبة الصور. بدء الفحص...");
    await rescanLibrary(handle,true);
  }catch(e){
    if(e?.name!=="AbortError") toast("تعذر ربط المجلد: "+(e.message||"خطأ"));
  }
}
async function ensurePermission(handle){
  if(!handle)return false;
  try{
    const q=await handle.queryPermission({mode:"read"});
    if(q==="granted")return true;
    if(q==="prompt"){
      const r=await handle.requestPermission({mode:"read"});
      return r==="granted";
    }
  }catch(e){}
  return false;
}
async function resolveFileHandle(root, rel){
  const parts=rel.split("/").filter(Boolean);
  let dir=root;
  for(let i=0;i<parts.length-1;i++) dir=await dir.getDirectoryHandle(parts[i]);
  return dir.getFileHandle(parts.at(-1));
}
function isImage(name){
  return /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(name);
}
function firstSegment(rel){return rel.split("/")[0]||"بدون ألبوم"}
async function makeThumb(file){
  if(file.type.includes("heic") || file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) return null;
  try{
    const bmp=await createImageBitmap(file);
    const max=300, scale=Math.min(1,max/Math.max(bmp.width,bmp.height));
    const c=document.createElement("canvas"); c.width=Math.max(1,Math.round(bmp.width*scale)); c.height=Math.max(1,Math.round(bmp.height*scale));
    c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
    bmp.close?.();
    return await new Promise(r=>c.toBlob(r,"image/webp",.62));
  }catch(e){
    return null;
  }
}
async function rescanLibrary(handle=libraryHandle, announce=false){
  if(!handle)return chooseFolder();
  if(!await ensurePermission(handle)){toast("إذن قراءة المكتبة غير متاح. استخدم إعادة الربط.");return;}
  const status=toastProgress("أفحص المكتبة...");
  const seen=new Set(); let found=0, created=0, missing=0;
  const photoByPath=new Map(allPhotos().map(p=>[p.relPath,p]));
  async function walk(dir, prefix=""){
    for await(const [name,entry] of dir.entries()){
      const rel=prefix?prefix+"/"+name:name;
      if(entry.kind==="directory"){await walk(entry,rel);continue;}
      if(!isImage(name))continue;
      found++;
      const key=rel;
      seen.add(key);
      let existing=photoByPath.get(key);
      let file;
      try{file=await entry.getFile()}catch(e){continue}
      if(existing){
        if(existing.size===file.size && existing.lastModified===file.lastModified){
          existing.handleName=name;
          await putRec("photos",existing);
          photoStore.set(existing.id,existing);
        }else{
          existing.size=file.size; existing.lastModified=file.lastModified;
          if(thumbUrlCache.has(existing.id)){ URL.revokeObjectURL(thumbUrlCache.get(existing.id)); thumbUrlCache.delete(existing.id); }
          existing.thumbBlob=await makeThumb(file); existing.missing=false; existing.addedAt=Date.now();
          await putRec("photos",existing); photoStore.set(existing.id,existing);
        }
      }else{
        const id=uid("ph");
        const rec={id,relPath:key,name,album:firstSegment(key),size:file.size,lastModified:file.lastModified,addedAt:Date.now(),missing:false,thumbBlob:await makeThumb(file)};
        await putRec("photos",rec); photoStore.set(id,rec); photoByPath.set(key,rec); created++;
        ensureMemoryForAlbum(rec.album);
      }
      if(found%10===0) status.textContent=`فحص المكتبة… ${found} صورة`;
      if(found%60===0) await new Promise(r=>setTimeout(r,0));
    }
  }
  try{
    await walk(handle);
    for(const p of photoStore.values()){
      if(!seen.has(p.relPath) && !p.missing){ p.missing=true; missing++; await putRec("photos",p); }
    }
    rebuildMemoryPhotoLists();
    await persist();
    if(announce)toast(`تم فحص ${found} صورة، وإضافة ${created} جديدة${missing?`، والمفقود ${missing}`:""}.`);
    else toast(`تم تحديث المكتبة: ${found} صورة.`);
    status.remove?.();
    renderSection(activeSection);
  }catch(e){
    status.remove?.();
    toast("حدث خطأ أثناء فحص المكتبة.");
  }
}
function toastProgress(t){
  const x=$("#toast");x.textContent=t;x.classList.add("show");return x;
}
function ensureMemoryForAlbum(album){
  if(!state.memories.some(m=>(m.album||m.title)===album)){
    state.memories.push({id:uid("mem"),title:album,date:"",place:"",description:"",album,photoIds:[],favorite:false});
  }
}
function rebuildMemoryPhotoLists(){
  const by=new Map();
  for(const p of photoStore.values()){
    if(!by.has(p.album))by.set(p.album,[]);
    by.get(p.album).push(p.id);
  }
  for(const [album,ids] of by) ids.sort((a,b)=>String(photoStore.get(a)?.relPath).localeCompare(String(photoStore.get(b)?.relPath)));
  state.memories.forEach(m=>{ const key=m.album||m.title; m.photoIds=by.get(key)||m.photoIds||[]; });
  for(const [album,ids] of by){
    if(!state.memories.some(m=>(m.album||m.title)===album)){
      state.memories.push({id:uid("mem"),title:album,date:"",place:"",description:"",album,photoIds:ids});
    }
  }
}

async function openPhoto(id){
  const p=photoStore.get(id); if(!p)return;
  const m=state.memories.find(x=>(x.photoIds||[]).includes(id));
  lightbox.photoIds=m?m.photoIds.slice():[id];
  lightbox.index=Math.max(0,lightbox.photoIds.indexOf(id));
  if(!$("#lightbox").open) $("#lightbox").showModal();
  await showLightboxCurrent();
}
async function showLightboxCurrent(){
  const id=lightbox.photoIds[lightbox.index], p=photoStore.get(id);
  if(!p)return;
  if(lightbox.objectUrl){URL.revokeObjectURL(lightbox.objectUrl);lightbox.objectUrl=null}
  $("#lbImage").removeAttribute("src"); $("#lbLoading").hidden=false; $("#lbCaption").textContent=p.name;
  try{
    if(!libraryHandle || !await ensurePermission(libraryHandle)) throw new Error("no permission");
    const fh=await resolveFileHandle(libraryHandle,p.relPath);
    const file=await fh.getFile();
    lightbox.objectUrl=URL.createObjectURL(file);
    $("#lbImage").src=lightbox.objectUrl;
    $("#lbLoading").hidden=true;
  }catch(e){
    if(p.thumbBlob){lightbox.objectUrl=URL.createObjectURL(p.thumbBlob);$("#lbImage").src=lightbox.objectUrl;$("#lbLoading").hidden=true;$("#lbCaption").textContent=p.name+" — نسخة مصغرة"}
    else{$("#lbLoading").hidden=true;$("#lbCaption").textContent="الصورة غير متاحة؛ أعد ربط المكتبة."}
  }
}
function closeLightbox(){
  if(lightbox.objectUrl)URL.revokeObjectURL(lightbox.objectUrl);
  lightbox.objectUrl=null;$("#lightbox").close();
}

function showModal(html){
  $("#modalBody").innerHTML=html;
  $("#modal").showModal();
}
function closeModal(){if($("#modal").open)$("#modal").close()}

function editMemory(id){
  const m=state.memories.find(x=>x.id===id);
  if(!m)return;
  showModal(`<h2>${m.title?"تعديل":"إضافة"} ذكرى</h2><div class="form">
    ${field("fTitle","اسم الذكرى",m.title||"","text")}
    ${field("fDate","التاريخ",m.date||"","date")}
    ${field("fPlace","المكان",m.place||"","text")}
    <div class="field"><label>وصف/تفصيلة</label><textarea id="fDesc">${esc(m.description||"")}</textarea></div>
    <div class="action-row"><button class="btn primary" data-action="saveMemory" data-id="${m.id}">حفظ</button><button class="btn" data-action="closeModal">إلغاء</button></div>
  </div>`);
}
function createMemory(){
  const m={id:uid("mem"),title:"",date:"",place:"",description:"",album:"",photoIds:[]};
  state.memories.unshift(m); editMemory(m.id);
}

function editDream(id){
  const d=state.dreams.find(x=>x.id===id);
  showModal(`<h2>${d?"تعديل الحلم":"حلم جديد"}</h2><div class="form">
    ${field("dTitle","الحلم",d?.title||"","text")}
    ${field("dDate","التاريخ المستهدف",d?.targetDate||"","date")}
    ${field("dProgress","نسبة التقدم 0–100",d?.progress??0,"number")}
    <div class="field"><label>تفصيل</label><textarea id="dNote">${esc(d?.note||"")}</textarea></div>
    <div class="action-row"><button class="btn primary" data-action="saveDream" data-id="${d?.id||""}">حفظ</button><button class="btn" data-action="closeModal">إلغاء</button></div>
  </div>`);
}
function addVerse(){
  showModal(`<h2>إضافة آية</h2><div class="form">${field("vRef","المرجع","","text")}<div class="field"><label>نص الآية</label><textarea id="vText"></textarea></div><button class="btn primary" data-action="saveVerse">حفظ</button></div>`);
}
function addPrayer(){
  showModal(`<h2>صلاة / أمنية</h2><div class="form">${field("pTitle","العنوان","","text")}<div class="field"><label>التفاصيل</label><textarea id="pText"></textarea></div><button class="btn primary" data-action="savePrayer">حفظ</button></div>`);
}
function addMessage(prefill=""){
  showModal(`<h2>رسالة مميزة ⭐</h2><div class="form">
    ${field("mDate","التاريخ",todayISO(),"date")}
    ${field("mSender","من","رانيا","text")}
    <div class="field"><label>نص الرسالة</label><textarea id="mText">${esc(prefill)}</textarea></div>
    <label><input type="checkbox" id="mStar" checked> مميزة ⭐</label>
    <button class="btn primary" data-action="saveMessage">حفظ</button>
  </div>`);
}
function addEvent(){
  showModal(`<h2>إضافة محطة في قصتنا</h2><div class="form">
    ${field("eTitle","العنوان","","text")}${field("eDate","التاريخ",todayISO(),"date")}
    <div class="field"><label>ماذا حدث؟</label><textarea id="eDesc"></textarea></div>
    <button class="btn primary" data-action="saveEvent">حفظ</button>
  </div>`);
}

async function processSharedMessage(){
  const params=new URLSearchParams(location.search);
  if(params.get("shared")==="1"){
    const text=params.get("text")||params.get("title")||"";
    history.replaceState({}, "", location.pathname);
    if(text) setTimeout(()=>addMessage(text),350);
  }
}

async function backup(){
  const payload={
    app:"OsRa",version:1,exportedAt:new Date().toISOString(),
    settings:{...state.settings},
    memories:state.memories.map(m=>({...m})),
    events:state.events,dreams:state.dreams,verses:state.verses,prayers:state.prayers,messages:state.messages,
    photoManifest:allPhotos().map(p=>({id:p.id,relPath:p.relPath,name:p.name,album:p.album,size:p.size,lastModified:p.lastModified,addedAt:p.addedAt}))
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`OsRa_Backup_${todayISO()}.json`;a.click();URL.revokeObjectURL(a.href);
  toast("تم تصدير نسخة بيانات OsRa.");
}
function restore(){
  const input=document.createElement("input");input.type="file";input.accept=".json,application/json";
  input.onchange=async()=>{
    const file=input.files?.[0];if(!file)return;
    try{
      const obj=JSON.parse(await file.text());
      if(obj.app!=="OsRa")throw new Error("ملف غير صالح");
      normalizeState(obj); state.settings.folderHandle=undefined;
      await persist();
      toast("تم استرجاع البيانات. أعد ربط مجلد الصور ثم اختر «فحص المكتبة».");
      renderSection("settings");
    }catch(e){toast("ملف النسخة الاحتياطية غير صالح.");}
  };input.click();
}

async function saveSettings(){
  const ids=["startDate","engagementDate","birthdayRania","osamaPhone","raniaPhone","whatsappUrl"];
  ids.forEach(id=>{const el=$("#"+id);if(el)state.settings[id]=el.value.trim()});
  await persist();toast("تم حفظ الإعدادات.");renderSection("settings");
}

async function saveMemory(id){
  const m=state.memories.find(x=>x.id===id); if(!m)return;
  m.title=$("#fTitle").value.trim()||"ذكرى بدون اسم";
  m.date=$("#fDate").value;
  m.place=$("#fPlace").value.trim();
  m.description=$("#fDesc").value.trim();
  await persist();closeModal();toast("تم حفظ الذكرى.");renderSection(activeSection);
}
async function saveDream(id){
  const existing=id?state.dreams.find(x=>x.id===id):null;
  const d=existing||{id:uid("dream"),title:"",targetDate:"",progress:0,note:"",done:false};
  d.title=$("#dTitle").value.trim()||"حلم جديد";d.targetDate=$("#dDate").value;d.progress=Math.max(0,Math.min(100,Number($("#dProgress").value||0)));d.note=$("#dNote").value.trim();d.done=d.progress>=100;
  if(!existing)state.dreams.unshift(d);await persist();closeModal();toast("تم حفظ الحلم.");renderSection("dreams");
}
async function saveVerse(){
  state.verses.unshift({id:uid("verse"),ref:$("#vRef").value.trim(),text:$("#vText").value.trim(),favorite:false});
  await persist();closeModal();renderSection("spiritual");
}
async function savePrayer(){
  state.prayers.unshift({id:uid("pr"),title:$("#pTitle").value.trim(),text:$("#pText").value.trim(),done:false});
  await persist();closeModal();renderSection("spiritual");
}
async function saveMessage(){
  state.messages.unshift({id:uid("msg"),date:$("#mDate").value,sender:$("#mSender").value.trim(),text:$("#mText").value.trim(),starred:$("#mStar").checked});
  await persist();closeModal();renderSection("messages");
}
async function saveEvent(){
  state.events.unshift({id:uid("ev"),title:$("#eTitle").value.trim(),date:$("#eDate").value,description:$("#eDesc").value.trim()});
  await persist();closeModal();toast("أضيفت محطة جديدة.");renderSection("story");
}
async function toggleId(listName,id,key){
  const arr=state[listName];const x=arr.find(v=>v.id===id);if(!x)return;x[key]=!x[key];await persist();renderSection(activeSection);
}

document.addEventListener("click",async e=>{
  const btn=e.target.closest("[data-action]");
  if(btn){
    const a=btn.dataset.action, id=btn.dataset.id;
    if(a==="go")navigate(btn.dataset.section,1);
    else if(a==="chooseFolder")await chooseFolder();
    else if(a==="rescan")await rescanLibrary();
    else if(a==="openMemory"){const m=state.memories.find(x=>x.id===id);if(m){$("#mainPage").innerHTML=templateMemory(m);hydrateImages();}}
    else if(a==="editMemory")editMemory(id);
    else if(a==="backToMemories")renderSection("memories");
    else if(a==="openPhoto")await openPhoto(id);
    else if(a==="addEvent")addEvent();
    else if(a==="addDream")editDream();
    else if(a==="editDream")editDream(id);
    else if(a==="addVerse")addVerse();
    else if(a==="addPrayer")addPrayer();
    else if(a==="addMessage")addMessage();
    else if(a==="toggleVerse"){await toggleId("verses",id,"favorite");}
    else if(a==="togglePrayer"){await toggleId("prayers",id,"done");}
    else if(a==="deleteVerse"){state.verses=state.verses.filter(v=>v.id!==id);await persist();renderSection("spiritual")}
    else if(a==="toggleMessage"){await toggleId("messages",id,"starred");}
    else if(a==="deleteMessage"){state.messages=state.messages.filter(v=>v.id!==id);await persist();renderSection("messages")}
    else if(a==="saveMemory")await saveMemory(id);
    else if(a==="saveDream")await saveDream(id);
    else if(a==="saveVerse")await saveVerse();
    else if(a==="savePrayer")await savePrayer();
    else if(a==="saveMessage")await saveMessage();
    else if(a==="saveEvent")await saveEvent();
    else if(a==="saveSettings")await saveSettings();
    else if(a==="backup")await backup();
    else if(a==="restore")restore();
    else if(a==="diagnostic")await runDiagnostic();
    else if(a==="closeModal")closeModal();
    return;
  }
  const nav=e.target.closest(".section-nav button");
  if(nav){navigate(nav.dataset.section, nav.dataset.section===activeSection?0:1)}
});

$("#modalClose").addEventListener("click",closeModal);
$("#lbClose").addEventListener("click",closeLightbox);
$("#lbPrev").addEventListener("click",async()=>{if(lightbox.index>0){lightbox.index--;await showLightboxCurrent()}});
$("#lbNext").addEventListener("click",async()=>{if(lightbox.index<lightbox.photoIds.length-1){lightbox.index++;await showLightboxCurrent()}});
$("#lightbox").addEventListener("click",e=>{if(e.target.id==="lightbox")closeLightbox()});
$("#quickSearchBtn").addEventListener("click",()=>showGlobalSearch());
$("#installBtn").addEventListener("click",async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$("#installBtn").hidden=true}});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("#installBtn").hidden=false});
window.addEventListener("appinstalled",()=>toast("تم تثبيت OsRa ❤️"));

async function runDiagnostic(){
  const secure=window.isSecureContext;
  const picker=!!window.showDirectoryPicker;
  let perm="لا توجد مكتبة";
  if(libraryHandle){try{perm=await libraryHandle.queryPermission({mode:"read"})}catch(e){perm="غير معروف"}}
  const est=await navigator.storage?.estimate?.();
  const html=`<h2>تشخيص OsRa</h2><div class="cards">
    <div class="status ${secure?"good":"warn"}">السياق الآمن: <b>${secure?"نعم":"لا"}</b></div>
    <div class="status ${picker?"good":"warn"}">اختيار مجلدات: <b>${picker?"متاح":"غير متاح"}</b></div>
    <div class="status ${libraryHandle?"good":"warn"}">المكتبة: <b>${libraryHandle?esc(libraryHandle.name):"غير مرتبطة"}</b></div>
    <div class="status">الإذن الحالي: <b>${esc(perm)}</b></div>
    <div class="status">الصور المفهرسة: <b>${countPhotos()}</b></div>
    <div class="status">صور مفقودة بعد آخر فحص: <b>${allPhotos().filter(p=>p.missing).length}</b></div>
    <div class="status">التخزين التقريبي المستخدم: <b>${est?.usage?Math.round(est.usage/1024/1024)+" MB":"غير متاح"}</b></div>
  </div><p class="page-note">إذا كان السياق غير آمن أو لا يوجد دعم لاختيار المجلد، افتح OsRa عبر HTTPS أو localhost في Chrome حديث.</p>`;
  showModal(html);
}

function showGlobalSearch(){
  showModal(`<h2>بحث في OsRa</h2><div class="form"><div class="field"><label>اكتب اسم ذكرى أو رسالة أو تاريخ أو مكان</label><input id="globalQ" autofocus></div><button class="btn primary" data-action="doGlobalSearch">بحث</button><div id="globalResults"></div></div>`);
}
document.addEventListener("input",e=>{
  if(e.target.id==="memorySearch"){
    const q=e.target.value;const holder=$("#mainPage");holder.innerHTML=templateMemories(q);hydrateImages();
  }
});
document.addEventListener("click",e=>{
  if(e.target.closest("[data-action='doGlobalSearch']")){
    const q=$("#globalQ").value.trim().toLowerCase(), out=[];
    state.memories.filter(x=>[x.title,x.date,x.place,x.description].join(" ").toLowerCase().includes(q)).forEach(x=>out.push(`📸 ${esc(x.title)} — ${formatDate(x.date)}`));
    state.messages.filter(x=>[x.text,x.date,x.sender].join(" ").toLowerCase().includes(q)).forEach(x=>out.push(`✉ ${esc(x.sender)} — ${formatDate(x.date)}`));
    state.dreams.filter(x=>[x.title,x.note,x.targetDate].join(" ").toLowerCase().includes(q)).forEach(x=>out.push(`✦ ${esc(x.title)}`));
    state.verses.filter(x=>[x.text,x.ref].join(" ").toLowerCase().includes(q)).forEach(x=>out.push(`☼ ${esc(x.ref)}`));
    $("#globalResults").innerHTML=out.length?`<div class="cards">${out.slice(0,40).map(x=>`<div class="card">${x}</div>`).join("")}</div>`:`<div class="empty">لا توجد نتائج.</div>`;
  }
});

function render(){
  $("#mainPage").innerHTML=templateHome();
  document.querySelectorAll(".section-nav button").forEach(b=>b.classList.toggle("active",b.dataset.section==="home"));
  hydrateImages();
}

async function boot(){
  try{
    await openDB();await loadState();await loadPhotoMeta();
    render();
    await processSharedMessage();
    if("serviceWorker" in navigator){
      try{await navigator.serviceWorker.register("sw.js")}catch(e){}
    }
  }catch(e){
    console.error(e);
    toast("تعذر بدء OsRa. جرّب تحديث الصفحة.");
  }
}
let touchStartX=0, touchStartY=0;
const bookEl=document.querySelector('.book');
bookEl.addEventListener('touchstart',e=>{
  const t=e.changedTouches[0]; touchStartX=t.clientX; touchStartY=t.clientY;
},{passive:true});
bookEl.addEventListener('touchend',e=>{
  const t=e.changedTouches[0], dx=t.clientX-touchStartX, dy=t.clientY-touchStartY;
  if(Math.abs(dx)<60 || Math.abs(dx)<Math.abs(dy)) return;
  const order=['home','memories','story','dreams','spiritual','messages','settings','closing'];
  const i=order.indexOf(activeSection);
  // RTL reading: swipe right goes to previous page; swipe left goes to next page.
  if(dx<0 && i<order.length-1) navigate(order[i+1],1);
  if(dx>0 && i>0) navigate(order[i-1],-1);
},{passive:true});
document.addEventListener('keydown',e=>{
  if(e.key!=='ArrowLeft' && e.key!=='ArrowRight') return;
  const order=['home','memories','story','dreams','spiritual','messages','settings','closing'];
  const i=order.indexOf(activeSection);
  if(e.key==='ArrowLeft' && i<order.length-1) navigate(order[i+1],1);
  if(e.key==='ArrowRight' && i>0) navigate(order[i-1],-1);
});

boot();
