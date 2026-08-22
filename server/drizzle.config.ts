import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Dev-only tooling config (drizzle-kit generate/push/studio) — reads the same DATABASE_URL as
// the app itself from .env, instead of a hardcoded connection string, so this file never needs
// editing (or leaking a real password) when pointed at a different database.
const databaseUrl = process.env.DATABASE_URL ?? "mysql://root:@127.0.0.1:3306/taskmatrix";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: { url: databaseUrl },
});
