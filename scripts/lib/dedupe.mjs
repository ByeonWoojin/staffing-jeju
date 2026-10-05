// 같은 글 반복 게시(끌올 목적) 묶기. 최신 글 1개만 노출(canonical), 나머지는 중복.
// 기준: 같은 작성자 + (제목 또는 본문 유사도 ≥ 0.6)  /  작성자 달라도 본문 유사도 ≥ 0.85 (복붙)
// 유사도 = 한글/영문 글자만 남긴 2-gram Jaccard. 같은 작성자의 다른 지점 글(유사도 ~0.2)은 중복 아님.
const SAME_WRITER = 0.6;
const ANY_WRITER = 0.85;

const grams = (s) => {
  const t = s.replace(/[^\p{L}]/gu, "");
  const o = new Set();
  for (let i = 0; i < t.length - 1; i++) o.add(t.slice(i, i + 2));
  return o;
};
const jaccard = (a, b) => {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n || 1);
};

// items: [{ id, writer, title, body, at(ms) }] → Map(id → { group, canonical, reposts, firstId })
export function dedupe(items) {
  const g = items.map((it) => ({ ...it, t: grams(it.title), b: grams(it.body.slice(0, 1500)) }));
  const parent = g.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < g.length; i++) {
    for (let j = i + 1; j < g.length; j++) {
      const same = g[i].writer && g[i].writer === g[j].writer;
      const bs = jaccard(g[i].b, g[j].b);
      if ((same && (bs >= SAME_WRITER || jaccard(g[i].t, g[j].t) >= SAME_WRITER)) || bs >= ANY_WRITER) parent[find(i)] = find(j);
    }
  }
  const groups = new Map();
  g.forEach((it, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), it]));
  const out = new Map();
  for (const members of groups.values()) {
    const newest = members.reduce((a, b) => (b.at > a.at || (b.at === a.at && +b.id > +a.id) ? b : a));
    const first = members.reduce((a, b) => (b.at < a.at ? b : a));
    for (const m of members) out.set(m.id, { group: first.id, canonical: m.id === newest.id, reposts: members.length - 1, firstId: first.id, newestId: newest.id });
  }
  return out;
}
