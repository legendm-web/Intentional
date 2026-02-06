// --- 1. CONFIGURATION ---
const PROXY = "https://api.allorigins.win/get?url=";

// --- 2. SEARCH ENGINE ---
async function searchYouTube(query) {
    updateStatus("piped", "loading");
    
    // We use the YouTube search results page directly through a proxy
    // This is more reliable than small, dying Invidious instances
    const targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
    
    try {
        const response = await fetch(PROXY + encodeURIComponent(targetUrl));
        const json = await response.json();
        const html = json.contents;

        // Extracting video data using Regex from the YouTube HTML
        const videoRegex = /"videoRenderer":\{"videoId":"([^"]+)","thumbnail":\{"thumbnails":\[\{"url":"([^"]+)"/g;
        const titleRegex = /"title":\{"runs":\[\{"text":"([^"]+)"/g;
        
        let results = [];
        let match;
        let count = 0;

        // This loops through the HTML and pulls out IDs and Thumbnails
        while ((match = videoRegex.exec(html)) !== null && count < 15) {
            results.push({
                id: match[1],
                thumbnail: match[2],
                platform: "yt"
            });
            count++;
        }

        // Add Titles (Simple match alignment)
        let titleMatch;
        let i = 0;
        while ((titleMatch = titleRegex.exec(html)) !== null && i < results.length) {
            results[i].title = titleMatch[1].replace(/\\u0026/g, '&');
            results[i].channel = "YouTube";
            results[i].duration = 0; // Duration is harder to parse, setting to 0
            i++;
        }

        updateStatus("piped", "success");
        return results;
    } catch (e) {
        console.error("YouTube search failed", e);
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
                channel: v.name,
                duration: 100 // placeholder
            }));
        }
    } catch (e) {
        updateStatus("odysee", "fail");
    }
    return [];
}

// --- 3. UI ENGINE ---
function updateStatus(id, status) {
    const el = document.getElementById(`status-${id}`);
    if (el) {
        const icons = { loading: "⏳", success: "✅", fail: "❌" };
        el.innerText = `${id}: ${icons[status]}`;
    }
}

async function searchAll(query) {
    // Clear old status
    document.getElementById("status-piped").innerText = "YouTube: ⏳";
    document.getElementById("status-odysee").innerText = "Odysee: ⏳";

    const [ytResults, odyseeResults] = await Promise.all([
        searchYouTube(query),
        searchOdysee(query)
    ]);

    return [...ytResults, ...odyseeResults];
}

function renderResults(videos) {
    const el = document.getElementById("results");
    if (!el) return;
    el.innerHTML = videos.length ? "" : "<p>No results found.</p>";

    videos.forEach(v => {
        const card = document.createElement("div");
        card.className = "video-card";
        card.onclick = () => window.location.href = `player.html?id=${v.id}&p=${v.platform}`;
        card.innerHTML = `
            <img src="${v.thumbnail}" width="160">
            <div>
                <p><b>${v.title}</b></p>
                <small>${v.channel} (${v.platform.toUpperCase()})</small>
            </div>
        `;
        el.appendChild(card);
    });
}

window.searchAll = searchAll;
window.renderResults = renderResults;
