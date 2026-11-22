function pointsForQuiz(score, passed) {
  let points = 10 + Math.round(score / 10);
  if (passed) points += 20;
  if (score === 100) points += 10;
  return points;
}

function levelFromPoints(points) {
  const level = Math.floor(points / 100) + 1;
  return { level, nextLevelAt: level * 100 };
}

module.exports = { pointsForQuiz, levelFromPoints };
