const STATE_KEY = "intentional_state";

const defaultState = {
  playerPreference: "invidious", // Added missing comma here
  watchedVideos: [],
  channelAffinity: {},
  topicWeights: {},
  continueWatching: []
};

function loadState() {
  try {
    const saved = localStorage.getItem(STATE_KEY);
    return saved ? JSON.parse(saved) : defaultState;
  } catch (e) {
    return defaultState;
  }
}

function saveState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

// Fixed the "tangled" nesting here
function setPlayer(pref) {
  const state = loadState();
  state.playerPreference = pref;
  saveState(state);
}

function getPlayer() {
    return localStorage.getItem("pref_player") || "invidious";
}

function recordWatch(video) {
    let history = JSON.parse(localStorage.getItem("watch_history") || "[]");
    history.unshift({ ...video, timestamp: Date.now() });
    localStorage.setItem("watch_history", JSON.stringify(history.slice(0, 50)));
}

  // Add video to the start of the array and limit to 20
  state.watchedVideos.unshift(video);
  state.watchedVideos = state.watchedVideos.slice(0, 20);

  // Increment channel affinity
  state.channelAffinity[video.channel] = (state.channelAffinity[video.channel] || 0) + 1;

  // Increment topic weights
  if (video.topics && Array.isArray(video.topics)) {
    video.topics.forEach(t => {
      state.topicWeights[t] = (state.topicWeights[t] || 0) + 1;
    });
  }

  saveState(state);
}
