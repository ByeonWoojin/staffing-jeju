import { notFound } from "next/navigation";
import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { JobPostForm } from "@/components/owner";
import { JobPostPhotoManager } from "@/components/owner/JobPostPhotoManager";
import {
  getCurrentOwner,
  getJobPostPhotoPublicUrl,
  getJobPostPhotos,
  getOwnerJobPostById,
} from "@/lib/owner-supabase-data";
import { PageHeader } from "@/components/ui";

interface EditJobPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function EditJobPage({ params }: EditJobPageProps) {
  const { id } = await params;

  const owner = await getCurrentOwner();
  const jobPost = await getOwnerJobPostById(owner.id, id);

  if (!jobPost) {
    notFound();
  }

  const photos = await getJobPostPhotos(jobPost.id);
  const photosWithUrls = photos.map((photo) => ({
    ...photo,
    publicUrl: getJobPostPhotoPublicUrl(photo.photo_path),
  }));

  return (
    <OwnerLayout>
      <PageHeader
        title="모집글 수정"
        description="모집 조건을 수정하면 지원자에게 안내가 필요할 수 있습니다."
      />
      <JobPostForm
        mode="edit"
        initialData={jobPost}
        photoManager={
          <JobPostPhotoManager jobPostId={jobPost.id} photos={photosWithUrls} />
        }
      />
    </OwnerLayout>
  );
}
