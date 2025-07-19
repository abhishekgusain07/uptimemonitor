CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "incident" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"monitor_id" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"summary" text,
	"last_notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "monitor" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"slug" text,
	"website_name" text NOT NULL,
	"url" text NOT NULL,
	"method" text DEFAULT 'GET' NOT NULL,
	"expected_status" integer DEFAULT 200 NOT NULL,
	"interval" integer NOT NULL,
	"timeout" integer NOT NULL,
	"is_paused" boolean DEFAULT false NOT NULL,
	"regions" text[],
	"last_checked_at" timestamp,
	"status" text DEFAULT 'UP',
	"user_id" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "monitor_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "monitor_alert_recipient" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"email" text NOT NULL,
	"monitor_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "monitor_alert_recipient_email_monitor_unique" UNIQUE("email","monitor_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "monitor_log" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"monitor_id" text NOT NULL,
	"region" text NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"meta" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "monitor_result" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"monitor_id" text NOT NULL,
	"region" text NOT NULL,
	"status_code" integer,
	"is_up" boolean NOT NULL,
	"response_time" integer NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	"error_message" text,
	"raw_response" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "slug_ticket" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"range_start" integer NOT NULL,
	"range_end" integer NOT NULL,
	"current_value" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"sub_plan" text DEFAULT 'BASIC',
	"verified_email_sent" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incident" ADD CONSTRAINT "incident_monitor_id_monitor_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."monitor"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "monitor" ADD CONSTRAINT "monitor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "monitor_alert_recipient" ADD CONSTRAINT "monitor_alert_recipient_monitor_id_monitor_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."monitor"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "monitor_log" ADD CONSTRAINT "monitor_log_monitor_id_monitor_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."monitor"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "monitor_result" ADD CONSTRAINT "monitor_result_monitor_id_monitor_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."monitor"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incident_monitor_status_idx" ON "incident" USING btree ("monitor_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incident_started_at_idx" ON "incident" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incident_status_idx" ON "incident" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitor_user_id_idx" ON "monitor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitor_status_idx" ON "monitor" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitor_last_checked_idx" ON "monitor" USING btree ("last_checked_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitor_alert_recipient_monitor_id_idx" ON "monitor_alert_recipient" USING btree ("monitor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitor_log_monitor_region_created_idx" ON "monitor_log" USING btree ("monitor_id","region","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitor_log_region_created_idx" ON "monitor_log" USING btree ("region","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitor_log_created_at_idx" ON "monitor_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitor_result_monitor_region_checked_idx" ON "monitor_result" USING btree ("monitor_id","region","checked_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitor_result_region_checked_idx" ON "monitor_result" USING btree ("region","checked_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitor_result_checked_at_idx" ON "monitor_result" USING btree ("checked_at");