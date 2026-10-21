import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? walk(`${dir}/${e.name}`) : `${dir}/${e.name}`,
      ),
    )
  ).flat();
}
const files = (await walk("dist")).filter((p) => !p.endsWith("sw.js"));
const digest = createHash("sha256");
for (const file of files) digest.update(await readFile(file));
const version = "sidequest-" + digest.digest("hex").slice(0, 12);
const assets = ["/", ...files.map((p) => "/" + p.slice(5))];
await writeFile(
  "dist/sw.js",
  `
const CACHE=${JSON.stringify(version)};
const ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sidequest-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
async function navigation(request,event){
 const cached=await caches.match('/');
 const network=fetch(request).then(response=>response.ok||!cached?response:cached).catch(error=>{if(cached)return cached;throw error;});
 event.waitUntil(network.then(()=>{},()=>{}));
 if(!cached)return network;
 return Promise.race([network,new Promise(resolve=>setTimeout(()=>resolve(cached),1800))]);
}
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(event.request.mode==='navigate')event.respondWith(navigation(event.request,event));
 else event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
`,
);
console.log(`Offline shell ready: ${files.length} local assets, ${version}`);
