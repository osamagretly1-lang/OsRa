const CACHE='OsRa-v12';
const APP=['./','./index.html','./style.css','./app.js?v=12','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png'];
const SHELL=new Set(APP.map(x=>new URL(x,self.location.href).pathname));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('OsRa-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url); if(u.origin!==location.origin)return;
 const isNav=e.request.mode==='navigate'||e.request.destination==='document';
 const isShell=SHELL.has(u.pathname);
 if(isNav||isShell){
  e.respondWith(fetch(e.request).then(res=>{if(res.ok)caches.open(CACHE).then(c=>c.put(e.request,res.clone())).catch(()=>{});return res}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
 }else{
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{if(res.ok)caches.open(CACHE).then(c=>c.put(e.request,res.clone())).catch(()=>{});return res}).catch(()=>caches.match('./index.html'))));
 }
});
