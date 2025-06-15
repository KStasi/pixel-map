CREATE TABLE "pixel_data" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"color" varchar(7) DEFAULT '#008000' NOT NULL,
	"last_bought" timestamp DEFAULT now() NOT NULL,
	"last_price" numeric DEFAULT 10000000000000000 NOT NULL,
	"owner" varchar(42) DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_spending" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_spending_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" varchar(42) NOT NULL,
	"total_spent" numeric DEFAULT 0 NOT NULL,
	"last_distribution" timestamp
);
