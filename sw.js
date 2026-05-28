// Service worker: офлайн-first для app shell, картинок и данных.
const CACHE = "pddge-v24";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./src/styles.css",
  "./src/app.js",
  "./src/data.js",
  "./src/visual_ids.js",
  "./src/store.js",
  "./src/render.js",
  "./src/tg.js",
  "./src/views/home.js",
  "./src/views/theory.js",
  "./src/views/ticket.js",
  "./src/views/practice.js",
  "./src/views/exam.js",
  "./src/views/result.js",
  "./src/views/mistakes.js",
  "./src/explanations/index.js",
  "./src/explanations/prioritet.js",
  "./src/explanations/uchastniki.js",
  "./src/explanations/neispravnosti.js",
  "./src/explanations/preduprezhd.js",
  "./src/explanations/zapreshch.js",
  "./src/explanations/predpisyv.js",
  "./src/explanations/info_ukaz.js",
  "./src/explanations/servis.js",
  "./src/explanations/dop_info.js",
  "./src/explanations/svetofor.js",
  "./src/explanations/regulirovshchik.js",
  "./src/explanations/specsignaly.js",
  "./src/explanations/avariynaya.js",
  "./src/explanations/svetozvuk.js",
  "./src/explanations/dvizhenie.js",
  "./src/explanations/obgon.js",
  "./src/explanations/skorost.js",
  "./src/explanations/distanciya.js",
  "./src/explanations/ostanovka.js",
  "./src/explanations/perekrestki.js",
  "./src/explanations/zhd.js",
  "./src/explanations/avtomagistral.js",
  "./src/explanations/zhilaya_zona.js",
  "./src/explanations/buksirovka.js",
  "./src/explanations/uchebnaya.js",
  "./src/explanations/perevozka.js",
  "./src/explanations/velo_skot.js",
  "./src/explanations/razmetka.js",
  "./src/explanations/med_pomoshch.js",
  "./src/explanations/bezopasnost.js",
  "./src/explanations/eko.js",
  "./data/questions.json",
  "./public/icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

// Принудительная активация нового SW по запросу из клиента
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// HTML — всегда network-first (чтобы новые версии HTML не залипали в кэше)
function isHTMLRequest(req, url) {
  if (req.mode === "navigate") return true;
  if (url.pathname === "/" || url.pathname.endsWith("/")) return true;
  if (url.pathname.endsWith(".html")) return true;
  return false;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // network-first для HTML и questions.json (чтобы обновления подхватывались)
  if (isHTMLRequest(req, url) || url.pathname.endsWith("/data/questions.json")) {
    e.respondWith(
      fetch(req).then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return r;
      }).catch(() => caches.match(req).then((c) => c || caches.match("./"))),
    );
    return;
  }

  // cache-first для всего остального
  e.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((r) => {
        if (r.ok && r.type === "basic") {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return r;
      }).catch(() => cached),
    ),
  );
});
