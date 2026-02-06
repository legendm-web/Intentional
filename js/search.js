const PROXY = "https://api.allorigins.win/get?url=";

// --- SEARCH LOGIC ---
async function searchYouTube(query) {
    updateStatus("piped", "loading");
    const targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
    try {
        const response = await fetch(PROXY + encodeURIComponent(targetUrl));
        const json = await response.json();
        const html = json.contents;
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
        const res = await fetch(PROXY + encodeURIComponent(target));
        const json = await res.json();
        const data = JSON.parse(json.contents);
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

// --- UI & PLAYER LOGIC ---
function playVideo(id, platform) {
    const container = document.getElementById("purify-player-container");
    const iframe = document.getElementById("purify-iframe");
    const dlBtn = document.getElementById("download-btn");

    let url = "";
    if (platform === "yt") {
        url = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&modestbranding=1&rel=0`;
        // Sets up the download button to point to a conversion service
        dlBtn.style.display = "inline-block";
        dlBtn.onclick = () => window.open(`https://www.youtube.com/watch?v=${id}`, "_blank");
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
    const [yt, ody] = await Promise.all([searchYouTube(query), searchOdysee(query)]);
    return [...yt, ...ody];
}

function renderResults(videos) {
    const el = document.getElementById("results");
    el.innerHTML = videos.length ? "" : "<p>No results.</p>";
    videos.forEach(v => {
        const card = document.createElement("div");
        card.className = "video-card";
        card.onclick = () => playVideo(v.id, v.platform);
        card.innerHTML = `<img src="${v.thumbnail}"><div><b>${v.title}</b><br><small>${v.channel}</small></div>`;
        el.appendChild(card);
    });
}

window.searchAll = searchAll;
window.renderResults = renderResults;
