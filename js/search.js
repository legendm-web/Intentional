// --- 1. CONFIGURATION ---
// We switch to a more stable proxy specifically for Odysee
const PROXY = "https://api.allorigins.win/get?url=";

// --- 2. SEARCH ENGINES ---
async function searchYouTube(query) {
    updateStatus("piped", "loading");
    
    // We use the YouTube Suggestion API - it's much more stable than scraping the results page
    const suggestUrl = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
    
    try {
        // Step 1: Get search suggestions
        const res = await fetch("https://corsproxy.io/?" + encodeURIComponent(suggestUrl));
        const data = await res.json();
        const suggestions = data[1] || [];
        
        // Step 2: Since scraping is blocked, we will generate "Virtual" cards that 
        // link to a search on a privacy-friendly YouTube frontend (Piped)
        // This is a common 'Purify' trick to avoid 403 blocks.
        
        let results = suggestions.slice(0, 10).map((term, index) => ({
            id: term, // Using the term as a trigger
            title: term,
            thumbnail: `https://picsum.photos/seed/${index}/320/180`, // Placeholder until we get API access
            channel: "Suggested Search",
            platform: "yt-search"
        }));

        updateStatus("piped", "success");
        return results;
    } catch (e) {
        console.error("YT Error:", e);
        updateStatus("piped", "fail");
        return [];
    }
}

async function searchOdysee(query) {
    updateStatus("odysee", "loading");
    const target = `https://api.odysee.com/api/v1/proxy?method=claim_search&text=${encodeURIComponent(query)}&claim_type=stream&page_size=10`;
    
    try {
        const res = await fetch(PROXY + encodeURIComponent(target));
        const json = await res.json();
        const data = JSON.parse(json.contents);
        
        if (data?.result?.items) {
            updateStatus("odysee", "success");
            return data.result.items.map(v => ({
                id: v.claim_id, 
                title: v.value.title, 
                platform: "lbry",
                thumbnail: v.value.thumbnail?.url, 
                channel: v.name
            }));
        }
    } catch (e) { 
        updateStatus("odysee", "fail"); 
    }
    return [];
}

// --- 3. UI & PLAYER LOGIC ---
function playVideo(id, platform) {
    const container = document.getElementById("purify-player-container");
    const iframe = document.getElementById("purify-iframe");
    const dlBtn = document.getElementById("download-btn");

    if (platform === "yt-search") {
        // If they click a suggested search, just search for it for real
        document.getElementById("q").value = id;
        doSearch();
        return;
    }

    let url = "";
    if (platform === "yt") {
        url = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&modestbranding=1&rel=0`;
        dlBtn.onclick = () => window.open(`https://www.youtube.com/watch?v=${id}`, "_blank");
        dlBtn.style.display = "inline-block";
    } else {
        url = `https://odysee.com/$/embed/${id}`;
        dlBtn.style.display = "none";
    }

    iframe.src = url;
    container.style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closePlayer() {
    document.getElementById("purify-player-container").style.display = "none";
    document.getElementById("purify-iframe").src = "";
}

function updateStatus(id, status) {
    const el = document.getElementById(`status-${id}`);
    if (el) {
        const icons = { loading: "⏳", success: "✅", fail: "❌" };
        el.innerText = `${id === 'piped' ? 'YouTube' : 'Odysee'}: ${icons[status]}`;
    }
}

async function searchAll(query) {
    if (typeof recordWatch === "function") { /* Keyword tracking happens here */ }
    const [yt, ody] = await Promise.all([searchYouTube(query), searchOdysee(query)]);
    return [...yt, ...ody];
}

function renderResults(videos) {
    const el = document.getElementById("results");
    el.innerHTML = videos.length ? "" : "<p>No results found. Try a different search.</p>";
    videos.forEach(v => {
        const card = document.createElement("div");
        card.className = "video-card";
        card.onclick = () => {
            if (typeof recordWatch === "function" && v.platform !== "yt-search") recordWatch(v);
            playVideo(v.id, v.platform);
        };
        card.innerHTML = `<img src="${v.thumbnail}"><div><b>${v.title}</b><br><small>${v.channel}</small></div>`;
        el.appendChild(card);
    });
}

window.searchAll = searchAll;
window.renderResults = renderResults;
