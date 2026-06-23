import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { JobPostForm } from "@/components/owner";
import {
  getCurrentJobPostMock,
  getCurrentOwnerMock,
} from "@/lib/owner-data";
import { ButtonLink, Card, CardContent, PageHeader } from "@/components/ui";

export default function NewJobPage() {
  const owner = getCurrentOwnerMock();
  const existingJobPost = getCurrentJobPostMock(owner.id);

  return (
    <OwnerLayout>
      <PageHeader
        title="스탭 모집글 작성"
        description="우리 게하의 스탭 모집글을 작성합니다. 섹션별로 정보를 입력해주세요."
      />

      {existingJobPost && (
        <Card className="mb-8 border-primary-100 bg-primary-50">
          <CardContent className="pt-5 md:pt-6">
            <p className="text-body-sm text-primary-800">
              이미 운영 중인 스탭 모집글이 있습니다. 기존 모집글을 수정해
              다시 모집을 시작할 수 있습니다.
            </p>
            <ButtonLink
              href={`/owner/jobs/${existingJobPost.id}/edit`}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              기존 모집글 수정하기
            </ButtonLink>
          </CardContent>
        </Card>
      )}

      <JobPostForm mode="create" />
    </OwnerLayout>
  );
}
