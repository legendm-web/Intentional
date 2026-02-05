// --- Updated 2026 Reliable Instances ---
const PIPED_INSTANCES = ["https://api-piped.mha.fi", "https://pipedapi.drgns.space", "https://pipedapi.kavin.rocks"];
const INVIDIOUS_INSTANCES = ["https://inv.nadeko.net", "https://invidious.projectsegfau.lt", "https://yewtu.be"];
const ODYSEE_API = "https://api.odysee.com/api/v1/proxy";

// Helper: Proxy to bypass CORS and handle errors gracefully
async function proxiedFetch(url) {
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) return null;
        const container = await response.json();
        return container.contents ? JSON.parse(container.contents) : null;
    } catch (e) {
        return null;
    }
}

async function updateStatus(id, status) {
    const el = document.getElementById(`status-${id}`);
    if (!el) return;
    const icons = { loading: "⏳", success: "✅", fail: "❌" };
    el.innerText = `${id.charAt(0).toUpperCase() + id.slice(1)}: ${icons[status]}`;
}

async function searchPiped(query) {
    updateStatus("piped", "loading");
    for (const instance of PIPED_INSTANCES) {
        const data = await proxiedFetch(`${instance}/search?q=${encodeURIComponent(query)}&filter=videos`);
        if (data?.items) {
            updateStatus("piped", "success");
            return data.items.map(v => ({
                id: v.url?.split("v=")[1],
                title: v.title,
                channel: v.uploaderName,
                thumbnail: v.thumbnail,
                duration: v.duration || 0,
                platform: "yt"
            })).filter(v => v.id);
        }
    }
    updateStatus("piped", "fail");
    return [];
}

async function searchInvidious(query) {
    updateStatus("invidious", "loading");
    for (const instance of INVIDIOUS_INSTANCES) {
        const data = await proxiedFetch(`${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
        if (Array.isArray(data)) {
            updateStatus("invidious", "success");
            return data.map(v => ({
                id: v.videoId,
                title: v.title,
                channel: v.author,
                thumbnail: v.videoThumbnails?.[0]?.url || "",
                duration: v.lengthSeconds || 0,
                platform: "yt"
            }));
        }
    }
    updateStatus("invidious", "fail");
    return [];
}

async function searchOdysee(query) {
    updateStatus("odysee", "loading");
    const url = `${ODYSEE_API}?method=claim_search&text=${encodeURIComponent(query)}&claim_type=stream&page_size=10`;
    const data = await proxiedFetch(url);
    if (data?.result?.items) {
        updateStatus("odysee", "success");
        return data.result.items.map(v => ({
            id: v.claim_id,
            title: v.value.title,
            channel: v.name,
            thumbnail: v.value.thumbnail?.url || "",
            duration: v.value.video?.duration || 0,
            platform: "lbry"
        }));
    }
    updateStatus("odysee", "fail");
    return [];
}

async function searchAll(query) {
    if (typeof saveSearchToHistory === 'function') saveSearchToHistory(query);

    // Run all APIs. If one fails, it returns [], so the app doesn't crash.
    const results = await Promise.all([
        searchPiped(query),
        searchInvidious(query),
        searchOdysee(query)
    ]);

    const flatResults = results.flat();
    const uniqueMap = new Map();

    flatResults.forEach(item => {
        // Safety check: Ensure item and id exist before processing
        if (item && item.id && !uniqueMap.has(item.id)) {
            uniqueMap.set(item.id, item);
        }
    });

    const finalResults = Array.from(uniqueMap.values()).filter(v => v.duration > 60);
    return typeof rankVideos === 'function' ? rankVideos(finalResults) : finalResults;
}

function renderResults(videos) {
    const el = document.getElementById("results");
    if (!el) return;
    el.innerHTML = videos.length ? "" : "<p>No videos found.</p>";

    videos.forEach(v => {
        const card = document.createElement("div");
        card.className = "card";
        card.style = "border:1px solid #ccc; margin:10px; padding:10px; cursor:pointer; display:flex; gap:15px;";
        card.onclick = () => window.location.href = `player.html?id=${v.id}&p=${v.platform}`;
        card.innerHTML = `
            <img src="${v.thumbnail}" style="width:120px; border-radius:4px;">
            <div>
                <h4 style="margin:0;">${v.title}</h4>
                <p style="font-size:0.8rem; color:grey;">${v.channel} (${v.platform.toUpperCase()})</p>
            </div>
        `;
        el.appendChild(card);
    });
}

window.searchAll = searchAll;
window.renderResults = renderResults;
