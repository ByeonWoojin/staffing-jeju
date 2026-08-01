export type ActionResultCode =
  | "SUCCESS"
  | "NO_CHANGES"
  | "VALIDATION_ERROR"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_FILES"
  | "UNSUPPORTED_FILE_TYPE"
  | "UPLOAD_FAILED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "SAVE_FAILED"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR"
  | "UPDATE_FAILED";

export type ActionResult<T = undefined> = {
  success: boolean;
  code?: ActionResultCode | string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
};

export const ACTION_RESULT_MESSAGES: Record<
  Exclude<ActionResultCode, "SUCCESS" | "UPDATE_FAILED">,
  string
> = {
  NO_CHANGES: "변경된 내용이 없습니다.",
  VALIDATION_ERROR: "입력한 내용을 다시 확인해 주세요.",
  FILE_TOO_LARGE: "사진 한 장의 용량은 최대 5MB까지 가능합니다.",
  TOO_MANY_FILES: "사진은 최대 5장까지 등록할 수 있습니다.",
  UNSUPPORTED_FILE_TYPE:
    "JPG, JPEG, PNG, WEBP 형식의 사진만 등록할 수 있습니다.",
  UPLOAD_FAILED:
    "사진 업로드 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  UNAUTHORIZED: "로그인 정보가 만료되었습니다. 다시 로그인해 주세요.",
  NOT_FOUND: "요청한 정보를 찾을 수 없습니다.",
  SAVE_FAILED: "정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  NETWORK_ERROR: "네트워크 연결을 확인한 후 다시 시도해 주세요.",
  UNKNOWN_ERROR: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
};

const SAVE_FAILED_MESSAGE = ACTION_RESULT_MESSAGES.SAVE_FAILED;
const UNKNOWN_ERROR_MESSAGE = ACTION_RESULT_MESSAGES.UNKNOWN_ERROR;
const KOREAN_TEXT_PATTERN = /[ㄱ-ㅎㅏ-ㅣ가-힣]/;
const TECHNICAL_MESSAGE_PATTERN =
  /\b(Supabase|PostgREST|JWT|TypeError|ReferenceError|SyntaxError|digest|stack|SQL|HTTP|status|fetch failed|Failed to fetch|NetworkError|ENOT|ECONN|permission denied)\b/i;

export function getDefaultActionMessage(code?: string): string {
  if (!code) return UNKNOWN_ERROR_MESSAGE;
  if (code === "UPDATE_FAILED") return SAVE_FAILED_MESSAGE;
  return (
    ACTION_RESULT_MESSAGES[
      code as Exclude<ActionResultCode, "SUCCESS" | "UPDATE_FAILED">
    ] ?? UNKNOWN_ERROR_MESSAGE
  );
}

export function isSafeKoreanUserMessage(
  message: string | null | undefined,
): message is string {
  if (!message) return false;
  return (
    KOREAN_TEXT_PATTERN.test(message) && !TECHNICAL_MESSAGE_PATTERN.test(message)
  );
}

export function getActionResultMessage(
  result: Pick<ActionResult, "code" | "message">,
  fallback = UNKNOWN_ERROR_MESSAGE,
): string {
  if (result.code) {
    if (
      result.code === "VALIDATION_ERROR" &&
      isSafeKoreanUserMessage(result.message)
    ) {
      return result.message;
    }

    if (
      result.code === "NO_CHANGES" &&
      isSafeKoreanUserMessage(result.message)
    ) {
      return result.message;
    }

    return getDefaultActionMessage(result.code);
  }

  if (isSafeKoreanUserMessage(result.message)) {
    return result.message;
  }

  return fallback;
}

export function getSafeErrorMessage(
  error: unknown,
  fallback = UNKNOWN_ERROR_MESSAGE,
): string {
  if (error instanceof Error && isSafeKoreanUserMessage(error.message)) {
    return error.message;
  }

  return fallback;
}
