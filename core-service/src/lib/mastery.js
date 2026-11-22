function updateMastery(oldScore, quizScore) {
  return oldScore === null
    ? Math.round(quizScore)
    : Math.round(0.6 * oldScore + 0.4 * quizScore);
}

module.exports = { updateMastery };
