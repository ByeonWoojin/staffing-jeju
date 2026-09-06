# 카카오 알림톡 연동 메모

신규 지원 알림은 지원서 저장 성공 후 best-effort로 발송한다. 알림톡 발송 실패는 지원서 제출 성공 여부에 영향을 주지 않는다.

## 신규 지원 알림 템플릿

```text
[스탭핑] 신규 지원자가 도착했어요

#{게스트하우스명} 모집글에 #{지원자명}님이 지원했습니다.

지원서를 확인해주세요.
```

버튼: `지원서 보기`

## 필요한 환경변수

| 이름 | 설명 |
| --- | --- |
| `KAKAO_ALIMTALK_WEBHOOK_URL` | 알림톡 발송 웹훅 또는 발송 대행사 API URL |
| `KAKAO_ALIMTALK_API_KEY` | 웹훅/API 인증 키 |
| `KAKAO_ALIMTALK_SENDER_KEY` | 카카오톡 채널 발신 프로필 키 |
| `KAKAO_ALIMTALK_NEW_APPLICATION_TEMPLATE_CODE` | 신규 지원 알림톡 승인 템플릿 코드 |
| `NEXT_PUBLIC_SITE_URL` | `지원서 보기` 버튼에 사용할 서비스 URL |

업체별 요청 스키마가 다를 수 있으므로, 실제 대행사가 정해지면 `src/lib/notifications/kakao-alimtalk.ts`의 요청 body를 해당 업체 스펙에 맞춘다.
