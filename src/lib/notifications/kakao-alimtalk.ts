import "server-only";

import { getKoreanMobilePhoneDigits } from "@/lib/phone";
import type { Application, Guesthouse, JobPost, Profile } from "@/types/database";

type NewApplicationAlimtalkPayload = {
  owner: Pick<Profile, "id" | "phone">;
  guesthouse: Pick<Guesthouse, "id" | "name">;
  jobPost: Pick<JobPost, "id" | "title">;
  application: Pick<Application, "id" | "name">;
};

type AlimtalkConfig =
  | {
      ok: true;
      webhookUrl: string;
      apiKey: string;
      senderKey: string;
      templateCode: string;
      siteUrl: string;
    }
  | { ok: false; missingKeys: string[] };

function getAlimtalkConfig(): AlimtalkConfig {
  const values = {
    KAKAO_ALIMTALK_WEBHOOK_URL: process.env.KAKAO_ALIMTALK_WEBHOOK_URL,
    KAKAO_ALIMTALK_API_KEY: process.env.KAKAO_ALIMTALK_API_KEY,
    KAKAO_ALIMTALK_SENDER_KEY: process.env.KAKAO_ALIMTALK_SENDER_KEY,
    KAKAO_ALIMTALK_NEW_APPLICATION_TEMPLATE_CODE:
      process.env.KAKAO_ALIMTALK_NEW_APPLICATION_TEMPLATE_CODE,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  };

  const missingKeys = Object.entries(values)
    .filter(([, value]) => !value?.trim())
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    return { ok: false, missingKeys };
  }

  return {
    ok: true,
    webhookUrl: values.KAKAO_ALIMTALK_WEBHOOK_URL!.trim(),
    apiKey: values.KAKAO_ALIMTALK_API_KEY!.trim(),
    senderKey: values.KAKAO_ALIMTALK_SENDER_KEY!.trim(),
    templateCode:
      values.KAKAO_ALIMTALK_NEW_APPLICATION_TEMPLATE_CODE!.trim(),
    siteUrl: values.NEXT_PUBLIC_SITE_URL!.trim().replace(/\/$/, ""),
  };
}

function buildApplicationUrl(siteUrl: string, applicationId: string) {
  return `${siteUrl}/owner/applications/${applicationId}`;
}

function buildNewApplicationMessage(payload: NewApplicationAlimtalkPayload) {
  return [
    "[스탭핑] 신규 지원자가 도착했어요",
    "",
    `${payload.guesthouse.name} 모집글에 ${payload.application.name}님이 지원했습니다.`,
    "",
    "지원서를 확인해주세요.",
  ].join("\n");
}

export async function sendOwnerNewApplicationAlimtalk(
  payload: NewApplicationAlimtalkPayload,
) {
  const recipientPhone = getKoreanMobilePhoneDigits(payload.owner.phone);
  if (!recipientPhone) {
    console.info("[kakao-alimtalk] skipped owner new application notification", {
      reason: "missing_or_invalid_owner_phone",
      owner_id: payload.owner.id,
      application_id: payload.application.id,
    });
    return;
  }

  const config = getAlimtalkConfig();
  if (!config.ok) {
    console.info("[kakao-alimtalk] skipped owner new application notification", {
      reason: "missing_config",
      missing_keys: config.missingKeys,
      owner_id: payload.owner.id,
      application_id: payload.application.id,
    });
    return;
  }

  const applicationUrl = buildApplicationUrl(
    config.siteUrl,
    payload.application.id,
  );
  const message = buildNewApplicationMessage(payload);

  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        senderKey: config.senderKey,
        templateCode: config.templateCode,
        recipientPhone,
        message,
        buttons: [
          {
            type: "WL",
            name: "지원서 보기",
            urlMobile: applicationUrl,
            urlPc: applicationUrl,
          },
        ],
        templateVariables: {
          "#{게스트하우스명}": payload.guesthouse.name,
          "#{지원자명}": payload.application.name,
          "#{지원서URL}": applicationUrl,
        },
        metadata: {
          ownerId: payload.owner.id,
          guesthouseId: payload.guesthouse.id,
          jobPostId: payload.jobPost.id,
          applicationId: payload.application.id,
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error("[kakao-alimtalk] owner new application notification failed", {
        status: response.status,
        response_text: responseText.slice(0, 1000),
        owner_id: payload.owner.id,
        application_id: payload.application.id,
      });
      return;
    }

    console.info("[kakao-alimtalk] owner new application notification sent", {
      owner_id: payload.owner.id,
      application_id: payload.application.id,
    });
  } catch (error) {
    console.error("[kakao-alimtalk] owner new application notification failed", {
      owner_id: payload.owner.id,
      application_id: payload.application.id,
      error,
    });
  }
}
