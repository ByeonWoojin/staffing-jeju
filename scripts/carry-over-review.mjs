#!/usr/bin/env node
// 끌올로 새 글 번호가 붙은 글에 이전 번호의 검수 결과(요약·썸네일 번호·OCR)를 복사한다. 이미 있으면 건드리지 않는다.
// 사용: node scripts/crawl-naver-cafe.mjs ... → node scripts/carry-over-review.mjs → 크롤링 스크립트 재실행
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const C = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".crawl");
const posts = JSON.parse(readFileSync(path.join(C, "posts.json"), "utf8"));
const kinds = [["summary", "json"], ["thumb", "txt"], ["ocr", "txt"], ["ocr", "json"]];
const f = (kind, ext, id) => path.join(C, kind, `${id}.${ext}`);

const groups = new Map();
for (const [id, p] of Object.entries(posts)) (groups.get(p.dedupe.firstId) ?? groups.set(p.dedupe.firstId, []).get(p.dedupe.firstId)).push(id);

let copied = 0;
for (const ids of groups.values()) {
  ids.sort((a, b) => b - a); // 최신 글이 앞
  const [newest, ...older] = ids;
  for (const [kind, ext] of kinds) {
    if (existsSync(f(kind, ext, newest))) continue;
    const from = older.find((id) => existsSync(f(kind, ext, id)));
    if (from) (copyFileSync(f(kind, ext, from), f(kind, ext, newest)), copied++);
  }
}
console.log(`이전 번호의 검수 결과 ${copied}건을 복사했습니다.`);
