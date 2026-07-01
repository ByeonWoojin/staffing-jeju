import Image from "next/image";
import Link from "next/link";
import { getStaffFavoritesData } from "@/lib/staff-favorite-data";
import { formatDate } from "@/lib/owner-utils";
import { AppHeader } from "@/components/layout/AppHeader";
import { FavoriteGuesthouseButton } from "@/components/jobs/FavoriteGuesthouseButton";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, UrgentBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

function GuesthouseImage({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-neutral-100 sm:w-48 sm:shrink-0">
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" sizes="192px" />
      ) : (
        <div className="flex h-full items-center justify-center px-4 text-center text-body-sm text-neutral-400">
          등록된 사진이 없습니다
        </div>
      )}
    </div>
  );
}

export default async function StaffFavoritesPage() {
  const { profile, items, authorized } = await getStaffFavoritesData();

  if (!authorized) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <AppHeader active="favorites" isAuthenticated />
        <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
          <EmptyState
            title="스탭 계정에서 사용할 수 있는 페이지입니다."
            description={`${profile.name}님 계정에서는 관심 게스트하우스 기능을 사용할 수 없습니다.`}
            action={<ButtonLink href="/jobs">모집글 둘러보기</ButtonLink>}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <AppHeader active="favorites" isAuthenticated />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <PageHeader
          title="관심 게스트하우스"
          description="저장한 게스트하우스가 현재 모집 중인지 확인할 수 있습니다."
          action={<ButtonLink href="/jobs">모집글 둘러보기</ButtonLink>}
        />

        {items.length === 0 ? (
          <EmptyState
            title="저장한 게스트하우스가 없습니다."
            description="모집글 목록에서 관심 있는 게스트하우스를 저장해보세요."
            action={<ButtonLink href="/jobs">모집글 둘러보기</ButtonLink>}
          />
        ) : (
          <div className="grid gap-4">
            {items.map(({ guesthouse, currentJobPost, imageUrl }) => (
              <Card key={guesthouse.id} className="flex flex-col gap-4 sm:flex-row">
                <GuesthouseImage src={imageUrl} alt={`${guesthouse.name} 대표 이미지`} />
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-caption font-semibold text-neutral-500">
                        {guesthouse.region}
                      </p>
                      <h2 className="mt-1 text-title text-neutral-900">{guesthouse.name}</h2>
                      {guesthouse.description && (
                        <p className="mt-2 line-clamp-2 text-body-sm text-neutral-600">
                          {guesthouse.description}
                        </p>
                      )}
                    </div>
                    <FavoriteGuesthouseButton
                      guesthouseId={guesthouse.id}
                      initialFavorited
                    />
                  </div>

                  {currentJobPost ? (
                    <div className="rounded-md border border-primary-100 bg-primary-50/50 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="primary">현재 모집 중</Badge>
                        {currentJobPost.is_urgent && <UrgentBadge />}
                      </div>
                      <h3 className="mt-2 text-body font-semibold text-neutral-900">
                        {currentJobPost.title}
                      </h3>
                      <p className="mt-1 text-body-sm text-neutral-600">
                        입도일 {formatDate(currentJobPost.work_start_date)}
                      </p>
                      <Link
                        href={`/jobs/${currentJobPost.slug}`}
                        className="mt-3 inline-flex text-body-sm font-semibold text-primary-700"
                      >
                        상세 보기
                      </Link>
                    </div>
                  ) : (
                    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-body-sm font-semibold text-neutral-700">
                        현재 모집 중인 공고가 없습니다.
                      </p>
                      <p className="mt-1 text-body-sm text-neutral-500">
                        이 게스트하우스가 다시 모집을 시작하면 여기에서 확인할 수 있습니다.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
