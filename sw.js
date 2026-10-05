const BUILD='osra100-20261005';
const CACHE=`OsRa-v100-${BUILD}`;
const APP=[
  './',
  './index.html',
  './style.css',
  './app.js?v=osra100-20261005',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];
const SHELL=new Set(APP.map(x=>new URL(x,self.location.href).pathname));

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE)
    .then(c=>c.addAll(APP))
    .then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(
    keys.filter(k=>/^OsRa-/i.test(k) && k!==CACHE).map(k=>caches.delete(k))
  )).then(()=>self.clients.claim())
));

async function freshNetwork(request){
  const fresh=new Request(request,{cache:'no-store'});
  const res=await fetch(fresh);
  if(res.ok) caches.open(CACHE).then(c=>c.put(request,res.clone())).catch(()=>{});
  return res;
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin) return;
  const isNav=e.request.mode==='navigate'||e.request.destination==='document';
  const isShell=SHELL.has(u.pathname);
  if(isNav||isShell){
    e.respondWith(
      freshNetwork(e.request).catch(()=>
        caches.match(e.request,{ignoreSearch:false})
          .then(r=>r||caches.match(e.request,{ignoreSearch:true}))
          .then(r=>r||caches.match('./index.html',{ignoreSearch:true}))
      )
    );
    return;
  }
  e.respondWith(
    caches.match(e.request,{ignoreSearch:false})
      .then(cached=>cached||freshNetwork(e.request))
      .catch(()=>caches.match('./index.html',{ignoreSearch:true}))
  );
});
