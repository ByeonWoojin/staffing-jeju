import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { ApplicationForm } from "./ApplicationForm";
import { AnalyticsEventTracker } from "@/components/analytics/AnalyticsEventTracker";
import { getCurrentAuthUser, getProfileById } from "@/lib/auth/onboarding";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/owner-utils";
import type { Application, Guesthouse, JobPost } from "@/types/database";
import {
  Badge,
  ButtonLink,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { privatePageMetadata } from "@/lib/seo/private-metadata";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export const dynamic = "force-dynamic";
export const metadata: Metadata = privatePageMetadata;

async function getApplicationTarget(slug: string) {
  const supabase = createSupabaseAdminClient();
  const { data: jobPost, error: jobPostError } = await supabase
    .from("job_posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (jobPostError) {
    console.error("[apply/page] job post lookup failed", {
      slug,
      message: jobPostError.message,
      code: jobPostError.code,
      details: jobPostError.details,
    });
    throw new Error(`모집글 조회에 실패했습니다: ${jobPostError.message}`);
  }

  if (!jobPost) return null;

  const { data: guesthouse, error: guesthouseError } = await supabase
    .from("guesthouses")
    .select("*")
    .eq("id", jobPost.guesthouse_id)
    .maybeSingle();

  if (guesthouseError) {
    console.error("[apply/page] guesthouse lookup failed", {
      guesthouseId: jobPost.guesthouse_id,
      message: guesthouseError.message,
      code: guesthouseError.code,
      details: guesthouseError.details,
    });
    throw new Error(`게스트하우스 조회에 실패했습니다: ${guesthouseError.message}`);
  }

  if (!guesthouse) return null;

  return {
    jobPost: jobPost as JobPost,
    guesthouse: guesthouse as Guesthouse,
  };
}

async function getExistingApplication(jobPost: JobPost, staffId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("job_post_id", jobPost.id)
    .eq("staff_id", staffId)
    .eq("recruitment_cycle", jobPost.recruitment_cycle)
    .maybeSingle();

  if (error) {
    console.error("[apply/page] existing application lookup failed", {
      jobPostId: jobPost.id,
      staffId,
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return null;
  }

  return (data as Application | null) ?? null;
}

function LoginRequiredState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-md">
        <EmptyState
          title="지원하려면 로그인이 필요합니다."
          description="Google 로그인 후 스탭 역할을 선택하면 지원서를 작성할 수 있습니다."
          action={<GoogleLoginButton ctaLocation="apply_login_required" />}
        />
      </div>
    </main>
  );
}

function JobClosedState() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <EmptyState
          title="모집이 종료된 공고입니다."
          description="현재 공개 중인 다른 모집글을 확인해주세요."
          action={<ButtonLink href="/jobs">모집글 둘러보기</ButtonLink>}
        />
      </div>
    </main>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption font-semibold text-neutral-500">{label}</dt>
      <dd className="mt-1 text-body-sm font-bold text-neutral-900">{value}</dd>
    </div>
  );
}

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slug) notFound();

  const user = await getCurrentAuthUser();
  if (!user) return <LoginRequiredState />;

  const profile = await getProfileById(user.id);
  if (!profile) redirect("/onboarding/role");
  if (profile.role === "owner") {
    return (
      <main className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
          <EmptyState
            title="사장님 계정에서는 지원 기능을 사용할 수 없습니다."
            description="스탭 계정으로 로그인해야 지원서를 작성할 수 있습니다."
            action={<ButtonLink href="/jobs">모집글 둘러보기</ButtonLink>}
          />
        </div>
      </main>
    );
  }
  if (profile.role !== "staff") {
    return (
      <main className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
          <EmptyState
            title="스탭 계정에서만 지원할 수 있습니다."
            description="지원 가능한 계정으로 다시 로그인해주세요."
            action={<ButtonLink href="/jobs">모집글 둘러보기</ButtonLink>}
          />
        </div>
      </main>
    );
  }

  const target = await getApplicationTarget(slug);
  if (!target) notFound();

  const { jobPost, guesthouse } = target;
  if (jobPost.status !== "open") return <JobClosedState />;

  const existingApplication = await getExistingApplication(jobPost, profile.id);
  if (existingApplication && existingApplication.status !== "canceled") {
    return (
      <main className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
          <EmptyState
            title="이미 지원한 모집글입니다."
            description="내 지원 현황에서 지원 상태를 확인할 수 있습니다."
            action={<ButtonLink href="/staff/applications">내 지원 현황</ButtonLink>}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <AnalyticsEventTracker
        eventName={ANALYTICS_EVENTS.APPLICATION_START}
        properties={{
          job_post_id: jobPost.id,
          guesthouse_id: guesthouse.id,
          source_page: "job_detail",
        }}
      />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
        <Link href={`/jobs/${slug}`} className="text-body-sm font-semibold text-primary-700">
          모집글로 돌아가기
        </Link>

        <PageHeader
          title="지원서 작성"
          description="사장님이 확인할 수 있도록 기본 정보와 대표사진을 등록해주세요."
        />

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr] lg:items-start">
          <Card className="lg:sticky lg:top-6">
            <CardContent className="flex flex-col gap-5">
              <div>
                <p className="text-caption font-semibold text-neutral-500">
                  {guesthouse.region}
                </p>
                <h2 className="mt-1 text-title text-neutral-900">
                  {guesthouse.name}
                </h2>
                <p className="mt-2 text-body-sm font-semibold text-neutral-800">
                  {jobPost.title}
                </p>
              </div>

              <dl className="grid gap-3">
                <SummaryItem label="입도일" value={formatDate(jobPost.work_start_date)} />
                <SummaryItem label="최소 근무 기간" value={jobPost.min_work_period} />
                <SummaryItem
                  label="숙소"
                  value={jobPost.provides_accommodation ? "제공" : "미제공"}
                />
                <SummaryItem
                  label="식사"
                  value={jobPost.provides_meal ? "제공" : "미제공"}
                />
              </dl>

              <div className="flex flex-wrap gap-2">
                <Badge variant="primary">모집중</Badge>
                {existingApplication?.status === "canceled" && (
                  <Badge>취소 후 재지원</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <ApplicationForm
            slug={slug}
            jobPostId={jobPost.id}
            guesthouseId={guesthouse.id}
            defaultName={profile.name}
            defaultPhone={profile.phone ?? ""}
            defaultAvailableStartDate={jobPost.work_start_date}
          />
        </div>
      </div>
    </main>
  );
}
