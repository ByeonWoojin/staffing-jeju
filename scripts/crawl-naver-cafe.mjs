#!/usr/bin/env node
// 네이버 카페 "G.H.스탭모집방-제주" 수집 → 파싱 → .crawl/posts.json
// 사용: node scripts/crawl-naver-cafe.mjs [--pages=1] [--size=50]
// 필요: .env.local 의 NAVER_NID_AUT / NAVER_NID_SES (로그인 쿠키)
//
// 하루 흐름 ("스탭핑 오늘 크롤링 시작해"):
//   1) 이 스크립트 실행 → 새 글 수집/파싱, 검수 대기 목록(.crawl/review.json) + 이미지 준비
//   2) Claude 가 .crawl/sheets/<id>.jpg (앞 12장 번호 시트)를 보고
//      - 안내문/공고문 이미지 번호를 `node scripts/read-image.mjs <id> <번호...>` 로 읽기 좋게 잘라 읽고
//        .crawl/ocr/<id>.txt (전사 텍스트를 파서가 재해석) 또는 .crawl/ocr/<id>.json (읽은 값을 필드로 직접 지정:
//        { fields, guesthouse, apply } 로 덮어씀. 월 단위 근무일처럼 파서가 오해할 표현이 있을 때) 에 기록. 읽을 게 없으면 빈 .txt
//      - 썸네일 번호를 .crawl/thumb/<id>.txt 에 기록("none" 이면 기본 이미지)
//   3) 스크립트 재실행(캐시로 재파싱) → 남은 누락 필드를 사장님이 직접 판정
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ASAP_DATE, buildTags, htmlToText, parsePost, stripLinkPreviews } from "./lib/parse-cafe-post.mjs";
import { dedupe } from "./lib/dedupe.mjs";
import { analyze, autoPick, contactSheet, suitability } from "./lib/pick-thumbnail.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const C = (...p) => path.join(root, ".crawl", ...p);
for (const d of ["raw", "ocr", "thumb", "images", "sheets"]) mkdirSync(C(d), { recursive: true });

for (const l of existsSync(path.join(root, ".env.local")) ? readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/) : []) {
  const i = l.indexOf("=");
  if (i > 0 && !l.startsWith("#") && !process.env[l.slice(0, i).trim()]) process.env[l.slice(0, i).trim()] = l.slice(i + 1).trim();
}

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const PAGES = +arg("pages", 1);
const SIZE = +arg("size", 50);
const CAFE = 22960569;
const MENU = 142;
const DELAY_MS = 800; // 네이버 차단 방지용 간격. 줄이지 말 것
const SHEET_SCAN = 12; // 시트에 올리는 앞쪽 사진 수 (썸네일 후보 + 안내문 찾기)
const AUTO_SCAN = 8; // 자동 1차 썸네일 선택 범위

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const read = (f, d = null) => (existsSync(f) ? readFileSync(f, "utf8") : d);
const H = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36",
  Referer: "https://cafe.naver.com/",
  Cookie: `NID_AUT=${process.env.NAVER_NID_AUT}; NID_SES=${process.env.NAVER_NID_SES}`,
};
const getJson = async (url) => (await fetch(url, { headers: H })).json();

// ── 1) 수집: 새 글만 raw 캐시에 저장 ──
let added = 0;
if (!process.env.NAVER_NID_AUT || !process.env.NAVER_NID_SES) {
  console.warn("NAVER_NID_AUT/SES 없음 → 새 글 수집은 건너뛰고 캐시만 재파싱합니다.");
} else {
  for (let page = 1; page <= PAGES; page++) {
    const r = await getJson(`https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/${CAFE}/menus/${MENU}/articles?page=${page}&pageSize=${SIZE}&sortBy=TIME&viewType=L`);
    for (const { item } of (r.result?.articleList ?? []).filter((a) => a.type === "ARTICLE")) {
      const id = String(item.articleId);
      if (existsSync(C("raw", `${id}.json`))) continue;
      await sleep(DELAY_MS);
      const d = await getJson(`https://apis.naver.com/cafe-web/cafe-articleapi/v2.1/cafes/${CAFE}/articles/${id}?query=&useCafeId=true&requestFrom=A`);
      if (d.result?.errorCode === "0004") throw new Error("로그인 쿠키가 만료됐습니다. NID_AUT/NID_SES 를 다시 넣어주세요.");
      const a = d.result?.article;
      if (!a || a.isBlind || !a.contentHtml) continue;
      writeFileSync(C("raw", `${id}.json`), JSON.stringify({ id, subject: a.subject, contentHtml: a.contentHtml, nick: a.writer?.nick, memberKey: a.writer?.memberKey, writeDate: a.writeDate }));
      added++;
      process.stdout.write(`\r새 글 ${added}건`);
    }
  }
}

// ── 2) 파싱 + 이미지 판정 (분석 결과는 URL 기준 캐시) ──
const analysisFile = C("analysis.json");
const cache = JSON.parse(read(analysisFile, "{}"));
const analyzed = async (url) => (url in cache ? cache[url] : (cache[url] = await analyze(url).catch(() => null)));

const saved = {};
const review = [];
const pending = [];
const dedupeItems = [];
for (const f of readdirSync(C("raw")).filter((x) => x.endsWith(".json"))) {
  const a = JSON.parse(readFileSync(C("raw", f), "utf8"));
  const ocrText = read(C("ocr", `${a.id}.txt`));
  const parsed = parsePost({ subject: a.subject, contentHtml: a.contentHtml, nick: a.nick, extraText: ocrText ?? "" });

  // 이미지에서 Claude 가 직접 읽어 지정한 값: 파서 결과 위에 덮어쓰고, 누락/가정 표시에서 뺀다
  const ov = existsSync(C("ocr", `${a.id}.json`)) ? JSON.parse(readFileSync(C("ocr", `${a.id}.json`), "utf8")) : null;
  if (ov) {
    const keys = Object.keys(ov.fields ?? {});
    Object.assign(parsed.fields, ov.fields);
    Object.assign(parsed.guesthouse, ov.guesthouse);
    Object.assign(parsed.apply, ov.apply);
    if (ov.party_kind !== undefined) parsed.party_kind = ov.party_kind;
    parsed.missing = parsed.missing.filter((k) => !keys.includes(k) && !(k === "region" && ov.guesthouse?.region));
    parsed.assumed = parsed.assumed.filter((k) => !keys.includes(k));
    parsed.derived = parsed.derived.filter((k) => !keys.includes(k));
    parsed.manual = keys;
    parsed.tags = buildTags(parsed.fields, parsed.guesthouse, parsed.fields.work_start_date === ASAP_DATE, parsed.party_kind);
  }

  const cands = await Promise.all(parsed.images.slice(0, SHEET_SCAN).map(analyzed));
  const manual = read(C("thumb", `${a.id}.txt`))?.trim();
  let thumbnail = null;
  let thumbnailSource = "none";
  if (manual) {
    thumbnail = manual === "none" ? null : cands[+manual] ?? (await analyzed(parsed.images[+manual])); // 글 전체 기준 사진 번호(시트 번호)로 지정
    thumbnailSource = "manual";
  } else {
    thumbnail = autoPick(cands.slice(0, AUTO_SCAN));
    thumbnailSource = thumbnail ? "auto" : "none";
  }

  const needsOcr = ocrText === null && !ov && parsed.missing.length > 0 && cands.length > 0; // 안내문 이미지가 있는지는 시트를 보고 판단
  const needsThumbReview = !manual && cands.length > 0;

  saved[a.id] = {
    source: { articleId: a.id, url: `https://cafe.naver.com/myguesthouse/${a.id}`, writer: a.nick, writtenAt: new Date(a.writeDate).toISOString() },
    ...parsed,
    thumbnail,
    thumbnail_source: thumbnailSource,
    ocr_done: ocrText !== null || Boolean(ov),
  };

  dedupeItems.push({ id: a.id, writer: a.memberKey ?? a.nick, title: a.subject, body: stripLinkPreviews(htmlToText(a.contentHtml)), at: a.writeDate });
  pending.push({ id: a.id, parsed, cands, needsOcr, needsThumbReview });
}

// 중복(같은 글 반복 게시)은 최신 1건만 노출. 검수·리포트·피드는 대표 글만 대상으로 한다.
const dup = dedupe(dedupeItems);
for (const [id, d] of dup) saved[id].dedupe = d;
for (const { id, parsed, cands, needsOcr, needsThumbReview } of pending) {
  if (!dup.get(id).canonical || !(needsOcr || needsThumbReview)) continue;
  const sheet = C("sheets", `${id}.jpg`);
  await contactSheet(cands, sheet);
  review.push({ id, title: parsed.fields.title, missing: parsed.missing, assumed: parsed.assumed, needs_ocr: needsOcr, needs_thumb: needsThumbReview, sheet, sheet_reasons: cands.map((p, i) => `${i}:${p ? suitability(p) ?? "적합" : "실패"}`) });
}
writeFileSync(analysisFile, JSON.stringify(cache));
writeFileSync(C("posts.json"), JSON.stringify(saved, null, 1));
writeFileSync(C("review.json"), JSON.stringify(review, null, 1));

// 사이트(로컬 확인용)가 읽는 피드: 대표 글만, 최신순
const feed = Object.values(saved)
  .filter((r) => r.dedupe.canonical)
  .sort((x, y) => y.source.writtenAt.localeCompare(x.source.writtenAt))
  .map((r) => ({
    id: r.source.articleId,
    url: r.source.url,
    writtenAt: r.source.writtenAt,
    firstPostedAt: saved[r.dedupe.firstId].source.writtenAt,
    reposts: r.dedupe.reposts,
    title: r.fields.title,
    guesthouse: r.guesthouse,
    fields: r.fields,
    party_kind: r.party_kind,
    apply: r.apply,
    tags: r.tags,
    thumbnail: r.thumbnail?.url ?? null,
    missing: r.missing,
    assumed: r.assumed,
    derived: r.derived,
  }));
writeFileSync(C("feed.json"), JSON.stringify(feed, null, 1));

// ── 3) 리포트 ──
const rows = Object.values(saved).filter((r) => r.dedupe.canonical);
const n = rows.length;
const pct = (c) => `${c}/${n} (${n ? Math.round((c / n) * 100) : 0}%)`;
const miss = {};
for (const r of rows) for (const k of r.missing) miss[k] = (miss[k] ?? 0) + 1;
const found = (r, k) => !r.assumed.includes(k) && r.fields[k] != null; // 글에서 실제로 읽어낸 값만
console.log(`\n=== 노출 대상 ${n}건 (수집 ${Object.keys(saved).length}건 중 중복 ${Object.keys(saved).length - n}건 제외, 신규 ${added}) → .crawl/feed.json`);
console.log("썸네일 확보:", pct(rows.filter((r) => r.thumbnail).length), "| 사진 0장:", pct(rows.filter((r) => !r.images.length).length));
console.log("필수 필드 모두 채움:", pct(rows.filter((r) => !r.missing.length).length), "| 필드별 누락:", miss);
console.log("지원 방법:", Object.fromEntries(["instagram", "openchat", "form", "sms", "kakao", "email", "original"].map((c) => [c, rows.filter((r) => r.apply.channel === c).length])));
console.log("파티:", Object.fromEntries(["party", "potluck", "none", null].map((k) => [k ?? "불명", rows.filter((r) => r.party_kind === k).length])));
console.log("필터 해석률(직접 읽음):", {
  지역: pct(rows.filter((r) => r.guesthouse.region).length),
  성별: pct(rows.filter((r) => found(r, "gender_condition")).length),
  숙소: pct(rows.filter((r) => r.fields.provides_accommodation != null).length),
  식사: pct(rows.filter((r) => r.fields.provides_meal != null).length),
  급여: pct(rows.filter((r) => found(r, "stipend_type")).length),
  입도일: pct(rows.filter((r) => found(r, "work_start_date")).length),
});
console.log(`검수 대기: 본문 보강(이미지 읽기 후보) ${review.filter((r) => r.needs_ocr).length}건 · 썸네일 선택 ${review.filter((r) => r.needs_thumb).length}건 → .crawl/review.json`);
