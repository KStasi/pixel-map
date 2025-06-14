import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.js',
  driver: 'pglite',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || "pixel_map_db",
  },
});