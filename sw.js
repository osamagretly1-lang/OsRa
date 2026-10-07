const BUILD='osra105-20261008-r29-28-surprise-styles';
const CACHE=`OsRa-v105-${BUILD}`;
const APP=[
  './',
  './index.html',
  './style.css',
  './app.js?v=osra105-20261008-r29-28-surprise-styles',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];
const SHELL=new Set(APP.map(x=>new URL(x,self.location.href).href));

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(APP)).then(()=>self.skipWaiting())
));

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  const hadOlderCache=keys.some(k=>/^OsRa-/i.test(k)&&k!==CACHE);
  await Promise.all(keys.filter(k=>/^OsRa-/i.test(k)&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
  if(hadOlderCache){
    const pages=await self.clients.matchAll({type:'window'});
    await Promise.all(pages.map(c=>c.navigate(c.url).catch(()=>null)));
  }
})()));

async function freshNetwork(request){
  const fresh=new Request(request,{cache:'no-store'});
  const res=await fetch(fresh);
  if(res.ok){
    const cache=await caches.open(CACHE);
    await cache.put(request,res.clone()).catch(()=>{});
  }
  return res;
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const u=new URL(event.request.url);
  if(u.origin!==location.origin) return;
  const isNav=event.request.mode==='navigate'||event.request.destination==='document';
  const isShell=SHELL.has(event.request.url);
  if(isNav||isShell){
    event.respondWith((async()=>{
      try{
        // Always prefer the current deployed files. Cache is fallback only.
        return await freshNetwork(event.request);
      }catch{
        return (await caches.match(event.request,{ignoreSearch:false})) ||
               (isNav ? await caches.match('./index.html') : null) ||
               new Response('',{status:504});
      }
    })());
    return;
  }
  event.respondWith(
    caches.match(event.request,{ignoreSearch:false}).then(cached=>cached||freshNetwork(event.request)).catch(()=>new Response('',{status:504}))
  );
});
