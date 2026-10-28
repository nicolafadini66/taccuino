/* Taccuino di scavo — funzionamento offline: l'app e le librerie restano sul dispositivo */
const VERSIONE = 'taccuino-v7';
const BASE = ['./', './index.html', './manifest.webmanifest', './manifest-campo.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];
const ESTERNI = ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSIONE);
    await c.addAll(BASE);
    for (const u of ESTERNI) { try { await c.add(new Request(u, { mode: 'cors' })); } catch (err) { /* la libreria PDF si salva al primo uso in rete */ } }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSIONE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;                                   // le chiamate all'archivio passano sempre dalla rete
  if (/script\.google(usercontent)?\.com$/.test(url.hostname)) return;
  if (url.searchParams.has('verifica')) return;                      // controllo degli aggiornamenti: sempre dalla rete
  if (req.mode === 'navigate') {                                       // pagina: rete se c'è, altrimenti la copia salvata
    e.respondWith(fetch(new Request(url.href, { cache: 'no-store', credentials: 'same-origin' })).then(r => { const cp = r.clone(); caches.open(VERSIONE).then(c => { c.put('./index.html', cp.clone()); c.put('./', cp); }); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {   // librerie, caratteri, icone: prima la copia salvata
    if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(VERSIONE).then(c => c.put(req, cp)); }
    return r;
  })));
});
