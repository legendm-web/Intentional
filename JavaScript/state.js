const STATE_KEY = "intentional_state";

const defaultState = {
  watchedVideos: [],
  channelAffinity: {},
  topicWeights: {},
  continueWatching: []
};

function loadState() {
  return JSON.parse(localStorage.getItem(STATE_KEY)) || defaultState;
}

function saveState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function recordWatch(video) {
  const state = loadState();

  state.watchedVideos.unshift(video);
  state.watchedVideos = state.watchedVideos.slice(0, 20);

  state.channelAffinity[video.channel] =
    (state.channelAffinity[video.channel] || 0) + 1;

  video.topics.forEach(t => {
    state.topicWeights[t] = (state.topicWeights[t] || 0) + 1;
  });

  saveState(state);
}
