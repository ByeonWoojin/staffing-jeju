#!/usr/bin/env node
// 요약(intro)이 비어 있는 공개 행 중 최신 N건을 .crawl/review-queue.json 에 글 번호 배열로 기록한다 (GitHub Actions 검수 단계 입력).
// 사용: node scripts/review-queue.mjs [--limit=6]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const l of existsSync(path.join(root, ".env.local")) ? readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/) : []) {
  const i = l.indexOf("=");
  if (i > 0 && !l.startsWith("#") && !process.env[l.slice(0, i).trim()]) process.env[l.slice(0, i).trim()] = l.slice(i + 1).trim();
}
const limit = +(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 6);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data, error } = await supabase.from("crawled_job_posts").select("source_group_id, source_article_id").eq("source", "naver_cafe").eq("status", "visible").is("intro", null).order("posted_at", { ascending: false }).limit(100);
if (error) { console.error(error.message); process.exit(1); }

const posts = JSON.parse(readFileSync(path.join(root, ".crawl", "posts.json"), "utf8"));
const feed = JSON.parse(readFileSync(path.join(root, ".crawl", "feed.json"), "utf8"));
const byMember = new Map();
for (const r of feed) {
  const first = posts[r.id].dedupe.firstId;
  for (const [id, p] of Object.entries(posts)) if (p.dedupe.firstId === first) byMember.set(id, r.id);
}
const ids = [];
for (const row of data) {
  const id = byMember.get(row.source_article_id) ?? byMember.get(row.source_group_id);
  if (id && !ids.includes(id)) ids.push(id); // 수집 캐시에 없는 오래된 글은 건너뜀
  if (ids.length >= limit) break;
}
writeFileSync(path.join(root, ".crawl", "review-queue.json"), JSON.stringify(ids));
console.log(`검수 대기 ${ids.length}건: ${ids.join(", ") || "-"}`);
