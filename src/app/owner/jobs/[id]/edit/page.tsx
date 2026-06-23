import { notFound } from "next/navigation";
import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { JobPostForm } from "@/components/owner";
import {
  getCurrentOwnerMock,
  getOwnerJobPostByIdMock,
} from "@/lib/owner-data";
import { PageHeader } from "@/components/ui";

interface EditJobPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditJobPage({ params }: EditJobPageProps) {
  const { id } = await params;

  //TODO: GET job_post by id where owner_id = currentOwner.id
  //TODO: PATCH job_posts by id
  //TODO: If important fields changed, INSERT job_post_update_logs

  const owner = getCurrentOwnerMock();
  const jobPost = getOwnerJobPostByIdMock(owner.id, id);

  if (!jobPost) {
    notFound();
  }

  return (
    <OwnerLayout>
      <PageHeader
        title="모집글 수정"
        description="모집 조건을 수정하면 지원자에게 안내가 필요할 수 있습니다."
      />
      <JobPostForm mode="edit" initialData={jobPost} />
    </OwnerLayout>
  );
}
