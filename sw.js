const CACHE_NAME = 'beautylash-cache-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style_index.css',
    '/style_agendamento.css',
    '/style_meus_agendamentos.css',
    '/auth.js',
    '/script_agendamento_auth.js',
    '/script_meus_agendamentos.js',
    '/agendamento_auth.html',
    '/meus-agendamentos.html',
    '/manifest.json',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap'
];

// Instala o service worker e faz cache dos arquivos essenciais
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Ativa o service worker e limpa caches antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Intercepta requisições
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // ⚠️ Ignora chamadas do Firestore realtime (Listen)
    if (url.includes('firestore.googleapis.com')) {
        return;
    }

    // Estratégia de cache: network first para arquivos online
    event.respondWith(
        fetch(event.request)
            .then(response => {
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
