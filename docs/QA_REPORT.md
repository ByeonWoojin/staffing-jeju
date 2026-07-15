# 스탭핑 출시 전 QA 이슈 수정 결과

## 1. QA 개요

- 점검 일자: 2026-07-15
- 프로젝트: 스탭핑
- 점검 기준 브랜치: `main`
- 점검 기준 커밋: `21d79c29a19efa105fc1e4ed682955241fa62a47`
- 운영 URL: `https://staffing-jeju.vercel.app/`
- 작업 범위: 기존 출시 전 QA에서 확인된 QA-001~QA-004 수정 및 회귀 검증
- 코드 수정 여부: 있음, QA-001~QA-004 관련 최소 범위
- 문서 갱신: `docs/QA_REPORT.md`
- 루트 `QA_REPORT.md`: 생성하지 않음, 삭제 상태 유지

QA 시작 전 기존 미커밋 변경사항:

| 파일 경로 | 상태 | 이번 작업에서 처리 |
|---|---|---|
| `DESIGN_SYSTEM.md` | deleted | 변경하지 않음 |
| `QA_REPORT.md` | deleted | 삭제 상태 유지 |
| `docs/DESIGN_SYSTEM.md` | untracked | 변경하지 않음 |
| `docs/QA_REPORT.md` | untracked | 이번 결과로 갱신 |
| `docs/analytics/` | untracked | 변경하지 않음 |

## 2. 종합 결과

| 항목 | 결과 |
|---|---:|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 1 |
| Potential | 0 |
| Not verified | 8 |

### 출시 판단

- 조건부 출시 가능

근거:

- QA-001~QA-004는 코드 기준으로 수정 완료됐다.
- `npm run lint`와 `npm run build`가 모두 성공했다.
- build route 목록에서 `/supabase-test`와 sessionStorage 기반 mock 완료 라우트 `/owner/jobs/[id]/complete`가 제거됐다.
- 실제 Google OAuth, Supabase 원격 DB 쓰기, Storage 업로드, GA4/Mixpanel 전체 이벤트 수신은 이번 로컬 환경에서 직접 검증하지 못했으므로 운영 배포 후 수동 QA가 필요하다.

## 3. 실행한 검증

| 검증 | 명령 또는 방법 | 결과 |
|---|---|---|
| Git 상태 | `git status` | 기존 삭제/이동 문서 변경과 이번 코드 변경 확인 |
| 최근 커밋 | `git log --oneline -5` | `21d79c2` 기준 확인 |
| Mock fallback 검색 | `rg -n "getOwnerGuesthouseMock|getCurrentJobPostMock|getApplicationsByJobPostIdMock|logMockFallback|sessionStorage|mock" src/app/owner src/components/owner src/lib` | 운영 owner 데이터 헬퍼의 implicit mock fallback 제거 확인. 남은 mock은 명시적 mock 모듈 또는 mock edit 차단 문구 |
| 직접 생성 라우트 검색 | `rg -n "owner/guesthouse/new|owner/jobs/new|createAction" src` | 직접 라우트는 redirect, 정식 온보딩 createAction 유지 확인 |
| 로그아웃 검색 | `rg -n "ANALYTICS_EVENTS.LOGOUT|signOut|resetAnalyticsUser" src` | `signOut` 성공 후 `logout` 이벤트와 reset 호출 순서 확인 |
| 진단 라우트 검색 | `rg -n "supabase-test|/supabase-test" . --glob '!node_modules' --glob '!.next'` | 코드 참조 없음. 문서 내 이력만 남음 |
| Lint | `npm run lint` | 성공 |
| Build | `npm run build` | 성공. `/supabase-test`, `/owner/jobs/[id]/complete` route 없음 |

## 4. 주요 기능 점검 결과

| 영역 | 점검 결과 | 상태 | 비고 |
|---|---|---|---|
| 사장님 게스트하우스 직접 생성 | `/owner/guesthouse/new`가 정식 온보딩 생성 경로 또는 수정 화면으로 redirect | Pass | mock 저장 폼 렌더링 없음 |
| 사장님 모집글 직접 생성 | `/owner/jobs/new`가 게스트하우스/모집글 상태에 따라 정식 경로로 redirect | Pass | sessionStorage mock 생성 없음 |
| Owner 데이터 조회 | Supabase 조회 실패/데이터 없음 시 mock 자동 반환 제거 | Pass | 데이터 없음은 `null`/빈 배열, 오류는 예외 |
| 로그아웃 분석 이벤트 | `signOut()` 성공 후 `logout` 이벤트와 reset 실행 | Pass | 실패 시 이벤트/reset 미실행 |
| `/supabase-test` | 라우트 폴더 삭제, build route 목록에서 제거 | Pass | 문서 이력 외 코드 참조 없음 |
| 기존 온보딩 생성 | `/onboarding/owner/guesthouse`, `/onboarding/owner/job-post`의 createAction 유지 | Pass | 새 Server Action 추가 없음 |
| Lint/Build | 정적 검증 통과 | Pass | test/typecheck 스크립트는 없음 |
| 실제 원격 DB E2E | 이번 로컬 QA에서 미검증 | Not verified | 운영 또는 staging 계정 필요 |

## 5. 발견된 문제 및 처리 상태

### QA-001 사장님 직접 생성 라우트가 DB 저장 액션 없이 mock fallback 경로를 사용함 - 해결 완료

- 심각도: 기존 High, 현재 해결 완료
- 확인 상태: Confirmed
- 영향 영역: 사장님 게스트하우스 등록, 사장님 모집글 등록
- 관련 경로:
  - `/owner/guesthouse/new`
  - `/owner/jobs/new`
- 수정 파일:
  - `src/app/owner/guesthouse/new/page.tsx`
  - `src/app/owner/jobs/new/page.tsx`
  - `src/components/owner/GuesthouseForm.tsx`
  - `src/components/owner/JobPostForm.tsx`
  - `src/lib/owner-utils.ts`
  - `src/app/owner/jobs/[id]/complete/page.tsx`
- 수정 방식:
  - `/owner/guesthouse/new`는 현재 owner의 게스트하우스 존재 여부를 서버에서 확인한다.
  - 게스트하우스가 있으면 `/owner/guesthouse/edit`로 redirect한다.
  - 게스트하우스가 없으면 실제 생성 Server Action이 연결된 `/onboarding/owner/guesthouse`로 redirect한다.
  - `/owner/jobs/new`는 게스트하우스가 없으면 `/onboarding/owner/guesthouse`, 기존 모집글이 있으면 `/owner/jobs/[id]/edit`, 모집글이 없으면 `/onboarding/owner/job-post`로 redirect한다.
  - `createAction`이 없는 create form 제출 시 더 이상 성공 alert, fake 완료 이동, sessionStorage 저장을 하지 않고 저장 경로 오류를 표시한다.
  - sessionStorage 기반 mock 완료 화면 `/owner/jobs/[id]/complete`를 제거했다.
- 검증 결과:
  - `rg` 기준 직접 생성 라우트에 운영 mock 성공 흐름 없음
  - `rg` 기준 `sessionStorage` 생성 헬퍼 호출 없음
  - build route 목록에서 `/owner/jobs/[id]/complete` 제거 확인
- 남은 수동 확인:
  - 실제 owner 계정으로 각 직접 URL 접근 시 redirect 결과 확인

### QA-002 운영 화면의 owner 데이터 mock fallback 제거 - 해결 완료

- 심각도: 기존 Medium, 현재 해결 완료
- 확인 상태: Confirmed
- 영향 영역: 사장님 대시보드, 게스트하우스, 모집글, 지원자 관리
- 관련 파일:
  - `src/lib/owner-supabase-data.ts`
- 수정 방식:
  - `currentOwner`, `getOwnerGuesthouseMock`, `getCurrentJobPostMock`, `getOwnerJobPostByIdMock`, `getApplicationsByJobPostIdMock`, `getApplicationWithOwnerCheckMock`, `getGuesthouseByIdMock` 자동 fallback import를 제거했다.
  - `getCurrentOwner()`는 현재 인증 사용자 profile만 조회한다.
  - profile이 없거나 owner가 아니거나 조회 실패 시 mock owner를 반환하지 않고 오류를 발생시킨다.
  - 게스트하우스/모집글/지원서가 정상적으로 없는 경우는 `null` 또는 빈 배열로 반환한다.
  - Supabase 조회 오류는 서버 로그 후 사용자용 일반 오류로 상위 error 처리에 맡긴다.
- 데이터 없음 처리 방식:
  - owner guesthouse 없음: `null`
  - current job post 없음: `null`
  - job post 없음 상태의 applications: `[]`
  - hidden job post applications/count: `[]` 또는 `0`
- 조회 오류 처리 방식:
  - mock 데이터로 숨기지 않음
  - 서버 로그는 `logSupabaseReadError()`로 제한
  - 사용자에게는 일반 오류 메시지를 throw
- 명시적 demo/mock 기능:
  - `src/lib/owner-data.ts`의 mock 모듈 자체는 삭제하지 않았다.
  - 일반 owner 운영 데이터 조회 실패 시 해당 mock 모듈이 자동 사용되지 않도록 분리했다.
- 검증 결과:
  - `src/lib/owner-supabase-data.ts`에서 `logMockFallback`과 mock 반환 import 제거 확인
  - `npm run build` 성공
- 남은 수동 확인:
  - 실제 Supabase 장애/권한 오류 시 화면의 error boundary 표시

### QA-003 로그아웃 성공 전 analytics 이벤트 기록 - 해결 완료

- 심각도: 기존 Medium, 현재 해결 완료
- 확인 상태: Confirmed
- 영향 영역: GA4/Mixpanel 로그아웃 이벤트 정확도
- 관련 파일:
  - `src/components/auth/LogoutButton.tsx`
- 수정 방식:
  - 기존: `trackEvent(LOGOUT)` -> `supabase.auth.signOut()` -> `resetAnalyticsUser()`
  - 변경: `supabase.auth.signOut()` -> 성공 확인 -> `trackEvent(LOGOUT)` -> `resetAnalyticsUser()` -> redirect/refresh
- 로그아웃 실패 시 analytics 동작:
  - `logout` 이벤트를 전송하지 않음
  - `resetAnalyticsUser()`를 호출하지 않음
  - 기존 alert 오류 처리를 유지함
- 검증 결과:
  - `rg` 기준 `signOut()` 뒤에 `ANALYTICS_EVENTS.LOGOUT`, 그 뒤에 `resetAnalyticsUser()` 호출 확인
  - `npm run lint`, `npm run build` 성공
- 남은 수동 확인:
  - 실제 브라우저에서 로그아웃 성공/실패 시 GA4/Mixpanel 수신 여부

### QA-004 공개 `/supabase-test` 진단 라우트 제거 - 해결 완료

- 심각도: 기존 Low, 현재 해결 완료
- 확인 상태: Confirmed
- 영향 영역: 공개 라우트 위생
- 삭제 파일:
  - `src/app/supabase-test/page.tsx`
  - `src/app/supabase-test/layout.tsx`
- 수정 방식:
  - `/supabase-test` route segment를 삭제했다.
  - Supabase 공통 클라이언트나 실제 연결 코드는 삭제하지 않았다.
- 참조 제거 결과:
  - `rg -n "supabase-test|/supabase-test" . --glob '!node_modules' --glob '!.next'` 기준 코드 참조 없음
  - 이 문서의 이력 설명에만 문자열이 남아 있음
- build 결과:
  - route 목록에서 `/supabase-test` 제거 확인

### QA-005 루트에 `.env.example`가 없음 - 미해결, 범위 제외

- 심각도: Low
- 확인 상태: Confirmed
- 영향 영역: 개발/배포 온보딩
- 상태: 이번 작업 범위가 아니므로 유지
- 권장 대응: 별도 작업에서 실제 값 없이 필요한 환경 변수명만 문서화

## 6. Critical 및 High 요약

> 확인된 Critical 및 High 문제는 없습니다.

QA-001은 기존 High였으나 이번 작업에서 코드 기준 해결 완료됐다. 실제 운영 계정으로 직접 URL redirect를 수동 확인하면 완전히 닫을 수 있다.

## 7. Medium 및 Low 개선 항목

| ID | 심각도 | 상태 | 내용 |
|---|---|---|---|
| QA-005 | Low | 미해결 | `.env.example` 부재. 이번 작업 범위 제외 |

## 8. 확인하지 못한 항목

| 확인하지 못한 기능 | 필요한 테스트 조건 | 사용자가 직접 확인할 방법 |
|---|---|---|
| `/owner/guesthouse/new` 운영 redirect | 실제 owner 계정, 게스트하우스 있음/없음 상태 | 직접 URL 접근 후 수정 화면 또는 온보딩으로 이동 확인 |
| `/owner/jobs/new` 운영 redirect | 실제 owner 계정, 게스트하우스/모집글 상태별 데이터 | 직접 URL 접근 후 정식 생성/수정 경로 확인 |
| Supabase 조회 오류 화면 | 강제 DB 오류 또는 권한 오류 환경 | owner 화면에서 오류 상태가 흰 화면 없이 표시되는지 확인 |
| Google OAuth 로그아웃 실패 케이스 | 브라우저 세션/네트워크 오류 재현 | 실패 시 `logout` 이벤트 미수신 확인 |
| GA4 커스텀 이벤트 수신 | Production 배포와 GA4 접근 | 로그아웃 및 주요 이벤트 실시간 수신 확인 |
| Mixpanel 이벤트/identify/reset | Production 배포와 Mixpanel 접근 | Live View에서 distinct_id/reset 확인 |
| 원격 RLS/Storage 정책 | Supabase Dashboard 또는 CLI 접근 | 원격 정책 적용 상태 확인 |
| 모바일 실기기 회귀 | 375px/768px 브라우저 또는 기기 | owner redirect, 지원/목록 UI 확인 |

## 9. GA4·Mixpanel 점검 결과

### GA4

- 기본 태그: 기존 구조 유지
- Production 활성화: 기존 `process.env.VERCEL_ENV === "production"` 조건 유지
- 이벤트 코드: 기존 공통 `trackEvent()` 유지
- 이번 변경: `logout` 이벤트가 Supabase 로그아웃 성공 후 호출되도록 변경
- 대시보드 수신 확인: Not verified
- 추가 확인 필요: Production에서 `logout`, `login`, `sign_up`, `application_submit` 실제 수신

### Mixpanel

- SDK 초기화: 기존 `AnalyticsProvider` 유지
- Production 활성화: 기존 조건 유지
- identify/reset: reset은 로그아웃 성공 후에만 실행
- 대시보드 수신 확인: Not verified
- 추가 확인 필요: 로그아웃 후 distinct_id가 다음 사용자와 섞이지 않는지 확인

### 이벤트 점검표

| 이벤트 | 코드 연결 | 성공 후 호출 | 중복 위험 | 개인정보 위험 | 실제 수신 |
|---|---|---|---|---|---|
| `landing_view` | 유지 | 예 | 낮음 | 낮음 | Not verified |
| `auth_start` | 유지 | 클릭 기준 | 낮음 | 낮음 | Not verified |
| `login` | 유지 | 예 | 낮음 | 낮음 | Not verified |
| `sign_up` | 유지 | 예 | 낮음 | 낮음 | Not verified |
| `logout` | 수정 | 예, `signOut` 성공 후 | 낮음 | 낮음 | Not verified |
| `job_list_view` | 유지 | 예 | 낮음 | 낮음 | Not verified |
| `job_filter_apply` | 유지 | 적용 기준 | 보통 | 낮음 | Not verified |
| `job_detail_view` | 유지 | 예 | 낮음 | 낮음 | Not verified |
| `favorite_add` | 유지 | 예 | 낮음 | 낮음 | Not verified |
| `favorite_remove` | 유지 | 예 | 낮음 | 낮음 | Not verified |
| `application_start` | 유지 | 예 | 낮음 | 낮음 | Not verified |
| `application_submit` | 유지 | 예 | 낮음 | 낮음 | Not verified |
| `application_cancel` | 유지 | 예 | 낮음 | 낮음 | Not verified |
| `guesthouse_create` | 유지 | 예 | 낮음 | 낮음 | Not verified |
| `job_post_start` | 유지 | 예 | 낮음 | 낮음 | Not verified |
| `job_post_create` | 유지 | 예 | 낮음 | 낮음 | Not verified |
| `job_post_status_change` | 유지 | 예 | 낮음 | 낮음 | Not verified |
| `applicant_detail_view` | 유지 | 예 | 낮음 | 낮음 | Not verified |
| `application_status_change` | 유지 | 예 | 낮음 | 낮음 | Not verified |

## 10. 운영 배포 후 수동 QA 체크리스트

### 공통

- [ ] Production 배포 성공
- [ ] 홈 접속
- [ ] 모바일 홈 확인
- [ ] 잘못된 URL 404 확인
- [ ] `/supabase-test` 접속 시 앱 진단 화면이 노출되지 않는지 확인

### 스탭

- [ ] 신규 Google 가입
- [ ] 기존 계정 로그인
- [ ] 모집글 필터
- [ ] 관심 등록·해제
- [ ] 모집글 상세
- [ ] 지원서 작성
- [ ] 지원 완료
- [ ] 중복 지원 차단
- [ ] 지원 취소

### 사장님

- [ ] 게스트하우스 없는 owner가 `/owner/guesthouse/new` 접근 시 `/onboarding/owner/guesthouse`로 이동
- [ ] 게스트하우스 있는 owner가 `/owner/guesthouse/new` 접근 시 `/owner/guesthouse/edit`로 이동
- [ ] 게스트하우스 없는 owner가 `/owner/jobs/new` 접근 시 게스트하우스 등록 경로로 이동
- [ ] 모집글 없는 owner가 `/owner/jobs/new` 접근 시 `/onboarding/owner/job-post`로 이동
- [ ] 모집글 있는 owner가 `/owner/jobs/new` 접근 시 기존 모집글 수정 화면으로 이동
- [ ] 게스트하우스 등록
- [ ] 게스트하우스 수정
- [ ] 모집글 등록
- [ ] 모집글 수정
- [ ] 마감
- [ ] 재오픈
- [ ] 숨김
- [ ] 끌어올리기
- [ ] 긴급 모집
- [ ] 지원자 상세
- [ ] 지원 상태 변경

### 분석

- [ ] GA4 `logout`
- [ ] Mixpanel `logout`
- [ ] 로그아웃 실패 시 `logout` 이벤트 미전송
- [ ] 로그아웃 후 Mixpanel 사용자 초기화
- [ ] `job_post_start` 중복 여부
- [ ] `guesthouse_create`, `job_post_create`가 실제 생성 성공 후에만 발생

## 11. 출시 전 권장 조치

### 반드시 수정

- 없음

### 가능하면 수정

- 운영/staging에서 QA-001~QA-004 수동 회귀 확인
- Supabase 조회 오류 시 사용자용 error boundary가 충분한지 확인

### 출시 후 개선 가능

- QA-005: `.env.example` 또는 환경 변수 운영 체크리스트 추가
- `npm audit` 네트워크 가능 환경에서 재실행
- Playwright 기반 owner redirect 및 핵심 퍼널 자동화

## 12. 최종 결론

- 현재 출시 가능 여부: 조건부 출시 가능
- 출시를 막는 문제: 코드 기준 확인된 Critical/High 없음
- 사용자가 직접 확인해야 하는 기능: 실제 Google OAuth, Supabase 원격 DB/Storage, owner direct URL redirect, 로그아웃 이벤트 수신, GA4/Mixpanel 대시보드 수신
- 다음 작업 우선순위:
  1. Production 또는 staging에서 owner direct URL redirect 수동 확인
  2. owner 온보딩 생성/수정/상태 변경 end-to-end 확인
  3. 로그아웃 성공/실패 시 analytics 이벤트 수신 확인
  4. Supabase 원격 RLS/Storage 정책 확인
  5. `.env.example` 문서화
