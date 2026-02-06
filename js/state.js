// --- LOCAL DATA ENGINE ---

// 1. Record a watch and extract keywords from the title
function recordWatch(video) {
    let history = JSON.parse(localStorage.getItem("watch_history") || "[]");
    history.push(video);
    localStorage.setItem("watch_history", JSON.stringify(history.slice(-20))); // Keep last 20

    // Extract keywords (longer than 3 chars, skip common words)
    const words = video.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ');
    let interests = JSON.parse(localStorage.getItem("user_interests") || "{}");
    
    words.forEach(word => {
        if (word.length > 3) {
            interests[word] = (interests[word] || 0) + 1;
        }
    });
    localStorage.setItem("user_interests", JSON.stringify(interests));
}

// 2. Get the top interest to use as a recommendation search
function getTopInterest() {
    const interests = JSON.parse(localStorage.getItem("user_interests") || "{}");
    return Object.keys(interests).sort((a, b) => interests[b] - interests[a])[0] || "Apex Legends";
}

function clearHistory() {
    localStorage.clear();
    location.reload();
}

async function loadRecommendations() {
    const topic = getTopInterest();
    const vids = await window.searchAll(topic);
    window.renderResults(vids);
}
