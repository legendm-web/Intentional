// REPLACE with your actual Worker URL
const MY_PROXY = "https://intentional.legendm.workers.dev/?url=";

async function searchYouTube(query) {
    updateStatus("piped", "loading");
    // Using the search results page via YOUR proxy
    const targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
    
    try {
        const response = await fetch(MY_PROXY + encodeURIComponent(targetUrl));
        const html = await response.text();

        // Extracting data from the HTML
        const videoRegex = /"videoRenderer":\{"videoId":"([^"]+)","thumbnail":\{"thumbnails":\[\{"url":"([^"]+)"/g;
        const titleRegex = /"title":\{"runs":\[\{"text":"([^"]+)"/g;
        
        let results = [], match, tMatch, count = 0;
        while ((match = videoRegex.exec(html)) !== null && count < 15) {
            results.push({ id: match[1], thumbnail: match[2], platform: "yt" });
            count++;
        }
        
        let i = 0;
        while ((tMatch = titleRegex.exec(html)) !== null && i < results.length) {
            results[i].title = tMatch[1].replace(/\\u0026/g, '&');
            results[i].channel = "YouTube";
            i++;
        }
        
        updateStatus("piped", "success");
        return results;
    } catch (e) {
        updateStatus("piped", "fail");
        return [];
    }
}

async function searchOdysee(query) {
    updateStatus("odysee", "loading");
    const target = `https://api.odysee.com/api/v1/proxy?method=claim_search&text=${encodeURIComponent(query)}&claim_type=stream&page_size=10`;
    try {
        const res = await fetch(MY_PROXY + encodeURIComponent(target));
        const data = await res.json();
        if (data?.result?.items) {
            updateStatus("odysee", "success");
            return data.result.items.map(v => ({
                id: v.claim_id, title: v.value.title, platform: "lbry",
                thumbnail: v.value.thumbnail?.url, channel: v.name
            }));
        }
    } catch (e) { updateStatus("odysee", "fail"); }
    return [];
}

// UI LOGIC
function playVideo(id, platform) {
    const container = document.getElementById("purify-player-container");
    const iframe = document.getElementById("purify-iframe");
    const dlBtn = document.getElementById("download-btn");

    iframe.src = platform === "yt" 
        ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&modestbranding=1` 
        : `https://odysee.com/$/embed/${id}`;

    container.style.display = "block";
    dlBtn.onclick = () => window.open(platform === "yt" ? `https://www.youtube.com/watch?v=${id}` : "", "_blank");
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
    const [yt, ody] = await Promise.all([searchYouTube(query), searchOdysee(query)]);
    return [...yt, ...ody];
}

function renderResults(videos) {
    const el = document.getElementById("results");
    el.innerHTML = videos.length ? "" : "<p>No results found. Try searching for something else!</p>";
    
    videos.forEach(v => {
        const card = document.createElement("div");
        card.className = "video-card";
        
        // When clicked, record the data for future recommendations and play
        card.onclick = () => {
            if (typeof recordWatch === "function") recordWatch(v);
            playVideo(v.id, v.platform);
        };

        card.innerHTML = `
            <div class="thumb-container">
                <img src="${v.thumbnail}">
            </div>
            <div class="video-info">
                <b>${v.title}</b>
                <small>${v.channel}</small>
            </div>
        `;
        el.appendChild(card);
    });
}

window.searchAll = searchAll;
window.renderResults = renderResults;
