import { redirect } from "next/navigation";
import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { GuesthouseForm } from "@/components/owner";
import {
  getCurrentOwnerMock,
  getOwnerGuesthouseMock,
} from "@/lib/owner-data";
import { PageHeader } from "@/components/ui";

export default function EditGuesthousePage() {
  //TODO: GET guesthouse where owner_id = currentOwner.id

  const owner = getCurrentOwnerMock();
  const guesthouse = getOwnerGuesthouseMock(owner.id);

  if (!guesthouse) {
    redirect("/owner/guesthouse/new");
  }

  const { id: _id, owner_id: _ownerId, created_at: _ca, updated_at: _ua, ...formData } =
    guesthouse;

  return (
    <OwnerLayout>
      <PageHeader
        title="게스트하우스 정보 수정"
        description="게스트하우스 기본 정보를 수정합니다."
      />
      <GuesthouseForm mode="edit" initialData={formData} />
    </OwnerLayout>
  );
}
