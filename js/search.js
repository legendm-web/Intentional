/** * UNIVERSAL SEARCH CONFIGURATION
 */
const PIPED_API = "https://pipedapi.kavin.rocks";
const ODYSEE_API = "https://api.odysee.com/api/v1/proxy";
const INVIDIOUS_INSTANCES = [
    "https://invidious.projectsegfau.lt",
    "https://inv.riverside.rocks",
    "https://invidious.lunar.icu"
];

// Helper: AllOrigins Proxy
async function proxiedFetch(url) {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Proxy error');
    const container = await response.json();
    return JSON.parse(container.contents);
}

/**
 * SEARCH HISTORY LOGIC
 */
function saveSearchToHistory(query) {
    if (!query) return;
    let history = JSON.parse(localStorage.getItem("search_history") || "[]");
    
    // Remove if already exists (to move it to the front)
    history = history.filter(q => q !== query);
    history.unshift(query);
    
    // Keep only last 10 searches
    history = history.slice(0, 10);
    localStorage.setItem("search_history", JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById("search-history");
    if (!container) return;
    
    const history = JSON.parse(localStorage.getItem("search_history") || "[]");
    container.innerHTML = history.map(q => `
        <span class="history-chip" 
              onclick="document.getElementById('q').value='${q}'; doSearch();"
              style="background:#ddd; padding:4px 10px; border-radius:15px; cursor:pointer; font-size:0.8rem;">
            ${q}
        </span>
    `).join("");
}

/**
 * API SEARCH FUNCTIONS
 */
async function searchPiped(query) {
    try {
        const url = `${PIPED_API}/search?q=${encodeURIComponent(query)}&filter=videos`;
        const res = await fetch(url);
        const data = await res.json();
        return data.items.map(v => ({
            id: v.url.split("v=")[1],
            title: v.title,
            channel: v.uploaderName,
            thumbnail: v.thumbnail,
            duration: v.duration,
            platform: "yt",
            topics: v.title.toLowerCase().split(" ")
        }));
    } catch (e) { return []; }
}

async function searchInvidious(query) {
    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
            const data = await proxiedFetch(url);
            if (Array.isArray(data)) {
                return data.map(v => ({
                    id: v.videoId,
                    title: v.title,
                    channel: v.author,
                    thumbnail: v.videoThumbnails?.[0]?.url || "",
                    duration: v.lengthSeconds,
                    platform: "yt",
                    topics: v.title.toLowerCase().split(" ")
                }));
            }
        } catch (e) { continue; }
    }
    return [];
}

async function searchOdysee(query) {
    try {
        const url = `${ODYSEE_API}?method=claim_search&text=${encodeURIComponent(query)}&claim_type=stream&page_size=10`;
        const data = await proxiedFetch(url);
        if (data.result?.items) {
            return data.result.items.map(v => ({
                id: v.claim_id,
                title: v.value.title,
                channel: v.name,
                thumbnail: v.value.thumbnail?.url || "",
                duration: v.value.video?.duration || 0,
                platform: "lbry",
                topics: v.value.title.toLowerCase().split(" ")
            }));
        }
    } catch (e) { return []; }
}

/**
 * CORE SEARCH ENGINE
 */
async function searchAll(query) {
    saveSearchToHistory(query); // Save the query when search starts
    
    const results = await Promise.all([
        searchPiped(query),
        searchInvidious(query),
        searchOdysee(query)
    ]);

    const flatResults = results.flat();
    const uniqueMap = new Map();
    flatResults.forEach(item => {
        if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
    });

    const finalResults = Array.from(uniqueMap.values()).filter(v => v.duration > 60);
    return typeof rankVideos === 'function' ? rankVideos(finalResults) : finalResults;
}

function renderResults(videos) {
    const el = document.getElementById("results");
    if (!el) return;
    el.innerHTML = "";

    if (!videos.length) {
        el.innerHTML = "<p>No results found.</p>";
        return;
    }

    videos.forEach(v => {
        const card = document.createElement("div");
        card.className = "card";
        card.onclick = () => {
            if (typeof recordWatch === 'function') recordWatch(v);
            window.location.href = `player.html?id=${v.id}&p=${v.platform}`;
        };
        card.innerHTML = `
            <img src="${v.thumbnail}" loading="lazy">
            <div>
                <span class="badge">${v.platform.toUpperCase()}</span>
                <h3>${v.title}</h3>
                <p>${v.channel}</p>
            </div>
        `;
        el.appendChild(card);
    });
}

// Initial load for history
document.addEventListener("DOMContentLoaded", renderHistory);

window.searchAll = searchAll;
window.renderResults = renderResults;
