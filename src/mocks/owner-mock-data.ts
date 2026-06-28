import type {
  Application,
  Guesthouse,
  JobPost,
  Profile,
} from "@/types/database";

//TODO: Supabase Auth에서 현재 로그인된 사용자 조회
//TODO: profiles.role이 'owner'가 아니면 접근 차단
//TODO: 로그인하지 않은 사용자는 /login으로 redirect

export const currentOwner: Profile = {
  id: "owner_001",
  role: "owner",
  name: "김사장",
  phone: "010-1234-5678",
  email: "owner@example.com",
  created_at: "2026-06-20T09:00:00+09:00",
  updated_at: "2026-06-20T09:00:00+09:00",
};

export const mockGuesthouses: Guesthouse[] = [
  {
    id: "guesthouse_001",
    owner_id: "owner_001",
    name: "제주 바람 게스트하우스",
    region: "제주시 애월",
    address_text: "제주특별자치도 제주시 애월읍 곽지해안로 20",
    map_url: "https://map.naver.com/p/example",
    contact_method: "카카오톡 @jeju-baram / 010-1234-5678",
    description:
      "애월 바다와 가까운 조용한 게스트하우스입니다. 함께 머무는 스탭과 게스트가 편하게 지낼 수 있는 분위기를 지향합니다.",
    created_at: "2026-06-01T10:00:00+09:00",
    updated_at: "2026-06-15T14:30:00+09:00",
  },
];

/** MVP: 게스트하우스당 운영 중인 스탭 모집글 1개 */
export const mockJobPosts: JobPost[] = [
  {
    id: "job_post_001",
    guesthouse_id: "guesthouse_001",
    owner_id: "owner_001",
    slug: "jeju-baram-staff-2026-summer",
    title: "여름 시즌 프론트·하우스키핑 스탭 모집",
    recruit_count: 2,
    gender_condition: "any",
    age_condition: "20대~30대",
    work_start_date: "2026-07-01",
    min_work_period: "1개월 이상",
    work_content:
      "프론트 데스크 운영, 체크인/체크아웃 안내, 공용 공간 청소, 세탁물 관리",
    work_time: "09:00 ~ 18:00 (점심 1시간)",
    work_days_per_week: 5,
    off_days_per_week: 2,
    stipend_type: "provided",
    stipend_description: "월 80만원 + 식사 제공",
    provides_accommodation: true,
    provides_meal: true,
    is_urgent: true,
    last_urgent_marked_at: "2026-06-18T10:00:00+09:00",
    preferred_conditions: "게스트하우스 근무 경험자 우대",
    caution: "주말 근무 포함, 성수기에는 교대 근무 가능",
    extra_info: "입도 후 3일간 오리엔테이션 진행",
    description:
      "제주 애월 바다가 보이는 게스트하우스에서 함께할 스탭을 모집합니다.",
    status: "open",
    recruitment_cycle: 1,
    bumped_at: "2026-06-18T08:00:00+09:00",
    last_bumped_at: "2026-06-18T10:00:00+09:00",
    bump_count: 2,
    created_at: "2026-06-10T09:00:00+09:00",
    updated_at: "2026-06-19T10:00:00+09:00",
  },
];

export const mockApplications: Application[] = [
  {
    id: "application_001",
    job_post_id: "job_post_001",
    staff_id: "staff_001",
    recruitment_cycle: 1,
    name: "이지은",
    age: 26,
    gender: "female",
    phone: "010-2345-6789",
    representative_photo_path: "applications/staff-001/profile.jpg",
    available_start_date: "2026-07-05",
    available_work_period: "2개월",
    experience_status: "experienced",
    introduction:
      "제주 게스트하우스에서 3개월 근무 경험이 있습니다. 프론트와 하우스키핑 모두 가능합니다.",
    status: "submitted",
    created_at: "2026-06-19T14:20:00+09:00",
    updated_at: "2026-06-19T14:20:00+09:00",
  },
  {
    id: "application_002",
    job_post_id: "job_post_001",
    staff_id: "staff_002",
    recruitment_cycle: 1,
    name: "박민수",
    age: 28,
    gender: "male",
    phone: "010-3456-7890",
    representative_photo_path: "applications/staff-002/profile.jpg",
    available_start_date: "2026-07-01",
    available_work_period: "1개월",
    experience_status: "none",
    introduction: "호스텔 알바 경험은 없지만 성실하게 일하겠습니다.",
    status: "viewed",
    created_at: "2026-06-18T11:00:00+09:00",
    updated_at: "2026-06-19T09:30:00+09:00",
  },
  {
    id: "application_003",
    job_post_id: "job_post_001",
    staff_id: "staff_003",
    recruitment_cycle: 1,
    name: "최서연",
    age: 24,
    gender: "female",
    phone: "010-4567-8901",
    representative_photo_path: "applications/staff-003/profile.jpg",
    available_start_date: "2026-07-10",
    available_work_period: "3개월",
    experience_status: "experienced",
    introduction: "부산 게스트하우스 6개월, 제주 호스텔 2개월 근무했습니다.",
    status: "accepted",
    created_at: "2026-06-17T16:45:00+09:00",
    updated_at: "2026-06-18T10:00:00+09:00",
  },
];

export const SHARE_LINK_BASE_URL = "https://staffing.example.com/jobs";
