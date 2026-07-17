import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.argv[2];

if (!databaseUrl?.startsWith("postgresql://")) {
  throw new Error("Usage: node scripts/generate-database-types.mjs postgresql://...");
}

const client = new Client({ connectionString: databaseUrl });

const scalarTypes = new Map([
  ["bool", "boolean"],
  ["date", "string"],
  ["float4", "number"],
  ["float8", "number"],
  ["inet", "string"],
  ["int2", "number"],
  ["int4", "number"],
  ["int8", "number"],
  ["json", "Json"],
  ["jsonb", "Json"],
  ["numeric", "number"],
  ["text", "string"],
  ["time", "string"],
  ["timestamp", "string"],
  ["timestamptz", "string"],
  ["uuid", "string"],
  ["varchar", "string"],
]);

function typeFor(column) {
  const isArray = column.data_type === "ARRAY";
  const databaseType = isArray ? column.udt_name.slice(1) : column.udt_name;
  const scalar = scalarTypes.get(databaseType) ?? "string";
  const value = isArray ? `${scalar}[]` : scalar;
  return column.is_nullable === "YES" ? `${value} | null` : value;
}

function property(name) {
  return JSON.stringify(name);
}

function renderRecord(columns, mode) {
  if (columns.length === 0) return "Record<string, never>";
  const lines = columns.map((column) => {
    const optional = mode === "Update"
      || (mode === "Insert" && (
        column.is_nullable === "YES"
        || column.column_default !== null
        || column.is_identity === "YES"
        || column.is_generated !== "NEVER"
      ));
    return `          ${property(column.column_name)}${optional ? "?" : ""}: ${typeFor(column)}`;
  });
  return `{\n${lines.join("\n")}\n        }`;
}

function renderRelationships(relationships) {
  if (relationships.length === 0) return "[]";
  const entries = relationships.map((relationship) => `{
            foreignKeyName: ${JSON.stringify(relationship.foreign_key_name)}
            columns: ${JSON.stringify(normalizePostgresArray(relationship.columns))}
            isOneToOne: ${relationship.is_one_to_one}
            referencedRelation: ${JSON.stringify(relationship.referenced_relation)}
            referencedColumns: ${JSON.stringify(normalizePostgresArray(relationship.referenced_columns))}
          }`);
  return `[\n          ${entries.join(",\n          ")}\n        ]`;
}

function normalizePostgresArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.startsWith("{") || !value.endsWith("}")) {
    throw new Error(`Unexpected PostgreSQL array value: ${String(value)}`);
  }
  const inner = value.slice(1, -1);
  return inner === "" ? [] : inner.split(",");
}

function renderRelations(relations, relationshipsByTable, relationKind) {
  return relations.map((relation) => {
    const columns = relation.columns;
    const blocks = [`        Row: ${renderRecord(columns, "Row")}`];
    if (relationKind === "Tables") {
      blocks.push(`        Insert: ${renderRecord(columns, "Insert")}`);
      blocks.push(`        Update: ${renderRecord(columns, "Update")}`);
    }
    blocks.push(`        Relationships: ${renderRelationships(relationshipsByTable.get(relation.table_name) ?? [])}`);
    return `      ${property(relation.table_name)}: {\n${blocks.join("\n")}\n      }`;
  }).join("\n");
}

await client.connect();

try {
  const columnsResult = await client.query(`
    select
      columns.table_name,
      tables.table_type,
      columns.column_name,
      columns.data_type,
      columns.udt_name,
      columns.is_nullable,
      columns.column_default,
      columns.is_identity,
      columns.is_generated,
      columns.ordinal_position
    from information_schema.columns columns
    join information_schema.tables tables
      on tables.table_schema = columns.table_schema
     and tables.table_name = columns.table_name
    where columns.table_schema = 'public'
      and tables.table_type in ('BASE TABLE', 'VIEW')
    order by columns.table_name, columns.ordinal_position
  `);

  const relationshipsResult = await client.query(`
    select
      foreign_key.conname as foreign_key_name,
      child.relname as table_name,
      parent.relname as referenced_relation,
      array_agg(child_column.attname order by key_position.position) as columns,
      array_agg(parent_column.attname order by key_position.position) as referenced_columns,
      exists (
        select 1
        from pg_constraint unique_constraint
        where unique_constraint.conrelid = foreign_key.conrelid
          and unique_constraint.contype in ('p', 'u')
          and unique_constraint.conkey = foreign_key.conkey
      ) as is_one_to_one
    from pg_constraint foreign_key
    join pg_class child on child.oid = foreign_key.conrelid
    join pg_namespace child_namespace
      on child_namespace.oid = child.relnamespace
     and child_namespace.nspname = 'public'
    join pg_class parent on parent.oid = foreign_key.confrelid
    cross join lateral generate_subscripts(foreign_key.conkey, 1) key_position(position)
    join pg_attribute child_column
      on child_column.attrelid = foreign_key.conrelid
     and child_column.attnum = foreign_key.conkey[key_position.position]
    join pg_attribute parent_column
      on parent_column.attrelid = foreign_key.confrelid
     and parent_column.attnum = foreign_key.confkey[key_position.position]
    where foreign_key.contype = 'f'
    group by foreign_key.oid, foreign_key.conname, child.relname, parent.relname
    order by child.relname, foreign_key.conname
  `);

  const relationMap = new Map();
  for (const column of columnsResult.rows) {
    const relation = relationMap.get(column.table_name) ?? {
      table_name: column.table_name,
      table_type: column.table_type,
      columns: [],
    };
    relation.columns.push(column);
    relationMap.set(column.table_name, relation);
  }

  const relationshipsByTable = new Map();
  for (const relationship of relationshipsResult.rows) {
    const relationships = relationshipsByTable.get(relationship.table_name) ?? [];
    relationships.push(relationship);
    relationshipsByTable.set(relationship.table_name, relationships);
  }

  const relations = [...relationMap.values()];
  const tables = relations.filter((relation) => relation.table_type === "BASE TABLE");
  const views = relations.filter((relation) => relation.table_type === "VIEW");
  const header = `// Generated from the applied public Postgres schema. Do not edit by hand.
// Regenerate with scripts/generate-database-types.mjs against a migrated database.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
${renderRelations(tables, relationshipsByTable, "Tables")}
    }
    Views: {
${renderRelations(views, relationshipsByTable, "Views")}
    }
    Functions: {
      accept_gym_invitation: {
        Args: { invitation_token_hash: string }
        Returns: string
      }
      create_staff_invitation: {
        Args: { target_gym_id: string; invite_email: string; target_role_key: string; invitation_token_hash: string; invitation_expires_at: string }
        Returns: string
      }
      create_gym_tenant: {
        Args: { actor_profile_id: string; owner_profile_id: string; configuration: Json; branding: Json }
        Returns: string
      }
      attach_wall_image: {
        Args: { target_gym_id: string; target_wall_id: string; object_path: string; image_alt_text: string; image_width: number; image_height: number; image_captured_at?: string | null }
        Returns: string
      }
      attach_route_media: {
        Args: { target_gym_id: string; target_route_id: string; object_path: string; object_media_type: string; object_alt_text?: string | null }
        Returns: string
      }
      publish_routes: {
        Args: { target_gym_id: string; target_route_ids: string[] }
        Returns: number
      }
      retire_routes: {
        Args: { target_gym_id: string; target_route_ids: string[] }
        Returns: number
      }
      submit_route_feedback: {
        Args: { target_gym_id: string; target_route_id: string; target_kind: string; feedback_comment?: string | null }
        Returns: string
      }
      toggle_route_favourite: {
        Args: { target_gym_id: string; target_route_id: string }
        Returns: boolean
      }
      get_route_public_metrics: {
        Args: { target_gym_id: string; target_route_id: string }
        Returns: Json
      }
      triage_route_feedback: {
        Args: { target_feedback_id: string; target_status: string }
        Returns: string
      }
      save_waiver_draft: {
        Args: { target_gym_id: string; target_waiver_id: string | null; template_name: string; template_description: string; required_for_entry: boolean; version_title: string; version_content: string; version_requirements: Json }
        Returns: string
      }
      publish_waiver_version: {
        Args: { target_gym_id: string; target_version_id: string }
        Returns: string
      }
      accept_member_waiver: {
        Args: { target_gym_id: string; target_version_id: string; acceptance: Json }
        Returns: string
      }
      accept_guest_waiver: {
        Args: { invitation_token_hash: string; target_version_id: string; acceptance: Json }
        Returns: string
      }
      register_public_day_pass: {
        Args: { target_gym_slug: string; guest_full_name: string; guest_email: string; invitation_token_hash: string; pass_reference_hash: string; payment_choice: string }
        Returns: Json
      }
      create_guest_pass: {
        Args: { target_gym_id: string; guest_full_name: string; guest_email: string; invitation_token_hash: string; pass_reference_hash: string; payment_choice: string }
        Returns: Json
      }
      configure_day_pass_registration: {
        Args: { target_gym_id: string; registration_enabled: boolean; valid_hours: number; public_information: string }
        Returns: string
      }
      verify_guest_pass: {
        Args: { target_gym_id: string; pass_reference_hash: string }
        Returns: Json
      }
      check_in_guest_pass: {
        Args: { target_gym_id: string; pass_reference_hash: string; confirm_reception_payment?: boolean }
        Returns: string
      }
      revoke_guest_pass: {
        Args: { target_gym_id: string; target_pass_id: string }
        Returns: string
      }
      issue_member_check_in_token: {
        Args: { target_gym_id: string; new_token_hash: string; token_expires_at: string }
        Returns: string
      }
      verify_member_check_in_token: {
        Args: { target_gym_id: string; member_token_hash: string }
        Returns: Json
      }
      check_in_member_token: {
        Args: { target_gym_id: string; member_token_hash: string }
        Returns: string
      }
      manual_member_check_in: {
        Args: { target_gym_id: string; target_membership_id: string }
        Returns: string
      }
      register_for_event: {
        Args: { target_gym_id: string; target_event_id: string }
        Returns: string
      }
      cancel_event_registration: {
        Args: { target_gym_id: string; target_event_id: string }
        Returns: string
      }
      get_event_availability: {
        Args: { target_gym_id: string; target_event_id: string }
        Returns: Json
      }
      save_ascent: {
        Args: { target_gym_id: string; target_route_id: string; target_ascent_id: string | null; target_session_id: string | null; target_session_date: string; target_outcome: string; target_attempts: number; target_notes: string; target_visibility: string }
        Returns: string
      }
      delete_ascent: {
        Args: { target_gym_id: string; target_ascent_id: string }
        Returns: string
      }
      attach_ascent_media: {
        Args: { target_gym_id: string; target_ascent_id: string; object_path: string; object_media_type: string }
        Returns: string
      }
      process_my_achievements: {
        Args: { target_gym_id: string }
        Returns: number
      }
      set_leaderboard_preference: {
        Args: { target_gym_id: string; participate: boolean; name_mode: string }
        Returns: string
      }
      get_community_leaderboard: {
        Args: { target_gym_id: string; category: string; window_month: string }
        Returns: { rank: number; profile_id: string; display_name: string; score: number; window_start: string; window_end: string; tie_achieved_at: string | null }[]
      }
      accept_community_guidelines: { Args: { target_gym_id: string }; Returns: string }
      create_community_post: { Args: { target_gym_id: string; post_title: string; post_body: string; post_image_path: string | null }; Returns: string }
      create_community_comment: { Args: { target_gym_id: string; target_post_id: string; comment_body: string }; Returns: string }
      toggle_community_reaction: { Args: { target_gym_id: string; target_post_id: string; reaction_name: string }; Returns: boolean }
      delete_community_content: { Args: { target_gym_id: string; target_type: string; target_id: string }; Returns: string }
      report_community_content: { Args: { target_gym_id: string; target_type: string; target_id: string; report_reason: string }; Returns: string }
      moderate_community_post: { Args: { target_gym_id: string; target_post_id: string; target_status: string; lock_post: boolean; reason: string; pin_post: boolean }; Returns: string }
      create_partner_request: { Args: { target_gym_id: string; window_start: string; window_end: string; discipline_name: string; ability_name: string; intent_name: string; public_note: string; private_availability: string }; Returns: string }
      get_partner_requests: { Args: { target_gym_id: string }; Returns: { id: string; profile_id: string; public_name: string; climbing_day: string; discipline: string; approximate_ability: string; session_intent: string; body: string; status: string; exact_start: string | null; exact_end: string | null; availability_note: string | null; is_owner: boolean }[] }
      express_partner_interest: { Args: { target_gym_id: string; target_request_id: string; interest_note: string }; Returns: string }
      respond_partner_interest: { Args: { target_gym_id: string; target_interest_id: string; accept_interest: boolean }; Returns: string }
      withdraw_partner_request: { Args: { target_gym_id: string; target_request_id: string }; Returns: string }
      report_partner_request: { Args: { target_gym_id: string; target_request_id: string; report_reason: string }; Returns: string }
      create_chat_channel: { Args: { target_gym_id: string; channel_name: string; channel_description: string; read_only?: boolean }; Returns: string }
      send_chat_message: { Args: { target_gym_id: string; target_channel_id: string; message_body: string; target_reply_id?: string }; Returns: string }
      edit_chat_message: { Args: { target_gym_id: string; target_message_id: string; message_body: string }; Returns: string }
      delete_chat_message: { Args: { target_gym_id: string; target_message_id: string }; Returns: string }
      mark_channel_read: { Args: { target_gym_id: string; target_channel_id: string }; Returns: string }
      report_chat_message: { Args: { target_gym_id: string; target_message_id: string; report_reason: string }; Returns: string }
      moderate_chat_message: { Args: { target_gym_id: string; target_message_id: string; target_status: string; reason: string }; Returns: string }
      save_competition: { Args: { target_gym_id: string; target_competition_id?: string; competition_name: string; competition_description: string; window_start: string; window_end: string; registration_start: string; registration_end: string; competition_status: string; maximum_attempts: number; division_names: string[] }; Returns: string }
      add_competition_route: { Args: { target_gym_id: string; target_competition_id: string; target_route_id: string }; Returns: string }
      register_for_competition: { Args: { target_gym_id: string; target_competition_id: string; target_division_id: string }; Returns: string }
      submit_competition_score: { Args: { target_gym_id: string; target_competition_id: string; target_competition_route_id: string; target_profile_id: string; top_achieved: boolean; zone_achieved: boolean; attempt_count: number; correction_reason?: string }; Returns: string }
      finalize_competition: { Args: { target_gym_id: string; target_competition_id: string }; Returns: string }
      get_route_setting_analytics: { Args: { target_gym_id: string; date_from: string; date_to: string; target_wall_id?: string; target_setter_id?: string; target_route_type?: string }; Returns: { route_id: string; route_name: string; colour: string; grade: string; grade_system: string; route_type: string; wall_name: string; setter_name: string; set_on: string | null; age_days: number; styles: string[]; activity_count: number; send_count: number; attempt_count: number; send_ratio: number | null; grade_soft: number; grade_right: number; grade_hard: number; open_issues: number; sample_size: number; low_sample: boolean; reset_priority: string }[] }
      get_gym_operational_analytics: { Args: { target_gym_id: string; date_from: string; date_to: string }; Returns: { period: string; metric_key: string; metric_label: string; metric_value: number; definition: string }[] }
      get_integration_statuses: { Args: { target_gym_id: string }; Returns: { id: string; provider_key: string; provider_category: string; status: string; last_sync_at: string | null; last_error_code: string | null; updated_at: string; queued: number; dead_letter: number }[] }
      ingest_integration_delivery: { Args: { target_integration_id: string; target_provider_key: string; event_key: string; event_payload: Json }; Returns: string }
      record_integration_delivery_attempt: { Args: { target_delivery_id: string; succeeded: boolean; error_code?: string }; Returns: string }
      resend_staff_invitation: {
        Args: { target_invitation_id: string; invitation_token_hash: string; invitation_expires_at: string }
        Returns: string
      }
      revoke_staff_invitation: {
        Args: { target_invitation_id: string }
        Returns: string
      }
      update_staff_access: {
        Args: { target_membership_id: string; target_role_key: string; target_status: string }
        Returns: string
      }
      update_gym_configuration: {
        Args: { target_gym_id: string; gym_name: string; gym_slug: string; gym_timezone: string; gym_country_code: string; gym_address_line_1: string; gym_address_line_2: string; gym_city: string; gym_postcode: string; gym_contact_email: string; gym_contact_phone: string; gym_disciplines: string[]; gym_opening_hours_text: string; allow_public_join_requests: boolean; brand_primary_colour: string; brand_accent_colour: string; brand_background_colour: string; brand_welcome_message: string }
        Returns: string
      }
      set_gym_logo_path: {
        Args: { target_gym_id: string; object_path: string }
        Returns: string
      }
      process_due_announcements: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      set_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

type PublicSchema = Database["public"]

export type Tables<
  Name extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][Name]["Row"]

export type TablesInsert<
  Name extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][Name]["Insert"]

export type TablesUpdate<
  Name extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][Name]["Update"]
`;

  const outputPath = resolve("src/lib/supabase/database.types.ts");
  await writeFile(outputPath, header, "utf8");
  process.stdout.write(`Generated ${tables.length} tables and ${views.length} views at ${outputPath}\n`);
} finally {
  await client.end();
}
