const C='yolcu-v2';
const ONBELLEK=['./yolcu.html','./config.js','./sofor-ikon.svg','./yolcu-manifest.json'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(ONBELLEK).catch(()=>{})))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>clients.claim())));
// HTML ve JS her zaman internetten; eski sürüm yapışmasın. Resim gibi statikler önbellekten.
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!='GET')return;
 const u=new URL(r.url),dosya=u.pathname.split('/').pop();
 if(r.mode=='navigate'||/\.(js|html)$/.test(dosya)){
  e.respondWith(fetch(r).then(x=>{const k=x.clone();caches.open(C).then(c=>c.put(r,k)).catch(()=>{});return x}).catch(()=>caches.match(r)));
  return;
 }
 e.respondWith(caches.match(r).then(x=>x||fetch(r).then(y=>{const k=y.clone();caches.open(C).then(c=>c.put(r,k)).catch(()=>{});return y}).catch(()=>x)));
});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window'}).then(L=>L.length?L[0].focus():clients.openWindow('./yolcu.html')))});
