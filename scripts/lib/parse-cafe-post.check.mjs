// node scripts/lib/parse-cafe-post.check.mjs — 파서 회귀 체크 (실패 시 assert 에러)
import assert from "node:assert/strict";
import { ASAP_DATE, parsePost } from "./parse-cafe-post.mjs";

const today = new Date("2026-10-05T00:00:00Z");
const p = (subject, text, nick = "") =>
  parsePost({ subject, contentHtml: text.split("\n").map((l) => `<p>${l}</p>`).join(""), nick }, today);

// 제목에 압축된 조건 + 본문 필드
let r = p("🍊[애월] 바다게스트하우스 여스탭 모집 (2일근무,4일휴무/유급/파티없음)", "모집인원 : 2인 (23세~35세)\n근무시간 : 13:00 ~ 18:00\n숙소 제공, 점심 제공\n10월 20일 이후 입도 가능");
assert.equal(r.guesthouse.region, "애월");
assert.equal(r.fields.gender_condition, "female");
assert.equal(r.fields.recruit_count, 2);
assert.equal(r.fields.age_condition, "23세~35세");
assert.equal(r.fields.work_days_per_week, 2);
assert.equal(r.fields.off_days_per_week, 4);
assert.equal(r.fields.stipend_type, "provided");
assert.equal(r.fields.has_party, false);
assert.equal(r.fields.provides_accommodation, true);
assert.equal(r.fields.provides_meal, true);
assert.equal(r.fields.work_time, "13:00 ~ 18:00");
assert.equal(r.fields.work_start_date, "2026-10-20");
assert.equal(r.assumed.includes("work_start_date"), false);

// 정원 ≠ 모집인원, 지난 날짜·'바로 입도' → ASAP, 가정값은 assumed 로 구분
r = p("정원 7명의 소규모 게스트하우스 스탭 모집", "9월 1일 부터 입도 가능");
assert.equal(r.fields.recruit_count, 1);
assert.equal(r.fields.work_start_date, ASAP_DATE);
assert.ok(r.assumed.includes("recruit_count"));

// 파티: 부정 표현 / 링크 미리보기 노이즈 / 업무표의 '파티 준비'
assert.equal(p("스탭 모집", "저희는 파티를 개최하지 않습니다").fields.has_party, false);
assert.equal(p("스탭 모집", "시끄러운 파티 보다는 차분한 숙소입니다").fields.has_party, false);
assert.equal(p("스탭 모집", "게스트하우스 파티우도 민박 : 네이버\n방문자리뷰 1,000 · 블로그리뷰 5\n근무 안내").fields.has_party, null);
assert.equal(p("스탭 모집", "19:00 : 저녁 파티 준비 및 정리").fields.has_party, true);

// 포틀럭(음식 나눔)은 술 파티와 구분. 포틀럭 글의 '저녁 파티 준비'는 포틀럭으로 본다
r = p("스탭 모집", "19:00 저녁 포틀럭 파티 (근무자 참석)\n17:00 저녁 파티 준비\n조용한 소규모 모임");
assert.equal(r.party_kind, "potluck");
assert.equal(r.fields.has_party, false);
assert.ok(r.tags.includes("포틀럭"));
assert.equal(p("스탭 모집", "포틀럭 진행해요\n맥주 마시는 대형 파티가 열려요").party_kind, "party");
assert.equal(p("스탭 모집", "파티는 없고 포틀럭만 해요").party_kind, "potluck");

// 지원 방법: 번호는 지원 안내(apply)에만 남기고 다른 필드에서는 제거
r = p("스탭 모집", "[지원 방법]\n인스타그램 @good_house 로 보내주세요.");
assert.deepEqual([r.apply.channel, r.apply.url], ["instagram", "https://www.instagram.com/good_house/"]);
r = p("스탭 모집", "지원 방법\n010-1234-5678 로 문자 주세요\n자기소개/나이/입도일");
assert.equal(r.apply.channel, "sms");
assert.equal(r.apply.url, null);
assert.equal(r.apply.phone, "010-1234-5678");
assert.ok(r.apply.hint.includes("010-1234-5678"));
assert.ok(!JSON.stringify([r.fields, r.guesthouse]).includes("1234"), "지원 안내 밖에 전화번호가 남아있음");
assert.ok(!JSON.stringify(p("스탭 모집", "근무 안내\n전화번호 : 010.1111.2222\n좋은 곳").fields).includes("1111"));
assert.equal(p("스탭 모집", "신청: https://open.kakao.com/o/abc123").apply.channel, "openchat");

// 링크 줄 바로 앞의 실제 내용(연락처)이 미리보기 정리에 같이 지워지면 안 된다 (예스준 글 사례)
r = p("스탭 모집", "💬 지원 시 아래 정보 함께 주세요\n이름 / 나이 / 사진\n👉 지원 연락처 : 010-3333-4444 (문자 먼저 주세요)\n👉 자세한 후기 & 사진 : https://naver.me/G7KDyyev");
assert.equal(r.apply.phone, "010-3333-4444");
assert.equal(r.apply.channel, "sms");

// 연락처가 지원방법 헤더에서 멀리(맨 끝/주소 줄) 있어도 찾는다
r = p("스탭 모집", "-지원방법-\n이름 / 나이\n1\n2\n3\n4\n5\n6\n7\n문 의 : 010-5555-6666\n마무리");
assert.equal(r.apply.phone, "010-5555-6666");
assert.ok(r.apply.hint.includes("010-5555-6666"));
r = p("스탭 모집", "매니저 인스타 주소 : https://www.instagram.com/manager_ig/ (여기로 지원서 보내주세요)");
assert.deepEqual([r.apply.channel, r.apply.url], ["instagram", "https://www.instagram.com/manager_ig/"]);
r = p("스탭 모집", "지원서는 카톡으로 주세요\n카톡 ID : kakao_test1");
assert.deepEqual([r.apply.channel, r.apply.kakaoId], ["kakao", "kakao_test1"]);
assert.ok(!JSON.stringify([r.fields, r.guesthouse]).includes("kakao_test1"), "카톡ID가 지원 안내 밖에 남아있음");
r = p("스탭 모집", "연락처 010 7777 8888\n지원양식\n글 상단에 있는 번호 카톡으로 보내주세요.");
assert.deepEqual([r.apply.channel, r.apply.phone], ["kakao", "010-7777-8888"]);
r = p("스탭 모집", "소개용 계정 @house_official 구경오세요\n근무 안내");
assert.equal(r.apply.channel, "original"); // 소개용 인스타 계정은 지원 수단이 아님

r = p("스탭 모집", "&lt;&lt;카카오톡&gt;&gt;으로 지원해주세요.");
assert.equal(r.apply.channel, "kakao");
assert.ok(r.apply.hint.includes("카카오톡"));

// 서로 다른 접수 메일이 둘이면 모두 남긴다 (접수처 라벨과 주소가 다른 줄이어도)
r = p("스탭 모집", "접수처:\na@naver.com\n본문\n접수처: b@gmail.com");
assert.deepEqual(r.apply.emails.sort(), ["a@naver.com", "b@gmail.com"]);

// 하이픈 앞뒤 공백이 있는 번호, 카톡 ID 에 @ 포함, 지원폼 + 문의 번호 동시 존재
r = p("스탭 모집", "지원 방식\n010 - 1111 - 2222 문자메세지 혹은\n@test_house 로 DM 보내주세요");
assert.equal(r.apply.phone, "010-1111-2222");
assert.ok(!JSON.stringify(p("스탭 모집", "연락처 : 010 - 3333 - 4444\n좋은 곳").fields).includes("3333"), "공백 포함 번호가 본문에 남음");
r = p("스탭 모집", "카톡아이디:kk_test@naver.com");
assert.equal(r.apply.kakaoId, "kk_test@naver.com");
r = p("스탭 모집", "지원 양식 https://forms.gle/abc123\n추가문의는 010-5555-6666 로");
assert.deepEqual([r.apply.channel, r.apply.phone], ["form", "010-5555-6666"]);

// 근무시간: 체크인 시간대 같은 짧은 구간은 무시, 한글 시각 지원
assert.equal(p("스탭 모집", "체크인 가능 시간 02:00 ~ 03:00").fields.work_time, null);
assert.equal(p("스탭 모집", "근무: 16시 ~ 23시").fields.work_time, "16:00 ~ 23:00");

// 하루 일과표 → work_time/work_content 요약 (derived 로 표시)
r = p("스탭 모집", "근무 안내\n11:00 객실 청소\n13:00 점심\n17:00 체크인 안내\n자유시간");
assert.match(r.fields.work_time, /11:00 객실 청소/);
assert.deepEqual(r.derived.sort(), ["work_content", "work_time"]);
assert.equal(p("스탭 모집", "근무 시간 : 6시간 [저녁]").fields.work_time, "6시간 [저녁]");

assert.equal(p("애월 호스타 모집 신제주(연동)와 15분거리", "x").guesthouse.region, "애월");

// 게하명: 제목의 이름 전체(한 글자만 뽑지 않기), 일반명사 '게스트하우스' 제외, 없으면 닉네임
assert.equal(p("[구구호스텔] 여성 스탭 모집", "x", "닉").guesthouse.name, "구구호스텔");
assert.equal(p("바다 게스트하우스 스탭 모집", "x", "닉네임").guesthouse.name, "닉네임");

// 이미지: 사진만 추출 (링크 미리보기/gif 제외)
r = parsePost({ subject: "x", contentHtml: '<img class="se-image-resource" src="https://a/1.jpg?type=w1600"/><img class="se-oglink-thumbnail-resource" src="https://a/2.jpg"/><img class="se-image-resource" src="https://a/3.gif"/>' }, today);
assert.deepEqual(r.images, ["https://a/1.jpg?type=w1600"]);

console.log("parse-cafe-post: ok");
