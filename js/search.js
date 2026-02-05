const INVIDIOUS_INSTANCES = ["https://yewtu.be", "https://vid.puffyan.us", "https://inv.nadeko.net"];
const ODYSEE_API = "https://api.odysee.com/api/v1/proxy";

async function searchAll(query) {
  const results = [];
  const PROXY = "https://corsproxy.io/?"; // Standard proxy to bypass CORS blocks

  // ---- Invidious (YouTube) search ----
  const instances = [
    "https://inv.tux.digital",
    "https://invidious.nerdvpn.de",
    "https://iv.ggtyler.dev"
  ];

  for (const instance of instances) {
    try {
      const apiUrl = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
      const res = await fetch(PROXY + encodeURIComponent(apiUrl));
      
      if (!res.ok) continue;
      
      const data = await res.json();
      data.forEach(v => {
        if (v.lengthSeconds < 60) return; 
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
      break; 
    } catch (e) {
      console.warn("Instance failed, trying next...");
    }
  }

  // ---- Odysee (LBRY) search ----
  try {
    // We use a GET-based search to avoid complex CORS preflight issues
    const odyseeUrl = `https://api.odysee.com/api/v1/proxy?method=claim_search&text=${encodeURIComponent(query)}&claim_type=stream&page_size=10`;
    const res = await fetch(PROXY + encodeURIComponent(odyseeUrl));
    const data = await res.json();

    if (data.result && data.result.items) {
      data.result.items.forEach(v => {
        if (!v.value?.video || v.value.video.duration < 60) return;
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
  } catch (e) {
    console.warn("Odysee search failed via proxy");
  }

  return rankVideos(results);
}
