// --- 1. CONFIGURATION & UTILS ---
const PIPED_INSTANCES = ["https://api-piped.mha.fi", "https://pipedapi.drgns.space"];
const INVIDIOUS_INSTANCES = ["https://inv.nadeko.net", "https://invidious.projectsegfau.lt"];
const ODYSEE_API = "https://api.odysee.com/api/v1/proxy";

// Helper: Proxy to bypass CORS
async function proxiedFetch(url) {
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        const container = await response.json();
        return container.contents ? JSON.parse(container.contents) : null;
    } catch (e) { return null; }
}

// --- 2. HISTORY LOGIC (Must be defined before searchAll) ---
function saveSearchToHistory(query) {
    if (!query) return;
    let history = JSON.parse(localStorage.getItem("search_history") || "[]");
    history = history.filter(q => q !== query); // Remove duplicates
    history.unshift(query); // Add to front
    localStorage.setItem("search_history", JSON.stringify(history.slice(0, 10)));
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById("search-history");
    if (!container) return;
    const history = JSON.parse(localStorage.getItem("search_history") || "[]");
    container.innerHTML = history.map(q => `
        <span onclick="document.getElementById('q').value='${q}'; doSearch();" 
              style="background:#eee; padding:5px 12px; border-radius:20px; cursor:pointer; font-size:12px;">
            ${q}
        </span>`).join("");
}

// --- 3. SEARCH APIS ---
async function updateStatus(id, status) {
    const el = document.getElementById(`status-${id}`);
    if (el) el.innerText = `${id}: ${status === 'loading' ? '⏳' : status === 'success' ? '✅' : '❌'}`;
}

async function searchPiped(query) {
    updateStatus("piped", "loading");
    for (const inst of PIPED_INSTANCES) {
        const data = await proxiedFetch(`${inst}/search?q=${encodeURIComponent(query)}&filter=videos`);
        if (data?.items) {
            updateStatus("piped", "success");
            return data.items.map(v => ({ id: v.url?.split("v=")[1], title: v.title, platform: "yt", duration: v.duration, thumbnail: v.thumbnail, channel: v.uploaderName }));
        }
    }
    updateStatus("piped", "fail");
    return [];
}

async function searchInvidious(query) {
    updateStatus("invidious", "loading");
    for (const inst of INVIDIOUS_INSTANCES) {
        const data = await proxiedFetch(`${inst}/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
        if (Array.isArray(data)) {
            updateStatus("invidious", "success");
            return data.map(v => ({ id: v.videoId, title: v.title, platform: "yt", duration: v.lengthSeconds, thumbnail: v.videoThumbnails?.[0]?.url, channel: v.author }));
        }
    }
    updateStatus("invidious", "fail");
    return [];
}

async function searchOdysee(query) {
    updateStatus("odysee", "loading");
    const data = await proxiedFetch(`${ODYSEE_API}?method=claim_search&text=${encodeURIComponent(query)}&claim_type=stream&page_size=10`);
    if (data?.result?.items) {
        updateStatus("odysee", "success");
        return data.result.items.map(v => ({ id: v.claim_id, title: v.value.title, platform: "lbry", duration: v.value.video?.duration || 0, thumbnail: v.value.thumbnail?.url, channel: v.name }));
    }
    updateStatus("odysee", "fail");
    return [];
}

// --- 4. CORE ENGINE ---
async function searchAll(query) {
    saveSearchToHistory(query); // Now this is safely defined above!
    const results = await Promise.all([searchPiped(query), searchInvidious(query), searchOdysee(query)]);
    const flat = results.flat();
    const unique = new Map();
    flat.forEach(v => { if (v && v.id && !unique.has(v.id)) unique.set(v.id, v); });
    return Array.from(unique.values()).filter(v => v.duration > 60);
}

function renderResults(videos) {
    const el = document.getElementById("results");
    if (!el) return;
    el.innerHTML = videos.length ? "" : "<p>No videos found.</p>";
    videos.forEach(v => {
        const card = document.createElement("div");
        card.style = "border:1px solid #ddd; padding:10px; margin:10px 0; display:flex; gap:10px; cursor:pointer;";
        card.onclick = () => window.location.href = `player.html?id=${v.id}&p=${v.platform}`;
        card.innerHTML = `<img src="${v.thumbnail}" width="120"><p><b>${v.title}</b><br>${v.channel}</p>`;
        el.appendChild(card);
    });
}

// Global initialization
document.addEventListener("DOMContentLoaded", renderHistory);
window.searchAll = searchAll;
window.renderResults = renderResults;
