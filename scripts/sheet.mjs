#!/usr/bin/env node
// 앞 12장 밖의 사진을 보고 싶을 때: node scripts/sheet.mjs <articleId> <시작번호>
// → .crawl/sheets/<id>-<시작번호>.jpg (번호는 글 전체 기준. 이 번호를 .crawl/thumb/<id>.txt 에 그대로 쓴다)
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePost } from "./lib/parse-cafe-post.mjs";
import { analyze, contactSheet } from "./lib/pick-thumbnail.mjs";

const crawl = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".crawl");
const [id, start = "12"] = process.argv.slice(2);
const raw = JSON.parse(readFileSync(path.join(crawl, "raw", `${id}.json`), "utf8"));
const urls = parsePost({ subject: raw.subject, contentHtml: raw.contentHtml }).images.slice(+start, +start + 12);
const out = path.join(crawl, "sheets", `${id}-${start}.jpg`);
await contactSheet(await Promise.all(urls.map((u) => analyze(u).catch(() => null))), out, +start);
console.log(out);
