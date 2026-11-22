const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Email tidak valid').max(254),
  password: z.string().min(8, 'Password minimal 8 karakter').max(128),
  consent: z.literal(true, { errorMap: () => ({ message: 'Persetujuan orang tua wajib diberikan.' }) })
});

const loginSchema = z.object({
  email: z.string().email('Email tidak valid').max(254),
  password: z.string().min(1).max(128)
});

const childLoginSchema = z.object({
  username: z.string().regex(/^[a-z0-9_]{3,20}$/),
  pin: z.string().regex(/^\d{4,6}$/)
});

module.exports = { registerSchema, loginSchema, childLoginSchema };
