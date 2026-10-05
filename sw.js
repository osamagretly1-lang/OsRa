const CACHE='OsRa-v70-recovery-cachefixed-20261005';
const APP=['./','./index.html','./style.css','./app.js?v=70-recovery-cachefixed-20261005','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png'];
const SHELL=new Set(APP.map(x=>new URL(x,self.location.href).pathname));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('OsRa-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url); if(u.origin!==self.location.origin)return;
 const isNav=e.request.mode==='navigate'||e.request.destination==='document';
 const isShell=SHELL.has(u.pathname);
 if(isNav||isShell){e.respondWith(fetch(e.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone())).catch(()=>{});return r;}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('./index.html',{ignoreSearch:true}))));return;}
 e.respondWith(fetch(e.request).catch(()=>caches.match(e.request,{ignoreSearch:true})));
});
