# Staffing Design System

이 문서는 `/design-system` 페이지와 현재 구현된 공통 UI 컴포넌트를 기준으로 작성한 프로젝트 디자인 시스템이다. 새 디자인을 제안하는 문서가 아니라, 실제 코드에 존재하는 토큰과 컴포넌트 사용 규칙을 QA 기준으로 정리한다.

## Design Philosophy

- 서비스 방향성: 제주 게스트하우스 스탭 모집을 빠르게 탐색하고, 사장님은 모집글과 지원자를 가볍게 관리할 수 있는 실용형 서비스다.
- 디자인 철학: beige, white, primary CTA 중심의 따뜻하고 깔끔한 UI를 유지한다. 장식보다 정보 위계, 읽기 쉬움, 조작 명확성을 우선한다.
- UX 원칙: 사용자는 현재 상태, 다음 행동, 위험 행동을 즉시 구분할 수 있어야 한다.
- CTA 원칙: 화면 또는 카드 안의 primary solid CTA는 최대 1개를 원칙으로 한다. 저장, 등록, 지원, 검색처럼 흐름을 완료하는 행동에만 강하게 사용한다.
- 정보 계층 원칙: 페이지 제목은 `PageHeader`, 섹션 제목은 `Section`, 카드 제목은 `CardTitle` 또는 `text-title`로 계층을 나눈다.

## Color System

### Brand

| Token | Hex | Use |
| --- | --- | --- |
| `primary-50` | `#fff3f0` | soft primary background, active nav background |
| `primary-100` | `#ffe1d9` | soft primary border, focus shadow |
| `primary-200` | `#ffc3b3` | soft primary hover border |
| `primary-300` | `#ff9b84` | accent scale |
| `primary-400` | `#f9735b` | accent scale |
| `primary-500` | `#E35336` | main CTA, brand mark |
| `primary-600` | `#c93e24` | primary hover |
| `primary-700` | `#a8321e` | primary active, primary text |
| `primary-800` | `#842a1c` | strong primary text |
| `primary-900` | `#5f2119` | deepest primary |
| `beige` | `#F5F5DC` | warm placeholder, icon empty background |
| `sand` | `#F4A460` | supporting brand color |
| `brown` | `#A0522D` | beige/sand text |
| `sand-light` | `#FAF4EB` | warm subtle background |
| `surface` | `#FAFAF8` | default page background |

### Neutral

| Token | Hex | Use |
| --- | --- | --- |
| `neutral-0` | `#FFFFFF` | cards, inputs, headers |
| `neutral-50` | `#FAFAFA` | subtle hover, public listing surfaces |
| `neutral-100` | `#F5F5F5` | borders, skeleton, secondary button |
| `neutral-200` | `#E5E5E5` | default border |
| `neutral-300` | `#D4D4D4` | stronger border |
| `neutral-400` | `#A3A3A3` | metadata, disabled text |
| `neutral-500` | `#737373` | secondary body text |
| `neutral-600` | `#525252` | nav text, default badge text |
| `neutral-700` | `#404040` | outline button text |
| `neutral-800` | `#262626` | body text |
| `neutral-900` | `#171717` | headings |

### Semantic

| Token | Hex | Use |
| --- | --- | --- |
| `success` | `#16A34A` | success state only |
| `success-light` | `#F0FDF4` | accepted badge background |
| `success-muted` | `#166534` | accepted/success text |
| `warning` | `#F59E0B` | warning state only |
| `warning-light` | `#FFFBEB` | warning background |
| `danger` | `#DC2626` | destructive state |
| `danger-light` | `#FEF2F2` | danger background/border |
| `danger-muted` | `#B91C1C` | danger outline text |
| `info` | `#2563EB` | info state only |
| `info-light` | `#EFF6FF` | info background |

### Color Rules

- Brand emphasis uses `primary-500`; hover uses `primary-600`; active uses `primary-700`.
- Soft primary uses `primary-50` background, `primary-100/200` border, and `primary-600/700` text.
- Semantic colors are status-only. Do not use success, warning, danger, or info as decorative brand colors.
- Text should use `neutral-*` tokens. Avoid raw `gray-*`, `green-*`, `red-*`, arbitrary hex, and one-off opacity unless the component is a deliberate overlay.
- Disabled states use `neutral-100/200` background or border and `neutral-400` text.

## Typography

Font: Pretendard 400, 500, 600, 700 with system fallback.

| Class | Desktop | Mobile | Weight | Line height |
| --- | --- | --- | --- | --- |
| `text-display` | 40px | 32px | 700 | 48px / 40px |
| `text-h1` | 32px | 28px | 700 | 40px / 36px |
| `text-h2` | 26px | 24px | 700 | 34px / 32px |
| `text-h3` | 22px | 22px | 700 | 30px |
| `text-title` | 18px | 18px | 600 | 26px |
| `text-body` | 16px | 16px | 400 | 24px |
| `text-body-sm` | 14px | 14px | 400 | 22px |
| `text-caption` | 12px | 12px | 400 | 18px |

Rules:

- Headings default to `font-weight: 700` and `neutral-800/900`.
- Body copy defaults to 16px / 24px, `neutral-800`.
- Use `font-semibold` for labels, badges, button text, and important metadata.
- Avoid arbitrary text sizes. Current exceptions are compact filter/job chips (`text-[11px]`, `text-[12px]`, `text-[13px]`) and should remain limited.
- Letter spacing should stay default. Do not use negative letter spacing.

## Layout

- `page-container`: width `100%`, max width `1120px`, centered, padding inline `20px` mobile and `32px` from `768px`.
- Default page background: `bg-surface`.
- Header height: `h-14` for owner and staff headers.
- Owner layout: header, mobile owner nav on small screens, side nav from `md`, content in `page-container py-5 md:py-7`.
- Public app header: same `page-container` and `h-14`.
- Main content pages use `PageHeader` at top with `mb-6 md:mb-7`.
- Public listing pages may use wider content containers for grid density, but header and focused management pages should align to `page-container`.
- Bottom navigation is not a primary system element in this repo; owner mobile navigation uses horizontal pill links.

## Spacing

- Page vertical padding: `py-5 md:py-7` inside owner layout, `py-8 md:py-10` for onboarding, `py-6 md:py-8` for staff focused pages.
- Section spacing: `Section` supports `sm: mb-5`, `md: mb-7`, `lg: mb-10`.
- Section header gap: `mb-4`, internal `gap-1` or `gap-2`.
- Card padding: `sm: p-4`, `md: p-4 md:p-5`, `lg: p-5 md:p-6`, `none`.
- Card footer: `mt-4`, `gap-3`.
- Form field gap: `gap-1.5`.
- Form section/grid gap: usually `gap-5`; form-level gap `gap-8`.
- Button internal gap: `gap-2`.

## Radius

| Token | Value | Use |
| --- | --- | --- |
| `sm` | 8px | compact controls where needed |
| `md` | 12px | default buttons, cards, inputs |
| `lg` | 16px | larger media, modal panels when needed |
| `xl` | 20px | rare large surfaces |
| `2xl` | 24px | rare large surfaces |
| `pill` | 999px | badges, nav pills, filter pills |

Rules:

- Default interactive controls use `rounded-md`.
- Badges use `rounded-pill`.
- Avoid arbitrary radius values and excessive rounding for management UI.

## Shadow

| Token | Value | Use |
| --- | --- | --- |
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` | default card/sidebar |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.06)` | elevated surface if needed |
| `shadow-lg` | `0 12px 24px rgba(0,0,0,0.08)` | modal/dropdown only |

Rules:

- Cards use `shadow-sm`.
- Modals and dropdown panels may use `shadow-lg`.
- Avoid heavy decorative shadows.

## Button

Base: `inline-flex`, centered, `gap-2`, `rounded-md`, `font-semibold`, `transition-colors duration-150`, `focus-ring`, disabled cursor.

### Sizes

| Size | Height | Padding | Typography |
| --- | --- | --- | --- |
| `sm` | `h-9` | `px-3` | `text-body-sm` |
| `md` | `h-11` | `px-5` | `text-body-sm` |
| `lg` | `h-12` | `px-6` | `text-body` |

### Variants

| Variant | Style | Use |
| --- | --- | --- |
| `primary` | `bg-primary-500`, `text-white`, hover `primary-600`, active `primary-700` | final CTA: save, register, apply, search, one key action per card |
| `soft-primary` | border `primary-100`, bg `primary-50`, text `primary-600`, hover bg `primary-100` | important but secondary management actions such as bump/urgent |
| `secondary` | bg `neutral-100`, text `neutral-700` | neutral secondary action |
| `outline` | white bg, neutral border/text, hover `neutral-50` | navigation, secondary management action |
| `outline-danger` | white bg, danger-light border, danger-muted text, hover danger-light alpha | destructive or caution action without solid red |
| `danger` | solid danger-muted with white text | rare destructive primary; generally avoid in owner management |
| `ghost` | transparent, neutral text, hover neutral background | low-emphasis utility |

Disabled:

- Background/border moves to neutral tokens.
- Text uses `neutral-400`.
- Disabled buttons must not look clickable.

CTA hierarchy rules:

- One card should not show multiple solid primary buttons.
- Owner management screens prefer one solid CTA and secondary actions as soft/outline.
- Danger actions should be visible but not louder than the primary CTA unless the page is explicitly about deletion.

## Badge

Base: `inline-flex h-7 items-center rounded-pill px-3 text-[13px] font-semibold leading-none whitespace-nowrap`.

Job status:

- `open`: `primary-50` background, `primary-700` text.
- `closed`: `neutral-100` background, `neutral-600` text.
- `hidden`: `neutral-800` background, `neutral-0` text.

Application status:

- `submitted`: `primary-50` / `primary-700`.
- `viewed`: `sand-light` / `brown`.
- `accepted`: `success-light` / `success-muted`.
- `rejected`: `danger-light` / `danger-muted`.
- `canceled`: `neutral-100` / `neutral-500`.

Feature badges:

- `urgent`: `primary-500` / white.
- `accommodation`, `meal`: `beige` / `brown`.

Rules:

- Badges show state only. They are not CTAs.
- Owner status pills must remain readable and not shrink below the shared badge baseline.
- Do not repeat the same status text next to a status badge.

## Card

Base card: `rounded-md border border-neutral-100 bg-neutral-0 shadow-sm`.

Variants:

- Default content card: `padding="md"`.
- Compact card: `padding="sm"`.
- Large card: `padding="lg"`.
- Media/list card with custom interior: `padding="none"`.
- Hoverable card: subtle border/background transition only.

Rules:

- Do not use heavy shadows on cards.
- Avoid nested cards unless the inner surface represents a repeated list item or a true panel.
- Interactive cards need `focus-ring`, hover feedback, and no click conflict with inner buttons.

## Form

Inputs, textarea, select:

- Label: `text-body-sm font-semibold text-neutral-800`.
- Required mark: `text-danger` `*`.
- Input height: `h-11`.
- Border: `neutral-200`, focus border `primary-500`, focus ring via `focus-ring`.
- Placeholder: `neutral-400`.
- Error: `border-danger`, message `text-[13px] text-danger`.
- Helper: `text-[13px] text-neutral-500`.
- Disabled: `bg-neutral-50 text-neutral-400`.

Checkbox:

- Size `h-5 w-5`, rounded, accent `primary-500`.
- Label/body uses `text-body-sm`; helper uses `text-[13px]`.

Current gaps:

- Radio, switch, date picker, and custom dropdown are not standalone shared UI components yet. Existing native date inputs and custom filter panel should follow the same field height, radius, border, and focus rules.

## Modal

Implemented owner action modal:

- Overlay: fixed full screen, neutral dark alpha.
- Panel: white/neutral background, `rounded-md`, `p-5`, `shadow-lg`.
- Title: `text-title text-neutral-900`.
- Description: `text-body-sm text-neutral-600`.
- Error area: `danger-light` background/border and `danger-muted` text.
- Confirm/cancel actions use Button variants.
- Buttons show processing state during action.

Rules:

- Use custom modal for owner destructive/major state actions.
- Avoid `window.alert` and `window.confirm` for service UI actions.

## Dropdown

- Dropdown-like panels use white background, neutral border, `rounded-md` or `rounded-lg` for larger bottom sheets, and `shadow-lg`.
- Close buttons need a visible touch target and `focus-ring`.
- Filter dropdown/bottom sheet is the current main dropdown pattern.

## Pagination

- Center aligned.
- Previous/next controls use `<` and `>`.
- Current page uses primary background and white text.
- No extra `2/2 페이지` text.
- Compact button size: around `h-7 min-w-7`, `text-caption`.
- Disabled arrows use neutral disabled color and do not look active.

## Empty State

- Implemented by `EmptyState`.
- Uses a `Card`, centered content, optional icon, title `text-title`, description `text-body-sm`, action margin `mt-6`.
- Empty states should explain what is missing and provide one useful next action when appropriate.

## Loading

- Global loading uses skeleton blocks inside a card.
- Skeletons use neutral backgrounds and defined radius.
- Prefer lightweight skeletons over spinners for page-level loading.

## Skeleton

- Use `bg-neutral-100`, `rounded-md`.
- Match the approximate size of real content.
- Avoid colorful skeletons.

## Icon

- Current code mostly uses text and simple letter marks.
- Brand mark is an `S` in `primary-500` square with white text.
- If icon buttons are added, ensure `aria-label`, `focus-ring`, and at least 36px touch target.

## Motion

- Default interaction: `transition-colors duration-150`.
- Image hover may use small scale transform, e.g. `scale-[1.02]`.
- Modal/dropdown animation is not yet systemized.
- Avoid decorative motion that distracts from forms and management tasks.

## Responsive

- Mobile: base styles, `page-container` side padding 20px, stacked headers/actions.
- Tablet: `md` starts at 768px, page padding 32px, owner side nav appears.
- Desktop: `page-container` max 1120px; public listing may intentionally use wider grids.
- Buttons wrap on mobile when needed; use full-width only when it improves scanability.
- Text should truncate or line-clamp long guesthouse/job names rather than causing horizontal scroll.

## Accessibility

- Use `focus-ring` on interactive custom elements.
- Labels should be connected by `htmlFor`/`id`.
- Error messages should be referenced by `aria-describedby`.
- Invalid fields use `aria-invalid`.
- Links styled as cards need clear focus state.
- Touch targets should generally be at least 36px high; primary controls are 44px+.
- Ensure primary solid buttons have white text. Soft/outline buttons should not force white text.
- Semantic color must not be the only signal; use status labels.

## Component Rules

- Use existing UI components before adding one-off markup: `Button`, `ButtonLink`, `Card`, `Badge`, `Input`, `Textarea`, `Select`, `Checkbox`, `PageHeader`, `Section`, `EmptyState`.
- Screen/card primary CTA: maximum 1 solid primary.
- Card inside card is discouraged unless it represents a contained repeated item or preview.
- Use design color tokens, not raw `gray-*`, `green-*`, `red-*`, or arbitrary hex.
- Use typography utility classes, not raw `text-sm/text-base`, except known compact chips.
- Use defined radius tokens only.
- Use `shadow-sm` for cards and reserve `shadow-lg` for modals/dropdowns.
- Use spacing scale through Tailwind utilities already present in the system.
- Status colors and labels must be consistent through badge components.
- Owner management destructive actions should be outline danger, not solid red by default.
- Server actions, auth ownership checks, status values, API shape, DB schema, and migrations are outside the design-system editing scope.
