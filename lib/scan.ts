import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from 'firebase/ai';
import { app } from './firebase';
import type { Cat } from './store';
import type { Currency } from './types';

/**
 * 사진(영수증·구독 관리 화면) → 구독 정보 추출.
 * Firebase AI Logic(Gemini Developer API) 사용 — API 키가 클라이언트에
 * 노출되지 않고, Spark(무료) 플랜에서 동작. 이미지는 파싱에만 쓰고
 * 어디에도 저장하지 않는다.
 */
export interface ScanItem {
  name: string;
  amount: number;
  currency: Currency;
  cycle: 'month' | 'year';
  cat: Cat;
  chargeDate?: string;         // 'YYYY-MM-DD'
  confidence: number;          // 0~1
}

const schema = Schema.array({
  items: Schema.object({
    properties: {
      name: Schema.string(),
      amount: Schema.number(),
      currency: Schema.enumString({ enum: ['JPY', 'USD', 'KRW'] }),
      cycle: Schema.enumString({ enum: ['month', 'year'] }),
      cat: Schema.enumString({ enum: ['ai', 'dev', 'ent', 'sto', 'prod', 'game', 'ins', 'etc'] }),
      chargeDate: Schema.string(),
      confidence: Schema.number(),
    },
    optionalProperties: ['chargeDate'],
  }),
});

const PROMPT = `이미지에서 "정기 구독 서비스"의 결제 정보를 추출해 JSON 배열로 반환하라.
규칙:
- 영수증, 카드 명세서, 구독 관리 화면, 결제 완료 메일 캡처 등 어떤 형태든 가능한 항목을 모두 추출
- name: 서비스 브랜드명 그대로 (예: "Netflix", "Claude", "YouTube Premium")
- amount: 숫자만 (통화 기호·콤마 제거). 세금 포함 총액 우선
- currency: JPY/USD/KRW 중 하나. 그 외 통화 항목은 제외
- cycle: 월 구독이면 month, 연 구독이면 year. 판단 불가면 month
- cat: ai(AI·LLM), dev(개발·인프라), ent(영상·음악), sto(클라우드 저장소), prod(생산성·문서·노트), game(게임), ins(보험·보증·케어 — AppleCare 등), etc(그 외)
- chargeDate: 이미지에 보이는 날짜 (YYYY-MM-DD). 다음 갱신일("Renews ...", "Next Billing Date")이 있으면 그것을 우선, 없으면 결제일·청구일. 연도가 없으면 문맥상 가장 가까운 미래 연도로. 날짜가 전혀 없으면 생략
- confidence: 추출 확신도 0~1
- 구독이 아닌 일반 구매(물건·음식 등)는 제외. 아무것도 없으면 빈 배열 []`;

let model: ReturnType<typeof getGenerativeModel> | null = null;
function getModel() {
  if (!model) {
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    model = getGenerativeModel(ai, {
      // 버전 고정 모델은 신규 프로젝트에서 제공 종료될 수 있음 → 최신 별칭 사용
      model: 'gemini-flash-latest',
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
    });
  }
  return model;
}

const MAX_DIM = 1600;

/** 큰 사진은 축소 후 JPEG로 재인코딩 — 전송량·비용 절감 + 요청 한도 회피 */
async function toPayload(file: File): Promise<{ mimeType: string; data: string }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return { mimeType: 'image/jpeg', data: dataUrl.split(',')[1] };
}

const SCAN_TIMEOUT_MS = 30_000;

export async function scanImage(file: File): Promise<ScanItem[]> {
  const { mimeType, data } = await toPayload(file);
  const call = getModel().generateContent([
    { inlineData: { mimeType, data } },
    { text: PROMPT },
  ]);
  // 30초 초과 시 중단 — UI가 타임아웃 안내·재시도를 제공한다
  const res = await Promise.race([
    call,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error('SCAN_TIMEOUT')), SCAN_TIMEOUT_MS)),
  ]);
  const parsed = JSON.parse(res.response.text()) as ScanItem[];
  return parsed.filter(i => i?.name && i.amount > 0);
}
