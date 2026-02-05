// --- Invidious Instances ---
const INVIDIOUS_INSTANCES = [
  "https://invidious.projectsegfau.lt",
  "https://inv.riverside.rocks",
  "https://invidious.lunar.icu"
];

// --- Improved Proxy Helper ---
// Using a different service: allorigins.win
async function proxiedFetch(url) {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error('Proxy request failed');
  const container = await response.json();
  return JSON.parse(container.contents); // AllOrigins wraps the result in a 'contents' string
}

async function searchAll(query) {
  let results = [];
  const encodedQuery = encodeURIComponent(query);

  // 1. Search YouTube (via Invidious)
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodedQuery}&type=video`;
      const data = await proxiedFetch(url);

      if (Array.isArray(data)) {
        data.forEach(v => {
          if (v.lengthSeconds > 60) { // Filter out shorts
            results.push({
              id: v.videoId,
              title: v.title,
              channel: v.author,
              thumbnail: v.videoThumbnails?.[0]?.url || "",
              duration: v.lengthSeconds,
              platform: "yt",
              topics: v.title.toLowerCase().split(" ")
            });
          }
        });
        break; // Stop if we got results
      }
    } catch (e) {
      console.warn(`Invidious instance ${instance} failed, trying next...`);
    }
  }

  // 2. Search Odysee
  try {
    const odyseeUrl = `https://api.odysee.com/api/v1/proxy?method=claim_search&text=${encodedQuery}&claim_type=stream&page_size=10`;
    const data = await proxiedFetch(odyseeUrl);

    if (data.result && data.result.items) {
      data.result.items.forEach(v => {
        if (v.value?.video?.duration > 60) {
          results.push({
            id: v.claim_id,
            title: v.value.title,
            channel: v.name,
            thumbnail: v.value.thumbnail?.url || "",
            duration: v.value.video.duration,
            platform: "lbry",
            topics: v.value.title.toLowerCase().split(" ")
          });
        }
      });
    }
  } catch (e) {
    console.error("Odysee search failed:", e);
  }

  // Rank results if rankVideos exists
  return typeof rankVideos === 'function' ? rankVideos(results) : results;
}

function renderResults(videos) {
  const el = document.getElementById("results");
  if (!el) return;
  
  el.innerHTML = "";

  if (!videos || videos.length === 0) {
    el.innerHTML = "<p>No results found. Try a different search term.</p>";
    return;
  }

  videos.forEach(v => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.display = "flex";
    card.style.margin = "10px 0";
    card.style.cursor = "pointer";
    card.style.border = "1px solid #ddd";
    card.style.padding = "10px";

    card.onclick = () => {
      if (typeof recordWatch === 'function') recordWatch(v);
      window.location.href = `player.html?id=${v.id}&p=${v.platform}`;
    };

    card.innerHTML = `
      <img src="${v.thumbnail}" style="width:120px; height:auto; margin-right:15px;">
      <div>
        <small>${v.platform.toUpperCase()}</small>
        <h3 style="margin:5px 0;">${v.title}</h3>
        <p style="color:#666;">${v.channel}</p>
      </div>
    `;
    el.appendChild(card);
  });
}

// Attach to window to ensure HTML can see them
window.searchAll = searchAll;
window.renderResults = renderResults;
