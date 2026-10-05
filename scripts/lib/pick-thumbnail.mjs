// 이미지 분석 / 썸네일 자동 1차 판정 / 사람(=Claude)이 눈으로 고를 후보 시트 / 긴 이미지 분할(OCR용).
// 자동 판정은 객관 규칙만(크기·비율·포맷·글자판 여부). 구도·내용 판단은 docs/CRAWL_PIPELINE.md 의 규칙대로 시트를 보고 결정.
import sharp from "sharp";

const MAX_BYTES = 5 * 1024 * 1024; // 사이트 업로드 제한과 동일
const MIN_WIDTH = 600;
const RATIO = [0.7, 2.0]; // 가로/세로. 4:3 카드 중앙 크롭 기준 (세로 3:4 까지)

export async function analyze(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf).metadata();
  // 글자판(포스터/캡처/공고문) 휴리스틱: 흰 배경 비율이 높거나 색 종류가 매우 적음
  const { data } = await sharp(buf).resize(32, 32, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let white = 0;
  const colors = new Set();
  for (let i = 0; i < data.length; i += 3) {
    if (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235) white++;
    colors.add((data[i] >> 4) * 256 + (data[i + 1] >> 4) * 16 + (data[i + 2] >> 4));
  }
  return { url, w: meta.width, h: meta.height, format: meta.format, bytes: buf.length, graphic: white / 1024 > 0.5 || colors.size < 40 };
}

export function suitability(p) {
  if (!p) return "다운로드 실패";
  if (!["jpeg", "png", "webp"].includes(p.format)) return `포맷 ${p.format}`;
  if (p.bytes > MAX_BYTES) return "5MB 초과";
  if (p.w < MIN_WIDTH) return "해상도 낮음";
  const r = p.w / p.h;
  if (r < RATIO[0] || r > RATIO[1]) return "비율 부적합";
  if (p.graphic) return "글자판/그래픽 의심";
  return null; // 적합
}

// 자동 1차 선택: 객관 규칙 통과 중 가로형 우선, 앞 8장만
export function autoPick(analyses) {
  const ok = analyses.filter((p) => p && !suitability(p));
  return ok.find((p) => p.w >= p.h) ?? ok[0] ?? null;
}

// 번호 매긴 후보 시트(4열). 부적합은 사유를 빨간색으로 표기 → 눈으로 고를 때 참고
export async function contactSheet(analyses, outPath, start = 0) {
  const [W, H, COLS] = [320, 240, 4];
  const rows = Math.ceil(analyses.length / COLS);
  const tiles = await Promise.all(
    analyses.map(async (p, i) => {
      const why = p ? suitability(p) : "다운로드 실패";
      const img = p ? Buffer.from(await (await fetch(p.url)).arrayBuffer()) : null;
      const base = img ? await sharp(img).resize(W, H, { fit: "contain", background: "#444" }).jpeg().toBuffer() : await sharp({ create: { width: W, height: H, channels: 3, background: "#444" } }).jpeg().toBuffer();
      const label = Buffer.from(`<svg width="${W}" height="${H}"><rect width="64" height="36" fill="#000a"/><text x="8" y="27" font-size="26" font-family="Helvetica" fill="#fff">${start + i}</text>${why ? `<rect y="${H - 22}" width="${W}" height="22" fill="#c00c"/><text x="6" y="${H - 6}" font-size="14" font-family="Helvetica" fill="#fff">${p ? `${p.w}x${p.h} ` : ""}x</text>` : ""}</svg>`);
      return { input: await sharp(base).composite([{ input: label }]).jpeg().toBuffer(), left: (i % COLS) * W, top: Math.floor(i / COLS) * H };
    }),
  );
  await sharp({ create: { width: W * COLS, height: H * rows, channels: 3, background: "#222" } }).composite(tiles).jpeg({ quality: 80 }).toFile(outPath);
}

// 긴 이미지를 읽을 수 있게 가로 1000px, 세로 1.4배 단위로 분할 저장 → 저장된 파일 경로 목록
export async function saveReadable(url, outPrefix) {
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const img = sharp(buf).resize({ width: 1000, withoutEnlargement: true });
  const { width, height } = await sharp(await img.clone().toBuffer()).metadata();
  const step = Math.round(width * 1.4);
  const files = [];
  for (let top = 0, n = 0; top < height; top += step - 40, n++) {
    const file = `${outPrefix}-${n}.jpg`;
    await sharp(await img.clone().toBuffer()).extract({ left: 0, top, width, height: Math.min(step, height - top) }).jpeg({ quality: 85 }).toFile(file);
    files.push(file);
    if (top + step >= height) break;
  }
  return files;
}
