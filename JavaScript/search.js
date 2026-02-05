const INVIDIOUS_INSTANCES = [
  "https://yewtu.be",
  "https://vid.puffyan.us",
  "https://inv.nadeko.net"
];

const ODYSEE_API = "https://api.odysee.com/api/v1/proxy";

async function searchAll(query) {
  let results = [];

  // ---- Invidious (YouTube) search ----
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(
        `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`
      );
      const data = await res.json();

      data.forEach(v => {
        if (v.lengthSeconds < 60) return; // hide shorts

        results.push({
          id: v.videoId,
          title: v.title,
          channel: v.author,
          thumbnail: v.videoThumbnails?.[0]?.url,
          duration: v.lengthSeconds,
          platform: "yt",
          topics: v.title.toLowerCase().split(" ")
        });
      });

      break; // stop after first working instance
    } catch (e) {
      console.warn("Invidious instance failed:", instance);
    }
  }

  // ---- Odysee (LBRY) search ----
  try {
    const res = await fetch(ODYSEE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "claim_search",
        params: {
          text: query,
          page_size: 10,
          claim_type: "stream"
        }
      })
    });

    const data = await res.json();

    data.result.items.forEach(v => {
      if (!v.value?.video) return;
      if (v.value.video.duration < 60) return;

      results.push({
        id: v.claim_id,
        title: v.value.title,
        channel: v.name,
        thumbnail: v.value.thumbnail?.url,
        duration: v.value.video.duration,
        platform: "lbry",
        topics: v.value.title.toLowerCase().split(" ")
      });
    });
  } catch (e) {
    console.warn("Odysee search failed");
  }

  return rankVideos(results);
}

function renderResults(videos) {
  const el = document.getElementById("results");
  el.innerHTML = "";

  if (!videos.length) {
    el.innerHTML = "<p>No results found.</p>";
    return;
  }

  videos.forEach(v => {
    const card = document.createElement("div");
    card.className = "card";

    card.onclick = () => {
      recordWatch(v);
      window.location.href = `player.html?id=${v.id}&p=${v.platform}`;
    };

    card.innerHTML = `
      <img src="${v.thumbnail}">
      <div>
        <span class="badge">${v.platform.toUpperCase()}</span>
        <h3>${v.title}</h3>
        <p>${v.channel}</p>
      </div>
    `;

    el.appendChild(card);
  });
}
