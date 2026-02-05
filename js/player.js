const params = new URLSearchParams(location.search);
const id = params.get("id");
const platform = params.get("p");
const frame = document.getElementById("player");

if (platform === "yt") {
    const pref = typeof getPlayer === 'function' ? getPlayer() : "invidious";
    if (pref === "youtube") {
        frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
    } else {
        // Try a different embed instance if yewtu.be is down
        frame.src = `https://inv.nadeko.net/embed/${id}`;
    }
} else {
    frame.src = `https://odysee.com/$/embed/${id}`;
}
