const PIPED = "https://piped.video";
const ODYSEE = "https://api.odysee.com/api/v1/proxy";

async function searchAll(query) {
  const yt = fetch(
    `${PIPED}/api/v1/search?q=${encodeURIComponent(query)}`
  ).then(r => r.json());

  const lbry = fetch(ODYSEE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "claim_search",
      params: { text: query, page_size: 10 }
    })
  }).then(r => r.json());

  const [ytRes, lbryRes] = await Promise.allSettled([yt, lbry]);

  let results = [];

  if (ytRes.status === "fulfilled") {
    ytRes.value.items.forEach(v => {
      if (v.duration < 60) return; // hide shorts
      results.push({
        id: v.id,
        title: v.title,
        channel: v.uploaderName,
        thumbnail: v.thumbnail,
        duration: v.duration,
        platform: "yt",
        topics: v.title.toLowerCase().split(" ")
      });
    });
  }

  if (lbryRes.status === "fulfilled") {
    lbryRes.value.result.items.forEach(v => {
      if (!v.value?.video) return;
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
  }

  return rankVideos(results);
}

function renderResults(videos) {
  const el = document.getElementById("results");
  el.innerHTML = "";

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
