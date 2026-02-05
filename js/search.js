// --- 1. CONFIGURATION ---
const PIPED_INSTANCES = ["https://api-piped.mha.fi", "https://pipedapi.drgns.space"];
const INVIDIOUS_INSTANCES = ["https://inv.nadeko.net", "https://invidious.projectsegfau.lt"];
const ODYSEE_API = "https://api.odysee.com/api/v1/proxy";

// Helper: Proxy for CORS
async function proxiedFetch(url) {
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        const container = await response.json();
        return container.contents ? JSON.parse(container.contents) : null;
    } catch (e) { return null; }
}

// --- 2. HISTORY LOGIC ---
function saveSearchToHistory(query) {
    if (!query) return;
    let history = JSON.parse(localStorage.getItem("search_history") || "[]");
    history = history.filter(q => q !== query);
    history.unshift(query);
    localStorage.setItem("search_history", JSON.stringify(history.slice(0, 8)));
    renderHistory();
}

function clearHistory() {
    localStorage.removeItem("search_history");
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById("search-history");
    if (!container) return;
    
    const history = JSON.parse(localStorage.getItem("search_history") || "[]");
    
    if (history.length === 0) {
        container.innerHTML = "";
        return;
    }

    // Map history to chips + add a "Clear" button at the end
    let html = history.map(q => `
        <span onclick="document.getElementById('q').value='${q}'; doSearch();" 
              style="background:#eee; padding:5px 12px; border-radius:20px; cursor:pointer; font-size:12px; border:1px solid #ccc;">
            ${q}
        </span>`).join("");
    
    html += `<button onclick="clearHistory()" style="background:none; border:none; color:red; cursor:pointer; font-size:12px; margin-left:10px;">Clear All</button>`;
    
    container.innerHTML = html;
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

// --- 4. ENGINE ---
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

    const videos = Array.from(unique.values()).filter(v => v.duration > 60);
    return typeof rankVideos === 'function' ? rankVideos(videos) : videos;
}

function renderResults(videos) {
    const el = document.getElementById("results");
    if (!el) return;
    el.innerHTML = videos.length ? "" : "<p>No videos found. Try different terms.</p>";

    videos.forEach(v => {
        const card = document.createElement("div");
        card.style = "border:1px solid #ddd; padding:10px; margin:10px 0; display:flex; gap:15px; cursor:pointer; align-items:center; border-radius:8px;";
        card.onclick = () => window.location.href = `player.html?id=${v.id}&p=${v.platform}`;
        card.innerHTML = `
            <img src="${v.thumbnail}" style="width:140px; border-radius:4px; aspect-ratio:16/9; object-fit:cover;">
            <div>
                <h3 style="margin:0; font-size:1.1rem;">${v.title}</h3>
                <p style="margin:5px 0; color:#666;">${v.channel} • <span style="text-transform:uppercase; font-weight:bold; font-size:0.7rem;">${v.platform}</span></p>
            </div>
        `;
        el.appendChild(card);
    });
}

// Initialization
document.addEventListener("DOMContentLoaded", renderHistory);
window.searchAll = searchAll;
window.renderResults = renderResults;
window.clearHistory = clearHistory;
