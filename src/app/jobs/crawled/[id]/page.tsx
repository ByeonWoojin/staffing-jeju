import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { getCrawledChips } from "@/components/jobs/CrawledJobsSection";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { getCurrentAuthUser } from "@/lib/auth/onboarding";
import { getCrawledJob, type CrawledJob } from "@/lib/crawled-jobs";
import { DEFAULT_GUESTHOUSE_IMAGE } from "@/lib/guesthouse-image";
import { GENDER_CONDITION_LABELS, STIPEND_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/owner-utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "카페 모집글", robots: { index: false, follow: false } };

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
      <dt className="w-28 shrink-0 text-body-sm font-semibold text-neutral-500">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-body-sm text-neutral-800">{value}</dd>
    </div>
  );
}

function ApplyCard({ job }: { job: CrawledJob }) {
  const { apply } = job;
  const external = { target: "_blank", rel: "noopener noreferrer" } as const;
  // 링크로 연결되는 수단만 버튼. 번호가 둘 이상이면(한 글에 지점별 번호) 어느 번호인지 원문 안내로 구분하도록 버튼 대신 목록으로 보여준다.
  const button =
    apply.channel === "instagram" || apply.channel === "openchat" || apply.channel === "form"
      ? { href: apply.url!, label: { instagram: "인스타그램 DM으로 지원", openchat: "오픈채팅으로 지원", form: "지원서 작성하기" }[apply.channel], external: true }
      : apply.channel === "kakao" && apply.url ? { href: apply.url, label: "카카오톡 채널로 지원", external: true }
      : apply.channel === "sms" && apply.phones.length === 1 ? { href: `sms:${apply.phones[0].replace(/-/g, "")}`, label: `문자로 지원 · ${apply.phones[0]}`, external: false }
      : apply.channel === "email" && apply.emails.length === 1 ? { href: `mailto:${apply.email}`, label: `메일로 지원 · ${apply.email}`, external: false }
      : null;
  const contacts = [
    apply.channel === "kakao" ? "카카오톡으로 지원해 주세요" : null,
    apply.channel === "sms" && apply.phones.length > 1 ? "문자로 지원해 주세요 (아래 번호 중 해당 게스트하우스)" : null,
    apply.kakaoId ? `카카오톡 ID  ${apply.kakaoId}` : null,
    apply.channel === "email" && apply.emails.length > 1 ? `메일로 지원해 주세요 (원문에 접수 메일이 ${apply.emails.length}개 적혀 있어요)` : null,
    apply.channel === "email" && apply.emails.length > 1 ? `접수 메일  ${apply.emails.join(" · ")}` : null,
    apply.phones.length > 0 && !button?.href.startsWith("sms:") ? `연락처  ${apply.phones.join(" · ")}` : null,
  ].filter(Boolean);

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-h3 text-neutral-900">지원 안내</h2>
        <p className="mt-1 text-body-sm text-neutral-500">
          이 모집글은 카페에 올라온 글이에요. 아래 방법으로 게스트하우스에 직접 연락해 주세요.
        </p>
      </div>
      {button && (
        <ButtonLink href={button.href} fullWidth {...(button.external ? external : {})}>
          {button.label}
        </ButtonLink>
      )}
      {contacts.length > 0 && (
        <div className="rounded-md border border-primary-100 bg-primary-50 p-3 text-body-sm font-semibold text-primary-700">
          {contacts.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
      {apply.hint && (
        <div className="rounded-md border border-neutral-100 bg-neutral-50 p-3">
          <p className="mb-1.5 text-caption font-semibold text-neutral-500">원문의 지원 방법</p>
          <p className="whitespace-pre-wrap break-words text-body-sm leading-relaxed text-neutral-700">{apply.hint}</p>
        </div>
      )}
      <ButtonLink href={job.url} variant="outline" fullWidth target="_blank" rel="noopener noreferrer">
        카페 원문 보기
      </ButtonLink>
    </Card>
  );
}

export default async function CrawledJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getCrawledJob(id);
  if (!job) notFound(); // 프로덕션에서는 항상 여기로

  const user = await getCurrentAuthUser();
  const f = job.fields;
  const workDays = f.work_days_per_week != null ? `주 ${f.work_days_per_week}일 근무 · 주 ${f.off_days_per_week ?? 0}일 휴무` : null;
  const stipend = f.stipend_type === "none" ? STIPEND_TYPE_LABELS.none : [STIPEND_TYPE_LABELS[f.stipend_type], f.stipend_description].filter(Boolean).join("\n");

  return (
    <main className="min-h-screen bg-neutral-50">
      <AppHeader isAuthenticated={Boolean(user)} />
      <div className="page-container flex flex-col gap-6 py-6 pb-16 md:py-8">
        <Link href="/jobs" className="w-fit rounded-md text-body-sm font-semibold text-primary-700 hover:text-primary-600 focus-ring">
          모집글 목록으로
        </Link>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-6">
            <section>
              <p className="break-words text-body-sm font-semibold text-neutral-500">
                {job.guesthouse.name ?? "게스트하우스"} · {job.guesthouse.region ?? "제주"}
              </p>
              <h1 className="mt-2 break-words text-h2 text-neutral-900 md:text-h1">{job.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="sand">외부 모집글</Badge>
                {f.is_urgent && <Badge variant="urgent">급구</Badge>}
                {getCrawledChips(job).map((label) => (
                  <Badge key={label}>{label}</Badge>
                ))}
              </div>
            </section>

            <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-beige">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={job.thumbnail ?? DEFAULT_GUESTHOUSE_IMAGE} alt={`${job.guesthouse.name ?? "게스트하우스"} 대표 이미지`} referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
            </div>

            <Card>
              <h2 className="text-h3 text-neutral-900">모집 정보</h2>
              <dl className="mt-3 divide-y divide-neutral-100">
                <Row label="입도일" value={formatDate(f.work_start_date)} />
                <Row label="최소 근무 기간" value={f.min_work_period} />
                <Row label="근무/휴무" value={workDays} />
                <Row label="모집 인원" value={`${f.recruit_count}명`} />
                <Row label="성별 조건" value={GENDER_CONDITION_LABELS[f.gender_condition]} />
                <Row label="연령 조건" value={f.age_condition} />
                <Row label="근무 시간" value={f.work_time} />
                <Row label="급여·보상" value={stipend} />
                <Row label="숙소/식사" value={[f.provides_accommodation ? "숙소 제공" : null, f.provides_meal ? "식사 제공" : null].filter(Boolean).join(" · ") || null} />
                <Row label="파티" value={job.party_kind === "party" ? `파티 있음\n${f.party_description ?? ""}`.trim() : job.party_kind === "potluck" ? `포틀럭(음식 나눔) 모임\n${f.party_description ?? ""}`.trim() : job.party_kind === "none" ? "파티 없음" : null} />
                <Row label="업무 내용" value={f.work_content} />
                <Row label="우대사항" value={f.preferred_conditions} />
                <Row label="주의사항" value={f.caution} />
              </dl>
            </Card>

            {(job.guesthouse.address_text || job.guesthouse.map_url) && (
              <Card>
                <h2 className="text-h3 text-neutral-900">위치 및 안내</h2>
                <dl className="mt-3 divide-y divide-neutral-100">
                  <Row label="주소" value={job.guesthouse.address_text} />
                  <Row label="지도" value={job.guesthouse.map_url} />
                </dl>
              </Card>
            )}

            {job.missing.length > 0 && (
              <p className="text-caption text-neutral-400">로컬 검수용 · 확인 필요: {job.missing.join(", ")} · 기본값 가정: {job.assumed.join(", ") || "없음"}</p>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <ApplyCard job={job} />
          </aside>
        </div>
      </div>
    </main>
  );
}
