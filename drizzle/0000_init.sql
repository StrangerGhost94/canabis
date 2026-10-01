CREATE TYPE "public"."account_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('ACTIVE', 'PAUSED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('FLOWER', 'PRE_ROLL', 'VAPE', 'EXTRACT', 'EDIBLE', 'BEVERAGE', 'TOPICAL', 'CAPSULE', 'SEED', 'ACCESSORY');--> statement-breakpoint
CREATE TYPE "public"."commission_status" AS ENUM('NOT_APPLICABLE', 'PENDING', 'APPROVED', 'WITHHELD', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."conversion_status" AS ENUM('REPORTED', 'CONFIRMED', 'REVERSED', 'DISPUTED');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('VISIT', 'HANDOFF');--> statement-breakpoint
CREATE TYPE "public"."licence_status" AS ENUM('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('OWNER', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."partner_status" AS ENUM('APPLIED', 'UNDER_REVIEW', 'VERIFIED', 'SUSPENDED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."partnership_status" AS ENUM('REQUESTED', 'ACTIVE', 'DECLINED', 'ENDED');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('ACTIVE', 'HIDDEN', 'FLAGGED');--> statement-breakpoint
CREATE TYPE "public"."retailer_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'VERIFIED', 'SUSPENDED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."risk_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."risk_status" AS ENUM('OPEN', 'DISMISSED', 'ACTIONED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('CUSTOMER', 'RETAILER', 'PARTNER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."rule_status" AS ENUM('ALLOWED', 'PROHIBITED', 'UNCONFIRMED');--> statement-breakpoint
CREATE TYPE "public"."stock_status" AS ENUM('IN_STOCK', 'LOW', 'OUT');--> statement-breakpoint
CREATE TYPE "public"."verification_method" AS ENUM('MANUAL_REGISTRY_CHECK', 'EXTERNAL_API', 'DEMO_SIMULATED');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"ip_hash" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"partner_id" text NOT NULL,
	"retailer_id" text NOT NULL,
	"product_id" text,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"status" "campaign_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "conversions" (
	"id" text PRIMARY KEY NOT NULL,
	"retailer_id" text NOT NULL,
	"campaign_id" text,
	"partner_id" text,
	"external_ref" text NOT NULL,
	"order_cents" integer,
	"reported_via" text NOT NULL,
	"status" "conversion_status" DEFAULT 'REPORTED' NOT NULL,
	"commission_cents" integer,
	"commission_status" "commission_status" DEFAULT 'NOT_APPLICABLE' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"uploaded_by_id" text NOT NULL,
	"licence_id" text,
	"partner_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "favourites" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"retailer_id" text,
	"product_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"product_id" text NOT NULL,
	"location_id" text NOT NULL,
	"status" "stock_status" DEFAULT 'IN_STOCK' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_product_id_location_id_pk" PRIMARY KEY("product_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "jurisdiction_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"key" text NOT NULL,
	"status" "rule_status" DEFAULT 'UNCONFIRMED' NOT NULL,
	"source" text,
	"notes" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"reviewed_by_id" text,
	"reviewed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jurisdictions" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"legal_age" integer NOT NULL,
	"age_source" text NOT NULL,
	"regulator" text NOT NULL,
	"registry_url" text,
	"retail_model" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "licences" (
	"id" text PRIMARY KEY NOT NULL,
	"retailer_id" text NOT NULL,
	"location_id" text,
	"number" text NOT NULL,
	"holder_name" text NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"issued_at" date,
	"expires_at" date NOT NULL,
	"status" "licence_status" DEFAULT 'PENDING' NOT NULL,
	"method" "verification_method",
	"source_reference" text,
	"review_notes" text,
	"verified_at" timestamp with time zone,
	"verified_by_id" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"retailer_id" text NOT NULL,
	"name" text NOT NULL,
	"street" text NOT NULL,
	"city" text NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"postal_code" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"phone" text,
	"hours" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"offers_pickup" boolean DEFAULT false NOT NULL,
	"offers_delivery" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_retailers" (
	"partner_id" text NOT NULL,
	"retailer_id" text NOT NULL,
	"status" "partnership_status" DEFAULT 'REQUESTED' NOT NULL,
	"commission_bps" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_retailers_partner_id_retailer_id_pk" PRIMARY KEY("partner_id","retailer_id")
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"jurisdiction_code" text NOT NULL,
	"status" "partner_status" DEFAULT 'APPLIED' NOT NULL,
	"audience" text,
	"channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attested_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"review_notes" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partners_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "partners_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"retailer_id" text NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"category" "category" NOT NULL,
	"size" text NOT NULL,
	"potency_unit" text NOT NULL,
	"thc_min" double precision,
	"thc_max" double precision,
	"cbd_min" double precision,
	"cbd_max" double precision,
	"price_cents" integer NOT NULL,
	"description" text,
	"status" "product_status" DEFAULT 'ACTIVE' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_start" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "event_type" NOT NULL,
	"campaign_id" text,
	"partner_id" text,
	"retailer_id" text,
	"product_id" text,
	"visitor_hash" text NOT NULL,
	"ip_hash" text,
	"jurisdiction_code" text,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retailer_api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"retailer_id" text NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retailer_api_keys_prefix_unique" UNIQUE("prefix")
);
--> statement-breakpoint
CREATE TABLE "retailer_members" (
	"user_id" text NOT NULL,
	"retailer_id" text NOT NULL,
	"role" "member_role" DEFAULT 'STAFF' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retailer_members_user_id_retailer_id_pk" PRIMARY KEY("user_id","retailer_id")
);
--> statement-breakpoint
CREATE TABLE "retailers" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"trade_name" text NOT NULL,
	"legal_name" text NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"status" "retailer_status" DEFAULT 'DRAFT' NOT NULL,
	"about" text,
	"website" text,
	"ordering_url" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retailers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "risk_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"reason" text NOT NULL,
	"severity" "risk_severity" NOT NULL,
	"status" "risk_status" DEFAULT 'OPEN' NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolution" text,
	"resolved_by_id" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"birth_date" date NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"roles" "role"[] DEFAULT ARRAY['CUSTOMER']::role[] NOT NULL,
	"status" "account_status" DEFAULT 'ACTIVE' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_licence_id_licences_id_fk" FOREIGN KEY ("licence_id") REFERENCES "public"."licences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurisdiction_rules" ADD CONSTRAINT "jurisdiction_rules_jurisdiction_code_jurisdictions_code_fk" FOREIGN KEY ("jurisdiction_code") REFERENCES "public"."jurisdictions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licences" ADD CONSTRAINT "licences_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licences" ADD CONSTRAINT "licences_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licences" ADD CONSTRAINT "licences_jurisdiction_code_jurisdictions_code_fk" FOREIGN KEY ("jurisdiction_code") REFERENCES "public"."jurisdictions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_jurisdiction_code_jurisdictions_code_fk" FOREIGN KEY ("jurisdiction_code") REFERENCES "public"."jurisdictions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_retailers" ADD CONSTRAINT "partner_retailers_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_retailers" ADD CONSTRAINT "partner_retailers_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_jurisdiction_code_jurisdictions_code_fk" FOREIGN KEY ("jurisdiction_code") REFERENCES "public"."jurisdictions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailer_api_keys" ADD CONSTRAINT "retailer_api_keys_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailer_members" ADD CONSTRAINT "retailer_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailer_members" ADD CONSTRAINT "retailer_members_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retailers" ADD CONSTRAINT "retailers_jurisdiction_code_jurisdictions_code_fk" FOREIGN KEY ("jurisdiction_code") REFERENCES "public"."jurisdictions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_jurisdiction_code_jurisdictions_code_fk" FOREIGN KEY ("jurisdiction_code") REFERENCES "public"."jurisdictions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_target" ON "audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_time" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "conv_ref" ON "conversions" USING btree ("retailer_id","external_ref");--> statement-breakpoint
CREATE INDEX "conv_partner" ON "conversions" USING btree ("partner_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "fav_user_retailer" ON "favourites" USING btree ("user_id","retailer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fav_user_product" ON "favourites" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rule_jur_key" ON "jurisdiction_rules" USING btree ("jurisdiction_code","key");--> statement-breakpoint
CREATE INDEX "licence_status" ON "licences" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "location_jur" ON "locations" USING btree ("jurisdiction_code","active");--> statement-breakpoint
CREATE INDEX "notif_user" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "product_retailer" ON "products" USING btree ("retailer_id","status");--> statement-breakpoint
CREATE INDEX "product_category" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ev_partner" ON "referral_events" USING btree ("partner_id","created_at");--> statement-breakpoint
CREATE INDEX "ev_retailer" ON "referral_events" USING btree ("retailer_id","created_at");--> statement-breakpoint
CREATE INDEX "ev_ip" ON "referral_events" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "retailer_jur_status" ON "retailers" USING btree ("jurisdiction_code","status");--> statement-breakpoint
CREATE INDEX "risk_open" ON "risk_flags" USING btree ("status","severity");--> statement-breakpoint
CREATE INDEX "session_user" ON "sessions" USING btree ("user_id");