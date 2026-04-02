-- SQL_SCHEMA_FINAL.sql
-- Auto-generated from live Supabase database
-- Generated at: 2026-04-02T13:06:32.948618+00:00
-- Database: postgres @ aws-1-ap-northeast-1.pooler.supabase.com:5432

-- ======================================================
-- SCHEMAS
-- ======================================================
CREATE SCHEMA IF NOT EXISTS "auth";
CREATE SCHEMA IF NOT EXISTS "extensions";
CREATE SCHEMA IF NOT EXISTS "graphql";
CREATE SCHEMA IF NOT EXISTS "graphql_public";
CREATE SCHEMA IF NOT EXISTS "public";
CREATE SCHEMA IF NOT EXISTS "realtime";
CREATE SCHEMA IF NOT EXISTS "storage";
CREATE SCHEMA IF NOT EXISTS "vault";

-- ======================================================
-- TABLES / COLUMNS / ROW COUNTS
-- ======================================================
-- Table: auth.audit_log_entries
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."audit_log_entries" (
    "instance_id" uuid,
    "id" uuid NOT NULL,
    "payload" json,
    "created_at" timestamp with time zone,
    "ip_address" character varying DEFAULT ''::character varying NOT NULL
);

-- Table: auth.custom_oauth_providers
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."custom_oauth_providers" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "provider_type" text NOT NULL,
    "identifier" text NOT NULL,
    "name" text NOT NULL,
    "client_id" text NOT NULL,
    "client_secret" text NOT NULL,
    "acceptable_client_ids" ARRAY DEFAULT '{}'::text[] NOT NULL,
    "scopes" ARRAY DEFAULT '{}'::text[] NOT NULL,
    "pkce_enabled" boolean DEFAULT true NOT NULL,
    "attribute_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "authorization_params" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "email_optional" boolean DEFAULT false NOT NULL,
    "issuer" text,
    "discovery_url" text,
    "skip_nonce_check" boolean DEFAULT false NOT NULL,
    "cached_discovery" jsonb,
    "discovery_cached_at" timestamp with time zone,
    "authorization_url" text,
    "token_url" text,
    "userinfo_url" text,
    "jwks_uri" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Table: auth.flow_state
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."flow_state" (
    "id" uuid NOT NULL,
    "user_id" uuid,
    "auth_code" text,
    "code_challenge_method" code_challenge_method,
    "code_challenge" text,
    "provider_type" text NOT NULL,
    "provider_access_token" text,
    "provider_refresh_token" text,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "authentication_method" text NOT NULL,
    "auth_code_issued_at" timestamp with time zone,
    "invite_token" text,
    "referrer" text,
    "oauth_client_state_id" uuid,
    "linking_target_id" uuid,
    "email_optional" boolean DEFAULT false NOT NULL
);

-- Table: auth.identities
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."identities" (
    "provider_id" text NOT NULL,
    "user_id" uuid NOT NULL,
    "identity_data" jsonb NOT NULL,
    "provider" text NOT NULL,
    "last_sign_in_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email" text,
    "id" uuid DEFAULT gen_random_uuid() NOT NULL
);

-- Table: auth.instances
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."instances" (
    "id" uuid NOT NULL,
    "uuid" uuid,
    "raw_base_config" text,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);

-- Table: auth.mfa_amr_claims
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."mfa_amr_claims" (
    "session_id" uuid NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "authentication_method" text NOT NULL,
    "id" uuid NOT NULL
);

-- Table: auth.mfa_challenges
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."mfa_challenges" (
    "id" uuid NOT NULL,
    "factor_id" uuid NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "ip_address" inet NOT NULL,
    "otp_code" text,
    "web_authn_session_data" jsonb
);

-- Table: auth.mfa_factors
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."mfa_factors" (
    "id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "friendly_name" text,
    "factor_type" factor_type NOT NULL,
    "status" factor_status NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "secret" text,
    "phone" text,
    "last_challenged_at" timestamp with time zone,
    "web_authn_credential" jsonb,
    "web_authn_aaguid" uuid,
    "last_webauthn_challenge_data" jsonb
);

-- Table: auth.oauth_authorizations
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."oauth_authorizations" (
    "id" uuid NOT NULL,
    "authorization_id" text NOT NULL,
    "client_id" uuid NOT NULL,
    "user_id" uuid,
    "redirect_uri" text NOT NULL,
    "scope" text NOT NULL,
    "state" text,
    "resource" text,
    "code_challenge" text,
    "code_challenge_method" code_challenge_method,
    "response_type" oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    "status" oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    "authorization_code" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    "approved_at" timestamp with time zone,
    "nonce" text
);

-- Table: auth.oauth_client_states
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."oauth_client_states" (
    "id" uuid NOT NULL,
    "provider_type" text NOT NULL,
    "code_verifier" text,
    "created_at" timestamp with time zone NOT NULL
);

-- Table: auth.oauth_clients
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."oauth_clients" (
    "id" uuid NOT NULL,
    "client_secret_hash" text,
    "registration_type" oauth_registration_type NOT NULL,
    "redirect_uris" text NOT NULL,
    "grant_types" text NOT NULL,
    "client_name" text,
    "client_uri" text,
    "logo_uri" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "deleted_at" timestamp with time zone,
    "client_type" oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    "token_endpoint_auth_method" text NOT NULL
);

-- Table: auth.oauth_consents
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."oauth_consents" (
    "id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "client_id" uuid NOT NULL,
    "scopes" text NOT NULL,
    "granted_at" timestamp with time zone DEFAULT now() NOT NULL,
    "revoked_at" timestamp with time zone
);

-- Table: auth.one_time_tokens
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."one_time_tokens" (
    "id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "token_type" one_time_token_type NOT NULL,
    "token_hash" text NOT NULL,
    "relates_to" text NOT NULL,
    "created_at" timestamp without time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT now() NOT NULL
);

-- Table: auth.refresh_tokens
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."refresh_tokens" (
    "instance_id" uuid,
    "id" bigint DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass) NOT NULL,
    "token" character varying,
    "user_id" character varying,
    "revoked" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "parent" character varying,
    "session_id" uuid
);

-- Table: auth.saml_providers
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."saml_providers" (
    "id" uuid NOT NULL,
    "sso_provider_id" uuid NOT NULL,
    "entity_id" text NOT NULL,
    "metadata_xml" text NOT NULL,
    "metadata_url" text,
    "attribute_mapping" jsonb,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "name_id_format" text
);

-- Table: auth.saml_relay_states
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."saml_relay_states" (
    "id" uuid NOT NULL,
    "sso_provider_id" uuid NOT NULL,
    "request_id" text NOT NULL,
    "for_email" text,
    "redirect_to" text,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "flow_state_id" uuid
);

-- Table: auth.schema_migrations
-- RowCount: 76
CREATE TABLE IF NOT EXISTS "auth"."schema_migrations" (
    "version" character varying NOT NULL
);

-- Table: auth.sessions
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."sessions" (
    "id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "factor_id" uuid,
    "aal" aal_level,
    "not_after" timestamp with time zone,
    "refreshed_at" timestamp without time zone,
    "user_agent" text,
    "ip" inet,
    "tag" text,
    "oauth_client_id" uuid,
    "refresh_token_hmac_key" text,
    "refresh_token_counter" bigint,
    "scopes" text
);

-- Table: auth.sso_domains
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."sso_domains" (
    "id" uuid NOT NULL,
    "sso_provider_id" uuid NOT NULL,
    "domain" text NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);

-- Table: auth.sso_providers
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."sso_providers" (
    "id" uuid NOT NULL,
    "resource_id" text,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "disabled" boolean
);

-- Table: auth.users
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."users" (
    "instance_id" uuid,
    "id" uuid NOT NULL,
    "aud" character varying,
    "role" character varying,
    "email" character varying,
    "encrypted_password" character varying,
    "email_confirmed_at" timestamp with time zone,
    "invited_at" timestamp with time zone,
    "confirmation_token" character varying,
    "confirmation_sent_at" timestamp with time zone,
    "recovery_token" character varying,
    "recovery_sent_at" timestamp with time zone,
    "email_change_token_new" character varying,
    "email_change" character varying,
    "email_change_sent_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "raw_app_meta_data" jsonb,
    "raw_user_meta_data" jsonb,
    "is_super_admin" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "phone" text DEFAULT NULL::character varying,
    "phone_confirmed_at" timestamp with time zone,
    "phone_change" text DEFAULT ''::character varying,
    "phone_change_token" character varying DEFAULT ''::character varying,
    "phone_change_sent_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone,
    "email_change_token_current" character varying DEFAULT ''::character varying,
    "email_change_confirm_status" smallint DEFAULT 0,
    "banned_until" timestamp with time zone,
    "reauthentication_token" character varying DEFAULT ''::character varying,
    "reauthentication_sent_at" timestamp with time zone,
    "is_sso_user" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_anonymous" boolean DEFAULT false NOT NULL
);

-- Table: auth.webauthn_challenges
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."webauthn_challenges" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid,
    "challenge_type" text NOT NULL,
    "session_data" jsonb NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);

-- Table: auth.webauthn_credentials
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "auth"."webauthn_credentials" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "credential_id" bytea NOT NULL,
    "public_key" bytea NOT NULL,
    "attestation_type" text DEFAULT ''::text NOT NULL,
    "aaguid" uuid,
    "sign_count" bigint DEFAULT 0 NOT NULL,
    "transports" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "backup_eligible" boolean DEFAULT false NOT NULL,
    "backed_up" boolean DEFAULT false NOT NULL,
    "friendly_name" text DEFAULT ''::text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "last_used_at" timestamp with time zone
);

-- Table: public.activity_logs
-- RowCount: 63
CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" bigint DEFAULT nextval('activity_logs_id_seq'::regclass) NOT NULL,
    "user_id" bigint NOT NULL,
    "action_type" character varying NOT NULL,
    "action_title" character varying,
    "action_description" text,
    "resource_type" character varying,
    "resource_id" bigint,
    "metadata" jsonb,
    "status" character varying DEFAULT 'SUCCESS'::character varying,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "error_message" text
);

-- Table: public.app_settings
-- RowCount: 6
CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "id" bigint DEFAULT nextval('app_settings_id_seq'::regclass) NOT NULL,
    "setting_key" character varying NOT NULL,
    "setting_value" text,
    "description" character varying,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: public.audit_logs
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" bigint DEFAULT nextval('audit_logs_id_seq'::regclass) NOT NULL,
    "user_id" bigint,
    "action" character varying,
    "resource_type" character varying,
    "resource_id" bigint,
    "details" text,
    "ip_address" character varying,
    "user_agent" character varying,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: public.campaign_queue
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "public"."campaign_queue" (
    "id" bigint DEFAULT nextval('campaign_queue_id_seq'::regclass) NOT NULL,
    "user_id" bigint NOT NULL,
    "csv_upload_id" bigint NOT NULL,
    "campaign_id" bigint NOT NULL,
    "status" character varying DEFAULT 'QUEUED'::character varying NOT NULL,
    "queue_position" integer NOT NULL,
    "total_recipients" integer,
    "processed_recipients" integer DEFAULT 0,
    "failed_recipients" integer DEFAULT 0,
    "sent_recipients" integer DEFAULT 0,
    "current_row" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "started_at" timestamp without time zone,
    "completed_at" timestamp without time zone,
    "error_message" text,
    "pause_reason" character varying,
    "retry_count" integer DEFAULT 0
);

-- Table: public.campaign_recipients
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "public"."campaign_recipients" (
    "id" bigint DEFAULT nextval('campaign_recipients_id_seq'::regclass) NOT NULL,
    "campaign_id" bigint NOT NULL,
    "name" character varying NOT NULL,
    "email" character varying NOT NULL,
    "company" character varying,
    "custom_field_1" character varying,
    "custom_field_2" character varying,
    "status" character varying DEFAULT 'PENDING'::character varying,
    "error_message" text,
    "error_code" character varying,
    "sent_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: public.campaign_runtime_events
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "public"."campaign_runtime_events" (
    "id" bigint DEFAULT nextval('campaign_runtime_events_id_seq'::regclass) NOT NULL,
    "user_id" bigint NOT NULL,
    "campaign_id" bigint,
    "queue_id" bigint NOT NULL,
    "seq_no" bigint NOT NULL,
    "event_time" timestamp without time zone DEFAULT now() NOT NULL,
    "level" character varying NOT NULL,
    "message" text NOT NULL,
    "row_number" integer,
    "recipient_email" character varying
);

-- Table: public.campaign_stats_daily
-- RowCount: 1
CREATE TABLE IF NOT EXISTS "public"."campaign_stats_daily" (
    "id" bigint DEFAULT nextval('campaign_stats_daily_id_seq'::regclass) NOT NULL,
    "user_id" bigint NOT NULL,
    "queue_id" bigint NOT NULL,
    "sent_count" integer DEFAULT 0 NOT NULL,
    "failed_count" integer DEFAULT 0 NOT NULL,
    "total_count" integer DEFAULT 0 NOT NULL,
    "recorded_at" timestamp without time zone DEFAULT now() NOT NULL,
    "expires_at" timestamp without time zone NOT NULL
);

-- Table: public.campaign_stats_yearly
-- RowCount: 1
CREATE TABLE IF NOT EXISTS "public"."campaign_stats_yearly" (
    "id" bigint DEFAULT nextval('campaign_stats_yearly_id_seq'::regclass) NOT NULL,
    "user_id" bigint NOT NULL,
    "stat_year" integer NOT NULL,
    "sent_count" bigint DEFAULT 0 NOT NULL,
    "failed_count" bigint DEFAULT 0 NOT NULL,
    "total_count" bigint DEFAULT 0 NOT NULL,
    "updated_at" timestamp without time zone DEFAULT now() NOT NULL
);

-- Table: public.campaigns
-- RowCount: 32
CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" bigint DEFAULT nextval('campaigns_id_seq'::regclass) NOT NULL,
    "user_id" bigint NOT NULL,
    "email_provider_id" bigint,
    "campaign_name" character varying NOT NULL,
    "subject" character varying NOT NULL,
    "email_body" text NOT NULL,
    "status" character varying DEFAULT 'DRAFT'::character varying,
    "scheduled_at" timestamp without time zone,
    "started_at" timestamp without time zone,
    "completed_at" timestamp without time zone,
    "paused_at" timestamp without time zone,
    "recipient_count" integer DEFAULT 0,
    "send_delay_ms" integer DEFAULT 0,
    "total_sent" integer DEFAULT 0,
    "total_failed" integer DEFAULT 0,
    "total_pending" integer DEFAULT 0,
    "success_rate" numeric DEFAULT 0.00,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: public.csv_uploads
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "public"."csv_uploads" (
    "id" bigint DEFAULT nextval('csv_uploads_id_seq'::regclass) NOT NULL,
    "user_id" bigint NOT NULL,
    "file_name" character varying NOT NULL,
    "file_size_bytes" bigint,
    "file_storage_path" character varying,
    "total_rows" integer DEFAULT 0,
    "valid_rows" integer DEFAULT 0,
    "invalid_rows" integer DEFAULT 0,
    "duplicate_rows" integer DEFAULT 0,
    "status" character varying DEFAULT 'UPLOADED'::character varying,
    "error_details" text,
    "uploaded_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "processed_at" timestamp without time zone,
    "queue_position" integer,
    "is_queued" boolean DEFAULT false,
    "queued_at" timestamp without time zone
);

-- Table: public.email_logs
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" bigint DEFAULT nextval('email_logs_id_seq'::regclass) NOT NULL,
    "campaign_id" bigint NOT NULL,
    "recipient_id" bigint,
    "recipient_email" character varying NOT NULL,
    "subject_sent" character varying,
    "status" character varying DEFAULT 'SENT'::character varying,
    "smtp_response_code" integer,
    "smtp_response_message" text,
    "opened_at" timestamp without time zone,
    "clicked_at" timestamp without time zone,
    "sent_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: public.email_providers
-- RowCount: 2
CREATE TABLE IF NOT EXISTS "public"."email_providers" (
    "id" bigint DEFAULT nextval('email_providers_id_seq'::regclass) NOT NULL,
    "user_id" bigint NOT NULL,
    "provider_type" character varying NOT NULL,
    "display_name" character varying,
    "from_email" character varying NOT NULL,
    "from_name" character varying,
    "encrypted_config" text NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_verified" boolean DEFAULT false,
    "verification_attempts" integer DEFAULT 0,
    "last_verified_at" timestamp without time zone,
    "last_verification_error" text,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: public.email_verification_tokens
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "public"."email_verification_tokens" (
    "id" bigint DEFAULT nextval('email_verification_tokens_id_seq'::regclass) NOT NULL,
    "user_id" bigint NOT NULL,
    "token" character varying NOT NULL,
    "expires_at" timestamp without time zone NOT NULL,
    "is_used" boolean DEFAULT false,
    "used_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: public.flyway_schema_history
-- RowCount: 14
CREATE TABLE IF NOT EXISTS "public"."flyway_schema_history" (
    "installed_rank" integer NOT NULL,
    "version" character varying,
    "description" character varying NOT NULL,
    "type" character varying NOT NULL,
    "script" character varying NOT NULL,
    "checksum" integer,
    "installed_by" character varying NOT NULL,
    "installed_on" timestamp without time zone DEFAULT now() NOT NULL,
    "execution_time" integer NOT NULL,
    "success" boolean NOT NULL
);

-- Table: public.password_reset_tokens
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "public"."password_reset_tokens" (
    "id" bigint DEFAULT nextval('password_reset_tokens_id_seq'::regclass) NOT NULL,
    "user_id" bigint NOT NULL,
    "token" character varying NOT NULL,
    "otp" character varying,
    "expires_at" timestamp without time zone NOT NULL,
    "is_used" boolean DEFAULT false,
    "used_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: public.users
-- RowCount: 1
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" bigint DEFAULT nextval('users_id_seq'::regclass) NOT NULL,
    "email" character varying NOT NULL,
    "password_hash" character varying NOT NULL,
    "full_name" character varying,
    "avatar_file_name" character varying,
    "avatar_file_size" bigint,
    "avatar_mime_type" character varying,
    "avatar_storage_path" character varying,
    "is_active" boolean DEFAULT true,
    "is_email_verified" boolean DEFAULT false,
    "email_verified_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" timestamp without time zone,
    "default_email_provider_id" bigint,
    "email_selection_preference" character varying DEFAULT 'default'::character varying
);

-- Table: realtime.messages
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "realtime"."messages" (
    "topic" text NOT NULL,
    "extension" text NOT NULL,
    "payload" jsonb,
    "event" text,
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT now() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT now() NOT NULL,
    "id" uuid DEFAULT gen_random_uuid() NOT NULL
);

-- Table: realtime.schema_migrations
-- RowCount: 68
CREATE TABLE IF NOT EXISTS "realtime"."schema_migrations" (
    "version" bigint NOT NULL,
    "inserted_at" timestamp without time zone
);

-- Table: realtime.subscription
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "realtime"."subscription" (
    "id" bigint NOT NULL,
    "subscription_id" uuid NOT NULL,
    "entity" regclass NOT NULL,
    "filters" ARRAY DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    "claims" jsonb NOT NULL,
    "claims_role" regrole NOT NULL,
    "created_at" timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "action_filter" text DEFAULT '*'::text
);

-- Table: storage.buckets
-- RowCount: 2
CREATE TABLE IF NOT EXISTS "storage"."buckets" (
    "id" text NOT NULL,
    "name" text NOT NULL,
    "owner" uuid,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" ARRAY,
    "owner_id" text,
    "type" buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);

-- Table: storage.buckets_analytics
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "storage"."buckets_analytics" (
    "name" text NOT NULL,
    "type" buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    "format" text DEFAULT 'ICEBERG'::text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "deleted_at" timestamp with time zone
);

-- Table: storage.buckets_vectors
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "storage"."buckets_vectors" (
    "id" text NOT NULL,
    "type" buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Table: storage.migrations
-- RowCount: 57
CREATE TABLE IF NOT EXISTS "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying NOT NULL,
    "hash" character varying NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: storage.objects
-- RowCount: 2
CREATE TABLE IF NOT EXISTS "storage"."objects" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "bucket_id" text,
    "name" text,
    "owner" uuid,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "last_accessed_at" timestamp with time zone DEFAULT now(),
    "metadata" jsonb,
    "path_tokens" ARRAY,
    "version" text,
    "owner_id" text,
    "user_metadata" jsonb
);

-- Table: storage.s3_multipart_uploads
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads" (
    "id" text NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" text NOT NULL,
    "bucket_id" text NOT NULL,
    "key" text NOT NULL,
    "version" text NOT NULL,
    "owner_id" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "user_metadata" jsonb
);

-- Table: storage.s3_multipart_uploads_parts
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads_parts" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "upload_id" text NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" text NOT NULL,
    "key" text NOT NULL,
    "etag" text NOT NULL,
    "owner_id" text,
    "version" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Table: storage.vector_indexes
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "storage"."vector_indexes" (
    "id" text DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "bucket_id" text NOT NULL,
    "data_type" text NOT NULL,
    "dimension" integer NOT NULL,
    "distance_metric" text NOT NULL,
    "metadata_configuration" jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Table: vault.secrets
-- RowCount: 0
CREATE TABLE IF NOT EXISTS "vault"."secrets" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" text,
    "description" text DEFAULT ''::text NOT NULL,
    "secret" text NOT NULL,
    "key_id" uuid,
    "nonce" bytea DEFAULT vault._crypto_aead_det_noncegen(),
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ======================================================
-- CONSTRAINTS
-- ======================================================
ALTER TABLE "auth"."audit_log_entries" ADD CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_authorization_url_https" CHECK (authorization_url IS NULL OR authorization_url ~~ 'https://%'::text);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_authorization_url_length" CHECK (authorization_url IS NULL OR char_length(authorization_url) <= 2048);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_client_id_length" CHECK (char_length(client_id) >= 1 AND char_length(client_id) <= 512);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_discovery_url_length" CHECK (discovery_url IS NULL OR char_length(discovery_url) <= 2048);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_identifier_format" CHECK (identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_identifier_key" UNIQUE (identifier);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_issuer_length" CHECK (issuer IS NULL OR char_length(issuer) >= 1 AND char_length(issuer) <= 2048);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_jwks_uri_https" CHECK (jwks_uri IS NULL OR jwks_uri ~~ 'https://%'::text);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_jwks_uri_length" CHECK (jwks_uri IS NULL OR char_length(jwks_uri) <= 2048);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_name_length" CHECK (char_length(name) >= 1 AND char_length(name) <= 100);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_oauth2_requires_endpoints" CHECK (provider_type <> 'oauth2'::text OR authorization_url IS NOT NULL AND token_url IS NOT NULL AND userinfo_url IS NOT NULL);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_oidc_discovery_url_https" CHECK (provider_type <> 'oidc'::text OR discovery_url IS NULL OR discovery_url ~~ 'https://%'::text);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_oidc_issuer_https" CHECK (provider_type <> 'oidc'::text OR issuer IS NULL OR issuer ~~ 'https://%'::text);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_oidc_requires_issuer" CHECK (provider_type <> 'oidc'::text OR issuer IS NOT NULL);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_provider_type_check" CHECK (provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]));
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_token_url_https" CHECK (token_url IS NULL OR token_url ~~ 'https://%'::text);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_token_url_length" CHECK (token_url IS NULL OR char_length(token_url) <= 2048);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_userinfo_url_https" CHECK (userinfo_url IS NULL OR userinfo_url ~~ 'https://%'::text);
ALTER TABLE "auth"."custom_oauth_providers" ADD CONSTRAINT "custom_oauth_providers_userinfo_url_length" CHECK (userinfo_url IS NULL OR char_length(userinfo_url) <= 2048);
ALTER TABLE "auth"."flow_state" ADD CONSTRAINT "flow_state_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."identities" ADD CONSTRAINT "identities_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."identities" ADD CONSTRAINT "identities_provider_id_provider_unique" UNIQUE (provider_id, provider);
ALTER TABLE "auth"."identities" ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "auth"."instances" ADD CONSTRAINT "instances_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."mfa_amr_claims" ADD CONSTRAINT "amr_id_pk" PRIMARY KEY (id);
ALTER TABLE "auth"."mfa_amr_claims" ADD CONSTRAINT "mfa_amr_claims_session_id_authentication_method_pkey" UNIQUE (session_id, authentication_method);
ALTER TABLE "auth"."mfa_amr_claims" ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;
ALTER TABLE "auth"."mfa_challenges" ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;
ALTER TABLE "auth"."mfa_challenges" ADD CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."mfa_factors" ADD CONSTRAINT "mfa_factors_last_challenged_at_key" UNIQUE (last_challenged_at);
ALTER TABLE "auth"."mfa_factors" ADD CONSTRAINT "mfa_factors_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."mfa_factors" ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_authorization_code_key" UNIQUE (authorization_code);
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_authorization_code_length" CHECK (char_length(authorization_code) <= 255);
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_authorization_id_key" UNIQUE (authorization_id);
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_code_challenge_length" CHECK (char_length(code_challenge) <= 128);
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_expires_at_future" CHECK (expires_at > created_at);
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_nonce_length" CHECK (char_length(nonce) <= 255);
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_redirect_uri_length" CHECK (char_length(redirect_uri) <= 2048);
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_resource_length" CHECK (char_length(resource) <= 2048);
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_scope_length" CHECK (char_length(scope) <= 4096);
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_state_length" CHECK (char_length(state) <= 4096);
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "auth"."oauth_client_states" ADD CONSTRAINT "oauth_client_states_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."oauth_clients" ADD CONSTRAINT "oauth_clients_client_name_length" CHECK (char_length(client_name) <= 1024);
ALTER TABLE "auth"."oauth_clients" ADD CONSTRAINT "oauth_clients_client_uri_length" CHECK (char_length(client_uri) <= 2048);
ALTER TABLE "auth"."oauth_clients" ADD CONSTRAINT "oauth_clients_logo_uri_length" CHECK (char_length(logo_uri) <= 2048);
ALTER TABLE "auth"."oauth_clients" ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."oauth_clients" ADD CONSTRAINT "oauth_clients_token_endpoint_auth_method_check" CHECK (token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text]));
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_revoked_after_granted" CHECK (revoked_at IS NULL OR revoked_at >= granted_at);
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_scopes_length" CHECK (char_length(scopes) <= 2048);
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_scopes_not_empty" CHECK (char_length(TRIM(BOTH FROM scopes)) > 0);
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_user_client_unique" UNIQUE (user_id, client_id);
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "auth"."one_time_tokens" ADD CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."one_time_tokens" ADD CONSTRAINT "one_time_tokens_token_hash_check" CHECK (char_length(token_hash) > 0);
ALTER TABLE "auth"."one_time_tokens" ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_token_unique" UNIQUE (token);
ALTER TABLE "auth"."saml_providers" ADD CONSTRAINT "entity_id not empty" CHECK (char_length(entity_id) > 0);
ALTER TABLE "auth"."saml_providers" ADD CONSTRAINT "metadata_url not empty" CHECK (metadata_url = NULL::text OR char_length(metadata_url) > 0);
ALTER TABLE "auth"."saml_providers" ADD CONSTRAINT "metadata_xml not empty" CHECK (char_length(metadata_xml) > 0);
ALTER TABLE "auth"."saml_providers" ADD CONSTRAINT "saml_providers_entity_id_key" UNIQUE (entity_id);
ALTER TABLE "auth"."saml_providers" ADD CONSTRAINT "saml_providers_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."saml_providers" ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;
ALTER TABLE "auth"."saml_relay_states" ADD CONSTRAINT "request_id not empty" CHECK (char_length(request_id) > 0);
ALTER TABLE "auth"."saml_relay_states" ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;
ALTER TABLE "auth"."saml_relay_states" ADD CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."saml_relay_states" ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;
ALTER TABLE "auth"."schema_migrations" ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY (version);
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_scopes_length" CHECK (char_length(scopes) <= 4096);
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "auth"."sso_domains" ADD CONSTRAINT "domain not empty" CHECK (char_length(domain) > 0);
ALTER TABLE "auth"."sso_domains" ADD CONSTRAINT "sso_domains_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."sso_domains" ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;
ALTER TABLE "auth"."sso_providers" ADD CONSTRAINT "resource_id not empty" CHECK (resource_id = NULL::text OR char_length(resource_id) > 0);
ALTER TABLE "auth"."sso_providers" ADD CONSTRAINT "sso_providers_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."users" ADD CONSTRAINT "users_email_change_confirm_status_check" CHECK (email_change_confirm_status >= 0 AND email_change_confirm_status <= 2);
ALTER TABLE "auth"."users" ADD CONSTRAINT "users_phone_key" UNIQUE (phone);
ALTER TABLE "auth"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."webauthn_challenges" ADD CONSTRAINT "webauthn_challenges_challenge_type_check" CHECK (challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text]));
ALTER TABLE "auth"."webauthn_challenges" ADD CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."webauthn_challenges" ADD CONSTRAINT "webauthn_challenges_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "auth"."webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY (id);
ALTER TABLE "auth"."webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."activity_logs" ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."activity_logs" ADD CONSTRAINT "fk_activity_logs_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "public"."app_settings" ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."app_settings" ADD CONSTRAINT "uk_app_settings_key" UNIQUE (setting_key);
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "fk_audit_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE "public"."campaign_queue" ADD CONSTRAINT "campaign_queue_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."campaign_queue" ADD CONSTRAINT "fk_campaign_queue_campaign" FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
ALTER TABLE "public"."campaign_queue" ADD CONSTRAINT "fk_campaign_queue_csv" FOREIGN KEY (csv_upload_id) REFERENCES csv_uploads(id) ON DELETE CASCADE;
ALTER TABLE "public"."campaign_queue" ADD CONSTRAINT "fk_campaign_queue_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "public"."campaign_recipients" ADD CONSTRAINT "campaign_recipients_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."campaign_recipients" ADD CONSTRAINT "ck_email_format" CHECK (email::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text);
ALTER TABLE "public"."campaign_recipients" ADD CONSTRAINT "ck_recipient_status" CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'SENT'::character varying, 'FAILED'::character varying, 'BOUNCED'::character varying, 'INVALID'::character varying]::text[]));
ALTER TABLE "public"."campaign_recipients" ADD CONSTRAINT "fk_cr_campaign" FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
ALTER TABLE "public"."campaign_runtime_events" ADD CONSTRAINT "campaign_runtime_events_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."campaign_stats_daily" ADD CONSTRAINT "campaign_stats_daily_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."campaign_stats_daily" ADD CONSTRAINT "campaign_stats_daily_queue_id_key" UNIQUE (queue_id);
ALTER TABLE "public"."campaign_stats_yearly" ADD CONSTRAINT "campaign_stats_yearly_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."campaign_stats_yearly" ADD CONSTRAINT "uq_campaign_stats_yearly_user_year" UNIQUE (user_id, stat_year);
ALTER TABLE "public"."campaigns" ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."campaigns" ADD CONSTRAINT "ck_status" CHECK (status::text = ANY (ARRAY['DRAFT'::character varying, 'SCHEDULED'::character varying, 'QUEUED'::character varying, 'RUNNING'::character varying, 'PAUSED'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying, 'CANCELLED'::character varying]::text[]));
ALTER TABLE "public"."campaigns" ADD CONSTRAINT "ck_success_rate" CHECK (success_rate >= 0::numeric AND success_rate <= 100::numeric);
ALTER TABLE "public"."campaigns" ADD CONSTRAINT "fk_camp_provider" FOREIGN KEY (email_provider_id) REFERENCES email_providers(id) ON DELETE RESTRICT;
ALTER TABLE "public"."campaigns" ADD CONSTRAINT "fk_camp_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "public"."csv_uploads" ADD CONSTRAINT "ck_csv_status" CHECK (status::text = ANY (ARRAY['UPLOADED'::character varying, 'PROCESSING'::character varying, 'SUCCESS'::character varying, 'FAILED'::character varying, 'PARTIALLY_FAILED'::character varying, 'QUEUED'::character varying, 'IN_PROGRESS'::character varying, 'DONE'::character varying, 'COMPLETED'::character varying]::text[]));
ALTER TABLE "public"."csv_uploads" ADD CONSTRAINT "csv_uploads_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."csv_uploads" ADD CONSTRAINT "fk_csv_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "public"."email_logs" ADD CONSTRAINT "ck_email_log_status" CHECK (status::text = ANY (ARRAY['SENT'::character varying, 'FAILED'::character varying, 'BOUNCED'::character varying, 'OPENED'::character varying, 'CLICKED'::character varying]::text[]));
ALTER TABLE "public"."email_logs" ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."email_logs" ADD CONSTRAINT "fk_el_campaign" FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
ALTER TABLE "public"."email_logs" ADD CONSTRAINT "fk_el_recipient" FOREIGN KEY (recipient_id) REFERENCES campaign_recipients(id) ON DELETE SET NULL;
ALTER TABLE "public"."email_providers" ADD CONSTRAINT "ck_provider_type" CHECK (provider_type::text = ANY (ARRAY['SMTP'::character varying, 'GMAIL'::character varying, 'OUTLOOK'::character varying, 'RESEND'::character varying]::text[]));
ALTER TABLE "public"."email_providers" ADD CONSTRAINT "email_providers_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."email_providers" ADD CONSTRAINT "fk_ep_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "public"."email_providers" ADD CONSTRAINT "uk_ep_user_type" UNIQUE (user_id, provider_type);
ALTER TABLE "public"."email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_token_key" UNIQUE (token);
ALTER TABLE "public"."email_verification_tokens" ADD CONSTRAINT "fk_evt_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "public"."flyway_schema_history" ADD CONSTRAINT "flyway_schema_history_pk" PRIMARY KEY (installed_rank);
ALTER TABLE "public"."password_reset_tokens" ADD CONSTRAINT "fk_prt_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "public"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."password_reset_tokens" ADD CONSTRAINT "uk_prt_token" UNIQUE (token);
ALTER TABLE "public"."users" ADD CONSTRAINT "chk_email_selection_pref" CHECK (email_selection_preference::text = ANY (ARRAY['default'::character varying, 'prompt'::character varying]::text[]));
ALTER TABLE "public"."users" ADD CONSTRAINT "ck_email_format" CHECK (email::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text);
ALTER TABLE "public"."users" ADD CONSTRAINT "fk_user_default_email_provider" FOREIGN KEY (default_email_provider_id) REFERENCES email_providers(id) ON DELETE SET NULL;
ALTER TABLE "public"."users" ADD CONSTRAINT "uk_users_email" UNIQUE (email);
ALTER TABLE "public"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY (id);
ALTER TABLE "realtime"."messages" ADD CONSTRAINT "messages_pkey" PRIMARY KEY (id, inserted_at);
ALTER TABLE "realtime"."schema_migrations" ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY (version);
ALTER TABLE "realtime"."subscription" ADD CONSTRAINT "pk_subscription" PRIMARY KEY (id);
ALTER TABLE "realtime"."subscription" ADD CONSTRAINT "subscription_action_filter_check" CHECK (action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text]));
ALTER TABLE "storage"."buckets" ADD CONSTRAINT "buckets_pkey" PRIMARY KEY (id);
ALTER TABLE "storage"."buckets_analytics" ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY (id);
ALTER TABLE "storage"."buckets_vectors" ADD CONSTRAINT "buckets_vectors_pkey" PRIMARY KEY (id);
ALTER TABLE "storage"."migrations" ADD CONSTRAINT "migrations_name_key" UNIQUE (name);
ALTER TABLE "storage"."migrations" ADD CONSTRAINT "migrations_pkey" PRIMARY KEY (id);
ALTER TABLE "storage"."objects" ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);
ALTER TABLE "storage"."objects" ADD CONSTRAINT "objects_pkey" PRIMARY KEY (id);
ALTER TABLE "storage"."s3_multipart_uploads" ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);
ALTER TABLE "storage"."s3_multipart_uploads" ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY (id);
ALTER TABLE "storage"."s3_multipart_uploads_parts" ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);
ALTER TABLE "storage"."s3_multipart_uploads_parts" ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY (id);
ALTER TABLE "storage"."s3_multipart_uploads_parts" ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;
ALTER TABLE "storage"."vector_indexes" ADD CONSTRAINT "vector_indexes_bucket_id_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);
ALTER TABLE "storage"."vector_indexes" ADD CONSTRAINT "vector_indexes_pkey" PRIMARY KEY (id);
ALTER TABLE "vault"."secrets" ADD CONSTRAINT "secrets_pkey" PRIMARY KEY (id);

-- ======================================================
-- INDEXES
-- ======================================================
-- auth.audit_log_entries -> audit_log_entries_pkey
CREATE UNIQUE INDEX audit_log_entries_pkey ON auth.audit_log_entries USING btree (id);
-- auth.audit_log_entries -> audit_logs_instance_id_idx
CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);
-- auth.custom_oauth_providers -> custom_oauth_providers_created_at_idx
CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);
-- auth.custom_oauth_providers -> custom_oauth_providers_enabled_idx
CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);
-- auth.custom_oauth_providers -> custom_oauth_providers_identifier_idx
CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);
-- auth.custom_oauth_providers -> custom_oauth_providers_identifier_key
CREATE UNIQUE INDEX custom_oauth_providers_identifier_key ON auth.custom_oauth_providers USING btree (identifier);
-- auth.custom_oauth_providers -> custom_oauth_providers_pkey
CREATE UNIQUE INDEX custom_oauth_providers_pkey ON auth.custom_oauth_providers USING btree (id);
-- auth.custom_oauth_providers -> custom_oauth_providers_provider_type_idx
CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);
-- auth.flow_state -> flow_state_created_at_idx
CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);
-- auth.flow_state -> flow_state_pkey
CREATE UNIQUE INDEX flow_state_pkey ON auth.flow_state USING btree (id);
-- auth.flow_state -> idx_auth_code
CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);
-- auth.flow_state -> idx_user_id_auth_method
CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);
-- auth.identities -> identities_email_idx
CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);
-- auth.identities -> identities_pkey
CREATE UNIQUE INDEX identities_pkey ON auth.identities USING btree (id);
-- auth.identities -> identities_provider_id_provider_unique
CREATE UNIQUE INDEX identities_provider_id_provider_unique ON auth.identities USING btree (provider_id, provider);
-- auth.identities -> identities_user_id_idx
CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);
-- auth.instances -> instances_pkey
CREATE UNIQUE INDEX instances_pkey ON auth.instances USING btree (id);
-- auth.mfa_amr_claims -> amr_id_pk
CREATE UNIQUE INDEX amr_id_pk ON auth.mfa_amr_claims USING btree (id);
-- auth.mfa_amr_claims -> mfa_amr_claims_session_id_authentication_method_pkey
CREATE UNIQUE INDEX mfa_amr_claims_session_id_authentication_method_pkey ON auth.mfa_amr_claims USING btree (session_id, authentication_method);
-- auth.mfa_challenges -> mfa_challenge_created_at_idx
CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);
-- auth.mfa_challenges -> mfa_challenges_pkey
CREATE UNIQUE INDEX mfa_challenges_pkey ON auth.mfa_challenges USING btree (id);
-- auth.mfa_factors -> factor_id_created_at_idx
CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);
-- auth.mfa_factors -> mfa_factors_last_challenged_at_key
CREATE UNIQUE INDEX mfa_factors_last_challenged_at_key ON auth.mfa_factors USING btree (last_challenged_at);
-- auth.mfa_factors -> mfa_factors_pkey
CREATE UNIQUE INDEX mfa_factors_pkey ON auth.mfa_factors USING btree (id);
-- auth.mfa_factors -> mfa_factors_user_friendly_name_unique
CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);
-- auth.mfa_factors -> mfa_factors_user_id_idx
CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);
-- auth.mfa_factors -> unique_phone_factor_per_user
CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);
-- auth.oauth_authorizations -> oauth_auth_pending_exp_idx
CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);
-- auth.oauth_authorizations -> oauth_authorizations_authorization_code_key
CREATE UNIQUE INDEX oauth_authorizations_authorization_code_key ON auth.oauth_authorizations USING btree (authorization_code);
-- auth.oauth_authorizations -> oauth_authorizations_authorization_id_key
CREATE UNIQUE INDEX oauth_authorizations_authorization_id_key ON auth.oauth_authorizations USING btree (authorization_id);
-- auth.oauth_authorizations -> oauth_authorizations_pkey
CREATE UNIQUE INDEX oauth_authorizations_pkey ON auth.oauth_authorizations USING btree (id);
-- auth.oauth_client_states -> idx_oauth_client_states_created_at
CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);
-- auth.oauth_client_states -> oauth_client_states_pkey
CREATE UNIQUE INDEX oauth_client_states_pkey ON auth.oauth_client_states USING btree (id);
-- auth.oauth_clients -> oauth_clients_deleted_at_idx
CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);
-- auth.oauth_clients -> oauth_clients_pkey
CREATE UNIQUE INDEX oauth_clients_pkey ON auth.oauth_clients USING btree (id);
-- auth.oauth_consents -> oauth_consents_active_client_idx
CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);
-- auth.oauth_consents -> oauth_consents_active_user_client_idx
CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);
-- auth.oauth_consents -> oauth_consents_pkey
CREATE UNIQUE INDEX oauth_consents_pkey ON auth.oauth_consents USING btree (id);
-- auth.oauth_consents -> oauth_consents_user_client_unique
CREATE UNIQUE INDEX oauth_consents_user_client_unique ON auth.oauth_consents USING btree (user_id, client_id);
-- auth.oauth_consents -> oauth_consents_user_order_idx
CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);
-- auth.one_time_tokens -> one_time_tokens_pkey
CREATE UNIQUE INDEX one_time_tokens_pkey ON auth.one_time_tokens USING btree (id);
-- auth.one_time_tokens -> one_time_tokens_relates_to_hash_idx
CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);
-- auth.one_time_tokens -> one_time_tokens_token_hash_hash_idx
CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);
-- auth.one_time_tokens -> one_time_tokens_user_id_token_type_key
CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);
-- auth.refresh_tokens -> refresh_tokens_instance_id_idx
CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);
-- auth.refresh_tokens -> refresh_tokens_instance_id_user_id_idx
CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);
-- auth.refresh_tokens -> refresh_tokens_parent_idx
CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);
-- auth.refresh_tokens -> refresh_tokens_pkey
CREATE UNIQUE INDEX refresh_tokens_pkey ON auth.refresh_tokens USING btree (id);
-- auth.refresh_tokens -> refresh_tokens_session_id_revoked_idx
CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);
-- auth.refresh_tokens -> refresh_tokens_token_unique
CREATE UNIQUE INDEX refresh_tokens_token_unique ON auth.refresh_tokens USING btree (token);
-- auth.refresh_tokens -> refresh_tokens_updated_at_idx
CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);
-- auth.saml_providers -> saml_providers_entity_id_key
CREATE UNIQUE INDEX saml_providers_entity_id_key ON auth.saml_providers USING btree (entity_id);
-- auth.saml_providers -> saml_providers_pkey
CREATE UNIQUE INDEX saml_providers_pkey ON auth.saml_providers USING btree (id);
-- auth.saml_providers -> saml_providers_sso_provider_id_idx
CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);
-- auth.saml_relay_states -> saml_relay_states_created_at_idx
CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);
-- auth.saml_relay_states -> saml_relay_states_for_email_idx
CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);
-- auth.saml_relay_states -> saml_relay_states_pkey
CREATE UNIQUE INDEX saml_relay_states_pkey ON auth.saml_relay_states USING btree (id);
-- auth.saml_relay_states -> saml_relay_states_sso_provider_id_idx
CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);
-- auth.schema_migrations -> schema_migrations_pkey
CREATE UNIQUE INDEX schema_migrations_pkey ON auth.schema_migrations USING btree (version);
-- auth.sessions -> sessions_not_after_idx
CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);
-- auth.sessions -> sessions_oauth_client_id_idx
CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);
-- auth.sessions -> sessions_pkey
CREATE UNIQUE INDEX sessions_pkey ON auth.sessions USING btree (id);
-- auth.sessions -> sessions_user_id_idx
CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);
-- auth.sessions -> user_id_created_at_idx
CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);
-- auth.sso_domains -> sso_domains_domain_idx
CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));
-- auth.sso_domains -> sso_domains_pkey
CREATE UNIQUE INDEX sso_domains_pkey ON auth.sso_domains USING btree (id);
-- auth.sso_domains -> sso_domains_sso_provider_id_idx
CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);
-- auth.sso_providers -> sso_providers_pkey
CREATE UNIQUE INDEX sso_providers_pkey ON auth.sso_providers USING btree (id);
-- auth.sso_providers -> sso_providers_resource_id_idx
CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));
-- auth.sso_providers -> sso_providers_resource_id_pattern_idx
CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);
-- auth.users -> confirmation_token_idx
CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);
-- auth.users -> email_change_token_current_idx
CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);
-- auth.users -> email_change_token_new_idx
CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);
-- auth.users -> reauthentication_token_idx
CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);
-- auth.users -> recovery_token_idx
CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);
-- auth.users -> users_email_partial_key
CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);
-- auth.users -> users_instance_id_email_idx
CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));
-- auth.users -> users_instance_id_idx
CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);
-- auth.users -> users_is_anonymous_idx
CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);
-- auth.users -> users_phone_key
CREATE UNIQUE INDEX users_phone_key ON auth.users USING btree (phone);
-- auth.users -> users_pkey
CREATE UNIQUE INDEX users_pkey ON auth.users USING btree (id);
-- auth.webauthn_challenges -> webauthn_challenges_expires_at_idx
CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);
-- auth.webauthn_challenges -> webauthn_challenges_pkey
CREATE UNIQUE INDEX webauthn_challenges_pkey ON auth.webauthn_challenges USING btree (id);
-- auth.webauthn_challenges -> webauthn_challenges_user_id_idx
CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);
-- auth.webauthn_credentials -> webauthn_credentials_credential_id_key
CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);
-- auth.webauthn_credentials -> webauthn_credentials_pkey
CREATE UNIQUE INDEX webauthn_credentials_pkey ON auth.webauthn_credentials USING btree (id);
-- auth.webauthn_credentials -> webauthn_credentials_user_id_idx
CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);
-- public.activity_logs -> activity_logs_pkey
CREATE UNIQUE INDEX activity_logs_pkey ON public.activity_logs USING btree (id);
-- public.activity_logs -> idx_action_type
CREATE INDEX idx_action_type ON public.activity_logs USING btree (action_type);
-- public.activity_logs -> idx_created_at
CREATE INDEX idx_created_at ON public.activity_logs USING btree (created_at DESC);
-- public.activity_logs -> idx_resource_type_id
CREATE INDEX idx_resource_type_id ON public.activity_logs USING btree (resource_type, resource_id);
-- public.activity_logs -> idx_user_id
CREATE INDEX idx_user_id ON public.activity_logs USING btree (user_id);
-- public.app_settings -> app_settings_pkey
CREATE UNIQUE INDEX app_settings_pkey ON public.app_settings USING btree (id);
-- public.app_settings -> uk_app_settings_key
CREATE UNIQUE INDEX uk_app_settings_key ON public.app_settings USING btree (setting_key);
-- public.audit_logs -> audit_logs_pkey
CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);
-- public.audit_logs -> idx_audit_action
CREATE INDEX idx_audit_action ON public.audit_logs USING btree (action);
-- public.audit_logs -> idx_audit_created_at
CREATE INDEX idx_audit_created_at ON public.audit_logs USING btree (created_at DESC);
-- public.audit_logs -> idx_audit_user_id
CREATE INDEX idx_audit_user_id ON public.audit_logs USING btree (user_id);
-- public.campaign_queue -> campaign_queue_pkey
CREATE UNIQUE INDEX campaign_queue_pkey ON public.campaign_queue USING btree (id);
-- public.campaign_queue -> idx_campaign_id
CREATE INDEX idx_campaign_id ON public.campaign_queue USING btree (campaign_id);
-- public.campaign_queue -> idx_csv_upload_id
CREATE INDEX idx_csv_upload_id ON public.campaign_queue USING btree (csv_upload_id);
-- public.campaign_queue -> idx_queue_position
CREATE INDEX idx_queue_position ON public.campaign_queue USING btree (queue_position);
-- public.campaign_queue -> idx_status
CREATE INDEX idx_status ON public.campaign_queue USING btree (status);
-- public.campaign_queue -> idx_user_id_status
CREATE INDEX idx_user_id_status ON public.campaign_queue USING btree (user_id, status);
-- public.campaign_recipients -> campaign_recipients_pkey
CREATE UNIQUE INDEX campaign_recipients_pkey ON public.campaign_recipients USING btree (id);
-- public.campaign_recipients -> idx_campaign_recipients_campaign
CREATE INDEX idx_campaign_recipients_campaign ON public.campaign_recipients USING btree (campaign_id);
-- public.campaign_recipients -> idx_campaign_recipients_status
CREATE INDEX idx_campaign_recipients_status ON public.campaign_recipients USING btree (status);
-- public.campaign_recipients -> idx_cr_campaign_id
CREATE INDEX idx_cr_campaign_id ON public.campaign_recipients USING btree (campaign_id);
-- public.campaign_recipients -> idx_cr_email
CREATE INDEX idx_cr_email ON public.campaign_recipients USING btree (email);
-- public.campaign_recipients -> idx_cr_sent_at
CREATE INDEX idx_cr_sent_at ON public.campaign_recipients USING btree (sent_at);
-- public.campaign_recipients -> idx_cr_status
CREATE INDEX idx_cr_status ON public.campaign_recipients USING btree (status);
-- public.campaign_runtime_events -> campaign_runtime_events_pkey
CREATE UNIQUE INDEX campaign_runtime_events_pkey ON public.campaign_runtime_events USING btree (id);
-- public.campaign_runtime_events -> idx_campaign_runtime_events_queue_time
CREATE INDEX idx_campaign_runtime_events_queue_time ON public.campaign_runtime_events USING btree (queue_id, event_time DESC);
-- public.campaign_runtime_events -> idx_campaign_runtime_events_user_time
CREATE INDEX idx_campaign_runtime_events_user_time ON public.campaign_runtime_events USING btree (user_id, event_time DESC);
-- public.campaign_runtime_events -> uq_campaign_runtime_events_queue_seq
CREATE UNIQUE INDEX uq_campaign_runtime_events_queue_seq ON public.campaign_runtime_events USING btree (queue_id, seq_no);
-- public.campaign_stats_daily -> campaign_stats_daily_pkey
CREATE UNIQUE INDEX campaign_stats_daily_pkey ON public.campaign_stats_daily USING btree (id);
-- public.campaign_stats_daily -> campaign_stats_daily_queue_id_key
CREATE UNIQUE INDEX campaign_stats_daily_queue_id_key ON public.campaign_stats_daily USING btree (queue_id);
-- public.campaign_stats_daily -> idx_campaign_stats_daily_user_expires
CREATE INDEX idx_campaign_stats_daily_user_expires ON public.campaign_stats_daily USING btree (user_id, expires_at);
-- public.campaign_stats_yearly -> campaign_stats_yearly_pkey
CREATE UNIQUE INDEX campaign_stats_yearly_pkey ON public.campaign_stats_yearly USING btree (id);
-- public.campaign_stats_yearly -> idx_campaign_stats_yearly_user_year
CREATE INDEX idx_campaign_stats_yearly_user_year ON public.campaign_stats_yearly USING btree (user_id, stat_year DESC);
-- public.campaign_stats_yearly -> uq_campaign_stats_yearly_user_year
CREATE UNIQUE INDEX uq_campaign_stats_yearly_user_year ON public.campaign_stats_yearly USING btree (user_id, stat_year);
-- public.campaigns -> campaigns_pkey
CREATE UNIQUE INDEX campaigns_pkey ON public.campaigns USING btree (id);
-- public.campaigns -> idx_camp_created_at
CREATE INDEX idx_camp_created_at ON public.campaigns USING btree (created_at DESC);
-- public.campaigns -> idx_camp_email_provider_id
CREATE INDEX idx_camp_email_provider_id ON public.campaigns USING btree (email_provider_id);
-- public.campaigns -> idx_camp_scheduled_at
CREATE INDEX idx_camp_scheduled_at ON public.campaigns USING btree (scheduled_at);
-- public.campaigns -> idx_camp_status
CREATE INDEX idx_camp_status ON public.campaigns USING btree (status);
-- public.campaigns -> idx_camp_user_id
CREATE INDEX idx_camp_user_id ON public.campaigns USING btree (user_id);
-- public.campaigns -> idx_campaigns_user
CREATE INDEX idx_campaigns_user ON public.campaigns USING btree (user_id);
-- public.csv_uploads -> csv_uploads_pkey
CREATE UNIQUE INDEX csv_uploads_pkey ON public.csv_uploads USING btree (id);
-- public.csv_uploads -> idx_csv_queue
CREATE INDEX idx_csv_queue ON public.csv_uploads USING btree (user_id, queue_position) WHERE (is_queued = true);
-- public.csv_uploads -> idx_csv_status
CREATE INDEX idx_csv_status ON public.csv_uploads USING btree (status);
-- public.csv_uploads -> idx_csv_uploaded_at
CREATE INDEX idx_csv_uploaded_at ON public.csv_uploads USING btree (uploaded_at);
-- public.csv_uploads -> idx_csv_uploads_user
CREATE INDEX idx_csv_uploads_user ON public.csv_uploads USING btree (user_id);
-- public.csv_uploads -> idx_csv_user_id
CREATE INDEX idx_csv_user_id ON public.csv_uploads USING btree (user_id);
-- public.csv_uploads -> idx_csv_user_queued
CREATE INDEX idx_csv_user_queued ON public.csv_uploads USING btree (user_id, is_queued);
-- public.email_logs -> email_logs_pkey
CREATE UNIQUE INDEX email_logs_pkey ON public.email_logs USING btree (id);
-- public.email_logs -> idx_el_campaign_id
CREATE INDEX idx_el_campaign_id ON public.email_logs USING btree (campaign_id);
-- public.email_logs -> idx_el_recipient_email
CREATE INDEX idx_el_recipient_email ON public.email_logs USING btree (recipient_email);
-- public.email_logs -> idx_el_sent_at
CREATE INDEX idx_el_sent_at ON public.email_logs USING btree (sent_at DESC);
-- public.email_logs -> idx_el_status
CREATE INDEX idx_el_status ON public.email_logs USING btree (status);
-- public.email_logs -> idx_email_logs_campaign
CREATE INDEX idx_email_logs_campaign ON public.email_logs USING btree (campaign_id);
-- public.email_providers -> email_providers_pkey
CREATE UNIQUE INDEX email_providers_pkey ON public.email_providers USING btree (id);
-- public.email_providers -> idx_email_providers_user
CREATE INDEX idx_email_providers_user ON public.email_providers USING btree (user_id);
-- public.email_providers -> idx_ep_is_active
CREATE INDEX idx_ep_is_active ON public.email_providers USING btree (is_active);
-- public.email_providers -> idx_ep_is_verified
CREATE INDEX idx_ep_is_verified ON public.email_providers USING btree (is_verified);
-- public.email_providers -> idx_ep_user_id
CREATE INDEX idx_ep_user_id ON public.email_providers USING btree (user_id);
-- public.email_providers -> uk_ep_user_type
CREATE UNIQUE INDEX uk_ep_user_type ON public.email_providers USING btree (user_id, provider_type);
-- public.email_verification_tokens -> email_verification_tokens_pkey
CREATE UNIQUE INDEX email_verification_tokens_pkey ON public.email_verification_tokens USING btree (id);
-- public.email_verification_tokens -> email_verification_tokens_token_key
CREATE UNIQUE INDEX email_verification_tokens_token_key ON public.email_verification_tokens USING btree (token);
-- public.email_verification_tokens -> idx_email_verification_user
CREATE INDEX idx_email_verification_user ON public.email_verification_tokens USING btree (user_id);
-- public.email_verification_tokens -> idx_evt_expires_at
CREATE INDEX idx_evt_expires_at ON public.email_verification_tokens USING btree (expires_at);
-- public.email_verification_tokens -> idx_evt_token
CREATE INDEX idx_evt_token ON public.email_verification_tokens USING btree (token);
-- public.email_verification_tokens -> idx_evt_user_id
CREATE INDEX idx_evt_user_id ON public.email_verification_tokens USING btree (user_id);
-- public.flyway_schema_history -> flyway_schema_history_pk
CREATE UNIQUE INDEX flyway_schema_history_pk ON public.flyway_schema_history USING btree (installed_rank);
-- public.flyway_schema_history -> flyway_schema_history_s_idx
CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);
-- public.password_reset_tokens -> idx_password_reset_user
CREATE INDEX idx_password_reset_user ON public.password_reset_tokens USING btree (user_id);
-- public.password_reset_tokens -> idx_prt_expires_at
CREATE INDEX idx_prt_expires_at ON public.password_reset_tokens USING btree (expires_at);
-- public.password_reset_tokens -> idx_prt_otp
CREATE INDEX idx_prt_otp ON public.password_reset_tokens USING btree (otp);
-- public.password_reset_tokens -> idx_prt_token
CREATE INDEX idx_prt_token ON public.password_reset_tokens USING btree (token);
-- public.password_reset_tokens -> idx_prt_user_id
CREATE INDEX idx_prt_user_id ON public.password_reset_tokens USING btree (user_id);
-- public.password_reset_tokens -> password_reset_tokens_pkey
CREATE UNIQUE INDEX password_reset_tokens_pkey ON public.password_reset_tokens USING btree (id);
-- public.password_reset_tokens -> uk_prt_token
CREATE UNIQUE INDEX uk_prt_token ON public.password_reset_tokens USING btree (token);
-- public.users -> idx_user_default_provider
CREATE INDEX idx_user_default_provider ON public.users USING btree (default_email_provider_id);
-- public.users -> idx_user_email_selection_pref
CREATE INDEX idx_user_email_selection_pref ON public.users USING btree (email_selection_preference);
-- public.users -> idx_users_created_at
CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);
-- public.users -> idx_users_email
CREATE INDEX idx_users_email ON public.users USING btree (email);
-- public.users -> idx_users_is_active
CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);
-- public.users -> uk_users_email
CREATE UNIQUE INDEX uk_users_email ON public.users USING btree (email);
-- public.users -> users_pkey
CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);
-- realtime.messages -> messages_inserted_at_topic_index
CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));
-- realtime.messages -> messages_pkey
CREATE UNIQUE INDEX messages_pkey ON ONLY realtime.messages USING btree (id, inserted_at);
-- realtime.schema_migrations -> schema_migrations_pkey
CREATE UNIQUE INDEX schema_migrations_pkey ON realtime.schema_migrations USING btree (version);
-- realtime.subscription -> ix_realtime_subscription_entity
CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);
-- realtime.subscription -> pk_subscription
CREATE UNIQUE INDEX pk_subscription ON realtime.subscription USING btree (id);
-- realtime.subscription -> subscription_subscription_id_entity_filters_action_filter_key
CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_key ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter);
-- storage.buckets -> bname
CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);
-- storage.buckets -> buckets_pkey
CREATE UNIQUE INDEX buckets_pkey ON storage.buckets USING btree (id);
-- storage.buckets_analytics -> buckets_analytics_pkey
CREATE UNIQUE INDEX buckets_analytics_pkey ON storage.buckets_analytics USING btree (id);
-- storage.buckets_analytics -> buckets_analytics_unique_name_idx
CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);
-- storage.buckets_vectors -> buckets_vectors_pkey
CREATE UNIQUE INDEX buckets_vectors_pkey ON storage.buckets_vectors USING btree (id);
-- storage.migrations -> migrations_name_key
CREATE UNIQUE INDEX migrations_name_key ON storage.migrations USING btree (name);
-- storage.migrations -> migrations_pkey
CREATE UNIQUE INDEX migrations_pkey ON storage.migrations USING btree (id);
-- storage.objects -> bucketid_objname
CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);
-- storage.objects -> idx_objects_bucket_id_name
CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");
-- storage.objects -> idx_objects_bucket_id_name_lower
CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");
-- storage.objects -> name_prefix_search
CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);
-- storage.objects -> objects_pkey
CREATE UNIQUE INDEX objects_pkey ON storage.objects USING btree (id);
-- storage.s3_multipart_uploads -> idx_multipart_uploads_list
CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);
-- storage.s3_multipart_uploads -> s3_multipart_uploads_pkey
CREATE UNIQUE INDEX s3_multipart_uploads_pkey ON storage.s3_multipart_uploads USING btree (id);
-- storage.s3_multipart_uploads_parts -> s3_multipart_uploads_parts_pkey
CREATE UNIQUE INDEX s3_multipart_uploads_parts_pkey ON storage.s3_multipart_uploads_parts USING btree (id);
-- storage.vector_indexes -> vector_indexes_name_bucket_id_idx
CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);
-- storage.vector_indexes -> vector_indexes_pkey
CREATE UNIQUE INDEX vector_indexes_pkey ON storage.vector_indexes USING btree (id);
-- vault.secrets -> secrets_name_idx
CREATE UNIQUE INDEX secrets_name_idx ON vault.secrets USING btree (name) WHERE (name IS NOT NULL);
-- vault.secrets -> secrets_pkey
CREATE UNIQUE INDEX secrets_pkey ON vault.secrets USING btree (id);

-- ======================================================
-- VIEWS
-- ======================================================
-- View: extensions.pg_stat_statements
CREATE OR REPLACE VIEW "extensions"."pg_stat_statements" AS
 SELECT userid,
    dbid,
    toplevel,
    queryid,
    query,
    plans,
    total_plan_time,
    min_plan_time,
    max_plan_time,
    mean_plan_time,
    stddev_plan_time,
    calls,
    total_exec_time,
    min_exec_time,
    max_exec_time,
    mean_exec_time,
    stddev_exec_time,
    rows,
    shared_blks_hit,
    shared_blks_read,
    shared_blks_dirtied,
    shared_blks_written,
    local_blks_hit,
    local_blks_read,
    local_blks_dirtied,
    local_blks_written,
    temp_blks_read,
    temp_blks_written,
    shared_blk_read_time,
    shared_blk_write_time,
    local_blk_read_time,
    local_blk_write_time,
    temp_blk_read_time,
    temp_blk_write_time,
    wal_records,
    wal_fpi,
    wal_bytes,
    jit_functions,
    jit_generation_time,
    jit_inlining_count,
    jit_inlining_time,
    jit_optimization_count,
    jit_optimization_time,
    jit_emission_count,
    jit_emission_time,
    jit_deform_count,
    jit_deform_time,
    stats_since,
    minmax_stats_since
   FROM pg_stat_statements(true) pg_stat_statements(userid, dbid, toplevel, queryid, query, plans, total_plan_time, min_plan_time, max_plan_time, mean_plan_time, stddev_plan_time, calls, total_exec_time, min_exec_time, max_exec_time, mean_exec_time, stddev_exec_time, rows, shared_blks_hit, shared_blks_read, shared_blks_dirtied, shared_blks_written, local_blks_hit, local_blks_read, local_blks_dirtied, local_blks_written, temp_blks_read, temp_blks_written, shared_blk_read_time, shared_blk_write_time, local_blk_read_time, local_blk_write_time, temp_blk_read_time, temp_blk_write_time, wal_records, wal_fpi, wal_bytes, jit_functions, jit_generation_time, jit_inlining_count, jit_inlining_time, jit_optimization_count, jit_optimization_time, jit_emission_count, jit_emission_time, jit_deform_count, jit_deform_time, stats_since, minmax_stats_since)
;

-- View: extensions.pg_stat_statements_info
CREATE OR REPLACE VIEW "extensions"."pg_stat_statements_info" AS
 SELECT dealloc,
    stats_reset
   FROM pg_stat_statements_info() pg_stat_statements_info(dealloc, stats_reset)
;

-- View: public.v_campaign_summary
CREATE OR REPLACE VIEW "public"."v_campaign_summary" AS
 SELECT c.id,
    c.campaign_name,
    c.subject,
    c.status,
    c.user_id,
    u.email AS user_email,
    u.full_name,
    c.recipient_count,
    c.total_sent,
    c.total_failed,
    c.total_pending,
    c.success_rate,
    c.created_at,
    c.started_at,
    c.completed_at,
    ep.provider_type,
    ep.from_email
   FROM ((campaigns c
     JOIN users u ON ((c.user_id = u.id)))
     JOIN email_providers ep ON ((c.email_provider_id = ep.id)))
;

-- View: public.v_recipient_stats
CREATE OR REPLACE VIEW "public"."v_recipient_stats" AS
 SELECT campaign_id,
    status,
    count(*) AS count,
    round((((count(*))::numeric * 100.0) / sum(count(*)) OVER (PARTITION BY campaign_id)), 2) AS percentage
   FROM campaign_recipients
  GROUP BY campaign_id, status
;

-- View: public.v_user_email_stats
CREATE OR REPLACE VIEW "public"."v_user_email_stats" AS
 SELECT u.id,
    u.email,
    u.full_name,
    count(DISTINCT c.id) AS total_campaigns,
    count(DISTINCT
        CASE
            WHEN ((c.status)::text = 'COMPLETED'::text) THEN c.id
            ELSE NULL::bigint
        END) AS completed_campaigns,
    sum(c.total_sent) AS total_emails_sent,
    count(DISTINCT ep.id) AS email_providers_count,
    u.last_login_at,
    u.created_at
   FROM ((users u
     LEFT JOIN campaigns c ON ((u.id = c.user_id)))
     LEFT JOIN email_providers ep ON ((u.id = ep.user_id)))
  GROUP BY u.id, u.email, u.full_name, u.last_login_at, u.created_at
;

-- View: vault.decrypted_secrets
CREATE OR REPLACE VIEW "vault"."decrypted_secrets" AS

;

-- ======================================================
-- SUPABASE STORAGE BUCKETS / OBJECT COUNTS
-- ======================================================
-- Bucket ID: avatar_img
-- Name: avatar_img
-- Public: True
-- File Size Limit: 5242880
-- Allowed MIME Types: None
-- Created At: 2026-03-24 19:46:33.541285+00:00
-- Updated At: 2026-03-24 19:46:33.541285+00:00
-- Object Count: 1

-- Bucket ID: csv_uploads
-- Name: csv_uploads
-- Public: False
-- File Size Limit: 10485760
-- Allowed MIME Types: None
-- Created At: 2026-03-24 19:44:06.612358+00:00
-- Updated At: 2026-03-24 19:44:06.612358+00:00
-- Object Count: 1

