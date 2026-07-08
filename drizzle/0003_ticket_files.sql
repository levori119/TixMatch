CREATE TABLE "ticket_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" integer NOT NULL,
	"file_name" text,
	"mime" text,
	"data_base64" text,
	"barcode" text,
	"previous_barcode" text,
	"rotated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket_files" ADD CONSTRAINT "ticket_files_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ticket_files_listing_idx" ON "ticket_files" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "ticket_files_barcode_idx" ON "ticket_files" USING btree ("barcode");