# 스탭핑 GA4·Mixpanel 분석 설정 및 이벤트 명세

## 문서 개요

이 문서는 스탭핑에 적용된 Google Analytics 4와 Mixpanel 설정, 공통 분석 함수, 현재 구현된 핵심 이벤트를 유지보수와 데이터 분석 목적으로 정리한다.

GA4는 전체 방문, 기본 페이지 이용, 핵심 전환 이벤트 확인에 사용한다. Mixpanel은 사용자 행동, 기능 사용 여부, 전환 퍼널 분석에 사용한다.

현재 분석 범위는 랜딩페이지 방문, Google 인증 시작과 완료, 모집글 탐색, 관심 등록, 지원서 제출, 사장님 등록 및 관리 행동이다.

이번 단계에서 제외한 분석 범위는 UTM, referrer, 광고 캠페인, 외부 유입 경로, Mixpanel Autocapture, Session Replay, Heatmap, 사용자 자유 입력 내용 분석이다.

## 현재 적용 상태

| 구분 | 적용 내용 |
|---|---|
| GA4 | Next.js 공식 `GoogleAnalytics` 사용 |
| Mixpanel | `mixpanel-browser` 사용 |
| 활성 환경 | Vercel Production |
| 로컬 환경 | 이벤트 전송 안 함 |
| Vercel Preview | 이벤트 전송 안 함 |
| GA 자동 페이지 조회 | `GoogleAnalytics` 기본 수집 사용 |
| Mixpanel Autocapture | 비활성화 |
| Mixpanel Session Replay | 활성화하지 않음 |
| IP 수집 | `ip: false` |
| UTM 저장 | `stop_utm_persistence: true` |
| 개인정보 | 이벤트 속성으로 전송하지 않음 |

## 설치 패키지

| 패키지 | 현재 버전 | 사용 목적 |
|---|---:|---|
| `@next/third-parties` | `^16.2.10` | Next.js 공식 GA4 컴포넌트와 `sendGAEvent` 사용 |
| `mixpanel-browser` | `^2.81.0` | 브라우저 Mixpanel 초기화, 이벤트 전송, identify/reset 처리 |

설치 명령:

```bash
npm install @next/third-parties mixpanel-browser
```

## 환경 변수

| 환경 변수 | 용도 | 공개 여부 |
|---|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 웹 데이터 스트림 식별 | 브라우저 공개 가능 |
| `NEXT_PUBLIC_MIXPANEL_TOKEN` | Mixpanel 프로젝트 식별 | 브라우저 공개 가능 |

예시:

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_MIXPANEL_TOKEN=
```

주의사항:

- 실제 값은 문서와 소스 코드에 하드코딩하지 않는다.
- 로컬에서는 `.env.local`에 입력한다.
- 운영에서는 Vercel Environment Variables에 입력한다.
- 환경 변수를 변경하면 새 Production 배포가 필요하다.
- Mixpanel API Secret은 프론트 환경 변수에 넣지 않는다.
- Supabase service role key를 분석 코드에 사용하지 않는다.
- 현재 저장소에는 `.env.example` 파일이 없다.

## 운영 환경 활성화 조건

현재 분석 도구는 루트 레이아웃에서 다음 조건으로 활성화된다.

```ts
const analyticsEnabled = process.env.VERCEL_ENV === "production";
```

Production에서만 GA4와 Mixpanel이 활성화된다. 로컬 개발 환경과 Vercel Preview에서는 분석 함수가 no-op으로 동작하며 운영 데이터에 이벤트를 보내지 않는다. 환경 변수가 없거나 빈 값이어도 서비스는 정상 실행되고, 해당 SDK만 초기화하지 않는다.

## GA4 초기화 구조

초기화 위치는 `src/app/layout.tsx`이다. `GoogleAnalytics`는 루트에서 한 번만 렌더링한다.

```tsx
const analyticsEnabled = process.env.VERCEL_ENV === "production";
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

{analyticsEnabled && gaMeasurementId ? (
  <GoogleAnalytics gaId={gaMeasurementId} />
) : null}
```

수동 `gtag.js` 스크립트나 `next/script`를 별도로 추가하지 않는다. 기본 `page_view`는 `GoogleAnalytics`의 기본 수집을 사용하고, SPA 라우트 이동마다 수동 `page_view` 이벤트를 만들지 않는다.

사용자 행동 이벤트는 공통 `trackEvent` 함수를 통해 `sendGAEvent("event", eventName, properties)`로 전송한다.

## Mixpanel 초기화 구조

초기화 컴포넌트는 `src/components/analytics/AnalyticsProvider.tsx`이다. 루트 레이아웃에서 `enabled`, `gaMeasurementId`, `mixpanelToken`을 전달하고, 브라우저에서 한 번만 초기화한다.

현재 적용 옵션:

```ts
mixpanel.init(mixpanelToken, {
  autocapture: false,
  debug: false,
  persistence: "localStorage",
  stop_utm_persistence: true,
  ip: false,
});
```

`mixpanelInitialized` 모듈 변수를 사용해 중복 초기화를 막는다. Mixpanel이 아직 준비되지 않은 시점에 호출된 이벤트, identify, reset은 공통 모듈에서 대기 후 초기화 완료 시 처리한다.

## 분석 관련 파일 구조

| 파일 | 역할 |
|---|---|
| `src/app/layout.tsx` | Production 여부와 환경 변수를 계산하고 GA4, Mixpanel Provider, 인증 이벤트 브리지를 루트에 연결 |
| `src/components/analytics/AnalyticsProvider.tsx` | Mixpanel 브라우저 초기화 및 공통 분석 클라이언트 상태 설정 |
| `src/components/analytics/AnalyticsEventTracker.tsx` | 페이지 진입 이벤트를 `useRef`로 한 번만 전송 |
| `src/components/analytics/AuthAnalyticsBridge.tsx` | OAuth 이후 `auth_event`, `user_role` query를 소비해 `login`/`sign_up` 전송 및 query 제거 |
| `src/lib/analytics/events.ts` | 이벤트명 상수와 분석 속성 타입 정의 |
| `src/lib/analytics/client.ts` | `trackEvent`, `identifyAnalyticsUser`, `resetAnalyticsUser` 구현 |

## 공통 분석 함수

### `trackEvent`

GA4와 Mixpanel에 동일한 이벤트명과 속성을 전송한다. 운영 환경이 아니면 아무 작업도 하지 않는다. GA4 또는 Mixpanel이 초기화되지 않았으면 가능한 SDK만 사용하거나 대기 큐에 넣는다. 이벤트 전송 실패는 사용자 기능을 중단시키지 않고, 개발 환경에서만 `console.warn`으로 제한한다.

```ts
trackEvent(ANALYTICS_EVENTS.APPLICATION_SUBMIT, {
  job_post_id: jobPostId,
  guesthouse_id: guesthouseId,
});
```

### `identifyAnalyticsUser`

로그인 또는 신규 가입 성공 후 Mixpanel에 Supabase 사용자 UUID를 식별자로 설정한다. 사용자 프로필에는 현재 `user_role`만 저장한다. 운영 환경이 아니거나 Mixpanel을 사용할 수 없으면 no-op이다.

### `resetAnalyticsUser`

로그아웃 성공 후 Mixpanel distinct_id를 초기화한다. 다음 사용자의 이벤트가 이전 로그인 사용자와 합쳐지지 않도록 한다. 운영 환경이 아니거나 Mixpanel을 사용할 수 없으면 no-op이다.

## 전체 이벤트 명세

| 영역 | 이벤트명 | 발생 시점 | 주요 속성 | 성공 기준 |
|---|---|---|---|---|
| 유입 및 인증 | `landing_view` | 랜딩페이지 `/` 렌더링 후 1회 | `page` | 랜딩페이지 Client Tracker 마운트 |
| 유입 및 인증 | `auth_start` | Google OAuth 시작 버튼 클릭 직전 | `method`, `entry_role`, `cta_location` | 사용자가 실제 Google 시작 버튼 클릭 |
| 유입 및 인증 | `login` | 기존 프로필이 있는 사용자의 OAuth 성공 후 | `method`, `user_role` | OAuth callback에서 기존 `profiles` 존재 확인 |
| 유입 및 인증 | `sign_up` | 역할 선택 과정에서 프로필이 최초 생성된 후 | `method`, `user_role` | `createProfileForUserWithStatus`가 신규 생성 반환 |
| 유입 및 인증 | `logout` | 로그아웃 요청 직전 | `user_role` | 사용자가 로그아웃 버튼 클릭, 이후 로그아웃 성공 시 reset |
| 모집글 탐색 | `job_list_view` | `/jobs` 목록 데이터가 표시된 후 1회 | `result_count` | `getPublicJobs` 결과 렌더링 |
| 모집글 탐색 | `job_filter_apply` | 필터 패널에서 `검색하기` 제출 | `filter_count`, `has_region_filter`, `has_entry_date_filter`, `has_work_condition_filter` | 필터 form submit |
| 모집글 탐색 | `job_detail_view` | 공개 모집글 상세 표시 후 1회 | `job_post_id`, `guesthouse_id`, `region`, `job_status` | 상세 데이터가 존재해 페이지 렌더링 |
| 관심 모집글 | `favorite_add` | 관심 게스트하우스 저장 성공 후 | `job_post_id`, `guesthouse_id`, `source_page` | `toggleFavoriteGuesthouse` 성공 결과가 저장 상태 |
| 관심 모집글 | `favorite_remove` | 관심 게스트하우스 해제 성공 후 | `job_post_id`, `guesthouse_id`, `source_page` | `toggleFavoriteGuesthouse` 성공 결과가 해제 상태 |
| 지원 | `application_start` | 지원서 작성 화면 정상 진입 후 1회 | `job_post_id`, `guesthouse_id`, `source_page` | 지원 가능한 스탭 사용자가 지원 폼 렌더링 |
| 지원 | `application_submit` | 지원서 DB 저장 성공 후 | `job_post_id`, `guesthouse_id` | `submitJobApplication` 성공 결과 |
| 지원 | `application_cancel` | 지원 취소 DB 반영 성공 후 | `job_post_id`, `application_id` | `cancelStaffApplication` 성공 결과 |
| 사장님 등록 및 관리 | `guesthouse_create` | 게스트하우스 최초 등록 성공 후 | `guesthouse_id`, `user_role` | `createOwnerGuesthouse`가 신규 생성 결과 반환 |
| 사장님 등록 및 관리 | `job_post_start` | 새 모집글 작성 화면 정상 진입 후 1회 | `guesthouse_id`, `user_role` | 게스트하우스 ID가 있는 작성 화면 렌더링 |
| 사장님 등록 및 관리 | `job_post_create` | 신규 모집글 DB 생성 성공 후 | `job_post_id`, `guesthouse_id`, `user_role` | `createOwnerJobPost`가 신규 생성 결과 반환 |
| 사장님 등록 및 관리 | `job_post_status_change` | 모집글 상태 변경 성공 후 | `job_post_id`, `previous_status`, `next_status`, `user_role` | close, reopen, hidden 처리 또는 채용 후 마감 성공 |
| 사장님 등록 및 관리 | `applicant_detail_view` | 사장님이 지원자 상세 화면을 정상 확인한 후 1회 | `job_post_id`, `application_id`, `application_status`, `user_role` | 지원자 상세 데이터 렌더링 |
| 사장님 등록 및 관리 | `application_status_change` | 지원자 상태 변경 성공 후 | `job_post_id`, `application_id`, `previous_status`, `next_status`, `user_role` | 합격 또는 불합격 처리 성공 |

참고:

- `job_post_status_change`는 상태값이 바뀌는 작업만 기록한다. 급구 처리와 끌어올리기는 현재 상태 변경 이벤트로 기록하지 않는다.
- 지원자 상세 진입 시 `submitted`를 `viewed`로 자동 변경하는 서버 처리는 별도 `application_status_change`로 기록하지 않고, `applicant_detail_view`로만 기록한다.

## 이벤트 속성 명세

| 속성 | 설명 | 예시 |
|---|---|---|
| `page` | 페이지 식별 | `landing` |
| `method` | 인증 방식 | `google` |
| `user_role` | 사용자 역할 | `staff`, `owner` |
| `entry_role` | CTA에서 의도한 진입 역할 | `staff`, `owner` |
| `cta_location` | CTA 위치 | `landing_hero`, `public_header` |
| `job_post_id` | 모집글 식별자 | UUID |
| `guesthouse_id` | 게스트하우스 식별자 | UUID |
| `application_id` | 지원서 식별자 | UUID |
| `region` | 제주 지역명 | `제주시` |
| `job_status` | 모집글 상태 | `open`, `closed`, `hidden` |
| `application_status` | 지원 상태 | `submitted`, `viewed`, `accepted`, `rejected`, `canceled` |
| `previous_status` | 변경 전 상태 | 실제 enum 값 |
| `next_status` | 변경 후 상태 | 실제 enum 값 |
| `source_page` | 이벤트 발생 화면 | `job_list`, `job_detail`, `favorites` |
| `result_count` | 조회된 모집글 결과 수 | 숫자 |
| `filter_count` | 적용된 필터 그룹 수 | 숫자 |
| `has_region_filter` | 지역 필터 사용 여부 | boolean |
| `has_entry_date_filter` | 입도 가능일 필터 사용 여부 | boolean |
| `has_work_condition_filter` | 근무 조건 필터 사용 여부 | boolean |

현재 코드에서 사용하는 `cta_location` 값:

- `landing_hero`
- `landing_card_staff`
- `landing_card_owner`
- `landing_card_connect`
- `landing_bottom_cta`
- `public_header`
- `apply_login_required`
- `mypage_login_required`

## 로그인과 신규 가입 판별

OAuth callback에서 기존 `profiles` 행이 존재하면 기존 회원으로 보고 `login` 이벤트를 준비한다. 이때 redirect URL에는 `auth_event=login`, `user_role=staff|owner`만 추가한다.

역할 선택 과정에서 프로필이 최초 생성되면 신규 가입으로 보고 `sign_up` 이벤트를 준비한다. `createProfileForUserWithStatus`는 기존 프로필 여부를 확인하고 `{ profile, isNewUser }`를 반환한다.

클라이언트의 `AuthAnalyticsBridge`는 `auth_event`와 `user_role`만 읽고, 현재 Supabase 사용자 UUID를 확인한 뒤 `identifyAnalyticsUser`와 `trackEvent`를 호출한다. 처리 후 `auth_event`와 `user_role` query를 `window.history.replaceState`로 제거한다.

인증 관련 개인정보, 토큰, OAuth code, 사용자 이메일은 query string에 포함하지 않는다. `useRef` 기반 처리 키로 같은 페이지에서 동일 인증 이벤트가 반복 소비되지 않게 한다.

## Mixpanel 사용자 식별

- 인증 성공 후 Supabase 사용자 UUID로 `identify`를 호출한다.
- Mixpanel 사용자 프로필에는 `user_role`만 저장한다.
- 익명 랜딩페이지 방문자는 identify하지 않는다.
- 로그아웃 성공 후 `resetAnalyticsUser`를 실행한다.
- 이메일, 이름, 전화번호, 나이, 성별은 Mixpanel 사용자 속성으로 등록하지 않는다.

## 개인정보 수집 제한

분석 도구로 다음 정보를 전송하지 않는다.

- 이름
- 이메일
- 전화번호
- 생년월일
- 나이
- 성별
- 상세 주소
- 자기소개
- 지원 동기
- 경력 상세 내용
- 사용자 자유 입력 문구
- Supabase 토큰
- OAuth code
- 전체 query string
- 비공개 게스트하우스 정보

분석 이벤트에는 내부 식별자, 역할, 상태값, 화면 출처, 필터 사용 여부처럼 서비스 운영 분석에 필요한 최소 속성만 사용한다.

## 이벤트 중복 방지

- 페이지 진입 이벤트는 `AnalyticsEventTracker`에서 `useRef`로 한 번만 전송한다.
- React Strict Mode나 컴포넌트 재렌더링으로 같은 페이지 진입 이벤트가 반복되지 않게 한다.
- OAuth 이벤트는 `AuthAnalyticsBridge`에서 한 번 소비한 뒤 query를 제거한다.
- DB 성공 이벤트는 서버 액션 성공 결과를 받은 클라이언트 한 곳에서만 전송한다.
- 버튼 클릭 이벤트와 서버 성공 이벤트를 같은 목적에 중복으로 넣지 않는다.
- Mixpanel은 `mixpanelInitialized`로 중복 초기화를 방지한다.
- Mixpanel 초기화 전 호출된 이벤트는 큐에 보관했다가 초기화 후 전송한다.

## 핵심 분석 지표

이벤트 수보다 가능하면 사용자 수 기준으로 분석한다.

### 랜딩페이지 인증 전환

- 랜딩 CTA 클릭률: `auth_start` 사용자 / `landing_view` 사용자
- 신규 가입 전환율: `sign_up` 사용자 / `landing_view` 사용자
- 전체 인증 완료율: `login` 또는 `sign_up` 사용자 / `landing_view` 사용자
- 인증 시작 대비 완료율: `login` 또는 `sign_up` 사용자 / `auth_start` 사용자

### 스탭 지원 퍼널

```text
job_list_view
→ job_detail_view
→ application_start
→ application_submit
```

### 관심 등록 이후 지원 전환

```text
favorite_add
→ application_start
→ application_submit
```

### 사장님 모집 퍼널

```text
guesthouse_create
→ job_post_start
→ job_post_create
```

### 지원자 관리

```text
applicant_detail_view
→ application_status_change
```

## GA4 확인 방법

운영 배포 후 확인 절차:

1. Vercel Production 배포를 확인한다.
2. 운영 사이트에 접속한다.
3. GA4 보고서의 실시간 화면으로 이동한다.
4. 최근 30분 활성 사용자를 확인한다.
5. 기본 `page_view`를 확인한다.
6. `landing_view`를 확인한다.
7. 로그인 버튼 클릭 후 `auth_start`를 확인한다.
8. 인증 완료 후 `login` 또는 `sign_up`을 확인한다.
9. 모집글 상세에서 `job_detail_view`를 확인한다.

현재 확인 상태:

- 2026년 7월 15일 Production 접속 테스트에서 GA4 최근 30분 활성 사용자 1명이 확인됨.
- 이를 통해 기본 GA 태그가 운영 환경에서 전송되는 것으로 확인함.
- 전체 커스텀 이벤트의 정상 수신은 각 기능별 추가 검증이 필요함.

## Mixpanel 확인 방법

1. Mixpanel 프로젝트에 접속한다.
2. Events 또는 Live View를 확인한다.
3. 운영 사이트에서 테스트 행동을 실행한다.
4. 각 이벤트가 한 번씩 들어오는지 확인한다.
5. 이벤트 속성을 확인한다.
6. 로그인 후 distinct_id와 `user_role`을 확인한다.
7. 로그아웃 후 다음 익명 이벤트가 이전 사용자와 합쳐지지 않는지 확인한다.

초기 확인 대상 이벤트:

- `landing_view`
- `auth_start`
- `login` 또는 `sign_up`
- `job_list_view`
- `job_detail_view`

## 신규 이벤트 추가 규칙

1. 이벤트 이름은 영문 snake_case를 사용한다.
2. `src/lib/analytics/events.ts` 상수에 먼저 등록한다.
3. 버튼 클릭보다 실제 성공 결과를 우선 기록한다.
4. 자유 입력 텍스트를 속성으로 보내지 않는다.
5. 기존 이벤트와 목적이 겹치는 이벤트를 만들지 않는다.
6. GA4와 Mixpanel에 동일한 이벤트명을 사용한다.
7. 페이지 진입 이벤트는 중복 호출을 방지한다.
8. 이벤트 추가 후 이 문서의 이벤트 명세도 갱신한다.

## 현재 미구현 범위

다음 항목은 현재 구현하지 않았다.

- UTM 캠페인 분석
- referrer 분석
- 외부 유입 채널 구분
- 광고 성과 연동
- Mixpanel Autocapture
- Session Replay
- Heatmap
- 오류 추적
- 서버 전용 이벤트 수집
- 분석 데이터 보관 정책 문서
- GA4 주요 이벤트 지정
- Mixpanel 퍼널 대시보드 생성

향후 실제 필요성이 확인된 뒤 별도 작업으로 진행한다.

