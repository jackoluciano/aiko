const { z } = require('zod');

const createPlayerSchema = z.object({
  display_name: z.string().trim().min(1).max(50),
  username: z.string().regex(/^[a-z0-9_]{3,20}$/),
  pin: z.string().regex(/^\d{4,6}$/),
  grade: z.number().int().min(1).max(6),
  daily_limit_minutes: z.number().int().min(5).max(60).optional().default(15),
  avatar: z.string().max(255).optional(),
  share_progress: z.boolean().optional().default(false)
});

const patchPlayerSchema = z.object({
  display_name: z.string().trim().min(1).max(50).optional(),
  grade: z.number().int().min(1).max(6).optional(),
  daily_limit_minutes: z.number().int().min(5).max(60).optional(),
  avatar: z.string().max(255).optional(),
  share_progress: z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0, { message: 'Minimal satu data harus diubah.' });

module.exports = { createPlayerSchema, patchPlayerSchema };
