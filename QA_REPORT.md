# 디자인 QA 결과

## Summary

- 전체 위반 개수: 12
- P0 개수: 0
- P1 개수: 5
- P2 개수: 7

정적 코드 QA 기준으로 `/design-system`, 공통 UI 컴포넌트, 주요 app route, owner/staff 컴포넌트를 검수했다. 현재 환경에서는 브라우저 캡처 기반 시각 QA를 수행하지 못했으므로, 최종 육안 확인은 별도로 필요하다.

----------------------------------------

## P0

없음.

현재 확인된 항목 중 기능 이해를 막거나 디자인 시스템을 심각하게 깨는 수준의 P0 위반은 없었다.

----------------------------------------

## P1

### 1. Staff 헤더 컨테이너가 owner/design-system 컨테이너와 달랐음

- 페이지: `/jobs`, `/staff/favorites`, `/staff/applications`, `/mypage`
- 컴포넌트: `AppHeader`
- 문제: staff/public 헤더가 `max-w-7xl px-4 md:px-6` 직접 레이아웃을 사용해 owner 헤더의 `page-container`와 기준이 달랐다.
- 왜 문제인지: 화면별 상단 헤더 좌우 정렬이 다르게 느껴질 수 있고, 디자인 시스템의 page container 기준과 불일치한다.
- 수정 방향: `AppHeader` 내부 컨테이너를 `page-container`로 통일.
- 상태: 수정 완료.

### 2. 전역 loading 화면이 page-container/surface 기준을 쓰지 않음

- 페이지: 전역 `loading.tsx`
- 컴포넌트: `Loading`
- 문제: `bg-neutral-50 px-4 md:px-6` 직접 레이아웃을 사용했다.
- 왜 문제인지: 디자인 시스템의 기본 page background와 container padding 기준에서 벗어난다.
- 수정 방향: `bg-surface`와 `page-container` 적용.
- 상태: 수정 완료.

### 3. 전역 error 화면이 page-container/surface 기준을 쓰지 않음

- 페이지: 전역 `error.tsx`
- 컴포넌트: `Error`
- 문제: `bg-neutral-50 px-4 md:px-6` 직접 레이아웃을 사용했다.
- 왜 문제인지: 공통 오류 화면의 상하좌우 여백이 다른 페이지와 달라질 수 있다.
- 수정 방향: `bg-surface`와 `page-container` 적용.
- 상태: 수정 완료.

### 4. Supabase 테스트 화면이 디자인 토큰을 쓰지 않음

- 페이지: `/supabase-test`
- 컴포넌트: `SupabaseTestPage`
- 문제: `border-gray-200`, `text-gray-*`, `text-green-700`, `text-red-700`, raw `text-sm/text-base`, `rounded-lg` 직접 카드 사용.
- 왜 문제인지: 디자인 시스템의 neutral/success/danger token, Card, typography 기준을 벗어난다.
- 수정 방향: `Card`, `bg-surface`, `text-body/text-body-sm`, `neutral/success-muted/danger-muted`로 교체.
- 상태: 수정 완료.

### 5. Owner onboarding 페이지가 page-container를 직접 재구현함

- 페이지: `/onboarding/owner/guesthouse`, `/onboarding/owner/job-post`
- 컴포넌트: onboarding page layouts
- 문제: `px-5`와 `max-w-5xl` 조합으로 `page-container` 역할을 직접 구현했다.
- 왜 문제인지: page padding과 max-width 기준이 점점 분산될 수 있다.
- 수정 방향: `page-container py-8 md:py-10`으로 통일.
- 상태: 수정 완료.

----------------------------------------

## P2

### 1. Public jobs list는 wide container를 사용함

- 페이지: `/jobs`
- 문제: listing grid와 filter bar는 `max-w-7xl`을 사용한다.
- 왜 문제인지: 기본 `page-container`보다 넓어 디자인 시스템 문서만 보면 예외로 보인다.
- 수정 방향: public listing의 밀도 확보를 위한 의도적 예외로 문서화하거나, 추후 `wide-container` 유틸로 분리.

### 2. Compact chip에서 arbitrary typography가 남아 있음

- 페이지: `/jobs`, `/jobs/[slug]`
- 문제: `text-[11px]`, `text-[12px]`, `text-[13px]`가 일부 compact chip/helper에 있다.
- 왜 문제인지: typography scale 밖의 예외가 늘어날 수 있다.
- 수정 방향: compact chip 컴포넌트 또는 `Badge size="compact"` 도입 검토.

### 3. Filter bottom sheet가 Dropdown/Modal 공통 컴포넌트가 아님

- 페이지: `/jobs`
- 컴포넌트: `JobsFilterBar`
- 문제: bottom sheet/dropdown 스타일이 컴포넌트 내부에 직접 정의되어 있다.
- 왜 문제인지: 향후 다른 dropdown/modal과 radius, shadow, focus 처리가 달라질 수 있다.
- 수정 방향: 추후 `DropdownPanel` 또는 `BottomSheet` 공통화 검토.

### 4. File input 스타일이 form system으로 추상화되어 있지 않음

- 페이지: `/owner/guesthouse/edit`, `/owner/jobs/[id]/edit`, `/jobs/[slug]/apply`
- 문제: file input class가 컴포넌트별로 직접 작성되어 있다.
- 왜 문제인지: 사진 업로드 버튼/파일 선택 UI가 화면마다 조금씩 달라질 수 있다.
- 수정 방향: `FileInput` 또는 photo manager 내부 shared 스타일로 분리.

### 5. Modal animation 정책이 아직 없음

- 컴포넌트: `OwnerActionModal`, `ApplicationDetail` modal
- 문제: modal 스타일은 있지만 motion/animation 기준이 명확하지 않다.
- 왜 문제인지: 이후 모달 추가 시 움직임이 제각각일 수 있다.
- 수정 방향: fade/scale 여부와 duration token을 문서화하고 공통 모달로 집중.

### 6. 일부 이미지 radius가 large token을 직접 사용함

- 페이지: `/owner/applications/[id]`, `/jobs`, `/staff/favorites`
- 문제: 콘텐츠 이미지에 `rounded-lg`, `rounded-full` 등 다양한 radius가 있다.
- 왜 문제인지: 이미지 성격별 radius 규칙이 아직 세분화되어 있지 않다.
- 수정 방향: avatar는 pill/full, media preview는 `rounded-md`, large portrait는 `rounded-lg`처럼 규칙화.

### 7. 페이지별 empty/loading/error 상태의 깊이가 다름

- 페이지: 일부 owner/staff/public 페이지
- 문제: EmptyState는 많지만 route별 loading/error는 전역 fallback 위주다.
- 왜 문제인지: 데이터가 느린 화면에서 섹션 단위 skeleton이 부족할 수 있다.
- 수정 방향: 필요 화면부터 섹션 단위 skeleton을 추가.

----------------------------------------

## 페이지별 체크 결과

| 페이지 | 결과 | 체크 내용 |
| --- | --- | --- |
| `/` | 통과 | 홈 CTA, typography, radius가 시스템 기준과 대체로 일치 |
| `/design-system` | 통과 | 디자인 시스템 기준 페이지 |
| `/jobs` | 수정 필요 | pagination은 통과, wide container와 compact chip은 P2 예외 |
| `/jobs/[slug]` | 수정 필요 | 상태 노출은 명확함, compact badge typography는 P2 |
| `/jobs/[slug]/apply` | 수정 필요 | form 구조는 통과, file input 공통화는 P2 |
| `/staff/favorites` | 통과 | 헤더 컨테이너 수정으로 정렬 기준 개선 |
| `/staff/applications` | 통과 | 헤더 컨테이너 수정으로 정렬 기준 개선 |
| `/mypage` | 통과 | 헤더 컨테이너 수정으로 정렬 기준 개선 |
| `/owner` | 통과 | owner layout, PageHeader, Section, Card, Button 위계 사용 |
| `/owner/jobs` | 통과 | 상태 pill, CTA 위계, action button 정책 유지 |
| `/owner/jobs/new` | 통과 | PageHeader, Card, Form 기준 사용 |
| `/owner/jobs/[id]/edit` | 수정 필요 | form 기준은 통과, photo file input 공통화는 P2 |
| `/owner/jobs/[id]/complete` | 통과 | PageHeader, ShareLinkBox, ButtonLink 기준 사용 |
| `/owner/jobs/[id]/applications` | 통과 | PageHeader, Section, EmptyState 기준 사용 |
| `/owner/applications` | 통과 | PageHeader, Section, ApplicantList 기준 사용 |
| `/owner/applications/[id]` | 수정 필요 | modal/image radius 정책은 P2 |
| `/owner/guesthouse` | 통과 | PageHeader 기반 owner layout |
| `/owner/guesthouse/new` | 통과 | PageHeader 기반 owner layout |
| `/owner/guesthouse/edit` | 수정 필요 | form 기준은 통과, photo file input 공통화는 P2 |
| `/onboarding/role` | 통과 | 단순 선택 화면, typography 기준 사용 |
| `/onboarding/owner/guesthouse` | 통과 | page-container 적용 완료 |
| `/onboarding/owner/job-post` | 통과 | page-container 적용 완료 |
| `/supabase-test` | 통과 | 디자인 토큰과 Card 적용 완료 |
| 전역 loading | 통과 | surface/page-container 적용 완료 |
| 전역 error | 통과 | surface/page-container 적용 완료 |

----------------------------------------

## 수정 범위

- DB, migration, Server Action, API, owner/staff 권한 로직, 상태값은 수정하지 않았다.
- 기능 로직 변경 없이 디자인 시스템 문서화와 순수 스타일 정리만 수행했다.
