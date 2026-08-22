import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    // MySQL connection. Prefer a single DATABASE_URL (mysql://user:pass@host:port/db),
    // which is what Drizzle/mysql2 and most cPanel Node.js setups expect. Discrete
    // DB_* vars are also accepted and assembled into a URL if DATABASE_URL is absent
    // (handy for cPanel's "Setup Node.js App" env-var UI, which some hosts make easier
    // to fill in as separate fields than as one connection string).
    DATABASE_URL: z.string().min(1).optional(),
    DB_HOST: z.string().default('127.0.0.1'),
    DB_PORT: z.coerce.number().default(3306),
    DB_USER: z.string().default('root'),
    DB_PASSWORD: z.string().default(''),
    DB_NAME: z.string().default('taskmatrix'),
    DB_CONNECTION_LIMIT: z.coerce.number().default(10),

    CLIENT_URL: z.string().min(1),
    REDIS_URL: z.string().default("redis://localhost:6379"),
    CLUSTER_WORKERS: z.coerce.number().optional(),

    CHECKLIST_TIMEZONE_OFFSET_MINUTES: z.coerce.number().default(330),

    JWT_ACCESS_SECRET: z.string().min(10),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN_DAYS: z.coerce.number().default(30),

    COOKIE_SECURE: z.coerce.boolean().default(false),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

    AWS_REGION: z.string().default('us-east-1'),
    AWS_S3_BUCKET: z.string().default(''),
    AWS_ACCESS_KEY_ID: z.string().default(''),
    AWS_SECRET_ACCESS_KEY: z.string().default(''),

    SMTP_HOST: z.string().default(''),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),
    MAIL_FROM: z.string().default(''),


    WHATSAPP_VERIFY_TOKEN: z.string().default(""),
    WHATSAPP_ACCESS_TOKEN: z.string().default(""),
    WHATSAPP_PHONE_NUMBER_ID: z.string().default(""),
    WHATSAPP_APP_SECRET: z.string().default(""),


    DOUBLETICK_API_KEY: z.string().default(""),
    DOUBLETICK_WEBHOOK_SECRET: z.string().default(""),
    DOUBLETICK_SENDER_NUMBER: z.string().default(""),


});

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
    console.error('Invalid enviroment variables : ', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid enviroment variables')
}

const data = parsed.data;

// Build a single connection URL if one wasn't provided directly. mysql2 (and Drizzle's
// mysql2 driver) accept a plain `mysql://user:pass@host:port/db` URL, so this keeps
// db.ts simple regardless of which style of env vars the host provides.
const resolvedDatabaseUrl =
    data.DATABASE_URL ??
    `mysql://${encodeURIComponent(data.DB_USER)}:${encodeURIComponent(data.DB_PASSWORD)}@${data.DB_HOST}:${data.DB_PORT}/${data.DB_NAME}`;

export const env = { ...data, DATABASE_URL: resolvedDatabaseUrl };
