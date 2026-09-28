const CACHE="osra-v1";
const ASSETS=[
  "./","./index.html","./style.css","./app.js","./manifest.json","./icon.svg"
];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{
  if(e.request.method==="POST" && new URL(e.request.url).searchParams.get("shared")==="1"){
    e.respondWith((async()=>{
      let text="";
      try{
        const fd=await e.request.formData();
        text=(fd.get("text")||fd.get("title")||"").toString();
      }catch(err){}
      const url=new URL("./",self.location.origin);
      url.searchParams.set("shared","1");
      url.searchParams.set("text",text);
      return Response.redirect(url.toString(),303);
    })());
    return;
  }
  if(e.request.method!=="GET")return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{
    const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp;
  }).catch(()=>caches.match("./index.html"))));
});
