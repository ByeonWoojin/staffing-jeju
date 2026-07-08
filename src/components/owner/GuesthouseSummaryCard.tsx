"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent } from "react";
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
  const router = useRouter();
  const href = guesthouse ? "/owner/guesthouse/edit" : "/owner/guesthouse/new";

  const navigateToGuesthouseForm = () => {
    router.push(href);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    navigateToGuesthouseForm();
  };

  const stopCardNavigation = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  if (!guesthouse) {
    return (
      <Card
        hoverable
        role="link"
        tabIndex={0}
        className="cursor-pointer focus-ring"
        onClick={navigateToGuesthouseForm}
        onKeyDown={handleCardKeyDown}
      >
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
          <ButtonLink
            href="/owner/guesthouse/new"
            size="sm"
            onClick={stopCardNavigation}
          >
            게스트하우스 등록
          </ButtonLink>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card
      hoverable
      role="link"
      tabIndex={0}
      className="cursor-pointer focus-ring"
      onClick={navigateToGuesthouseForm}
      onKeyDown={handleCardKeyDown}
    >
      <CardHeader>
        <CardTitle className="break-words">{guesthouse.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {guesthouse.description && (
          <p className="mb-2 line-clamp-3 text-body-sm text-neutral-600">
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
        <ButtonLink
          href="/owner/guesthouse/edit"
          variant="outline"
          size="sm"
          onClick={stopCardNavigation}
        >
          정보 수정
        </ButtonLink>
        {guesthouse.map_url && (
          <Link
            href={guesthouse.map_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-body-sm font-semibold text-primary-700 hover:text-primary-600 focus-ring rounded-md px-2 py-1"
            onClick={stopCardNavigation}
          >
            지도 보기
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
