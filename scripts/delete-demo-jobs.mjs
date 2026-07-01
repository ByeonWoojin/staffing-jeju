#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const AUTH_PAGE_SIZE = 1000;
const DEMO_EMAIL_PATTERN = /^demo-owner-\d{3}@staffing\.local$/;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function loadEnvFile(fileName) {
  const envPath = path.join(projectRoot, fileName);
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다. .env.local을 확인해주세요.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function deleteDemoRows(tableName, filter) {
  const query = filter(supabase.from(tableName).delete({ count: "exact" }));
  const { count, error } = await query;
  if (error) {
    throw new Error(`${tableName} 데모 데이터 삭제 실패: ${error.message}`);
  }

  return count ?? 0;
}

async function listDemoAuthUsers() {
  const demoUsers = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    });

    if (error) {
      throw new Error(`auth user 목록 조회 실패: ${error.message}`);
    }

    const users = data.users ?? [];
    demoUsers.push(
      ...users.filter((user) => DEMO_EMAIL_PATTERN.test(user.email ?? "")),
    );

    if (users.length < AUTH_PAGE_SIZE) break;
  }

  return demoUsers;
}

async function deleteDemoAuthUsers() {
  const users = await listDemoAuthUsers();

  for (const user of users) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      throw new Error(`${user.email} auth user 삭제 실패: ${error.message}`);
    }
  }

  return users.length;
}

async function main() {
  console.log("데모 모집글 삭제를 시작합니다.");
  console.log(
    "주의: demo-% 모집글에 연결된 demo 지원/관심 데이터는 FK cascade로 함께 삭제될 수 있습니다.",
  );

  const deletedJobPosts = await deleteDemoRows("job_posts", (query) =>
    query.like("slug", "demo-%"),
  );
  const deletedGuesthouses = await deleteDemoRows("guesthouses", (query) =>
    query.like("name", "[데모]%"),
  );
  const deletedProfiles = await deleteDemoRows("profiles", (query) =>
    query.like("email", "demo-owner-%@staffing.local"),
  );
  const deletedAuthUsers = await deleteDemoAuthUsers();

  console.log(`삭제된 job_posts: ${deletedJobPosts}`);
  console.log(`삭제된 guesthouses: ${deletedGuesthouses}`);
  console.log(`삭제된 profiles: ${deletedProfiles}`);
  console.log(`삭제된 auth users: ${deletedAuthUsers}`);
  console.log("완료: demo 데이터 삭제가 끝났습니다.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
