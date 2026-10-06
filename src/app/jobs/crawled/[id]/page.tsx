import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GoogleLoginCtaButton } from "@/components/auth/GoogleLoginCtaButton";
import { getCrawledChips } from "@/components/jobs/CrawledJobsSection";
import { JobDetailLoginGate } from "@/components/jobs/JobDetailLoginGate";
import { AppHeader } from "@/components/layout/AppHeader";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import { getCrawledJobDetail, type CrawledJobFull } from "@/lib/crawled-jobs";
import { DEFAULT_GUESTHOUSE_IMAGE } from "@/lib/guesthouse-image";
import { GENDER_CONDITION_LABELS, STIPEND_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/owner-utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "카페 모집글", robots: { index: false, follow: false } };

type Item = { label: string; value: string | null | undefined };

// 로그인 전에는 기존 모집글 상세(/jobs/[slug])와 같은 방식으로 값을 가린다.
const LOCKED = "로그인 후 확인";
const lockedItems = (labels: string[]): Item[] => labels.map((label) => ({ label, value: LOCKED }));

function Grid({ items, strong = false }: { items: Item[]; strong?: boolean }) {
  const shown = items.filter((item) => item.value);
  if (shown.length === 0) return null;
  return (
    <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-caption font-semibold text-neutral-500">{item.label}</dt>
          <dd className={`mt-1 whitespace-pre-wrap break-words text-body-sm ${item.value === LOCKED ? "text-neutral-400" : strong ? "font-bold text-neutral-900" : "font-semibold text-neutral-800"}`}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function LockedNotice() {
  return (
    <div className="rounded-md border border-primary-100 bg-primary-50/70 p-4">
      <p className="text-body-sm font-semibold text-primary-700">로그인하면 상세 정보를 모두 확인할 수 있어요.</p>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h2 className="text-h3 text-neutral-900">{title}</h2>
        {description && <p className="mt-1 text-body-sm text-neutral-500">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

function TextBlock({ title, value }: { title: string; value: string | null }) {
  if (!value) return null;
  return (
    <section className="py-5 first:pt-0 last:pb-0">
      <h3 className="text-body font-bold text-neutral-900">{title}</h3>
      <p className="mt-3 whitespace-pre-wrap break-words text-body-sm leading-relaxed text-neutral-600">{value}</p>
    </section>
  );
}

function summaryItems(j: CrawledJobFull): Item[] {
  const workDays = j.work_days_per_week != null ? `주 ${j.work_days_per_week}일 근무 · 주 ${j.off_days_per_week ?? 0}일 휴무` : null;
  const stipend = j.stipend_type === "none" ? STIPEND_TYPE_LABELS.none : [STIPEND_TYPE_LABELS[j.stipend_type], j.stipend_description].filter(Boolean).join("\n");
  return [
    { label: "입도일", value: formatDate(j.work_start_date) },
    { label: "근무 기간", value: j.min_work_period },
    { label: "근무/휴무", value: workDays },
    { label: "모집 인원", value: `${j.recruit_count}명` },
    { label: "숙식", value: [j.provides_accommodation ? "숙소 제공" : "숙소 미제공", j.provides_meal ? "식사 제공" : "식사 미제공"].join(" · ") },
    { label: "급여/보상", value: stipend },
  ];
}

function partyText(j: CrawledJobFull) {
  if (j.party_kind === "party") return `파티 있음\n${j.party_description ?? ""}`.trim();
  if (j.party_kind === "potluck") return `포틀럭(음식 나눔) 모임\n${j.party_description ?? ""}`.trim();
  return j.party_kind === "none" ? "파티 없음" : null;
}

function ApplyCard({ job }: { job: CrawledJobFull }) {
  const external = { target: "_blank", rel: "noopener noreferrer" } as const;
  const { apply_channel: channel, apply_phones: phones, apply_emails: emails } = job;
  // 링크로 연결되는 수단만 버튼. 번호/메일이 둘 이상이면(한 글에 지점별 연락처) 어느 쪽인지 원문 안내로 구분하도록 목록으로 보여준다.
  const button =
    channel === "instagram" || channel === "openchat" || channel === "form"
      ? { href: job.apply_url!, label: { instagram: "인스타그램 DM으로 지원", openchat: "오픈채팅으로 지원", form: "지원서 작성하기" }[channel], external: true }
      : channel === "kakao" && job.apply_url ? { href: job.apply_url, label: "카카오톡 채널로 지원", external: true }
      : channel === "sms" && phones.length === 1 ? { href: `sms:${phones[0].replace(/-/g, "")}`, label: `문자로 지원 · ${phones[0]}`, external: false }
      : channel === "email" && emails.length === 1 ? { href: `mailto:${emails[0]}`, label: `메일로 지원 · ${emails[0]}`, external: false }
      : null;
  const contacts = [
    channel === "kakao" ? "카카오톡으로 지원해 주세요" : null,
    channel === "sms" && phones.length > 1 ? "문자로 지원해 주세요 (아래 번호 중 해당 게스트하우스)" : null,
    job.apply_kakao_id ? `카카오톡 ID  ${job.apply_kakao_id}` : null,
    channel === "email" && emails.length > 1 ? `메일로 지원해 주세요 (원문에 접수 메일이 ${emails.length}개 적혀 있어요)` : null,
    channel === "email" && emails.length > 1 ? `접수 메일  ${emails.join(" · ")}` : null,
    phones.length > 0 && !button?.href.startsWith("sms:") ? `연락처  ${phones.join(" · ")}` : null,
  ].filter(Boolean);

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-h3 text-neutral-900">지원 안내</h2>
        <p className="mt-1 text-body-sm text-neutral-500">이 모집글은 카페에 올라온 글이에요. 아래 방법으로 게스트하우스에 직접 연락해 주세요.</p>
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
      {job.apply_hint && (
        <div className="rounded-md border border-neutral-100 bg-neutral-50 p-3">
          <p className="mb-1.5 text-caption font-semibold text-neutral-500">원문의 지원 방법</p>
          <p className="whitespace-pre-wrap break-words text-body-sm leading-relaxed text-neutral-700">{job.apply_hint}</p>
        </div>
      )}
      <ButtonLink href={job.source_url} variant="outline" fullWidth {...external}>
        카페 원문 보기
      </ButtonLink>
    </Card>
  );
}

function LockedApplyCard({ redirectPath }: { redirectPath: string }) {
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-h3 text-neutral-900">지원 안내</h2>
        <p className="mt-1 text-body-sm text-neutral-500">지원 방법과 연락처는 로그인하면 확인할 수 있어요.</p>
      </div>
      <GoogleLoginCtaButton className="w-full" ctaLocation="crawled_job_detail" loadingText="로그인으로 이동 중..." redirectPath={redirectPath}>
        Google로 시작하고 지원 안내 보기
      </GoogleLoginCtaButton>
    </Card>
  );
}

export default async function CrawledJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentAuthUser();
  const viewerProfile = user ? await getProfileById(user.id) : null;
  const isAuthenticated = Boolean(viewerProfile);

  const detail = await getCrawledJobDetail(id, isAuthenticated);
  if (!detail) notFound();

  const { job, full } = detail;
  const detailPath = `/jobs/crawled/${job.id}`;
  const gateTriggerId = "crawled-job-login-gate-trigger";
  const chips = full ? getCrawledChips(full) : [];

  return (
    <main className="min-h-screen bg-neutral-50">
      <AppHeader isAuthenticated={isAuthenticated} loginRedirectPath={isAuthenticated ? undefined : detailPath} />
      <div className="page-container flex flex-col gap-6 py-6 pb-16 md:py-8">
        <Link href="/jobs" className="w-fit rounded-md text-body-sm font-semibold text-primary-700 hover:text-primary-600 focus-ring">
          모집글 목록으로
        </Link>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-6">
            <section>
              <p className="break-words text-body-sm font-semibold text-neutral-500">
                {job.guesthouse_name ?? "게스트하우스"} · {job.region ?? "제주"}
              </p>
              <h1 className="mt-2 break-words text-h2 text-neutral-900 md:text-h1">{job.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="sand">외부 모집글</Badge>
                {job.is_urgent && <Badge variant="urgent">급구</Badge>}
                {chips.map((label) => (
                  <Badge key={label}>{label}</Badge>
                ))}
              </div>
            </section>

            <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-beige">
              <Image
                src={job.thumbnail_url ?? DEFAULT_GUESTHOUSE_IMAGE}
                alt={`${job.guesthouse_name ?? "게스트하우스"} 대표 이미지`}
                fill
                priority
                className="object-cover"
                sizes="(min-width: 1024px) 720px, 100vw"
              />
            </div>

            <Card padding="sm">
              <Grid strong items={full ? summaryItems(full) : lockedItems(["입도일", "근무 기간", "근무/휴무", "모집 인원", "숙식", "급여/보상"])} />
            </Card>

            {!isAuthenticated && <div id={gateTriggerId} className="h-px scroll-mt-24" aria-hidden="true" />}

            {/* 모바일에서는 지원 안내를 본문 위에 */}
            <div className="lg:hidden">{full ? <ApplyCard job={full} /> : <LockedApplyCard redirectPath={detailPath} />}</div>

            <Section title="모집 정보" description="모집글에서 핵심만 정리했어요. 자세한 내용은 카페 원문에서 볼 수 있어요.">
              {full ? (
                <>
                  <Grid
                    items={[
                      { label: "성별 조건", value: GENDER_CONDITION_LABELS[full.gender_condition] },
                      { label: "연령 조건", value: full.age_condition },
                      { label: "근무 시간", value: full.work_time },
                      { label: "파티", value: partyText(full) },
                    ]}
                  />
                  {full.intro && <p className="whitespace-pre-wrap break-words rounded-md bg-primary-50/70 p-4 text-body leading-relaxed text-neutral-800">{full.intro}</p>}
                  <div className="divide-y divide-neutral-200 border-t border-neutral-200">
                    {full.highlights.map((h) => (
                      <section key={h.title} className="py-5 first:pt-0 last:pb-0">
                        <h3 className="text-body font-bold text-neutral-900">{h.title}</h3>
                        <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-body-sm leading-relaxed text-neutral-600">
                          {h.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </section>
                    ))}
                    {full.highlights.length === 0 && <TextBlock title="업무 내용" value={full.work_content} />}
                    <TextBlock title="우대 조건" value={full.preferred_conditions} />
                    <TextBlock title="주의사항" value={full.caution} />
                  </div>
                </>
              ) : (
                <>
                  <Grid items={lockedItems(["성별 조건", "연령 조건", "근무 시간", "파티 운영"])} />
                  <LockedNotice />
                </>
              )}
            </Section>

            {(full ? Boolean(full.address_text || full.map_url) : true) && (
              <Section title="위치 및 안내" description="방문 전 확인할 위치입니다.">
                {full ? (
                  <Grid items={[{ label: "주소", value: full.address_text }, { label: "지도", value: full.map_url }]} />
                ) : (
                  <>
                    <Grid items={lockedItems(["주소"])} />
                    <LockedNotice />
                  </>
                )}
              </Section>
            )}
          </div>

          <aside className="hidden lg:block lg:self-start">
            <div className="sticky top-20">{full ? <ApplyCard job={full} /> : <LockedApplyCard redirectPath={detailPath} />}</div>
          </aside>
        </div>
      </div>
      {!isAuthenticated && <JobDetailLoginGate redirectPath={detailPath} triggerId={gateTriggerId} />}
    </main>
  );
}
