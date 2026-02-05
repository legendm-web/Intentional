const params = new URLSearchParams(location.search);
const id = params.get("id");
const platform = params.get("p");

const frame = document.getElementById("player");

if (platform === "yt") {
  const pref = getPlayer();

  if (pref === "youtube") {
    frame.src = `https://www.youtube-nocookie.com/embed/${id}`;
  } else {
    frame.src = `https://yewtu.be/embed/${id}`;
  }
} else {
  // LBRY
  frame.src = `https://odysee.com/$/embed/${id}`;
}
