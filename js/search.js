// --- Configuration: Using more reliable 2026 instances ---
const PIPED_INSTANCES = ["https://pipedapi.kavin.rocks", "https://api-piped.mha.fi", "https://pipedapi.drgns.space"];
const INVIDIOUS_INSTANCES = ["https://invidious.projectsegfau.lt", "https://inv.riverside.rocks"];
const ODYSEE_API = "https://api.odysee.com/api/v1/proxy";

// Helper: Proxy to bypass CORS
async function proxiedFetch(url) {
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) return null;
        const container = await response.json();
        return JSON.parse(container.contents);
    } catch (e) {
        return null;
    }
}

async function searchPiped(query) {
    for (const instance of PIPED_INSTANCES) {
        const data = await proxiedFetch(`${instance}/search?q=${encodeURIComponent(query)}&filter=videos`);
        if (data && data.items) {
            return data.items.map(v => ({
                id: v.url ? v.url.split("v=")[1] : null,
                title: v.title,
                channel: v.uploaderName,
                thumbnail: v.thumbnail,
                duration: v.duration,
                platform: "yt",
                topics: (v.title || "").toLowerCase().split(" ")
            })).filter(v => v.id); // Remove items without an ID
        }
    }
    return [];
}

async function searchInvidious(query) {
    for (const instance of INVIDIOUS_INSTANCES) {
        const data = await proxiedFetch(`${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
        if (Array.isArray(data)) {
            return data.map(v => ({
                id: v.videoId,
                title: v.title,
                channel: v.author,
                thumbnail: v.videoThumbnails?.[0]?.url || "",
                duration: v.lengthSeconds,
                platform: "yt",
                topics: (v.title || "").toLowerCase().split(" ")
            }));
        }
    }
    return [];
}

async function searchOdysee(query) {
    const url = `${ODYSEE_API}?method=claim_search&text=${encodeURIComponent(query)}&claim_type=stream&page_size=10`;
    const data = await proxiedFetch(url);
    if (data && data.result?.items) {
        return data.result.items.map(v => ({
            id: v.claim_id,
            title: v.value.title,
            channel: v.name,
            thumbnail: v.value.thumbnail?.url || "",
            duration: v.value.video?.duration || 0,
            platform: "lbry",
            topics: (v.value.title || "").toLowerCase().split(" ")
        }));
    }
    return [];
}

async function searchAll(query) {
    saveSearchToHistory(query);
    
    // Fetch all, but catch individual failures so one crash doesn't stop the rest
    const [piped, invidious, odysee] = await Promise.all([
        searchPiped(query).catch(() => []),
        searchInvidious(query).catch(() => []),
        searchOdysee(query).catch(() => [])
    ]);

    const flatResults = [...piped, ...invidious, ...odysee];
    const uniqueMap = new Map();

    flatResults.forEach(item => {
        // FIXED: Added check to ensure 'item' and 'item.id' exist
        if (item && item.id && !uniqueMap.has(item.id)) {
            uniqueMap.set(item.id, item);
        }
    });

    const finalResults = Array.from(uniqueMap.values()).filter(v => v.duration > 60);
    return typeof rankVideos === 'function' ? rankVideos(finalResults) : finalResults;
}

// ... Keep your renderResults and renderHistory functions below ...
