// REPLACE with your deployed Cloudflare Worker URL
const MY_PROXY = "https://intentional.legendm.workers.dev/?url=";

async function searchYouTube(query) {
    const targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
    try {
        const response = await fetch(MY_PROXY + encodeURIComponent(targetUrl));
        const html = await response.text();

        // Robust regex for IDs and Titles
        const videoIds = [...html.matchAll(/"videoId":"([^"]+)"/g)].map(m => m[1]);
        const titles = [...html.matchAll(/"title":\{"runs":\[\{"text":"([^"]+)"/g)].map(m => m[1]);
        
        let results = [];
        const uniqueIds = [...new Set(videoIds)].slice(0, 12);

        uniqueIds.forEach((id, i) => {
            results.push({
                id: id,
                title: titles[i] || "YouTube Video",
                thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
                platform: "yt",
                channel: "YouTube"
            });
        });
        return results;
    } catch (e) {
        return [];
    }
}

async function searchOdysee(query) {
    const target = `https://api.odysee.com/api/v1/proxy?method=claim_search&text=${encodeURIComponent(query)}&claim_type=stream&page_size=10`;
    try {
        const res = await fetch(MY_PROXY + encodeURIComponent(target));
        const data = await res.json();
        if (data?.result?.items) {
            return data.result.items.map(v => ({
                id: v.claim_id, title: v.value.title, platform: "lbry",
                thumbnail: v.value.thumbnail?.url, channel: v.name
            }));
        }
    } catch (e) { return []; }
}

async function searchAll(query) {
    const [yt, ody] = await Promise.all([searchYouTube(query), searchOdysee(query)]);
    return [...yt, ...(ody || [])];
}

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

function renderResults(videos) {
    const el = document.getElementById("results");
    el.innerHTML = videos.length ? "" : "No results.";
    videos.forEach(v => {
        const card = document.createElement("div");
        card.className = "video-card";
        card.onclick = () => {
            if (typeof recordWatch === "function") recordWatch(v);
            playVideo(v.id, v.platform);
        };
        card.innerHTML = `<img src="${v.thumbnail}"><div><b>${v.title}</b><br><small>${v.channel}</small></div>`;
        el.appendChild(card);
    });
}
