const BUILD='osra100-20261006-r23';
const CACHE=`OsRa-v100-${BUILD}`;
const APP=[
  './',
  './index.html',
  './style.css',
  './app.js?v=osra100-20261006-r23',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];
const SHELL=new Set(APP.map(x=>new URL(x,self.location.href).pathname));

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(
    keys.filter(k=>/^OsRa-/i.test(k)&&k!==CACHE).map(k=>caches.delete(k))
  )).then(()=>self.clients.claim())
));

async function freshNetwork(request){
  const fresh=new Request(request,{cache:'no-store'});
  const res=await fetch(fresh);
  if(res.ok) caches.open(CACHE).then(c=>c.put(request,res.clone())).catch(()=>{});
  return res;
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const u=new URL(event.request.url);
  if(u.origin!==location.origin) return;
  const isNav=event.request.mode==='navigate'||event.request.destination==='document';
  const isShell=SHELL.has(u.pathname);
  if(isNav||isShell){
    event.respondWith((async()=>{
      const cached=await caches.match(event.request,{ignoreSearch:false})||await caches.match(event.request,{ignoreSearch:true})||await caches.match('./index.html',{ignoreSearch:true});
      if(cached){
        event.waitUntil(freshNetwork(event.request).catch(()=>{}));
        return cached;
      }
      return freshNetwork(event.request);
    })());
    return;
  }
  event.respondWith(
    caches.match(event.request,{ignoreSearch:false})
      .then(cached=>cached||freshNetwork(event.request))
      .catch(()=>caches.match('./index.html',{ignoreSearch:true}))
  );
});
