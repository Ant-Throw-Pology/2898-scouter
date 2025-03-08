const cacheName = 'scouter-offline';

const toCache = [
    '/2898-scouter/',
    '/2898-scouter/index.html',
    '/2898-scouter/index.css',
    '/2898-scouter/index.js',
    '/2898-scouter/manifest.webmanifest',
    '/2898-scouter/initial.png',
    '/2898-scouter/initial-mobile.png',
    '/2898-scouter/favicon.svg',
    '/2898-scouter/favicon-192.png',
    '/2898-scouter/favicon-512.png',
    '/2898-scouter/bin.svg',
    '/2898-scouter/teams-list-start.png',
    '/2898-scouter/teams-list-end.png',
];

const me = self as unknown as ServiceWorkerGlobalScope;

me.addEventListener('install', (event) => {
    console.log('Service worker install event!');
    event.waitUntil((async () => {
        const cache = await caches.open(cacheName);
        try {
            for (const path of toCache) {
                const req = new Request(path);
                const fetchedResponse = await fetch(req.clone());
                if (fetchedResponse.ok) {
                    console.log(req.url, "Fetched, updating cache");
                    await cache.put(req, fetchedResponse);
                }
            }
        } catch (e) {}
    })());
});

me.addEventListener('activate', (event) => {
    console.log('Service worker activate event!');
});

let lastIsOnline: boolean | undefined, lastIsOnlineTime: number | undefined;

async function isOnline() {
    if (!(location.host.includes("localhost") || location.host.includes("127.0.0.1")) && !navigator.onLine) return false;
    if (lastIsOnlineTime && lastIsOnlineTime >= Date.now() - 10000) {
        console.log(`Probably still o${lastIsOnline ? "n" : "ff"}line`);
        return lastIsOnline || false;
    }
    try {
        console.log("Checking offlineness");
        const res = await fetch("/", {method: "HEAD", signal: AbortSignal.timeout(3000)});
        lastIsOnline = res.ok;
        lastIsOnlineTime = Date.now();
        console.log(`Now o${lastIsOnline ? "n" : "ff"}line`);
        return lastIsOnline;
    } catch (e) {
        console.log("Network error, now offline");
        lastIsOnline = false;
        lastIsOnlineTime = Date.now();
        return false;
    }
}

me.addEventListener('fetch', (event) => {
    event.respondWith((async (req) => {
        if (toCache.includes(new URL(req.url).pathname)) {
            if (await isOnline()) {
                console.log(req.url, "Fetching");
                try {
                    const fetchedResponse = await fetch(req.clone());
                    if (fetchedResponse.ok) {
                        console.log(req.url, "Fetched, updating cache");
                        await (await caches.open(cacheName)).put(req, fetchedResponse.clone());
                        return fetchedResponse;
                    }
                } catch (e) {}
                console.log(req.url, "Fetch failed");
            } else console.log(req.url, "Offline, skipped fetching");
            const cachedResponse = await caches.match(req);
            if (cachedResponse) {
                console.log(req.url, "Serving from cache");
                return cachedResponse;
            }
        }
        console.log(req.url, "Serving from network normally");
        return fetch(req);
    })(event.request));
});