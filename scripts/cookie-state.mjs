#!/usr/bin/env node
// 네이버 쿠키(.crawl/cookie.json)를 Supabase 비공개 버킷에 보관/복원한다. GitHub Actions 가 실행 사이에 쿠키를 이어 쓰기 위한 것.
// 사용: node scripts/cookie-state.mjs pull|push
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const [cmd] = process.argv.slice(2);
const BUCKET = "crawler-state";
const FILE = "naver-cookie.json";
const LOCAL = ".crawl/cookie.json";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

if (cmd === "pull") {
  const { data } = await supabase.storage.from(BUCKET).download(FILE);
  if (data) {
    mkdirSync(".crawl", { recursive: true });
    writeFileSync(LOCAL, Buffer.from(await data.arrayBuffer()));
    console.log("쿠키 저장본을 복원했습니다.");
  } else console.log("쿠키 저장본 없음 → 환경변수 값을 사용합니다.");
} else if (cmd === "push" && existsSync(LOCAL)) {
  const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  const up = await supabase.storage.from(BUCKET).upload(FILE, readFileSync(LOCAL), { contentType: "application/json", upsert: true });
  if (up.error) throw up.error;
  console.log("갱신된 쿠키를 저장했습니다.");
}
