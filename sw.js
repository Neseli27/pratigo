const CACHE_NAME = 'pratigo-v8';
const ASSETS = [
    '/',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Yüklenince temel dosyaları önbelleğe al
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Eski önbellekleri temizle
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Network-first strateji (önce internet, yoksa önbellek)
self.addEventListener('fetch', e => {
    // Firebase ve API isteklerini cache'leme
    if (e.request.url.includes('firebasejs') || 
        e.request.url.includes('firestore') ||
        e.request.url.includes('googleapis')) {
        return;
    }

    e.respondWith(
        fetch(e.request)
            .then(res => {
                // Başarılı yanıtı önbelleğe al
                if (res.status === 200) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});
