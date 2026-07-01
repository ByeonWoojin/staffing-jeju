#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const DEMO_COUNT = 30;
const DEMO_PASSWORD = "DemoOwner!2026";
const AUTH_PAGE_SIZE = 1000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function loadEnvFile(fileName) {
  const envPath = path.join(projectRoot, fileName);
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다. .env.local을 확인해주세요.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const regions = [
  "제주시",
  "서귀포시",
  "애월",
  "한림",
  "조천",
  "구좌",
  "성산",
  "표선",
  "남원",
  "중문",
  "대정",
  "기타",
];

const regionSlugMap = {
  제주시: "jeju-city",
  서귀포시: "seogwipo",
  애월: "aewol",
  한림: "hallim",
  조천: "jocheon",
  구좌: "gujwa",
  성산: "seongsan",
  표선: "pyoseon",
  남원: "namwon",
  중문: "jungmun",
  대정: "daejeong",
  기타: "etc",
};

const guesthouseThemes = [
  "바다",
  "오름",
  "마당",
  "노을",
  "돌담",
  "숲길",
  "파도",
  "귤밭",
  "달빛",
  "하루",
];

const genderConditions = ["any", "male", "female"];
const stipendTypes = ["none", "provided", "negotiable", "custom"];
const workStartOffsets = [2, 4, 6, 8, 10, 13, 15, 18, 22, 26, 29, 30];
const minWorkPeriods = ["2주 이상", "1개월 이상", "2개월 이상", "3개월 이상"];
const workTimes = [
  "오전 10:00 ~ 오후 4:00",
  "오후 2:00 ~ 오후 8:00",
  "오전 9:00 ~ 오후 3:00",
  "오후 5:00 ~ 오후 11:00",
];

function pad(number) {
  return String(number).padStart(3, "0");
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function getStipendDescription(stipendType, index) {
  if (stipendType === "none") return null;
  if (stipendType === "provided") return `월 ${20 + (index % 4) * 10}만원 제공`;
  if (stipendType === "negotiable") return "경험과 근무 기간에 따라 협의";
  return "근무 조건에 따라 교통비 또는 인센티브 제공";
}

function createDemoRecord(index) {
  const number = index + 1;
  const padded = pad(number);
  const region = regions[index % regions.length];
  const regionSlug = regionSlugMap[region];
  const theme = guesthouseThemes[index % guesthouseThemes.length];
  const genderCondition = genderConditions[index % genderConditions.length];
  const stipendType = stipendTypes[index % stipendTypes.length];
  const providesAccommodation = index % 3 !== 1;
  const providesMeal = index % 2 === 0 || index % 5 === 0;
  const hasParty = index % 4 === 0 || index % 7 === 0;
  const isUrgent = index % 6 === 0;
  const recruitCount = (index % 4) + 1;
  const workDaysPerWeek = 4 + (index % 3);
  const offDaysPerWeek = 7 - workDaysPerWeek;
  const minWorkPeriod = minWorkPeriods[index % minWorkPeriods.length];
  const workStartDate = formatDateOnly(
    addDays(new Date(), workStartOffsets[index % workStartOffsets.length]),
  );
  const bumpedAt = new Date(Date.now() - index * 60 * 60 * 1000).toISOString();

  return {
    email: `demo-owner-${padded}@staffing.local`,
    profileName: `데모 사장님 ${padded}`,
    guesthouse: {
      name: `[데모] ${region} ${theme} 게스트하우스 ${String(number).padStart(
        2,
        "0",
      )}`,
      region,
      address_text: `제주특별자치도 ${region} 데모로 ${number}`,
      map_url: null,
      contact_method: `demo-owner-${padded}@staffing.local`,
      description: `${region}에서 스탭과 함께 조용하고 편안한 숙소를 운영하는 데모 게스트하우스입니다.`,
    },
    jobPost: {
      slug: `demo-${regionSlug}-staff-${padded}`,
      title: `${region} ${theme} 게스트하우스 스탭 ${recruitCount}명 모집`,
      recruit_count: recruitCount,
      gender_condition: genderCondition,
      age_condition: index % 2 === 0 ? "20세 이상" : null,
      work_start_date: workStartDate,
      min_work_period: minWorkPeriod,
      work_content:
        "체크인 안내, 객실 정리, 공용 공간 관리, 게스트 응대 업무를 함께 합니다.",
      work_time: workTimes[index % workTimes.length],
      work_days_per_week: workDaysPerWeek,
      off_days_per_week: offDaysPerWeek,
      stipend_type: stipendType,
      stipend_description: getStipendDescription(stipendType, index),
      provides_accommodation: providesAccommodation,
      provides_meal: providesMeal,
      has_party: hasParty,
      party_description: hasParty
        ? "주 1회 게스트와 함께하는 가벼운 커뮤니티 시간이 있습니다."
        : null,
      is_urgent: isUrgent,
      last_urgent_marked_at: isUrgent ? bumpedAt : null,
      preferred_conditions:
        index % 2 === 0
          ? "게스트 응대가 편하고 제주 생활에 관심 있는 분을 선호합니다."
          : "깔끔한 정리와 기본적인 소통을 중요하게 봅니다.",
      caution:
        "데모 공고입니다. 실제 지원 전 게스트하우스와 근무 조건을 확인해주세요.",
      extra_info:
        providesAccommodation || providesMeal
          ? "숙식 제공 조건은 근무 기간과 협의 내용에 따라 조정될 수 있습니다."
          : "개인 숙소와 식사는 별도 준비가 필요합니다.",
      description:
        "제주에 머물며 일상을 경험하고 싶은 스탭을 위한 데모 모집글입니다.",
      status: "open",
      recruitment_cycle: 1,
      bumped_at: bumpedAt,
      last_bumped_at: null,
      bump_count: 0,
    },
  };
}

async function findAuthUserByEmail(email) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    });

    if (error) {
      throw new Error(`auth user 목록 조회 실패: ${error.message}`);
    }

    const users = data.users ?? [];
    const found = users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );
    if (found) return found;
    if (users.length < AUTH_PAGE_SIZE) return null;
  }
}

async function getOrCreateDemoUser(record) {
  const existing = await findAuthUserByEmail(record.email);
  if (existing) return existing;

  const { data, error } = await supabase.auth.admin.createUser({
    email: record.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      name: record.profileName,
      demo: true,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      const user = await findAuthUserByEmail(record.email);
      if (user) return user;
    }
    throw new Error(`${record.email} auth user 생성 실패: ${error.message}`);
  }

  if (!data.user) {
    throw new Error(`${record.email} auth user 생성 결과가 없습니다.`);
  }

  return data.user;
}

async function upsertProfile(user, record) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      role: "owner",
      name: record.profileName,
      phone: null,
      email: record.email,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(`${record.email} profile upsert 실패: ${error.message}`);
  }
}

async function upsertGuesthouse(ownerId, record) {
  const { data, error } = await supabase
    .from("guesthouses")
    .upsert(
      {
        owner_id: ownerId,
        ...record.guesthouse,
      },
      { onConflict: "owner_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(`${record.guesthouse.name} guesthouse upsert 실패: ${error.message}`);
  }

  return data;
}

async function upsertJobPost(ownerId, guesthouse, record) {
  const payload = {
    guesthouse_id: guesthouse.id,
    owner_id: ownerId,
    ...record.jobPost,
  };

  const { data: existingBySlug, error: slugError } = await supabase
    .from("job_posts")
    .select("id")
    .eq("slug", payload.slug)
    .maybeSingle();

  if (slugError) {
    throw new Error(`${payload.slug} job_post 조회 실패: ${slugError.message}`);
  }

  const { data: existingByGuesthouse, error: guesthouseJobError } = await supabase
    .from("job_posts")
    .select("id")
    .eq("guesthouse_id", guesthouse.id)
    .maybeSingle();

  if (guesthouseJobError) {
    throw new Error(
      `${payload.slug} guesthouse job_post 조회 실패: ${guesthouseJobError.message}`,
    );
  }

  const existing = existingBySlug ?? existingByGuesthouse;

  if (existing) {
    const { data, error } = await supabase
      .from("job_posts")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`${payload.slug} job_post update 실패: ${error.message}`);
    }

    return data;
  }

  const { data, error } = await supabase
    .from("job_posts")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`${payload.slug} job_post insert 실패: ${error.message}`);
  }

  return data;
}

async function main() {
  const records = Array.from({ length: DEMO_COUNT }, (_, index) =>
    createDemoRecord(index),
  );

  console.log(`데모 모집글 ${DEMO_COUNT}개 seed를 시작합니다.`);

  for (const [index, record] of records.entries()) {
    const user = await getOrCreateDemoUser(record);
    await upsertProfile(user, record);
    const guesthouse = await upsertGuesthouse(user.id, record);
    const jobPost = await upsertJobPost(user.id, guesthouse, record);

    console.log(
      `[${String(index + 1).padStart(2, "0")}/${DEMO_COUNT}] ${record.email} -> ${jobPost.slug}`,
    );
  }

  console.log("완료: /jobs에서 demo- slug의 open 모집글을 확인하세요.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
