# 스탭핑 MVP DB 컬럼명 및 상태값 정의서

## 1. 문서 목적

본 문서는 스탭핑 MVP 개발 전, DB 테이블명·컬럼명·enum·status 값을 먼저 고정하기 위한 기준 문서이다.

이 문서에서는 SQL, RLS, API 구현 방식은 다루지 않는다.

개발 중 혼선을 줄이기 위해 테이블명, 컬럼명, 필수 여부, 상태값, MVP 운영 정책만 확정한다.

---

## 2. DB 네이밍 원칙

DB 테이블명과 컬럼명은 모두 `snake_case`를 사용한다.

### 예시

| 구분 | 사용하지 않음 | 사용함 |
| --- | --- | --- |
| 테이블명 | `jobPosts` | `job_posts` |
| 컬럼명 | `createdAt` | `created_at` |
| 컬럼명 | `guesthouseName` | `guesthouse_name` |

상태값은 모두 영어 소문자 enum 값으로 저장한다.

---

# 3. MVP 핵심 운영 정책

---

## 3-1. 게스트하우스와 모집글 운영 정책

스탭핑 MVP에서는 사장님 1명이 하나의 게스트하우스를 운영하고, 해당 게스트하우스는 하나의 스탭 모집글만 운영한다.

사장님은 여러 개의 게스트하우스나 여러 개의 모집글을 동시에 등록하고 관리하지 않는다.

사장님은 기존 모집글 1개를 계속 수정하고, 모집 상태를 변경하며 운영한다.

즉, 사장님 화면의 핵심 개념은 “여러 공고 관리”가 아니라 “우리 게하 스탭 모집 관리”이다.

### 운영 흐름

게스트하우스 등록

→ 스탭 모집글 작성

→ 공유 링크 생성

→ 지원자 접수

→ 지원자 관리

→ 모집 마감

→ 필요 시 모집글 수정 후 모집중으로 재개

### 모집 회차 정책

스탭핑 MVP에서는 모집글 row를 새로 만들지 않고, 기존 모집글을 수정해서 재사용한다.

다만 모집을 마감했다가 다시 모집중으로 재개하는 경우, 이전 모집과 새로운 모집을 구분하기 위해 `recruitment_cycle` 값을 사용한다.

최초 모집글 생성 시 `recruitment_cycle` 기본값은 `1`이다.

모집 마감 후 다시 모집중으로 재개할 때 `recruitment_cycle`을 증가시킨다.

이를 통해 동일 스탭은 같은 모집 회차에는 중복 지원할 수 없지만, 모집 마감 후 재오픈된 새 회차에는 다시 지원할 수 있다.

### 정책 기준

| 항목 | 정책 |
| --- | --- |
| 사장님 | 사장님 계정 1개당 게스트하우스 1개만 운영한다. |
| 게스트하우스 | 사장님 계정 기준 1개 등록을 MVP 기본 전제로 한다. |
| 모집글 | 게스트하우스 1개당 스탭 모집글 1개만 운영한다. |
| 새 모집 | 기존 모집글을 수정하고 `status`를 `open`으로 변경해 운영한다. |
| 모집 회차 | 모집 마감 후 재오픈 시 `recruitment_cycle`을 증가시킨다. |
| 모집 마감 | 기존 모집글의 `status`를 `closed`로 변경한다. |
| 끌어올리기 | `open` 상태의 모집글에서만 가능하다. |
| 여러 게스트하우스 | MVP에서는 지원하지 않는다. |
| 여러 공고 | MVP에서는 지원하지 않는다. |

### DB 제약 기준

MVP에서는 `guesthouses.owner_id`를 unique로 관리한다.

즉, 하나의 사장님 계정은 하나의 `guesthouses` row만 가질 수 있다.

MVP에서는 `job_posts.guesthouse_id`를 unique로 관리한다.

즉, 하나의 `guesthouse_id`는 하나의 `job_posts` row만 가질 수 있다.

지원 중복 방지는 `applications.job_post_id + applications.staff_id + applications.recruitment_cycle` 조합으로 처리한다.

즉, 동일 스탭은 같은 모집 회차에는 한 번만 지원할 수 있지만, 모집 마감 후 재오픈된 새 회차에는 다시 지원할 수 있다.

향후 여러 게스트하우스, 여러 포지션, 시즌별 모집, 파트별 모집을 지원하는 확장 단계에서는 `guesthouses.owner_id unique`, `job_posts.guesthouse_id unique` 정책을 제거할 수 있다.

## 3-2. 화면 용어 정책

DB 테이블명은 `job_posts`를 유지한다.

다만 사용자 화면에서는 “공고”보다 “스탭 모집글” 또는 “우리 게하 스탭 모집 관리”라는 표현을 우선 사용한다.

| 기존 표현 | MVP 화면 표현 |
| --- | --- |
| 공고 등록 | 스탭 모집글 작성 |
| 내 공고 관리 | 우리 게하 스탭 모집 관리 |
| 공고 수정 | 모집글 수정 |
| 공고 마감 | 모집 마감 |
| 공고 끌어올리기 | 모집글 끌어올리기 |
| 공고 목록 | 사용하지 않음 |
| 여러 공고 관리 | 사용하지 않음 |

---

# 4. enum / status 값 정의

## 4-1. 사용자 역할 enum

### enum 타입명

`user_role`

### 사용 컬럼

`profiles.role`

| DB 값 | 화면 표시명 | 설명 |
| --- | --- | --- |
| `staff` | 스탭 | 모집글을 탐색하고 지원하는 사용자 |
| `owner` | 사장님 | 게스트하우스와 스탭 모집글을 운영하는 사용자 |
| `admin` | 관리자 | 전체 회원, 모집글, 지원 내역을 관리하는 운영자 |

---

## 4-2. 모집글 상태 enum

### enum 타입명

`job_status`

### 사용 컬럼

`job_posts.status`

| DB 값 | 화면 표시명 | 설명 |
| --- | --- | --- |
| `open` | 모집중 | 모집글 노출, 지원 가능 |
| `closed` | 마감 | 지원 불가, 기본 모집글 리스트에서는 제외 |
| `hidden` | 숨김 | 일반 사용자에게 노출하지 않음 |

### 정책 메모

- `open` 상태만 지원 가능하다.
- `closed` 상태는 공유 링크 접근은 가능하지만 지원 버튼은 비활성화한다.
- `hidden` 상태는 공고 리스트와 공유 링크에서 모두 노출하지 않는다.
- 급구 여부는 모집글 상태가 아니므로 `is_urgent` boolean 컬럼으로 관리한다.
- 끌어올리기는 `open` 상태에서만 가능하다.
- `closed`, `hidden` 상태에서는 끌어올리기를 사용할 수 없다.

---

## 4-3. 지원 상태 enum

### enum 타입명

`application_status`

### 사용 컬럼

- `applications.status`
- `application_status_logs.from_status`
- `application_status_logs.to_status`

| DB 값 | 화면 표시명 | 설명 |
| --- | --- | --- |
| `submitted` | 지원 완료 | 스탭이 지원서를 제출한 상태 |
| `viewed` | 사장님 열람 | 사장님이 지원자 상세를 확인한 상태 |
| `accepted` | 채용합격 | 사장님이 채용합격 처리한 상태 |
| `rejected` | 불합격 | 사장님이 불합격 처리한 상태 |
| `canceled` | 지원취소 | 스탭이 지원을 취소한 상태 |

### 상태 전환 기준

| 현재 상태 | 변경 가능 상태 |
| --- | --- |
| `submitted` | `viewed`, `accepted`, `rejected`, `canceled` |
| `viewed` | `accepted`, `rejected`, `canceled` |
| `accepted` | 변경 불가 |
| `rejected` | 변경 불가 |
| `canceled` | 변경 불가 |

### 정책 메모

- 지원서 제출 직후 기본 상태는 `submitted`이다.
- 사장님이 지원자 상세를 처음 열람하면 `viewed`로 변경한다.
- 스탭은 `submitted`, `viewed` 상태에서만 지원취소할 수 있다.
- `accepted`, `rejected` 상태에서는 스탭이 직접 지원취소할 수 없다.
- `reviewing`, `contacted` 상태는 MVP에서 사용하지 않는다.

---

## 4-4. 성별 조건 enum

### enum 타입명

`gender_condition`

### 사용 컬럼

- `job_posts.gender_condition`
- `applications.gender`

| DB 값 | 화면 표시명 | 설명 |
| --- | --- | --- |
| `any` | 성별 무관 | 모집글에서 성별 무관 조건으로 사용 |
| `male` | 남성 | 남성 조건 또는 남성 지원자 |
| `female` | 여성 | 여성 조건 또는 여성 지원자 |

### 정책 메모

- `job_posts.gender_condition`에서는 `any`, `male`, `female` 모두 사용한다.
- `applications.gender`에서는 지원자 실제 성별이므로 화면에서 `male`, `female`만 선택하게 한다.
- MVP에서는 별도 enum을 나누지 않고 `gender_condition`을 공통 사용한다.

---

## 4-5. 스탭 경험 여부 enum

### enum 타입명

`experience_status`

### 사용 컬럼

`applications.experience_status`

| DB 값 | 화면 표시명 | 설명 |
| --- | --- | --- |
| `none` | 경험 없음 | 게스트하우스 스탭 경험 없음 |
| `experienced` | 경험 있음 | 게스트하우스 스탭 경험 있음 |

---

## 4-6. 급여/지원금 유형 enum

### enum 타입명

`stipend_type`

### 사용 컬럼

`job_posts.stipend_type`

| DB 값 | 화면 표시명 | 설명 |
| --- | --- | --- |
| `none` | 없음 | 급여 또는 지원금 없음 |
| `provided` | 있음 | 급여 또는 지원금 있음 |
| `negotiable` | 협의 | 사장님과 협의 필요 |
| `custom` | 직접 입력 | 상세 설명에 직접 입력 |

---

# 5. 테이블 및 컬럼 정의

## 5-1. profiles

Supabase Auth 사용자와 연결되는 프로필 테이블이다.

### 테이블명

`profiles`

| 컬럼명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | O | Supabase `auth.users.id`와 동일한 사용자 ID |
| `role` | user_role | O | 사용자 역할 |
| `name` | text | O | 사용자 이름 |
| `phone` | text | X | 연락처 |
| `email` | text | X | 이메일 |
| `created_at` | timestamptz | O | 생성일 |
| `updated_at` | timestamptz | O | 수정일 |

### 핵심 값

| 컬럼명 | 허용 값 |
| --- | --- |
| `role` | `staff`, `owner`, `admin` |

---

## 5-2. guesthouses

사장님이 등록하는 게스트하우스 정보 테이블이다.

### 테이블명

`guesthouses`

| 컬럼명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | O | 게스트하우스 ID |
| `owner_id` | uuid | O | 사장님 ID, `profiles.id` 참조 |
| `name` | text | O | 게스트하우스명 |
| `region` | text | O | 지역 |
| `address_text` | text | O | 주소 텍스트 |
| `map_url` | text | X | 네이버지도 링크 |
| `contact_method` | text | O | 연락처 또는 연락 수단 |
| `created_at` | timestamptz | O | 생성일 |
| `updated_at` | timestamptz | O | 수정일 |

### 제약 기준

| 제약 | 설명 |
| --- | --- |
| `owner_id` unique | MVP에서 사장님 1명당 게스트하우스 1개만 운영 |
| `owner_id` FK | `profiles.id` 참조 |

### 제외 컬럼

아래 컬럼은 MVP에서 사용하지 않는다.

| 컬럼명 | 제외 사유 |
| --- | --- |
| `latitude` | 지도 기반 탐색 기능이 MVP 범위가 아님 |
| `longitude` | 지도 기반 탐색 기능이 MVP 범위가 아님 |

### 정책 메모

- MVP에서는 사장님 계정 기준 하나의 게스트하우스 등록을 기본 전제로 한다.
- 사장님은 본인이 등록한 게스트하우스만 수정할 수 있다.
- 한 사장님 계정은 하나의 게스트하우스만 등록할 수 있다.

---

## 5-3. job_posts

사장님이 운영하는 스탭 모집글 테이블이다.

DB 테이블명은 `job_posts`를 유지하지만, 서비스 화면에서는 “공고”보다 “스탭 모집글”이라는 표현을 우선 사용한다.

### 테이블명

`job_posts`

| 컬럼명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | O | 모집글 ID |
| `guesthouse_id` | uuid | O | 게스트하우스 ID, `guesthouses.id` 참조 |
| `owner_id` | uuid | O | 사장님 ID, `profiles.id` 참조 |
| `slug` | text | O | 공유 링크용 고유 값 |
| `title` | text | O | 모집 제목 |
| `recruit_count` | integer | O | 모집 인원 |
| `gender_condition` | gender_condition | O | 성별 조건 |
| `age_condition` | text | X | 나이 조건 |
| `work_start_date` | date | O | 근무 시작일 |
| `min_work_period` | text | O | 최소 근무 기간 |
| `work_content` | text | O | 업무 내용 |
| `work_time` | text | O | 근무 시간 |
| `work_days_per_week` | integer | O | 주 N일 근무 |
| `off_days_per_week` | integer | O | 주 N일 휴무 |
| `stipend_type` | stipend_type | O | 급여/지원금 유형 |
| `stipend_description` | text | X | 급여/지원금 상세 설명 |
| `provides_accommodation` | boolean | O | 숙소 제공 여부 |
| `provides_meal` | boolean | O | 식사 제공 여부 |
| `is_urgent` | boolean | O | 급구 여부 |
| `preferred_conditions` | text | X | 우대사항 |
| `caution` | text | X | 주의사항 |
| `extra_info` | text | X | 기타 안내 |
| `description` | text | X | 상세 설명 |
| `status` | job_status | O | 모집글 상태 |
| `recruitment_cycle` | integer | O | 모집 회차 |
| `bumped_at` | timestamptz | X | 리스트 상단 노출 기준 시간 |
| `last_bumped_at` | timestamptz | X | 마지막 끌어올리기 시간 |
| `bump_count` | integer | O | 끌어올리기 누적 횟수 |
| `created_at` | timestamptz | O | 생성일 |
| `updated_at` | timestamptz | O | 수정일 |

### 핵심 값

| 컬럼명 | 허용 값 |
| --- | --- |
| `gender_condition` | `any`, `male`, `female` |
| `stipend_type` | `none`, `provided`, `negotiable`, `custom` |
| `status` | `open`, `closed`, `hidden` |

### 기본값 기준

| 컬럼명 | 기본값 |
| --- | --- |
| `status` | `open` |
| `provides_accommodation` | `false` |
| `provides_meal` | `false` |
| `is_urgent` | `false` |
| `recruitment_cycle` | `1` |
| `bump_count` | `0` |
| `bumped_at` | 모집글 생성 시점 |
| `last_bumped_at` | `null` |

### 제약 기준

| 제약 | 설명 |
| --- | --- |
| `slug` unique | 공유 링크 중복 방지 |
| `guesthouse_id` unique | MVP에서 게스트하우스 1개당 모집글 1개만 운영 |
| `owner_id` FK | `profiles.id` 참조 |
| `guesthouse_id` FK | `guesthouses.id` 참조 |
| `recruit_count > 0` | 모집 인원은 1명 이상 |
| `work_days_per_week between 1 and 7` | 주 근무일 범위 제한 |
| `off_days_per_week between 0 and 6` | 주 휴무일 범위 제한 |
| `bump_count >= 0` | 끌어올리기 횟수 음수 방지 |

### 정책 메모

- MVP에서는 하나의 게스트하우스가 하나의 스탭 모집글만 운영한다.
- 사장님은 여러 개의 모집글을 동시에 등록하지 않는다.
- 기존 모집글을 수정하고, `status`를 `open` 또는 `closed`로 변경하며 운영한다.
- 모집 마감 후 재오픈 시 `recruitment_cycle`을 증가시킨다.
- `work_days_per_week`와 `off_days_per_week`는 필수 입력값이다.
- `work_days_per_week + off_days_per_week = 7` 조건은 강제하지 않는다.
- 급구 여부는 `status`가 아니라 `is_urgent`로 관리한다.
- 공유 링크는 `slug`를 기준으로 생성한다.
- 사장님 모집글 조회와 권한 처리를 단순화하기 위해 `owner_id`를 별도로 저장한다.
- `job_posts.owner_id`는 `guesthouses.owner_id`와 반드시 일치해야 한다.
- DB 구현 시 `job_posts` insert/update 시점에 `guesthouse_id` 기준으로 `owner_id`를 자동 세팅한다.
- 향후 여러 포지션 또는 시즌별 모집을 지원할 경우 `guesthouse_id` unique 정책은 제거할 수 있다.

---

## 5-4. applications

스탭이 모집글에 제출하는 지원서 테이블이다.

### 테이블명

`applications`

| 컬럼명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | O | 지원 ID |
| `job_post_id` | uuid | O | 모집글 ID, `job_posts.id` 참조 |
| `staff_id` | uuid | O | 스탭 ID, `profiles.id` 참조 |
| `recruitment_cycle` | integer | O | 지원한 모집 회차 |
| `name` | text | O | 지원자 이름 |
| `age` | integer | O | 지원자 나이 |
| `gender` | gender_condition | O | 지원자 성별 |
| `phone` | text | O | 연락처 |
| `representative_photo_path` | text | O | 지원자 대표사진 Storage path |
| `available_start_date` | date | O | 입도 가능일 |
| `available_work_period` | text | O | 가능 근무 기간 |
| `experience_status` | experience_status | O | 스탭 경험 여부 |
| `introduction` | text | O | 간단 자기소개 |
| `status` | application_status | O | 지원 상태 |
| `created_at` | timestamptz | O | 지원일 |
| `updated_at` | timestamptz | O | 수정일 |

### 핵심 값

| 컬럼명 | 허용 값 |
| --- | --- |
| `gender` | `male`, `female` |
| `experience_status` | `none`, `experienced` |
| `status` | `submitted`, `viewed`, `accepted`, `rejected`, `canceled` |

### 기본값 기준

| 컬럼명 | 기본값 |
| --- | --- |
| `status` | `submitted` |

### 제약 기준

| 제약 | 설명 |
| --- | --- |
| `job_post_id + staff_id + recruitment_cycle` unique | 동일 스탭의 동일 모집 회차 중복 지원 방지 |
| `job_post_id` FK | `job_posts.id` 참조 |
| `staff_id` FK | `profiles.id` 참조 |
| `gender <> 'any'` | 지원자 성별에는 성별 무관 값 저장 불가 |
| `age > 0` | 나이는 1 이상 |

### 정책 메모

- 동일 스탭은 동일 모집 회차에 한 번만 지원할 수 있다.
- 모집 마감 후 재오픈되어 `recruitment_cycle`이 증가하면 같은 스탭도 다시 지원할 수 있다.
- 중복 지원 방지는 `job_post_id + staff_id + recruitment_cycle` 조합으로 처리한다.
- 대표사진 파일은 Supabase Storage에 업로드하고, DB에는 `representative_photo_path`만 저장한다.
- 대표사진 조회 시에는 Storage path를 기준으로 signed URL을 발급해 화면에 표시한다.
- MVP에서는 지원서 수정 기능을 제공하지 않는다.
- 스탭은 `open` 상태의 모집글에만 지원할 수 있다.
- 스탭은 `submitted`, `viewed` 상태에서만 지원취소할 수 있다.

---

## 5-5. application_status_logs

지원 상태 변경 이력을 저장하는 로그 테이블이다.

### 테이블명

`application_status_logs`

| 컬럼명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | O | 로그 ID |
| `application_id` | uuid | O | 지원 ID, `applications.id` 참조 |
| `changed_by` | uuid | O | 상태를 변경한 사용자 ID, `profiles.id` 참조 |
| `from_status` | application_status | X | 이전 지원 상태 |
| `to_status` | application_status | O | 변경된 지원 상태 |
| `memo` | text | X | 변경 메모 |
| `created_at` | timestamptz | O | 변경일 |

### 핵심 값

| 컬럼명 | 허용 값 |
| --- | --- |
| `from_status` | `submitted`, `viewed`, `accepted`, `rejected`, `canceled`, `null` |
| `to_status` | `submitted`, `viewed`, `accepted`, `rejected`, `canceled` |

### 정책 메모

- 지원서 최초 생성 시 로그를 남긴다면 `from_status`는 `null`, `to_status`는 `submitted`로 저장할 수 있다.
- 사장님이 지원자 상세를 처음 열람할 때 `submitted`에서 `viewed`로 변경하고 로그를 남긴다.
- 사장님이 지원 상태를 변경하면 변경 전/후 상태를 기록한다.
- MVP에서는 로그를 화면에 노출하지 않아도 DB에는 저장한다.

---

## 5-6. job_post_update_logs

모집글 주요 조건 수정 이력을 저장하는 로그 테이블이다.

### 테이블명

`job_post_update_logs`

| 컬럼명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | O | 로그 ID |
| `job_post_id` | uuid | O | 모집글 ID, `job_posts.id` 참조 |
| `changed_by` | uuid | O | 수정한 사용자 ID, `profiles.id` 참조 |
| `field_name` | text | O | 수정된 컬럼명 |
| `old_value` | text | X | 이전 값 |
| `new_value` | text | X | 변경 값 |
| `created_at` | timestamptz | O | 수정일 |

### 로그 저장 대상 컬럼

| 컬럼명 | 설명 |
| --- | --- |
| `work_start_date` | 근무 시작일 |
| `min_work_period` | 최소 근무 기간 |
| `work_content` | 업무 내용 |
| `work_time` | 근무 시간 |
| `work_days_per_week` | 주 N일 근무 |
| `off_days_per_week` | 주 N일 휴무 |
| `stipend_type` | 급여/지원금 유형 |
| `stipend_description` | 급여/지원금 상세 설명 |
| `provides_accommodation` | 숙소 제공 여부 |
| `provides_meal` | 식사 제공 여부 |

### 정책 메모

- 사장님이 모집글 주요 조건을 수정하면 변경 이력을 저장한다.
- MVP에서는 이력을 화면에 노출하지 않아도 DB에는 저장한다.
- 단순 문구 수정이 아닌 근무 조건, 급여, 숙소/식사 제공 조건 변경은 로그 저장 대상이다.

---

## 5-7. admin_logs

관리자 운영 이력을 저장하는 로그 테이블이다.

### 테이블명

`admin_logs`

| 컬럼명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | O | 로그 ID |
| `admin_id` | uuid | O | 관리자 ID, `profiles.id` 참조 |
| `action` | text | O | 관리자 작업명 |
| `target_table` | text | O | 대상 테이블명 |
| `target_id` | uuid | X | 대상 데이터 ID |
| `memo` | text | X | 관리자 메모 |
| `created_at` | timestamptz | O | 생성일 |

### action 값 예시

| 값 | 설명 |
| --- | --- |
| `hide_job_post` | 모집글 숨김 처리 |
| `restore_job_post` | 숨김 모집글 복구 |
| `view_application` | 지원 내역 확인 |
| `update_user_role` | 사용자 역할 변경 |

---

# 6. 최종 테이블명 목록

| 테이블명 | 설명 |
| --- | --- |
| `profiles` | 사용자 프로필 |
| `guesthouses` | 게스트하우스 정보 |
| `job_posts` | 스탭 모집글 |
| `applications` | 스탭 지원서 |
| `application_status_logs` | 지원 상태 변경 로그 |
| `job_post_update_logs` | 모집글 수정 로그 |
| `admin_logs` | 관리자 운영 로그 |

---

# 7. 최종 enum 타입 목록

| enum 타입명 | 사용 목적 |
| --- | --- |
| `user_role` | 사용자 역할 |
| `job_status` | 모집글 상태 |
| `application_status` | 지원 상태 |
| `gender_condition` | 성별 조건 및 지원자 성별 |
| `experience_status` | 스탭 경험 여부 |
| `stipend_type` | 급여/지원금 유형 |

---

# 8. 최종 status 값 요약

## 사용자 역할

| DB 값 | 화면 표시명 |
| --- | --- |
| `staff` | 스탭 |
| `owner` | 사장님 |
| `admin` | 관리자 |

## 모집글 상태

| DB 값 | 화면 표시명 |
| --- | --- |
| `open` | 모집중 |
| `closed` | 마감 |
| `hidden` | 숨김 |

## 지원 상태

| DB 값 | 화면 표시명 |
| --- | --- |
| `submitted` | 지원 완료 |
| `viewed` | 사장님 열람 |
| `accepted` | 채용합격 |
| `rejected` | 불합격 |
| `canceled` | 지원취소 |

## 성별 조건

| DB 값 | 화면 표시명 |
| --- | --- |
| `any` | 성별 무관 |
| `male` | 남성 |
| `female` | 여성 |

## 스탭 경험 여부

| DB 값 | 화면 표시명 |
| --- | --- |
| `none` | 경험 없음 |
| `experienced` | 경험 있음 |

## 급여/지원금 유형

| DB 값 | 화면 표시명 |
| --- | --- |
| `none` | 없음 |
| `provided` | 있음 |
| `negotiable` | 협의 |
| `custom` | 직접 입력 |

---

# 9. 이번 버전에서 확정된 변경사항

| 항목 | 결정 |
| --- | --- |
| 사장님 화면 구조 | 여러 공고 관리가 아니라 우리 게하 스탭 모집글 1개 관리 |
| 게스트하우스 운영 정책 | 사장님 1명당 게스트하우스 1개만 운영 |
| 모집글 운영 정책 | MVP에서는 게스트하우스 1개당 모집글 1개만 운영 |
| DB 제약 | `guesthouses.owner_id` unique 적용 |
| DB 제약 | `job_posts.guesthouse_id` unique 적용 |
| 모집 회차 | `job_posts.recruitment_cycle`로 관리 |
| 재지원 정책 | 모집 마감 후 재오픈된 새 회차에는 같은 스탭도 다시 지원 가능 |
| 중복 지원 방지 | `applications.job_post_id + applications.staff_id + applications.recruitment_cycle` 조합으로 관리 |
| 지원 상태 | `submitted`, `viewed`, `accepted`, `rejected`, `canceled`만 사용 |
| 사장님 열람 상태 | `viewed`로 관리 |
| 연락완료 상태 | MVP에서 제외 |
| 검토중 상태 | MVP에서 제외 |
| 게스트하우스 위도/경도 | MVP에서 제외 |
| 주 N일 근무 | `work_days_per_week` 필수 |
| 주 N일 휴무 | `off_days_per_week` 필수 |
| 근무일+휴무일 합산 | 7일 합산 조건은 강제하지 않음 |
| 지원자 대표사진 | `representative_photo_path` 필수 |
| 급구 여부 | `is_urgent` boolean으로 관리 |
| 공유 링크 | `job_posts.slug`로 관리 |
| 모집글 owner_id | `guesthouses.owner_id` 기준으로 자동 세팅 |
| 모집글 끌어올리기 | `open` 상태에서만 가능, 24시간 1회 제한 |
| 모집 마감 | `job_posts.status = closed` |
| 모집 재개 | `job_posts.status = open`, `recruitment_cycle` 증가 |

---

# 10. 개발 전 최종 고정 기준

개발자는 아래 기준을 변경하지 않고 구현한다.

```
테이블명:
profiles
guesthouses
job_posts
applications
application_status_logs
job_post_update_logs
admin_logs

MVP 운영 정책:
owner 1명당 guesthouse 1개
guesthouse 1개당 job_post 1개
모집글은 하나를 계속 수정해서 재사용
모집 마감 후 재오픈 시 recruitment_cycle 증가

DB 제약:
guesthouses.owner_id unique
job_posts.guesthouse_id unique
applications.job_post_id + applications.staff_id + applications.recruitment_cycle unique

모집글 상태:
open
closed
hidden

지원 상태:
submitted
viewed
accepted
rejected
canceled

사용자 역할:
staff
owner
admin

성별 조건:
any
male
female

지원자 성별:
male
female

경험 여부:
none
experienced

급여/지원금 유형:
none
provided
negotiable
custom

대표사진:
representative_photo_path
```