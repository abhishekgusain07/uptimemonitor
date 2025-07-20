CREATE TABLE IF NOT EXISTS "billing_history" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"user_id" text NOT NULL,
	"subscription_id" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text NOT NULL,
	"description" text NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"paid_at" timestamp,
	"failed_at" timestamp,
	"refunded_at" timestamp,
	"payment_method" text,
	"transaction_id" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_usage" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"user_id" text NOT NULL,
	"subscription_id" text,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"monitors_used" integer DEFAULT 0 NOT NULL,
	"alert_recipients_used" integer DEFAULT 0 NOT NULL,
	"api_calls_used" integer DEFAULT 0 NOT NULL,
	"checks_performed" integer DEFAULT 0 NOT NULL,
	"data_retention_days" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile_audit_log" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"field_changed" text,
	"old_value" text,
	"new_value" text,
	"ip_address" text,
	"user_agent" text,
	"session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"user_id" text NOT NULL,
	"plan" text DEFAULT 'BASIC' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"current_period_start" timestamp DEFAULT now() NOT NULL,
	"current_period_end" timestamp DEFAULT now() NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"cancelled_at" timestamp,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_preferences" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"user_id" text NOT NULL,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"push_notifications" boolean DEFAULT false NOT NULL,
	"sms_notifications" boolean DEFAULT false NOT NULL,
	"weekly_report" boolean DEFAULT true NOT NULL,
	"maintenance_alerts" boolean DEFAULT true NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"date_format" text DEFAULT 'MM/DD/YYYY' NOT NULL,
	"time_format" text DEFAULT '12h' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "company" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "timezone" text DEFAULT 'UTC';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_secret" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "backup_codes" json;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_login_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_login_ip" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_suspended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "suspension_reason" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_history" ADD CONSTRAINT "billing_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_history" ADD CONSTRAINT "billing_history_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plan_usage" ADD CONSTRAINT "plan_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plan_usage" ADD CONSTRAINT "plan_usage_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profile_audit_log" ADD CONSTRAINT "profile_audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_history_user_id_idx" ON "billing_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_history_status_idx" ON "billing_history" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_history_created_at_idx" ON "billing_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plan_usage_user_period_idx" ON "plan_usage" USING btree ("user_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plan_usage_period_start_idx" ON "plan_usage" USING btree ("period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_audit_log_user_action_idx" ON "profile_audit_log" USING btree ("user_id","action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_audit_log_created_at_idx" ON "profile_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_user_id_idx" ON "subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_status_idx" ON "subscription" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_period_end_idx" ON "subscription" USING btree ("current_period_end");