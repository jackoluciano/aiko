const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_PATH: z.string().default('./data/aiko.db'),
  JWT_SECRET: z.string().default('development-secret-change-this-value-32chars'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  ADMIN_TOKEN: z.string().default('development-admin-token')
});

const result = schema.safeParse(process.env);
if (!result.success) throw new Error('Konfigurasi environment tidak valid');
const config = result.data;
if (config.NODE_ENV === 'production' && config.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET minimal 32 karakter pada production');
}
module.exports = config;
