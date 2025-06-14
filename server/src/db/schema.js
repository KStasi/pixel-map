import { bigint, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const pixelDataTable = pgTable("pixel_data", {
  id: varchar({ length: 50 }).notNull().primaryKey(), // Assuming pixel ID is a string (e.g., hash)
  color: varchar({ length: 7 }).notNull(), // Assuming hex color format
  last_bought: timestamp().notNull().defaultNow(),
  last_price: bigint().notNull(),
  owner: varchar({ length: 42 }).notNull(), // Assuming owner is a string (e.g., wallet address)
});

export const userSpendingTable = pgTable("user_spending", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: varchar({ length: 42 }).notNull(), // Assuming user ID is a string (e.g., wallet address)
  total_spent: bigint().notNull().default(0),
  last_distribution: timestamp(),
});
