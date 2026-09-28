const CACHE='OsRa-v3';
const APP=['./','./index.html','./style.css','./app.js','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png'];
const SHELL=['index.html','style.css','app.js','manifest.json','icon.svg','icon-192.png','icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(APP))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('OsRa-')).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin) return;

  const name=url.pathname.split('/').pop();
  const shell=url.pathname.endsWith('/')||url.pathname.endsWith('/index.html')||SHELL.includes(name);

  if(shell){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          if(response.ok){
            const copy=response.clone();
            caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
          }
          return response;
        })
        .catch(()=>caches.match(event.request).then(response=>response||caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response=>response||fetch(event.request).then(network=>{
        const copy=network.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
        return network;
      }))
      .catch(()=>caches.match('./index.html'))
  );
});
