// 네이버 카페 스탭모집 글 → 스탭핑 job_posts 필드 (규칙 기반).
// ponytail: 정규식 휴리스틱. 정확도 한계가 오면 본문을 LLM 구조화 추출로 교체.

export const ASAP_DATE = "9999-12-31";

const ENTITIES = { nbsp: " ", quot: '"', "#x27": "'", "#x3D": "=", lt: "<", gt: ">", amp: "&" };

export function htmlToText(html) {
  return html
    .replace(/<img[^>]*>/g, "")
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(nbsp|quot|#x27|#x3D|lt|gt|amp);/g, (_, k) => ENTITIES[k])
    .replace(/[​ ]/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

// 링크 미리보기 카드(네이버 플레이스/인스타/유튜브)의 제목·설명 줄은 모집 내용이 아니라 노이즈.
// 카드 모양: [제목 줄] / [방문자리뷰·팔로워 설명 줄] / [도메인만 있는 줄]. 글 속에 문장과 함께 쓴 링크 줄은 지우지 않는다.
// (예전엔 URL 줄의 '앞 줄'까지 지워서 "지원 연락처 : 010-…" 같은 실제 내용이 사라졌다)
export function stripLinkPreviews(text) {
  const lines = text.split("\n");
  const drop = new Set();
  lines.forEach((l, i) => {
    if (/방문자리뷰|블로그리뷰|팔로워\s*[\d,.K]+/i.test(l)) {
      drop.add(i);
      if (i > 0 && lines[i - 1].length < 120) drop.add(i - 1); // 카드 제목 줄
    } else if (/^(?:https?:\/\/)?(?:www\.)?(?:naver\.me|instagram\.com|youtu\.?be(?:\.com)?)\S*$/i.test(l.trim())) {
      drop.add(i); // 도메인만 있는 카드 푸터
    }
  });
  return lines.filter((_, i) => !drop.has(i)).join("\n");
}

// se-image-resource 만 본문 사진. 링크미리보기/지도/스티커/gif 는 제외.
export function extractImages(html) {
  const urls = [];
  for (const tag of html.match(/<img[^>]+>/g) ?? []) {
    if (!/class="[^"]*se-image-resource/.test(tag)) continue;
    const src = tag.match(/src="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
    if (src && !/\.gif(\?|$)/i.test(src)) urls.push(src);
  }
  return urls;
}

const cleanTitle = (s) =>
  s
    .replace(/[\p{Extended_Pictographic}️‍]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const REGION_KEYWORDS = {
  조천: ["함덕", "조천", "신촌", "북촌"],
  구좌: ["구좌", "세화", "월정", "김녕", "평대", "하도", "종달", "행원"],
  성산: ["성산", "섭지", "오조", "수산"],
  표선: ["표선", "가시리"],
  남원: ["남원", "위미", "신흥"],
  서귀포시: ["서귀포", "정방", "이중섭"],
  중문: ["중문", "색달", "대포"],
  대정: ["대정", "모슬포", "안덕", "화순", "하모", "사계", "송악"],
  애월: ["애월", "곽지", "한담", "하귀", "고내"],
  한림: ["한림", "협재", "금능", "한경", "판포", "월령"],
  제주시: ["제주시", "제주공항", "공항", "연동", "노형", "이도", "용담", "삼양", "탑동", "동문", "도두", "신제주"],
};

// 제목: 가장 먼저 나온 지명 ("애월 호스타 … 신제주와 15분거리" 에서 거리 참고용 지명 배제)
// 본문 앞부분 → 본문 전체: 최다 빈도 지명
function detectRegion(title, body) {
  const pos = (scope) =>
    Object.entries(REGION_KEYWORDS)
      .flatMap(([region, words]) => words.map((w) => ({ region, i: scope.indexOf(w) })))
      .filter((x) => x.i >= 0)
      .sort((a, b) => a.i - b.i)[0]?.region;
  const t = pos(title);
  if (t) return t;
  for (const scope of [body.slice(0, 1500), body]) {
    let best = null;
    for (const [region, words] of Object.entries(REGION_KEYWORDS)) {
      const n = words.reduce((c, w) => c + scope.split(w).length - 1, 0);
      if (n && (!best || n > best.n)) best = { region, n };
    }
    if (best) return best.region;
  }
  return null;
}

function detectGender(...scopes) {
  for (const s of scopes) {
    if (/남\s*[,/·&]?\s*여|남녀|성별\s*무관/.test(s)) return "any";
    const f = /여\s*(?:자|성|스[탭텝])/.test(s);
    const m = /남\s*(?:자|성|스[탭텝])/.test(s);
    if (f && m) return "any";
    if (f) return "female";
    if (m) return "male";
  }
  return null;
}

function detectAge(...scopes) {
  for (const s of scopes) {
    let m;
    if ((m = s.match(/(\d{2})\s*세?\s*[~\-]\s*(\d{2})\s*세/))) return `${m[1]}세~${m[2]}세`;
    if ((m = s.match(/(\d{2})\s*세\s*(이상|이하)/))) return `${m[1]}세 ${m[2]}`;
    if ((m = s.match(/(\d0)대\s*(?:초반|중반|후반)?\s*[~\-]\s*(\d0)대/))) return `${m[1]}대~${m[2]}대`;
    if ((m = s.match(/\b(20)(30)\b/))) return "20대~30대";
    if ((m = s.match(/(\d0)대\s*(?:초반|중반|후반)?\s*(?:스[탭텝]|만|모집|분)/))) return `${m[1]}대`;
  }
  return null;
}

function detectRecruitCount(title, body, gender) {
  const s = `${title}\n${body.slice(0, 2500)}`;
  const line = s.split("\n").find((l) => /모집\s*인원|인원\s*[:：]/.test(l));
  let m;
  if (line) {
    const gm = [...line.matchAll(/[남여녀]\s*(\d)/g)];
    if (gm.length) return gm.reduce((c, x) => c + +x[1], 0); // "남2 여2"
    const nums = [...line.matchAll(/(\d{1,2})\s*(?:명|인)(?!\s*실)/g)];
    if (nums.length) return +nums.at(-1)[1];
  }
  if ((m = s.match(/(?:남\s*[,/·]?\s*[여녀]|한)\s*명\s*씩|(\d{1,2})\s*명\s*씩/))) return (+m[1] || 1) * (gender === "any" ? 2 : 1);
  if ((m = s.match(/(\d{1,2})\s*명\s*(?:모집|모십|구[합해])/))) return +m[1];
  if ((m = title.match(/(?<!정원\s*|총\s*)(\d{1,2})\s*명(?!\s*의)/))) return +m[1];
  if ((m = s.match(/\((\d)\s*인[,\s]/))) return +m[1];
  return null;
}

function resolveDate(month, day, today) {
  let y = today.getFullYear();
  const mk = (yy) => new Date(Date.UTC(yy, month - 1, day));
  let d = mk(y);
  if (d.getUTCMonth() !== month - 1) return null; // 2/31 등
  if (d < new Date(today.getTime() - 60 * 864e5)) d = mk(++y); // 두 달 이상 지난 날짜는 내년으로
  return d.toISOString().slice(0, 10);
}

function detectStartDate(title, body, today) {
  const lead = `${title}\n${body.slice(0, 2500)}`;
  if (/바로\s*입도|빠른\s*입도|즉시\s*입도|바로\s*출근|asap|급구/i.test(lead)) return { value: ASAP_DATE, asap: true };
  const re = /(?:20\d{2}\s*\.\s*)?(\d{1,2})\s*(?:월|\.)\s*(\d{1,2})\s*(?:일|\.|~|\/|\s*or)/g; // 10월 8일 / 2026. 10. 10. / 10월 1~3
  let m;
  const found = [];
  while ((m = re.exec(lead))) {
    const near = lead.slice(Math.max(0, m.index - 20), m.index + 30);
    if (/입도|시작|출근|부터|이후|전후/.test(near)) found.push(resolveDate(+m[1], +m[2], today));
  }
  const dates = found.filter(Boolean).sort();
  if (!dates.length) return null;
  const iso = today.toISOString().slice(0, 10);
  // 과거 날짜(이미 입도 가능)면 ASAP 로 처리 — 기존 자동 전환 정책과 동일
  return dates[0] < iso ? { value: ASAP_DATE, asap: true } : { value: dates[0], asap: false };
}

function detectMinPeriod(title, body) {
  const s = `${title}\n${body.slice(0, 3000)}`;
  let m;
  if ((m = s.match(/(\d{1,2})\s*(개월|주)\s*(?:이상|부터)/))) return `${m[1]}${m[2]} 이상`;
  if ((m = s.match(/(?:최소|최단)\s*(?:근무\s*기간)?\s*[:：]?\s*(\d{1,2})\s*(개월|주|달)/))) return `${m[1]}${m[2] === "달" ? "개월" : m[2]} 이상`;
  if (/한\s*달\s*(?:이상|살기|살이)|1\s*개월/.test(s)) return "1개월 이상";
  return null;
}

const NUM_WORDS = { 하루: "1일", 이틀: "2일", 사흘: "3일", 이일: "2일", 삼일: "3일", 사일: "4일", 오일: "5일" };

function detectWorkDays(title, body) {
  const s = `${title}\n${body.slice(0, 3000)}`.replace(/하루|이틀|사흘|이일|삼일|사일|오일/g, (w) => NUM_WORDS[w]);
  let m;
  if ((m = s.match(/(\d)\s*(?:일\s*)?(?:근무|근|일하고|일)\s*[,/·\s]*(\d)\s*(?:일\s*)?(?:휴무|휴|쉬)/))) {
    const [w, o] = [+m[1], +m[2]];
    if (w >= 1 && w <= 7 && o <= 6) return { work: w, off: o };
  }
  if ((m = s.match(/주\s*(\d)\s*일\s*(?:근무|출근)/))) return { work: +m[1], off: 7 - +m[1] };
  return null;
}

function detectWorkTime(body) {
  const pad = (h) => h.padStart(2, "0");
  const hours = (a, b) => ((+b - +a + 24) % 24) || 24;
  const lines = body.split("\n").filter((l) => /근무|출근|시간/.test(l));
  for (const l of [...lines.filter((x) => /근무\s*시간/.test(x)), ...lines]) {
    let m = l.match(/(\d{1,2}):(\d{2})\s*[-~–]\s*(?:익일\s*)?(\d{1,2}):(\d{2})/);
    if (m && hours(m[1], m[3]) >= 2) return `${pad(m[1])}:${m[2]} ~ ${pad(m[3])}:${m[4]}`;
    m = l.match(/(\d{1,2})\s*시\s*(?:부터)?\s*[~\-–]\s*(\d{1,2})\s*시/); // 16시 ~ 23시
    if (m && hours(m[1], m[2]) >= 2) return `${pad(m[1])}:00 ~ ${pad(m[2])}:00`;
  }
  return null;
}

// "근무 시간 : 6시간 [저녁시간대]" 같은 라벨형
const detectWorkTimeLabel = (body) => body.match(/근무\s*시간\s*[:：]\s*([^\n]{2,40})/)?.[1]?.trim() ?? null;

// 하루 일과표 블록: 시각으로 시작하는 줄이 2줄 이상 이어지는 구간 ("15:00~16:00 출근 / 17:00 체크인 안내")
// → work_time/work_content 요약. 단일 시간대와 달리 요약이므로 derived 로 표시.
function detectSchedule(body) {
  const lines = body.split("\n");
  const isTime = (l) => /^[^\d가-힣]{0,4}(?:오전|오후)?\s*\d{1,2}\s*(?::\d{2}|시)/.test(l);
  let best = [];
  for (let i = 0; i < lines.length; ) {
    if (!isTime(lines[i])) { i++; continue; }
    let j = i;
    while (j < lines.length && isTime(lines[j])) j++;
    if (j - i > best.length) best = lines.slice(i, j);
    i = j;
  }
  if (best.length < 2) return null;
  const rows = best.slice(0, 6).map((l) => l.replace(/\s+/g, " ").slice(0, 40));
  return { time: rows.slice(0, 4).join(" / ").slice(0, 120), content: rows.join("\n") };
}

// 헤더 줄 매칭 후 그 줄 + 다음 n줄
function section(body, headerRe, n = 6, max = 500) {
  const lines = body.split("\n");
  const i = lines.findIndex((l) => l.length < 60 && headerRe.test(l));
  return i < 0 ? null : lines.slice(i, i + 1 + n).join("\n").slice(0, max);
}

// 줄 단위 판정. 포틀럭(음식 나눔 모임)은 술 파티와 다르므로 별도 종류로 분리.
//  party: 술/클럽식 파티 · potluck: 잔잔한 음식 나눔 모임 · none: 명시적으로 없음 · null: 언급 없음/불명
// 제목에 '파티' 가 부정 없이 있으면 광고성 강조이므로 party.
const PARTY_NEG = /파티\s*(?:가|를|는|도|나)?\s*(?:없|않|아닙|아니|X|x|❌|금지|안\s*해|개최하지|진행하지|하지\s*않)|파티[^\n]{0,20}(?:보다는|보단)|노\s*파티|파티\s*리스|파티하는\s*게[^\s]*\s*아/;
const PARTY_POS = /(?:디너|저녁|대형|소규모|게하)\s*(?:게하\s*)?파티|파티\s*(?:를|도|는)?\s*(?:진행|운영|열|합니다|해요|해서|참여|참석|무료|준비|마감|셋팅|정리|같이|함께|때)|파티\s*(?:가|도)?\s*있/;

// 포틀럭 글에서는 술 파티를 뜻하는 강한 단서가 있을 때만 party. (근처/제휴업체 설명 줄은 우리 숙소 얘기가 아니므로 제외)
const PARTY_STRONG = /술\s*파티|맥주|칵테일|클럽|파티\s*게하|게하\s*파티|대형\s*파티|DJ|음주|파티비/i;

function detectParty(title, body) {
  if (PARTY_NEG.test(title)) return { kind: "none", line: title };
  if (/파티/.test(title) && !/포틀럭/.test(title)) return { kind: "party", line: title };
  const lines = body.split("\n");
  const partyLines = lines.filter((l) => /파티/.test(l) && !/포틀럭|근처|주변|제휴|인근/.test(l));
  const neg = partyLines.find((l) => PARTY_NEG.test(l)); // 명시적 부정이 한 줄이라도 있으면 우선 (업무표의 '파티 준비' 보다 신뢰)
  const pos = partyLines.find((l) => PARTY_POS.test(l));
  const strong = partyLines.find((l) => PARTY_STRONG.test(l) && !PARTY_NEG.test(l));
  const potluck = lines.find((l) => /포틀럭/.test(l));
  if (strong && !neg) return { kind: "party", line: strong.slice(0, 150) };
  if (potluck) return { kind: "potluck", line: potluck.slice(0, 150) };
  if (neg) return { kind: "none", line: neg.slice(0, 150) };
  if (pos) return { kind: "party", line: pos.slice(0, 150) };
  return { kind: null, line: null };
}

// ── 연락처 / 지원 방법 ──
// 전화번호·카톡ID 는 넘기지 않는다(제3자 개인정보). 줄 전체를 제거.
const PHONE = /(?<!\d)0\d{1,2}[\s.-]{0,3}\d{3,4}[\s.-]{0,3}\d{4}(?!\d)/; // "010 - 1234 - 5678" 처럼 구분자 앞뒤 공백도 허용
const KAKAO_ID = /(?:카톡|카카오톡?)\s*(?:아이디|ID|id)/;
export const scrubContacts = (text) =>
  text.split("\n").filter((l) => !PHONE.test(l) && !KAKAO_ID.test(l)).join("\n");

// 지원 방법. 지원 안내(hint/phone/email/kakaoId)에는 글쓴이가 지원용으로 공개한 연락처를 그대로 둔다.
// 그 외 필드(본문 요약 등)에서는 scrubContacts 로 계속 제거한다.
// 연락처는 '지원 방법' 헤더 아래가 아니라 글 곳곳(맨 끝, 주소 줄 등)에 있어서 글 전체에서 후보 줄에 점수를 매겨 고른다.
const CONTACT_CTX = /지원|문의|연락|접수|문자|전화|카톡|카카오|번호|📞|☎|📱/;
const fmtPhone = (raw) => {
  const d = raw.replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : raw;
};

// 카페 카드(링크 미리보기)는 본문 텍스트에 URL 이 안 남고 href/linkdata 에만 있다 → 원본 HTML 에서 지원 관련 링크를 따로 모은다.
export const extractLinks = (html) => [...new Set(html.match(/https?:\/\/(?:pf\.kakao\.com|open\.kakao\.com|forms\.gle|docs\.google\.com\/forms|form\.naver\.com)\/[^\s"'<>&\\]+/g) ?? [])];

// "문자, SNS, 카톡등으로 지원 받지 않습니다" / "카톡,전화X" 같은 거절 표현
const refused = (text, word) => new RegExp(`${word}[^\\n]{0,20}(?:받지\\s*않|불가)|${word}\\s*X|카톡[,\\s]*전화\\s*X`).test(text) && !(word === "문자" && !/문자[^\n]{0,20}(?:받지\s*않|불가)|문자\s*X/.test(text));

export function detectApply(text, links = []) {
  const lines = text.split("\n");
  const clean = stripLinkPreviews(text).split("\n"); // 링크 미리보기 카드 줄은 제외
  // 오픈채팅/지원폼 링크가 있으면 그것이 주 경로. 문의용 번호 등 나머지 연락처는 보조로 계속 담는다.
  let link = null;
  for (const l of [...lines, ...links]) {
    const u = l.match(/https?:\/\/open\.kakao\.com\/\S+/)?.[0];
    if (u) { link = { channel: "openchat", url: u }; break; }
  }
  for (const l of link ? [] : [...lines, ...links]) {
    const u = l.match(/https?:\/\/(?:forms\.gle|docs\.google\.com\/forms|form\.naver\.com)\/\S+/)?.[0] ?? (/지원|신청|접수/.test(l) ? l.match(/https?:\/\/naver\.me\/\S+/)?.[0] : null);
    if (u) { link = { channel: "form", url: u }; break; }
  }

  // 지원 안내 헤더 → "지원 시/지원하실 분" 류 → 접수/문의
  const find = (re) => clean.findIndex((l) => l.length < 40 && re.test(l));
  const header = [find(/지원\s*(?:방법|양식|하는\s*법)/), find(/지원\s*(?:시|하실)/), find(/접수|문의/), find(/메일\s*지원/)].find((x) => x >= 0) ?? -1;
  const nearHeader = (i) => header >= 0 && i >= header && i <= header + 12;
  // 연락처 줄 점수: 지원·연락 문맥 +3, 헤더 근처 +2, 같은 점수면 글 아래쪽(맨 끝 연락처) 우선
  const best = (re, ctx = CONTACT_CTX) =>
    clean
      .map((l, i) => ({ l, i, m: l.match(re)?.[0], score: (ctx.test(l) ? 3 : 0) + (nearHeader(i) ? 2 : 0) + i / clean.length }))
      .filter((x) => x.m)
      .sort((a, b) => b.score - a.score)[0];
  const ph = best(PHONE);
  const em = best(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/, /지원|접수|보내|메일|이력서|서류/);
  const kk = best(/(?<=(?:카톡|카카오톡?)\s*(?:아이디|ID|id)?\s*[:：]?\s*)[A-Za-z][\w.@-]{3,}/); // 카톡 ID 가 이메일 형태인 경우도 있음
  const kakaoMention = clean.findIndex((l) => /카톡|카카오/.test(l) && /지원|문의|연락|보내/.test(l));
  const igLine = clean
    .map((l, i) => ({ i, h: /지원|DM|디엠|보내|문의|연락/i.test(l) && /인스타|insta|DM|디엠|instagram\.com/i.test(l) ? l.match(/instagram\.com\/([\w.]{2,30})/)?.[1] ?? l.match(/@([\w.]{2,30})/)?.[1] : null }))
    .find((x) => x.h && !/^(p|reel|explore)$/.test(x.h));

  const all = clean.join("\n");
  const [noSms, noKakao, noSns] = [refused(all, "문자"), refused(all, "카톡"), /(?:SNS|인스타|DM)[^\n]{0,10}(?:받지\s*않|불가)/.test(all)];
  const near = ph ? clean.slice(Math.max(0, ph.i - 2), ph.i + 3).join("\n") : "";
  const phoneIsKakao = ph && ((/카톡|카카오/.test(near) && !/문자/.test(near)) || /번호[^\n]{0,8}카톡/.test(all));
  // 후보 점수 → 최고점 채널. 동점이면 링크로 바로 연결되는 수단(메일·인스타) 우선
  const cands = [
    em && { channel: "email", score: em.score + (/접수처|메일\s*지원|메일로|지원서[^\n]*메일/.test(em.l) || clean.some((l) => /\[?메일\s*지원\]?/.test(l)) ? 3 : 0) + 0.2 },
    igLine && !noSns && { channel: "instagram", score: 3 + (nearHeader(igLine.i) ? 2 : 0) + 0.1 },
    (kk || kakaoMention >= 0 || phoneIsKakao) && !noKakao && { channel: "kakao", score: (kk ? kk.score : kakaoMention >= 0 ? 3 + (nearHeader(kakaoMention) ? 2 : 0) : ph.score) + (phoneIsKakao ? 0.15 : 0) },
    ph && !noSms && !phoneIsKakao && { channel: "sms", score: ph.score },
  ].filter(Boolean).sort((a, b) => b.score - a.score);
  const channel = link?.channel ?? cands[0]?.channel ?? (/문자|전화/.test(all) && ph ? "sms" : "original");

  // 번호: 헤더 구간 안의 번호는 모두(한 글에 두 지점 번호가 있는 경우), 없으면 채택된 1개
  const inSection = clean.map((l, i) => (nearHeader(i) ? l.match(PHONE)?.[0] : null)).filter(Boolean).map(fmtPhone);
  const phones = [...new Set(inSection.length ? inSection : ph ? [fmtPhone(ph.m)] : [])];
  const idx = new Set([ph?.i, em?.i, kk?.i, !ph && !kk && kakaoMention >= 0 ? kakaoMention : null, igLine?.i].filter((x) => x != null));
  if (header >= 0) for (let k = header; k < Math.min(clean.length, header + 8); k++) idx.add(k);
  const hint = [...idx].sort((a, b) => a - b).map((k) => clean[k]).reduce((acc, l) => (acc.length + l.length > 450 ? acc : acc ? `${acc}\n${l}` : l), "") || null;
  // 접수 메일: "접수처:" 와 주소가 다른 줄에 있기도 해서 앞 줄까지 문맥으로 본다. 서로 다른 주소가 여럿이면 모두 보여준다.
  const emails = [...new Set(clean.flatMap((l, i) => (/접수|지원|보내|메일/.test(`${clean[i - 1] ?? ""} ${l}`) ? l.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [] : [])))];
  const pf = links.find((u) => /pf\.kakao\.com/.test(u));
  return {
    channel,
    url: link ? link.url : channel === "instagram" ? `https://www.instagram.com/${igLine.h}/` : channel === "kakao" && pf ? pf : null,
    phone: phones.length === 1 ? phones[0] : ph ? fmtPhone(ph.m) : null,
    phones,
    email: emails.length === 1 ? emails[0] : em?.m ?? null,
    emails: emails.length ? emails : em ? [em.m] : [],
    kakaoId: kk?.m ?? null,
    hint,
  };
}

const lineWith = (body, re, max = 200) => body.split("\n").find((l) => re.test(l))?.slice(0, max) ?? null;

export function parsePost({ subject, contentHtml, nick = "", extraText = "" }, today = new Date()) {
  const title = cleanTitle(subject);
  const rawText = [htmlToText(contentHtml), extraText].filter(Boolean).join("\n");
  const apply = detectApply(rawText, extractLinks(contentHtml));
  const body = [scrubContacts(stripLinkPreviews(rawText))].filter(Boolean).join("\n");
  const images = extractImages(contentHtml);
  const lead = body.slice(0, 1500);

  const gender = detectGender(title, lead);
  const days = detectWorkDays(title, body);
  const start = detectStartDate(title, body, today);
  const hay = `${title}\n${body}`;

  // 급여
  let stipend = null;
  if (/무급/.test(title)) stipend = "none";
  else if (/유급/.test(title)) stipend = "provided";
  else if (/유급|월\s*\d+\s*만|활동비|지원비\s*\d|급\s*여\s*[:：]?\s*\d/.test(body)) stipend = "provided";
  else if (/무급|급\s*여\s*[:：]?\s*(?:없|X|x)/.test(body)) stipend = "none";
  else if (/급여\s*협의|협의\s*후/.test(body)) stipend = "negotiable";

  const party = detectParty(title, body);
  const schedule = detectSchedule(body);

  const noAccom = /숙소\s*(?:미제공|불포함|별도)/.test(hay);
  const noMeal = /식사\s*(?:미제공|불포함|별도)/.test(hay);

  const fields = {
    title,
    recruit_count: detectRecruitCount(title, body, gender),
    gender_condition: gender,
    age_condition: detectAge(title, body.slice(0, 3000)),
    work_start_date: start?.value ?? null,
    min_work_period: detectMinPeriod(title, body),
    work_content: section(body, /하실\s*일|업무\s*(?:내용|소개|안내)?|근무\s*(?:형태|내용)|하는\s*일/) ?? schedule?.content ?? null,
    work_time: detectWorkTime(body) ?? detectWorkTimeLabel(body) ?? schedule?.time ?? null,
    work_days_per_week: days?.work ?? null,
    off_days_per_week: days?.off ?? null,
    stipend_type: stipend,
    stipend_description: stipend === "provided" || stipend === "negotiable" ? lineWith(body, /유급|월\s*\d+\s*만|활동비|지원비|급여/) : null,
    provides_accommodation: noAccom ? false : /숙소\s*제공|숙식|스[탭텝]\s*(?:전용\s*)?(?:방|숙소)|숙박\s*제공|무료\s*숙박|독채\s*숙소|숙소\s*무료/.test(hay) ? true : null,
    provides_meal: noMeal ? false : /식사\s*(?:제공|지원|무료|해결)|숙식|조식|점심\s*제공|저녁\s*제공|스[탭텝]\s*밀|기본\s*식품/.test(hay) ? true : null,
    has_party: party.kind === null ? null : party.kind === "party", // 포틀럭은 술 파티가 아니므로 false
    party_description: party.kind === "party" || party.kind === "potluck" ? party.line : null,
    is_urgent: /급구|긴급|급하게|바로\s*입도|즉시\s*입도|asap/i.test(`${title}\n${body.slice(0, 300)}`),
    preferred_conditions: section(body, /우대|이런\s*분|선호/, 4, 300),
    caution: section(body, /주의|유의|필독/, 4, 300),
    description: body.split("\n").slice(0, 12).join("\n").slice(0, 800),
  };

  const NOT_NAME = /^(게스트|제주|제주도|감성|소규모|한달|오션뷰|구옥|전스탭|신규|새로)$/;
  const guess = [...title.matchAll(/([가-힣A-Za-z0-9]{2,12})(?:게스트하우스|게하|하우스|하숙집|민박|호스텔)/g)].find((m) => !NOT_NAME.test(m[1]))?.[0];
  const addr = body.split("\n").map((l) => l.match(/(?:주소|위치)\s*[:：]\s*(.+)/)?.[1] ?? l.match(/(제주(?:특별자치도|시)?\s*[가-힣]+(?:시|읍|면)?\s*[가-힣0-9]+(?:로|길)\s*\d+[-\d]*)/)?.[1]).find(Boolean);
  const guesthouse = {
    address_text: addr?.replace(/^[(\s]+|[)\s]+$/g, "").slice(0, 100) ?? null, // DB 필수(address_text). 없으면 사람 검수
    map_url: rawText.match(/https?:\/\/(?:naver\.me|map\.naver\.com|naver\.com\/maps)\/\S+/)?.[0] ?? null,
    name: guess ?? nick ?? null, // 닉네임이 게하명인 경우가 많음. 사람 검수 대상
    region: detectRegion(title, body),
  };

  // 일과표 요약에서 가져온 값(정확한 근무시간 범위가 아님) → 사람 검수 때 구분
  const derived = [];
  if (schedule && fields.work_time === schedule.time) derived.push("work_time");
  if (schedule && fields.work_content === schedule.content) derived.push("work_content");

  // 글에 안 적힌 값은 보수적 기본값으로 가정(assumed). 사람이 검수할 때 구분하려고 따로 기록.
  const assumed = [];
  const assume = (k, v) => {
    if (fields[k] == null) {
      fields[k] = v;
      assumed.push(k);
    }
  };
  assume("recruit_count", 1);
  assume("gender_condition", "any");
  assume("work_start_date", ASAP_DATE);
  assume("min_work_period", "협의");
  assume("stipend_type", "none");

  // 가정할 수 없는 필수 필드 → 사람 검수 or OCR 대상
  const missing = ["work_content", "work_time", "work_days_per_week", "off_days_per_week"].filter((k) => fields[k] == null);
  if (!guesthouse.region) missing.push("region");

  return { fields, guesthouse, apply, party_kind: party.kind, derived, images, thumbnail: images[0] ?? null, missing, assumed, tags: buildTags(fields, guesthouse, fields.work_start_date === ASAP_DATE, party.kind) };
}

// 사이트 필터(region/gender/party/paid/accommodation/meal/urgent/date)와 1:1 대응되는 태그 + 보조 태그
export function buildTags(f, g, asap, partyKind) {
  const t = [];
  if (g.region) t.push(g.region);
  if (f.gender_condition) t.push({ any: "성별무관", male: "남성", female: "여성" }[f.gender_condition]);
  if (f.provides_accommodation) t.push("숙소제공");
  if (f.provides_meal) t.push("식사제공");
  if (f.stipend_type === "provided") t.push("급여있음");
  if (f.stipend_type === "none") t.push("무급");
  if (partyKind === "party") t.push("파티있음");
  if (partyKind === "potluck") t.push("포틀럭");
  if (partyKind === "none") t.push("파티없음");
  if (f.is_urgent) t.push("급구");
  if (asap) t.push("바로입도");
  if (f.work_days_per_week && f.off_days_per_week != null) t.push(`${f.work_days_per_week}일근무${f.off_days_per_week}일휴무`);
  if (f.min_work_period) t.push(f.min_work_period.replace(/\s/g, ""));
  return t;
}
