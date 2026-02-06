// --- 1. CONFIGURATION ---
const PIPED_INSTANCES = ["https://api-piped.mha.fi", "https://pipedapi.drgns.space", "https://piped.video"];
const INVIDIOUS_INSTANCES = ["https://inv.nadeko.net", "https://invidious.projectsegfau.lt", "https://inv.tux.digital"];
const ODYSEE_API = "https://api.odysee.com/api/v1/proxy";

// YOUR CLOUDFLARE PROXY URL
const MY_PROXY = "https://intentional.legendm.workers.dev/?url=";

// --- 2. THE SMART FETCH ENGINE ---
// This handles Direct -> Private Proxy -> AllOrigins Fallback
async function smartFetch(url, forceProxy = false) {
    // Attempt 1: Direct fetch (Fastest, works for Piped)
    if (!forceProxy) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn("Direct fetch failed, trying private proxy...");
        }
    }

    // Attempt 2: Your Private Cloudflare Worker
    try {
        const res = await fetch(MY_PROXY + encodeURIComponent(url));
        if (res.ok) return await res.json();
    } catch (e) {
        console.warn("Private proxy failed, trying AllOrigins fallback...");
    }

    // Attempt 3: AllOrigins Public Fallback
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        const data = await res.json();
        return data.contents ? JSON.parse(data.contents) : data;
    } catch (e) {
        console.error("All fetch methods failed for:", url);
        return null;
    }
}

// --- 3. SEARCH APIS ---
async function searchPiped(query) {
    updateStatus("piped", "loading");
    for (const inst of PIPED_INSTANCES) {
        const data = await smartFetch(`${inst}/api/v1/search?q=${encodeURIComponent(query)}&filter=videos`, false);
        if (data?.items) {
            updateStatus("piped", "success");
            return data.items.map(v => ({
                id: v.url?.split("v=")[1] || v.videoId,
                title: v.title,
                platform: "yt",
                duration: v.duration || 0,
                thumbnail: v.thumbnail,
                channel: v.uploaderName
            })).filter(v => v.id);
        }
    }
    updateStatus("piped", "fail");
    return [];
}

async function searchInvidious(query) {
    updateStatus("invidious", "loading");
    for (const inst of INVIDIOUS_INSTANCES) {
        const data = await smartFetch(`${inst}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, true);
        if (Array.isArray(data)) {
            updateStatus("invidious", "success");
            return data.map(v => ({
                id: v.videoId,
                title: v.title,
                platform: "yt",
                duration: v.lengthSeconds || 0,
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
    const data = await smartFetch(`${ODYSEE_API}?method=claim_search&text=${encodeURIComponent(query)}&claim_type=stream&page_size=10`, true);
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

// --- 4. ENGINE & UI ---
function saveSearchToHistory(query) {
    if (!query) return;
    let history = JSON.parse(localStorage.getItem("search_history") || "[]");
    history = [query, ...history.filter(q => q !== query)].slice(0, 10);
    localStorage.setItem("search_history", JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById("search-history");
    if (!container) return;
    const history = JSON.parse(localStorage.getItem("search_history") || "[]");
    container.innerHTML = history.map(q => `
        <span onclick="document.getElementById('q').value='${q}'; doSearch();" 
              style="background:#eee; padding:5px 12px; border-radius:20px; cursor:pointer; font-size:12px; margin-right:5px; display:inline-block;">
            ${q}
        </span>`).join("");
}

function updateStatus(id, status) {
    const el = document.getElementById(`status-${id}`);
    if (el) {
        const icons = { loading: "⏳", success: "✅", fail: "❌" };
        el.innerText = `${id.charAt(0).toUpperCase() + id.slice(1)}: ${icons[status]}`;
    }
}

async function searchAll(query) {
    saveSearchToHistory(query);
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
    
    const finalVids = Array.from(unique.values()).filter(v => v.duration > 30);
    // Apply ranking if rank.js is loaded
    return typeof window.rankVideos === 'function' ? window.rankVideos(finalVids) : finalVids;
}

function renderResults(videos) {
    const el = document.getElementById("results");
    if (!el) return;
    el.innerHTML = videos.length ? "" : "<p>No videos found across platforms.</p>";
    
    videos.forEach(v => {
        const card = document.createElement("div");
        card.style = "border:1px solid #ddd; padding:10px; margin:10px 0; display:flex; gap:10px; cursor:pointer; border-radius:8px;";
        card.onclick = () => {
            if (typeof window.recordWatch === 'function') window.recordWatch(v);
            window.location.href = `player.html?id=${v.id}&p=${v.platform}`;
        };
        card.innerHTML = `
            <img src="${v.thumbnail}" width="120" style="border-radius:4px; height:68px; object-fit:cover;">
            <div style="overflow:hidden;">
                <b style="display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.title}</b>
                <small>${v.channel} (${v.platform.toUpperCase()})</small>
            </div>
        `;
        el.appendChild(card);
    });
}

// Global Initialization
document.addEventListener("DOMContentLoaded", renderHistory);
window.searchAll = searchAll;
window.renderResults = renderResults;
window.renderHistory = renderHistory;
