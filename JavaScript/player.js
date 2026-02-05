const params = new URLSearchParams(location.search);
const id = params.get("id");
const platform = params.get("p");

const frame = document.getElementById("player");

if (platform === "yt") {
  frame.src = `https://piped.video/embed/${id}`;
} else {
  frame.src = `https://odysee.com/$/embed/${id}`;
}
