const params = new URLSearchParams(window.location.search);
const videoId = params.get("id");
const platform = params.get("p");
const playerFrame = document.getElementById("main-player");

// List of backup YouTube embed sources
const YT_SOURCES = [
    (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,
    (id) => `https://piped.video/embed/${id}`,
    (id) => `https://inv.nadeko.net/embed/${id}`,
    (id) => `https://invidious.projectsegfau.lt/embed/${id}`
];

function loadVideo() {
    if (!videoId) {
        document.getElementById("video-title").innerText = "Video not found.";
        return;
    }

    if (platform === "yt") {
        // We start with the most stable: YouTube No-Cookie
        playerFrame.src = YT_SOURCES[0](videoId);
        
        // If you want to use your preferred player from state.js:
        if (typeof getPlayer === "function") {
            const pref = getPlayer();
            if (pref === "piped") playerFrame.src = YT_SOURCES[1](videoId);
            if (pref === "invidious") playerFrame.src = YT_SOURCES[2](videoId);
        }
    } else if (platform === "lbry") {
        // Odysee / LBRY Embed
        playerFrame.src = `https://odysee.com/$/embed/${videoId}`;
    }

    // Clean up the title (optional)
    document.getElementById("video-title").innerText = "Enjoy your video";
}

// Record that we are watching this (for your history logic)
if (typeof recordWatch === "function") {
    recordWatch({ id: videoId, platform: platform });
}

loadVideo();
