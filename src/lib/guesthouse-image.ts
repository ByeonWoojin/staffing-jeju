export const DEFAULT_GUESTHOUSE_IMAGE =
  "/images/guesthouse/default-guesthouse-thumbnail.png";

export const DEFAULT_GUESTHOUSE_IMAGE_ALT = "제주 게스트하우스 기본 이미지";

export function normalizeImageSource(value: string | null | undefined) {
  const source = value?.trim();
  return source ? source : null;
}

export function getGuesthouseImageSource(value: string | null | undefined) {
  return normalizeImageSource(value) ?? DEFAULT_GUESTHOUSE_IMAGE;
}

export function getGuesthouseImageAlt(
  guesthouseName: string | null | undefined,
  imageSource: string | null | undefined,
) {
  if (!normalizeImageSource(imageSource)) {
    return DEFAULT_GUESTHOUSE_IMAGE_ALT;
  }

  const name = guesthouseName?.trim();
  return name ? `${name} 게스트하우스` : DEFAULT_GUESTHOUSE_IMAGE_ALT;
}
