CREATE TABLE "pulse_errors" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pulse_errors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"issue_id" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text,
	"visitor_id" text,
	"session_id" text,
	"path" text,
	"stack" text,
	"props" jsonb,
	"browser" text,
	"os" text
);
--> statement-breakpoint
CREATE TABLE "pulse_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pulse_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"visitor_id" text,
	"session_id" text,
	"user_id" text,
	"path" text,
	"value" double precision,
	"props" jsonb,
	"referrer" text,
	"country" text,
	"device" text,
	"browser" text,
	"os" text
);
--> statement-breakpoint
CREATE TABLE "pulse_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"culprit" text,
	"status" text DEFAULT 'open' NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pulse_errors" ADD CONSTRAINT "pulse_errors_issue_id_pulse_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."pulse_issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulse_errors" ADD CONSTRAINT "pulse_errors_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulse_events" ADD CONSTRAINT "pulse_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pulse_errors_issue_idx" ON "pulse_errors" USING btree ("issue_id","ts");--> statement-breakpoint
CREATE INDEX "pulse_errors_ts_idx" ON "pulse_errors" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "pulse_events_ts_idx" ON "pulse_events" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "pulse_events_kind_idx" ON "pulse_events" USING btree ("kind","ts");--> statement-breakpoint
CREATE INDEX "pulse_events_user_idx" ON "pulse_events" USING btree ("user_id","ts");--> statement-breakpoint
CREATE INDEX "pulse_events_session_idx" ON "pulse_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "pulse_issues_last_seen_idx" ON "pulse_issues" USING btree ("status","last_seen");