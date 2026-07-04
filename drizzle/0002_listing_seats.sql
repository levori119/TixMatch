CREATE TYPE "public"."seat_type" AS ENUM('seated', 'standing');--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "seat_kind" "seat_type";--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "seat_section" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "seat_row" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "seat_number" text;