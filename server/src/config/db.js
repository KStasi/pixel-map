import { drizzle } from 'drizzle-orm/pglite';
export const dbUrl = process.env.DATABASE_URL || "pixel_map_db";

// Initialize db
export const db = drizzle(dbUrl);