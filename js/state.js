function recordWatch(video) {
    let interests = JSON.parse(localStorage.getItem("user_interests") || "{}");
    const words = video.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ');
    words.forEach(word => { if (word.length > 4) interests[word] = (interests[word] || 0) + 1; });
    localStorage.setItem("user_interests", JSON.stringify(interests));
}

function getTopInterest() {
    const interests = JSON.parse(localStorage.getItem("user_interests") || "{}");
    return Object.keys(interests).sort((a, b) => interests[b] - interests[a])[0] || "Apex Legends";
}

async function loadRecommendations() {
    const topic = getTopInterest();
    const vids = await searchAll(topic);
    renderResults(vids);
}
