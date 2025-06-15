import { decimal, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const pixelDataTable = pgTable("pixel_data", {
    id: varchar({ length: 50 }).notNull().primaryKey(), // Assuming pixel ID is a string (e.g., hash)
    color: varchar({ length: 7 }).notNull().default("#2AFF6B"), // Assuming hex color format
    last_bought: timestamp().notNull().defaultNow(),
    last_price: decimal().notNull().default(10_000_000_000_000_000),
    owner: varchar({ length: 42 }).notNull().default(""), // Assuming owner is a string (e.g., wallet address)
});

export const userSpendingTable = pgTable("user_spending", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    user_id: varchar({ length: 42 }).notNull(), // Assuming user ID is a string (e.g., wallet address)
    total_spent: decimal().notNull().default(0),
    last_distribution: timestamp(),
});
