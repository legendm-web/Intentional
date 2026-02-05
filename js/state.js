function getPlayer() {
    return localStorage.getItem("pref_player") || "invidious";
}

function recordWatch(video) {
    try {
        let history = JSON.parse(localStorage.getItem("watch_history") || "[]");
        // Ensure we don't save duplicates
        history = history.filter(item => item.id !== video.id);
        history.unshift({ ...video, timestamp: Date.now() });
        localStorage.setItem("watch_history", JSON.stringify(history.slice(0, 50)));
    } catch (e) {
        console.error("Failed to record watch history", e);
    }
}

// Ensure these are globally available
window.getPlayer = getPlayer;
window.recordWatch = recordWatch;
