#!/usr/bin/env node

import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

export const MANAGED_STORAGE_BUCKETS = Object.freeze([
  "gym-branding",
  "wall-images",
  "route-media",
  "event-images",
  "community-images",
  "ascent-media",
]);

export function parseResetOptions(argv) {
  const supported = new Set(["--include-auth-users"]);
  const unknown = argv.filter((argument) => !supported.has(argument));
  if (unknown.length) throw new Error("Unknown reset option: " + unknown.join(", "));
  return { includeAuthUsers: argv.includes("--include-auth-users") };
}

export function validateResetEnvironment(environment) {
  if (environment.ALLOW_DATABASE_RESET !== "true") {
    throw new Error("Refusing reset: set ALLOW_DATABASE_RESET=true.");
  }
  if (environment.NODE_ENV === "production" && environment.ALLOW_PRODUCTION_DATABASE_RESET !== "true") {
    throw new Error("Refusing production reset: set ALLOW_PRODUCTION_DATABASE_RESET=true as an additional acknowledgement.");
  }
  const projectUrl = environment.SUPABASE_URL ?? environment.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY;
  if (!projectUrl) throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required.");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");
  if (serviceRoleKey === environment.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("The service-role key must not be the public anonymous key.");
  }
  const url = new URL(projectUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("The Supabase project URL must use HTTP or HTTPS.");
  return { projectUrl: url.origin, serviceRoleKey };
}

export function confirmationPhrase(projectUrl, includeAuthUsers) {
  const host = new URL(projectUrl).host;
  return includeAuthUsers
    ? "RESET MYCRUX DATA AND AUTH USERS AT " + host
    : "RESET MYCRUX APPLICATION DATA AT " + host;
}

async function listBucketFiles(client, bucketId, prefix = "") {
  const files = [];
  const limit = 1_000;
  let offset = 0;
  for (;;) {
    const { data, error } = await client.storage.from(bucketId).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error("Could not list " + bucketId + (prefix ? "/" + prefix : "") + ": " + error.message);
    for (const item of data ?? []) {
      const objectPath = prefix ? prefix + "/" + item.name : item.name;
      if (item.id) files.push(objectPath);
      else files.push(...await listBucketFiles(client, bucketId, objectPath));
    }
    if (!data || data.length < limit) break;
    offset += data.length;
  }
  return files;
}

async function clearManagedStorage(client) {
  const { data: buckets, error } = await client.storage.listBuckets();
  if (error) throw new Error("Could not list storage buckets: " + error.message);
  const existing = new Set((buckets ?? []).map(({ id }) => id));
  const counts = {};
  for (const bucketId of MANAGED_STORAGE_BUCKETS) {
    if (!existing.has(bucketId)) {
      counts[bucketId] = 0;
      continue;
    }
    const paths = await listBucketFiles(client, bucketId);
    let removed = 0;
    for (let index = 0; index < paths.length; index += 100) {
      const batch = paths.slice(index, index + 100);
      const result = await client.storage.from(bucketId).remove(batch);
      if (result.error) throw new Error("Could not clear " + bucketId + ": " + result.error.message);
      removed += result.data?.length ?? batch.length;
    }
    counts[bucketId] = removed;
  }
  return counts;
}

async function deleteAuthUsers(client) {
  let deleted = 0;
  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1_000 });
    if (error) throw new Error("Could not list Auth users: " + error.message);
    const users = data.users;
    if (!users.length) break;
    for (const user of users) {
      const result = await client.auth.admin.deleteUser(user.id, false);
      if (result.error) throw new Error("Could not delete Auth user " + user.id + ": " + result.error.message);
      deleted += 1;
    }
  }
  return deleted;
}

function total(values) {
  return Object.values(values).reduce((sum, value) => sum + Number(value), 0);
}

function report(result) {
  const tableCounts = result.database.tables ?? {};
  const storageCounts = result.storage;
  process.stdout.write("\nReset complete.\n");
  process.stdout.write("Database rows deleted: " + total(tableCounts) + "\n");
  for (const [table, count] of Object.entries(tableCounts).filter(([, count]) => Number(count) > 0).sort()) {
    process.stdout.write("  " + table + ": " + count + "\n");
  }
  process.stdout.write("Storage objects deleted: " + total(storageCounts) + "\n");
  for (const [bucket, count] of Object.entries(storageCounts)) process.stdout.write("  " + bucket + ": " + count + "\n");
  process.stdout.write("Auth users deleted: " + result.authUsersDeleted + "\n");
  process.stdout.write("Profiles preserved: " + result.profilesPreserved + "\n");
  process.stdout.write("Platform plans preserved: " + (result.database.platform_plans_preserved ?? 0) + "\n");
}

export async function runReset({
  argv = process.argv.slice(2),
  environment = process.env,
  input = process.stdin,
  output = process.stdout,
} = {}) {
  const options = parseResetOptions(argv);
  const configuration = validateResetEnvironment(environment);
  const phrase = confirmationPhrase(configuration.projectUrl, options.includeAuthUsers);

  output.write("\nMyCrux destructive database reset\n");
  output.write("Target Supabase project: " + configuration.projectUrl + "\n");
  output.write("Mode: " + (options.includeAuthUsers ? "application data plus Auth users" : "application data only (Auth users and profiles preserved)") + "\n");
  output.write("Schema, migrations, functions, triggers, RLS policies and bucket definitions will be preserved.\n");
  output.write("Type this exact phrase to continue:\n" + phrase + "\n> ");
  if (!input.isTTY || !output.isTTY) throw new Error("Refusing reset without an interactive terminal.");
  const prompt = createInterface({ input, output });
  const answer = await prompt.question("");
  prompt.close();
  if (answer !== phrase) throw new Error("Confirmation phrase did not match. Nothing was reset.");

  const client = createClient(configuration.projectUrl, configuration.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "mycrux-administrative-reset" } },
  });

  // Verify the database migration and service-role grant before touching Storage.
  // Supabase secret keys are opaque `sb_secret_...` values, so authorization is
  // enforced by the RPC's EXECUTE grant rather than by decoding a legacy JWT.
  const accessCheck = await client.rpc("check_administrative_reset_access");
  if (accessCheck.error || accessCheck.data !== true) {
    throw new Error(
      "Database reset preflight failed: "
      + (accessCheck.error?.message ?? "service-role access was not confirmed"),
    );
  }

  // Delete blobs through the Storage API first. If this fails, database truncation
  // does not begin and the idempotent command can be safely retried.
  const storage = await clearManagedStorage(client);
  const { data: database, error } = await client.rpc("administrative_reset_application_data");
  if (error) throw new Error("Database reset RPC failed: " + error.message);
  const authUsersDeleted = options.includeAuthUsers ? await deleteAuthUsers(client) : 0;
  let profilesPreserved = database.profiles_preserved ?? 0;
  if (options.includeAuthUsers) {
    const profileResult = await client.from("profiles").select("id", { count: "exact", head: true });
    if (profileResult.error) throw new Error("Could not verify profile cleanup: " + profileResult.error.message);
    profilesPreserved = profileResult.count ?? 0;
  }
  const result = { storage, database, authUsersDeleted, profilesPreserved };
  report(result);
  return result;
}

const isDirectExecution = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectExecution) {
  runReset().catch((error) => {
    process.stderr.write("\nReset aborted: " + (error instanceof Error ? error.message : String(error)) + "\n");
    process.exitCode = 1;
  });
}
