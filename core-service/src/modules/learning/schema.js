const { z } = require('zod');

const startQuizSchema = z.object({
  playerId: z.string().uuid()
});

const answerSchema = z.object({
  questionId: z.string().uuid(),
  chosenIndex: z.number().int().min(0).max(3)
});

module.exports = { startQuizSchema, answerSchema };
