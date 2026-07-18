#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const CONFIRMATION = "DELETE ALL STAFFING DATA";
const AUTH_PAGE_SIZE = 1000;
const STORAGE_PAGE_SIZE = 1000;
const STORAGE_REMOVE_CHUNK_SIZE = 100;

const serviceTables = [
  {
    name: "application_status_logs",
    note: "지원 상태 변경 로그",
  },
  {
    name: "job_post_update_logs",
    note: "모집글 수정·상태 로그",
  },
  {
    name: "admin_logs",
    note: "관리자·변경 로그",
  },
  {
    name: "staff_favorite_guesthouses",
    note: "스탭 관심 게스트하우스",
  },
  {
    name: "applications",
    note: "지원서",
  },
  {
    name: "job_post_photos",
    note: "모집글 사진 메타데이터",
  },
  {
    name: "guesthouse_photos",
    note: "게스트하우스 사진 메타데이터",
  },
  {
    name: "job_posts",
    note: "모집글",
  },
  {
    name: "guesthouses",
    note: "게스트하우스",
  },
  {
    name: "profiles",
    note: "회원 프로필",
  },
];

const uploadBuckets = [
  {
    name: "guesthouse-images",
    note: "게스트하우스 업로드 이미지",
  },
  {
    name: "job-post-images",
    note: "모집글 업로드 이미지",
  },
  {
    name: "application-photos",
    note: "지원자 대표사진",
  },
];

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

function requireEnvironment() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다. 삭제 작업은 실행할 수 없습니다.",
    );
  }

  let safeHost;
  try {
    safeHost = new URL(supabaseUrl).host;
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 형식이 올바르지 않습니다.");
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    safeHost,
    hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

function createAdminClient(supabaseUrl, serviceRoleKey) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function formatCount(value) {
  if (typeof value !== "number") return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function printMarkdownTable(headers, rows) {
  console.log(`| ${headers.join(" | ")} |`);
  console.log(`| ${headers.map(() => "---").join(" | ")} |`);
  for (const row of rows) {
    console.log(`| ${row.join(" | ")} |`);
  }
}

async function countTableRows(supabase, tableName) {
  const { count, error } = await supabase
    .from(tableName)
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(`${tableName} 건수 조회 실패: ${error.message}`);
  }

  return count ?? 0;
}

async function getTableCounts(supabase) {
  const result = [];
  for (const table of serviceTables) {
    result.push({
      ...table,
      count: await countTableRows(supabase, table.name),
    });
  }
  return result;
}

async function getExistingBucketNames(supabase) {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error(`Storage bucket 목록 조회 실패: ${error.message}`);
  }

  return new Set((data ?? []).map((bucket) => bucket.name));
}

function isStorageFolder(item) {
  return !item.id && item.metadata === null;
}

async function listStorageObjects(supabase, bucketName, prefix = "") {
  const objects = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage.from(bucketName).list(prefix, {
      limit: STORAGE_PAGE_SIZE,
      offset,
      sortBy: {
        column: "name",
        order: "asc",
      },
    });

    if (error) {
      throw new Error(`${bucketName} 객체 목록 조회 실패: ${error.message}`);
    }

    const items = data ?? [];
    for (const item of items) {
      const objectPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (isStorageFolder(item)) {
        objects.push(...(await listStorageObjects(supabase, bucketName, objectPath)));
      } else {
        objects.push(objectPath);
      }
    }

    if (items.length < STORAGE_PAGE_SIZE) break;
    offset += items.length;
  }

  return objects;
}

async function getStorageCounts(supabase, existingBucketNames) {
  const result = [];

  for (const bucket of uploadBuckets) {
    if (!existingBucketNames.has(bucket.name)) {
      result.push({
        ...bucket,
        exists: false,
        count: 0,
      });
      continue;
    }

    const objects = await listStorageObjects(supabase, bucket.name);
    result.push({
      ...bucket,
      exists: true,
      count: objects.length,
    });
  }

  return result;
}

async function listAuthUserIds(supabase) {
  const userIds = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    });

    if (error) {
      throw new Error(`Auth 회원 목록 조회 실패: ${error.message}`);
    }

    const users = data.users ?? [];
    userIds.push(...users.map((user) => user.id));

    if (users.length < AUTH_PAGE_SIZE) break;
  }

  return userIds;
}

async function getSnapshot(supabase) {
  const existingBucketNames = await getExistingBucketNames(supabase);
  const [tables, storage, authUserIds] = await Promise.all([
    getTableCounts(supabase),
    getStorageCounts(supabase, existingBucketNames),
    listAuthUserIds(supabase),
  ]);

  return {
    tables,
    storage,
    authUserCount: authUserIds.length,
  };
}

function printSnapshot(snapshot) {
  printMarkdownTable(
    ["유형", "실제 이름", "현재 건수", "삭제 여부", "비고"],
    [
      ...snapshot.tables.map((table) => [
        "DB table",
        table.name,
        formatCount(table.count),
        "삭제",
        table.note,
      ]),
      ...snapshot.storage.map((bucket) => [
        "Storage bucket",
        bucket.name,
        formatCount(bucket.count),
        bucket.exists ? "객체만 삭제" : "bucket 없음",
        bucket.exists ? bucket.note : `${bucket.note}; bucket 자체 생성 안 함`,
      ]),
      [
        "Auth",
        "auth users",
        formatCount(snapshot.authUserCount),
        "삭제",
        "전체 회원",
      ],
    ],
  );
}

function printDeletionOrder() {
  console.log("\n실제 삭제 순서:");
  console.log("1. Storage 사용자 업로드 객체 삭제");
  serviceTables.forEach((table, index) => {
    console.log(`${index + 2}. DB table: ${table.name}`);
  });
  console.log(`${serviceTables.length + 2}. Supabase Auth 회원 삭제`);
}

function assertExecutionAllowed() {
  const isExecute = process.argv.includes("--execute");
  if (!isExecute) return false;

  if (process.env.RESET_CONFIRMATION !== CONFIRMATION) {
    throw new Error(
      `실행 확인 문구가 일치하지 않습니다. RESET_CONFIRMATION="${CONFIRMATION}"가 필요합니다.`,
    );
  }

  return true;
}

function chunkArray(values, chunkSize) {
  const chunks = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

async function deleteStorageObjects(supabase) {
  const existingBucketNames = await getExistingBucketNames(supabase);
  let deletedCount = 0;
  let failureCount = 0;

  for (const bucket of uploadBuckets) {
    if (!existingBucketNames.has(bucket.name)) continue;

    const objects = await listStorageObjects(supabase, bucket.name);
    for (const objectChunk of chunkArray(objects, STORAGE_REMOVE_CHUNK_SIZE)) {
      const { error } = await supabase.storage.from(bucket.name).remove(objectChunk);
      if (error) {
        failureCount += objectChunk.length;
      } else {
        deletedCount += objectChunk.length;
      }
    }
  }

  return {
    deletedCount,
    failureCount,
  };
}

async function deleteTableRows(supabase, tableName) {
  const { error } = await supabase
    .from(tableName)
    .delete({ count: "exact" })
    .not("id", "is", null);

  if (error) {
    throw new Error(`${tableName} 삭제 실패: ${error.message}`);
  }

  return true;
}

async function deleteServiceTablesDirectly(supabase) {
  for (const table of serviceTables) {
    await deleteTableRows(supabase, table.name);
  }
}

async function deleteAuthUsers(supabase) {
  const userIds = await listAuthUserIds(supabase);
  let deletedCount = 0;
  let failureCount = 0;

  for (const userId of userIds) {
    const { error } = await supabase.auth.admin.deleteUser(userId, false);
    if (error) {
      failureCount += 1;
    } else {
      deletedCount += 1;
    }
  }

  return {
    before: userIds.length,
    deletedCount,
    failureCount,
    after: (await listAuthUserIds(supabase)).length,
  };
}

function isPermissionDeniedError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("permission denied for table");
}

function buildTableResults(beforeSnapshot, finalSnapshot) {
  const finalCounts = new Map(
    finalSnapshot.tables.map((table) => [table.name, table.count]),
  );

  return beforeSnapshot.tables.map((table) => ({
    tableName: table.name,
    before: table.count,
    after: finalCounts.get(table.name) ?? 0,
  }));
}

async function executeReset(supabase, beforeSnapshot) {
  console.log("\n삭제 실행을 시작합니다.");

  const storageResult = await deleteStorageObjects(supabase);
  console.log(`Storage 삭제 성공: ${formatCount(storageResult.deletedCount)}`);
  console.log(`Storage 삭제 실패: ${formatCount(storageResult.failureCount)}`);

  if (storageResult.failureCount > 0) {
    throw new Error("Storage 삭제 실패가 있어 DB/Auth 삭제를 중단합니다.");
  }

  const storageAfter = await getStorageCounts(
    supabase,
    await getExistingBucketNames(supabase),
  );
  const remainingStorageObjects = storageAfter.reduce(
    (sum, bucket) => sum + bucket.count,
    0,
  );
  if (remainingStorageObjects > 0) {
    throw new Error("Storage 객체가 남아 있어 DB/Auth 삭제를 중단합니다.");
  }

  let authResult;
  let dbDeleteMode = "직접 DB DELETE";
  try {
    await deleteServiceTablesDirectly(supabase);
    const directDeleteSnapshot = await getSnapshot(supabase);
    const remainingRows = directDeleteSnapshot.tables.reduce(
      (sum, table) => sum + table.count,
      0,
    );
    if (remainingRows > 0) {
      throw new Error("DB 서비스 데이터가 남아 있어 Auth 삭제를 중단합니다.");
    }
    authResult = await deleteAuthUsers(supabase);
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      throw error;
    }

    dbDeleteMode = "Auth 삭제에 따른 기존 FK cascade";
    console.log(
      "DB 직접 DELETE 권한이 없어 Auth 삭제 후 기존 FK cascade로 서비스 데이터를 정리합니다.",
    );
    authResult = await deleteAuthUsers(supabase);
  }

  const finalSnapshot = await getSnapshot(supabase);
  const tableResults = buildTableResults(beforeSnapshot, finalSnapshot);

  console.log(`\nDB 삭제 결과 (${dbDeleteMode}):`);
  printMarkdownTable(
    ["테이블", "삭제 전", "삭제 후"],
    tableResults.map((table) => [
      table.tableName,
      formatCount(table.before),
      formatCount(table.after),
    ]),
  );

  console.log("\nAuth 삭제 결과:");
  printMarkdownTable(
    ["항목", "건수"],
    [
      ["삭제 전 회원", formatCount(authResult.before)],
      ["삭제 성공", formatCount(authResult.deletedCount)],
      ["삭제 실패", formatCount(authResult.failureCount)],
      ["최종 회원", formatCount(authResult.after)],
    ],
  );

  console.log("\n유지된 항목:");
  console.log("- Supabase 프로젝트, schema, table, enum, constraint, index, trigger");
  console.log("- RLS 정책과 Storage bucket 및 정책");
  console.log("- public 정적 이미지, Next.js 코드, 마이그레이션 파일");

  console.log("\n최종 건수:");
  printSnapshot(finalSnapshot);

  const remainingData =
    finalSnapshot.authUserCount +
    finalSnapshot.tables.reduce((sum, table) => sum + table.count, 0) +
    finalSnapshot.storage.reduce((sum, bucket) => sum + bucket.count, 0);

  if (remainingData > 0 || authResult.failureCount > 0) {
    throw new Error("일부 삭제 대상이 남아 있습니다. 초기화 완료로 표시하지 않습니다.");
  }

  console.log("\n초기화가 완료되었습니다.");
  console.log(
    `삭제 전 Auth 회원 수: ${formatCount(beforeSnapshot.authUserCount)}, 최종 Auth 회원 수: ${formatCount(finalSnapshot.authUserCount)}`,
  );
}

async function main() {
  const isExecute = assertExecutionAllowed();
  const environment = requireEnvironment();
  const supabase = createAdminClient(
    environment.supabaseUrl,
    environment.serviceRoleKey,
  );

  console.log("스탭핑 운영 데이터 초기화 점검");
  console.log(`연결 대상 Supabase host: ${environment.safeHost}`);
  console.log("service role key: 존재함");
  console.log(
    `NEXT_PUBLIC_SUPABASE_ANON_KEY: ${environment.hasAnonKey ? "존재함" : "없음"}`,
  );
  console.log(`실행 모드: ${isExecute ? "실제 삭제" : "dry-run"}`);
  console.log("민감한 키, 이메일, 이름, 전화번호, UUID 목록은 출력하지 않습니다.\n");

  const snapshot = await getSnapshot(supabase);
  printSnapshot(snapshot);
  printDeletionOrder();

  console.log("\n유지되는 데이터와 설정:");
  console.log("- DB schema, table, enum, PK/FK/unique/check constraint, index, trigger");
  console.log("- RLS 정책, Storage bucket, Storage 정책");
  console.log("- 마이그레이션, 시드, Next.js 코드, Vercel/OAuth/analytics 설정");
  console.log("- public 정적 이미지와 docs 문서");

  if (!isExecute) {
    console.log("\n실제 삭제 실행 여부: 실행하지 않음");
    console.log(
      `실제 삭제는 RESET_CONFIRMATION="${CONFIRMATION}" node scripts/reset-production-data.mjs --execute 로만 실행됩니다.`,
    );
    console.log("\n삭제 대상 확인이 완료되었습니다.");
    console.log(
      "계속하려면 정확히 `DELETE ALL STAFFING DATA`라고 입력해 주세요.",
    );
    return;
  }

  await executeReset(supabase, snapshot);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
