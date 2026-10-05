#!/usr/bin/env node
// 안내문 이미지를 읽기 좋게 잘라 저장: node scripts/read-image.mjs <articleId> <시트번호...>
// 가로 1000px, 세로 1.4배 단위 분할 → .crawl/images/<id>-<번호>-<n>.jpg (Claude 가 Read 로 읽는다)
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePost } from "./lib/parse-cafe-post.mjs";
import { saveReadable } from "./lib/pick-thumbnail.mjs";

const crawl = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".crawl");
const [id, ...nums] = process.argv.slice(2);
const raw = JSON.parse(readFileSync(path.join(crawl, "raw", `${id}.json`), "utf8"));
const { images } = parsePost({ subject: raw.subject, contentHtml: raw.contentHtml });
for (const n of nums) for (const f of await saveReadable(images[+n], path.join(crawl, "images", `${id}-${n}`))) console.log(f);
