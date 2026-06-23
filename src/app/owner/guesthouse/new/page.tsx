import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { GuesthouseForm } from "@/components/owner";
import { PageHeader } from "@/components/ui";

export default function NewGuesthousePage() {
  return (
    <OwnerLayout>
      <PageHeader
        title="게스트하우스 등록"
        description="지원자에게 보여질 게스트하우스 기본 정보를 등록합니다."
      />
      <GuesthouseForm mode="create" />
    </OwnerLayout>
  );
}
