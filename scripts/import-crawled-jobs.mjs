#!/usr/bin/env node
// .crawl/feed.json 의 수집 공고를 Supabase(crawled_job_posts + 이미지 버킷)에 올린다.
// 사용: node scripts/import-crawled-jobs.mjs [--days=1] [--all] [--dry-run]
//   기본: 오늘(KST) 올라온 글(끌올 포함, posted_at 갱신). --days=N 이면 최근 N일, --all 이면 대표 글 전체.
//   같은 글(끌올)은 source_group_id 로 찾아 새 행을 만들지 않고 갱신한다. status(숨김 처리 등)는 덮어쓰지 않는다.
// 필요: .env.local 의 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY, 마이그레이션 019 적용
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const l of existsSync(path.join(root, ".env.local")) ? readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/) : []) {
  const i = l.indexOf("=");
  if (i > 0 && !l.startsWith("#") && !process.env[l.slice(0, i).trim()]) process.env[l.slice(0, i).trim()] = l.slice(i + 1).trim();
}

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const flag = (k) => process.argv.includes(`--${k}`);
const DRY = flag("dry-run");
const BUCKET = "crawled-job-images";
const TABLE = "crawled_job_posts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 없습니다.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const feedPath = path.join(root, ".crawl", "feed.json");
const postsPath = path.join(root, ".crawl", "posts.json");
if (!existsSync(feedPath)) {
  console.error(".crawl/feed.json 이 없습니다. 먼저 node scripts/crawl-naver-cafe.mjs 를 실행하세요.");
  process.exit(1);
}
const feed = JSON.parse(readFileSync(feedPath, "utf8"));
const posts = JSON.parse(readFileSync(postsPath, "utf8"));

// ── 대상 선택: 오늘(KST)부터 N일 안에 처음 올라온 대표 글 ──
const kst = (v) => new Date(v).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
const days = +arg("days", 1);
const cutoff = new Date(`${kst(new Date())}T00:00:00+09:00`).getTime() - (days - 1) * 864e5;
const targets = feed.filter((r) => flag("all") || new Date(r.writtenAt).getTime() >= cutoff);

console.log(`대상 프로젝트: ${new URL(url).hostname}`);
console.log(`선택된 글: ${targets.length}건 (대표 글 ${feed.length}건 중, ${flag("all") ? "전체" : `최근 ${days}일 게시(끌올 포함)`})${DRY ? " [dry-run]" : ""}`);
if (targets.length === 0) process.exit(0);

// ── 테이블 존재 확인 ──
const probe = await supabase.from(TABLE).select("id").limit(1);
if (probe.error) {
  const missing = /does not exist|schema cache|PGRST205|42P01/i.test(`${probe.error.code} ${probe.error.message}`);
  console.error(missing ? `\n테이블 public.${TABLE} 이 없습니다. supabase/migrations/019_add_crawled_job_posts.sql 을 Supabase SQL Editor 에서 먼저 실행해 주세요.` : `\n조회 실패: ${probe.error.message}`);
  process.exit(1);
}

// ── 버킷 보장 ──
if (!DRY) {
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] });
  if (error && !/already exists|duplicate/i.test(error.message)) {
    console.error("버킷 생성 실패:", error.message);
    process.exit(1);
  }
}

// ── 이미 올라간 행 조회(끌올 갱신 / 썸네일 재업로드 판단) ──
const groupIds = targets.map((r) => posts[r.id].dedupe.firstId);
const { data: existingRows, error: exErr } = await supabase.from(TABLE).select("source_group_id, thumbnail_path, thumbnail_source_url").eq("source", "naver_cafe").in("source_group_id", groupIds);
if (exErr) {
  console.error("기존 행 조회 실패:", exErr.message);
  process.exit(1);
}
const existing = new Map(existingRows.map((r) => [r.source_group_id, r]));

// 썸네일: 카드가 4:3 이므로 중앙(주요 피사체 기준) 4:3 으로 잘라 1200x900 JPEG 로 저장
async function uploadThumbnail(groupId, srcUrl) {
  const res = await fetch(srcUrl);
  if (!res.ok) throw new Error(`이미지 다운로드 ${res.status}`);
  const body = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize(1200, 900, { fit: "cover", position: sharp.strategy.attention }).jpeg({ quality: 82 }).toBuffer();
  const objectPath = `${groupId}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, body, { contentType: "image/jpeg", upsert: true, cacheControl: "3600" });
  if (error) throw new Error(error.message);
  return objectPath;
}

const rows = [];
let inserted = 0;
let updated = 0;
let thumbs = 0;
for (const r of targets) {
  const groupId = posts[r.id].dedupe.firstId;
  const prev = existing.get(groupId);
  prev ? updated++ : inserted++;

  let thumbnail_path = prev?.thumbnail_path ?? null;
  let thumbnail_source_url = prev?.thumbnail_source_url ?? null;
  const srcUrl = r.thumbnail ?? null;
  if (srcUrl && srcUrl !== prev?.thumbnail_source_url) {
    if (DRY) thumbs++;
    else {
      try {
        thumbnail_path = await uploadThumbnail(groupId, srcUrl);
        thumbnail_source_url = srcUrl;
        thumbs++;
      } catch (e) {
        console.warn(`  썸네일 업로드 실패(${r.id}): ${e.message}`);
      }
    }
  } else if (!srcUrl) {
    thumbnail_path = null;
    thumbnail_source_url = null;
  }

  // Claude 가 원문을 읽고 정리한 어필 포인트(.crawl/summary/<글번호>.json: { intro, highlights }). 없으면 비워 둔다.
  const sumPath = path.join(root, ".crawl", "summary", `${r.id}.json`);
  const summary = existsSync(sumPath) ? JSON.parse(readFileSync(sumPath, "utf8")) : {};

  // 파서가 놓치거나 잘못 읽은 값은 Claude 가 원문을 보고 summary.fields 로 덮어쓴다(컬럼 이름 그대로).
  const partyKind = summary.party_kind ?? r.party_kind;
  const a = { ...r.apply, ...(summary.apply ?? {}) };
  const f = { ...r.fields, ...(summary.fields ?? {}) };
  const g = { ...r.guesthouse, ...(summary.fields?.address_text ? { address_text: summary.fields.address_text } : {}), ...(summary.fields?.map_url ? { map_url: summary.fields.map_url } : {}) };
  rows.push({
    source: "naver_cafe",
    source_group_id: groupId,
    source_article_id: r.id,
    source_url: r.url,
    first_posted_at: r.firstPostedAt,
    posted_at: r.writtenAt,
    repost_count: r.reposts,
    title: f.title,
    guesthouse_name: r.guesthouse.name,
    region: r.guesthouse.region,
    address_text: g.address_text,
    map_url: g.map_url,
    recruit_count: f.recruit_count || 1,
    gender_condition: f.gender_condition,
    age_condition: f.age_condition,
    work_start_date: f.work_start_date,
    min_work_period: f.min_work_period,
    work_content: f.work_content,
    work_time: f.work_time,
    work_days_per_week: f.work_days_per_week ?? null,
    off_days_per_week: f.off_days_per_week ?? null,
    stipend_type: f.stipend_type,
    stipend_description: f.stipend_description,
    provides_accommodation: Boolean(f.provides_accommodation),
    provides_meal: Boolean(f.provides_meal),
    has_party: partyKind === "party",
    party_kind: partyKind,
    party_description: f.party_description,
    is_urgent: Boolean(f.is_urgent),
    preferred_conditions: f.preferred_conditions,
    caution: f.caution,
    description: f.description,
    intro: summary.intro ?? null,
    highlights: summary.highlights ?? [],
    apply_channel: a.channel,
    apply_url: a.url,
    apply_phones: a.phones ?? [],
    apply_emails: a.emails ?? [],
    apply_kakao_id: a.kakaoId,
    apply_hint: a.hint,
    tags: r.tags,
    thumbnail_path,
    thumbnail_source_url,
    review_missing: r.missing,
    review_assumed: r.assumed,
  });
}

if (DRY) {
  console.log(`\n[dry-run] 신규 ${inserted}건 · 갱신(끌올 포함) ${updated}건 · 업로드할 썸네일 ${thumbs}건 — 아무것도 쓰지 않았습니다.`);
  process.exit(0);
}

// status 는 payload 에 없으므로 신규 행만 기본값(visible), 기존 행은 유지된다.
const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: "source,source_group_id" });
if (error) {
  console.error("업서트 실패:", error.message);
  process.exit(1);
}
console.log(`\n완료: 신규 ${inserted}건 · 갱신 ${updated}건 · 썸네일 업로드 ${thumbs}건`);
