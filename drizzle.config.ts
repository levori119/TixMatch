import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // DEV by default (from .env). For prod migrations, point this at the prod URL explicitly.
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
