CREATE TYPE "public"."buyer_id_status" AS ENUM('NONE', 'PENDING', 'VERIFIED', 'REJECTED');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "id_status" "buyer_id_status" DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "id_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "id_reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "id_reviewed_by_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "id_review_notes" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address" jsonb;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "subject_user_id" text;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "fulfilment" "fulfilment" DEFAULT 'DELIVERY' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "routing_excluded" text[] DEFAULT '{}'::text[] NOT NULL;
