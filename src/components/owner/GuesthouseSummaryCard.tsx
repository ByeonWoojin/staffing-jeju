import Link from "next/link";
import type { Guesthouse } from "@/types/database";
import {
  ButtonLink,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui";

interface GuesthouseSummaryCardProps {
  guesthouse: Guesthouse | null;
}

export function GuesthouseSummaryCard({
  guesthouse,
}: GuesthouseSummaryCardProps) {
  if (!guesthouse) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>게스트하우스 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-body-sm text-neutral-500">
            등록된 게스트하우스가 없습니다. 먼저 게스트하우스 정보를
            등록해주세요.
          </p>
        </CardContent>
        <CardFooter>
          <ButtonLink href="/owner/guesthouse/new" size="sm">
            게스트하우스 등록
          </ButtonLink>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{guesthouse.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {guesthouse.description && (
          <p className="mb-2 text-body-sm text-neutral-600">
            {guesthouse.description}
          </p>
        )}
        <p className="text-body-sm text-neutral-600">
          <span className="font-semibold text-neutral-700">지역</span>{" "}
          {guesthouse.region}
        </p>
        <p className="text-body-sm text-neutral-600">
          <span className="font-semibold text-neutral-700">주소</span>{" "}
          {guesthouse.address_text}
        </p>
        <p className="text-body-sm text-neutral-600">
          <span className="font-semibold text-neutral-700">연락</span>{" "}
          {guesthouse.contact_method}
        </p>
      </CardContent>
      <CardFooter>
        <ButtonLink href="/owner/guesthouse/edit" variant="outline" size="sm">
          정보 수정
        </ButtonLink>
        {guesthouse.map_url && (
          <Link
            href={guesthouse.map_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-body-sm font-semibold text-primary-700 hover:text-primary-600 focus-ring rounded-md px-2 py-1"
          >
            지도 보기
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
