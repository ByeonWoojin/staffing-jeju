import {
  AccommodationBadge,
  ApplicationStatusBadge,
  Button,
  ButtonLink,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  Input,
  JobStatusBadge,
  MealBadge,
  PageHeader,
  Section,
  Select,
  Textarea,
  UrgentBadge,
} from "@/components/ui";
import { cn } from "@/lib/cn";

const BRAND_COLORS = [
  { name: "Primary", hex: "#E35336", className: "bg-primary-500" },
  { name: "Beige", hex: "#F5F5DC", className: "bg-beige" },
  { name: "Sand", hex: "#F4A460", className: "bg-sand" },
  { name: "Brown", hex: "#A0522D", className: "bg-brown" },
] as const;

const PRIMARY_SCALE = [
  { name: "50", className: "bg-primary-50" },
  { name: "100", className: "bg-primary-100" },
  { name: "200", className: "bg-primary-200" },
  { name: "300", className: "bg-primary-300" },
  { name: "400", className: "bg-primary-400" },
  { name: "500", className: "bg-primary-500" },
  { name: "600", className: "bg-primary-600" },
  { name: "700", className: "bg-primary-700" },
  { name: "800", className: "bg-primary-800" },
  { name: "900", className: "bg-primary-900" },
] as const;

const SEMANTIC_COLORS = [
  { name: "Success", hex: "#16A34A", className: "bg-success" },
  { name: "Warning", hex: "#F59E0B", className: "bg-warning" },
  { name: "Danger", hex: "#DC2626", className: "bg-danger" },
  { name: "Info", hex: "#2563EB", className: "bg-info" },
] as const;

function ColorSwatch({
  name,
  hex,
  className,
  size = "lg",
}: {
  name: string;
  hex?: string;
  className: string;
  size?: "lg" | "sm";
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0">
      <div
        className={cn(
          className,
          size === "lg" ? "h-20 md:h-24" : "h-8",
        )}
      />
      <div className={size === "lg" ? "px-3 py-2.5" : "px-2 py-1"}>
        <p
          className={
            size === "lg"
              ? "text-body-sm font-semibold text-neutral-800"
              : "text-caption text-neutral-600"
          }
        >
          {name}
        </p>
        {hex && (
          <p className="text-caption text-neutral-400">{hex}</p>
        )}
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="page-container py-8 md:py-12">
        <PageHeader
          title="스탭핑 디자인 시스템"
          description="Beige · White · Primary CTA 중심의 따뜻하고 깔끔한 UI"
          action={
            <ButtonLink href="/owner" variant="outline">
              Owner 홈 보기
            </ButtonLink>
          }
        />

        <Section title="Typography" description="Pretendard 기반 타이포그래피">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <p className="text-display">Display 40px</p>
              <p className="text-h1">Heading 1 — 32px</p>
              <p className="text-h2">Heading 2 — 26px</p>
              <p className="text-h3">Heading 3 — 22px</p>
              <p className="text-title">Title — 18px semibold</p>
              <p className="text-body">Body — 16px regular</p>
              <p className="text-body-sm">Body Small — 14px</p>
              <p className="text-caption">Caption — 12px</p>
            </CardContent>
          </Card>
        </Section>

        <Section
          title="Brand Colors"
          description="서비스 전반에서 사용하는 핵심 브랜드 컬러"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BRAND_COLORS.map((color) => (
              <ColorSwatch
                key={color.name}
                name={color.name}
                hex={color.hex}
                className={color.className}
              />
            ))}
          </div>
        </Section>

        <Section
          title="Primary Scale"
          description="Primary 500 = #E35336 기준 농도 단계"
          spacing="sm"
        >
          <Card padding="sm">
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {PRIMARY_SCALE.map((step) => (
                <ColorSwatch
                  key={step.name}
                  name={step.name}
                  className={step.className}
                  size="sm"
                />
              ))}
            </div>
          </Card>
        </Section>

        <Section
          title="Semantic Colors"
          description="상태 표시가 필요할 때만 사용하는 보조 색상"
          spacing="sm"
        >
          <Card padding="sm">
            <div className="grid grid-cols-4 gap-2 max-w-md">
              {SEMANTIC_COLORS.map((color) => (
                <ColorSwatch
                  key={color.name}
                  name={color.name}
                  hex={color.hex}
                  className={color.className}
                  size="sm"
                />
              ))}
            </div>
            <p className="mt-3 text-caption text-neutral-400">
              채용합격, 불합격, 경고 등 상태 구분에만 사용합니다. 브랜드 UI
              강조색으로 쓰지 않습니다.
            </p>
          </Card>
        </Section>

        <Section title="Buttons" description="Primary CTA 하나만 명확하게 강조">
          <Card>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-wrap gap-3">
                <Button>Primary CTA</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button disabled>Disabled</Button>
              </div>
              <div className="border-t border-neutral-100 pt-4">
                <p className="mb-3 text-caption text-neutral-500">
                  삭제·마감 등 위험 행동 — outline danger 우선 사용
                </p>
                <Button variant="outline-danger" size="sm">
                  공고 마감
                </Button>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section title="Form Controls">
          <Card>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <Input
                label="게스트하우스 이름"
                placeholder="예: 제주 바람 게스트하우스"
                helperText="지원자에게 표시되는 이름입니다."
              />
              <Input
                label="연락처"
                placeholder="010-0000-0000"
                error="올바른 연락처를 입력해주세요."
              />
              <Select label="성별 조건" placeholder="선택해주세요">
                <option value="any">성별 무관</option>
                <option value="male">남성</option>
                <option value="female">여성</option>
              </Select>
              <div className="md:col-span-2">
                <Textarea
                  label="공고 상세"
                  placeholder="근무 내용, 일정, 제공 혜택 등을 작성해주세요."
                />
              </div>
              <Checkbox
                label="숙소 제공"
                description="스탭에게 숙소를 제공합니다."
              />
            </CardContent>
          </Card>
        </Section>

        <Section title="Cards">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>기본 카드</CardTitle>
                <CardDescription>
                  white 배경 + border, shadow는 최소화
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-body-sm text-neutral-600">
                  게스트하우스 요약, 공고 카드, 지원자 카드 등에 사용합니다.
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="outline">
                  상세 보기
                </Button>
              </CardFooter>
            </Card>

            <Card hoverable>
              <CardHeader>
                <CardTitle>Hoverable 카드</CardTitle>
                <CardDescription>
                  목록 hover 시 border/shadow만 은은하게
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-body-sm text-neutral-600">
                  공고 목록, 지원자 목록 등 클릭 가능한 카드에 사용합니다.
                </p>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section title="Badges" description="상태 표시 — 연한 배경 + 차분한 텍스트">
          <Card>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-wrap gap-2">
                <span className="w-full text-body-sm font-semibold text-neutral-600">
                  공고 상태
                </span>
                <JobStatusBadge status="open" />
                <JobStatusBadge status="closed" />
                <JobStatusBadge status="hidden" />
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="w-full text-body-sm font-semibold text-neutral-600">
                  지원 상태
                </span>
                <ApplicationStatusBadge status="submitted" />
                <ApplicationStatusBadge status="viewed" />
                <ApplicationStatusBadge status="accepted" />
                <ApplicationStatusBadge status="rejected" />
                <ApplicationStatusBadge status="canceled" />
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="w-full text-body-sm font-semibold text-neutral-600">
                  기타
                </span>
                <UrgentBadge />
                <AccommodationBadge />
                <MealBadge />
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section title="Empty State">
          <EmptyState
            title="아직 등록한 공고가 없습니다."
            description="첫 공고를 등록하고 스탭 모집을 시작해보세요."
            action={<Button>공고 등록하기</Button>}
          />
        </Section>
      </div>
    </div>
  );
}
