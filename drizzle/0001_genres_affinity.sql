CREATE TABLE "event_genres" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"genre_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_he" text NOT NULL,
	"emoji" text,
	CONSTRAINT "genres_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_genre_affinity" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"genre_id" integer NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_genres" ADD CONSTRAINT "event_genres_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_genres" ADD CONSTRAINT "event_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_genre_affinity" ADD CONSTRAINT "user_genre_affinity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_genre_affinity" ADD CONSTRAINT "user_genre_affinity_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_genre_uniq" ON "event_genres" USING btree ("event_id","genre_id");--> statement-breakpoint
CREATE INDEX "event_genres_event_idx" ON "event_genres" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_genre_uniq" ON "user_genre_affinity" USING btree ("user_id","genre_id");