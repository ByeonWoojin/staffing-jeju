// /jobs 필터 바가 쓰는 쿼리 키. 전체보기로 넘어갈 때 걸려 있는 필터를 그대로 유지하려고 쓴다.
export const FILTER_KEYS = ["region", "gender", "party", "paid", "accommodation", "meal", "urgent", "q", "arrivalStart", "arrivalEnd", "start"] as const;

type Params = Record<string, string | string[] | undefined>;

export const hasFilter = (searchParams: Params) => FILTER_KEYS.some((key) => Boolean(searchParams[key]));

export function buildFilterQuery(searchParams: Params) {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = Array.isArray(searchParams[key]) ? searchParams[key][0] : searchParams[key];
    if (value) params.set(key, value);
  }
  return params.size ? `?${params}` : "";
}
