const QUIZ_LENGTH = 8;

function nextDifficulty(current, isCorrect) {
  return isCorrect
    ? Math.min(3, current + 1)
    : Math.max(1, current - 1);
}

function selectQuestion(questions, targetDifficulty, usedIds = []) {
  const unused = questions.filter((question) => !usedIds.includes(question.id));
  if (!unused.length) return null;
  const exact = unused.filter((question) => question.difficulty === targetDifficulty);
  const pool = exact.length ? exact : unused;
  return pool[Math.floor(Math.random() * pool.length)];
}

function quizScore(answerRows) {
  const weights = { 1: 1, 2: 2, 3: 3 };
  let earned = 0;
  let max = 0;
  for (const answer of answerRows) {
    max += weights[answer.difficulty] || 1;
    if (answer.is_correct) earned += weights[answer.difficulty] || 1;
  }
  const score = max ? Math.round(100 * earned / max) : 0;
  return { score, passed: score >= 70 };
}

module.exports = { QUIZ_LENGTH, nextDifficulty, selectQuestion, quizScore };
