function scoreVideo(video, state) {
  const channelScore = state.channelAffinity[video.channel] || 0;
  const topicScore = video.topics.reduce(
    (sum, t) => sum + (state.topicWeights[t] || 0),
    0
  );

  const durationScore = Math.min(video.duration / 600, 1); // prefer long-form

  return (
    channelScore * 0.4 +
    topicScore * 0.3 +
    durationScore * 0.3
  );
}

function rankVideos(videos) {
  const state = loadState();
  return videos
    .map(v => ({ ...v, score: scoreVideo(v, state) }))
    .sort((a, b) => b.score - a.score);
}
