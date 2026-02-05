// --- 1. CONFIGURATION: EXTENDED INSTANCE LISTS ---
const PIPED_INSTANCES = [
    "https://api-piped.mha.fi",
    "https://pipedapi.drgns.space",
    "https://pipedapi.kavin.rocks",
    "https://piped-api.lunar.icu",
    "https://api.piped.projectsegfau.lt"
];

const INVIDIOUS_INSTANCES = [
    "https://inv.nadeko.net",
    "https://invidious.projectsegfau.lt",
    "https://inv.tux.digital",
    "https://invidious.nerdvpn.de",
    "https://iv.ggtyler.dev",
    "https://invidious.lunar.icu"
];

const ODYSEE_API = "https://api.odysee.com/api/v1/proxy";

// --- 2. MULTI-PROXY FALLBACK LOGIC ---
async function fetchWithProxy(url) {
    // List of proxies to try in order
    const proxies = [
        (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
        (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        (u) => `https://thingproxy.freeboard.io/fetch/${u}`
    ];

    for (const proxy of proxies) {
        try {
            const targetUrl = proxy(url);
            const response = await fetch(targetUrl, { signal: AbortSignal.timeout(5000) });
            
            if (!response.ok) continue;

            const data = await response.json();
            
            // AllOrigins wraps data in .contents, others might return it directly
            const content = data.contents ? JSON.parse(data.contents) : data;
            if (content) return content;
        } catch (e) {
            console.warn(`Proxy failed or timed out: ${proxy(url).split('?')[0]}`);
            continue;
        }
    }
    return null;
}

// --- 3. API SEARCHES ---
async function updateStatus(id, status) {
    const el = document.getElementById(`status-${id}`);
    if (el) {
        const icons = { loading: "⏳", success: "✅", fail: "❌" };
        el.innerText = `${id.charAt(0).toUpperCase() + id.slice(1)}: ${icons[status]}`;
    }
}

async function searchPiped(query) {
    updateStatus("piped", "loading");
    // Try top 3 instances
    for (let i = 0; i < 3; i++) {
        const data = await fetchWithProxy(`${PIPED_INSTANCES[i]}/search?q=${encodeURIComponent(query)}&filter=videos`);
        if (data?.items) {
            updateStatus("piped", "success");
            return data.items.map(v => ({
                id: v.url?.split("v=")[1],
                title: v.title,
                platform: "yt",
                duration: v.duration,
                thumbnail: v.thumbnail,
                channel: v.uploaderName
            }));
        }
    }
    updateStatus("piped", "fail");
    return [];
}

async function searchInvidious(query) {
    updateStatus("invidious", "loading");
    for (let i = 0; i < 3; i++) {
        const data = await fetchWithProxy(`${INVIDIOUS_INSTANCES[i]}/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
        if (Array.isArray(data)) {
            updateStatus("invidious", "success");
            return data.map(v => ({
                id: v.videoId,
                title: v.title,
                platform: "yt",
                duration: v.lengthSeconds,
                thumbnail: v.videoThumbnails?.[0]?.url,
                channel: v.author
            }));
        }
    }
    updateStatus("invidious", "fail");
    return [];
}

async function searchOdysee(query) {
    updateStatus("odysee", "loading");
    const data = await fetchWithProxy(`${ODYSEE_API}?method=claim_search&text=${encodeURIComponent(query)}&claim_type=stream&page_size=10`);
    if (data?.result?.items) {
        updateStatus("odysee", "success");
        return data.result.items.map(v => ({
            id: v.claim_id,
            title: v.value.title,
            platform: "lbry",
            duration: v.value.video?.duration || 0,
            thumbnail: v.value.thumbnail?.url,
            channel: v.name
        }));
    }
    updateStatus("odysee", "fail");
    return [];
}

// --- 4. ENGINE ---
async function searchAll(query) {
    if (typeof saveSearchToHistory === 'function') saveSearchToHistory(query);
    
    // Fire all searches
    const results = await Promise.all([
        searchPiped(query),
        searchInvidious(query),
        searchOdysee(query)
    ]);

    const flat = results.flat();
    const unique = new Map();
    flat.forEach(v => {
        if (v && v.id && !unique.has(v.id)) unique.set(v.id, v);
    });

    const videos = Array.from(unique.values()).filter(v => v.duration > 30);
    return typeof rankVideos === 'function' ? rankVideos(videos) : videos;
}

// ... Keep your renderResults and history functions below ...
