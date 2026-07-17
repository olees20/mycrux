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
