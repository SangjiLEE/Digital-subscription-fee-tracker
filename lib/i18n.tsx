'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/** UI 다국어. 문구는 전부 여기서 — 컴포넌트에 하드코딩 금지. */
export type Lang = 'ko' | 'ja' | 'en';
export const LANG_NAME: Record<Lang, string> = { ko: '한국어', ja: '日本語', en: 'English' };
const LANGS: Lang[] = ['ko', 'ja', 'en'];

/** 영어 월 약칭 (1-base) */
export const MON_EN = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DICT: Record<string, Record<Lang, string>> = {
  // 공통
  monthly:      { ko: '월 결제', ja: '月払い', en: 'Monthly' },
  yearly:       { ko: '연 결제', ja: '年払い', en: 'Yearly' },
  today:        { ko: '오늘', ja: '今日', en: 'Today' },
  monthN:       { ko: '{m}월', ja: '{m}月', en: '{mon}' },
  // 헤더 / 탭
  signIn:       { ko: '로그인', ja: 'ログイン', en: 'Sign in' },
  signOut:      { ko: '로그아웃', ja: 'ログアウト', en: 'Sign out' },
  navHome:      { ko: '홈', ja: 'ホーム', en: 'Home' },
  navList:      { ko: '목록', ja: 'リスト', en: 'List' },
  navSettings:  { ko: '설정', ja: '設定', en: 'Settings' },
  // 홈
  totalLabel:   { ko: '{mon} 총 구독료', ja: '{mon}の合計サブスク料', en: 'Total for {mon}' },
  countsLine:   { ko: '활성 구독 {n}건 · 일회성 {k}건', ja: '定期 {n}件 · 単発 {k}件', en: '{n} subscriptions · {k} one-time' },
  monthlySpend: { ko: '월별 지출', ja: '月別支出', en: 'Monthly spending' },
  tapBarHint:   { ko: '막대를 누르면 상세', ja: 'バーをタップで詳細', en: 'Tap a bar for details' },
  upcoming:     { ko: '다가오는 갱신', ja: '今後の更新', en: 'Upcoming renewals' },
  within30:     { ko: '30일 이내', ja: '30日以内', en: 'Next 30 days' },
  footerLegend: { ko: '실선 = 결제 완료 · 빗금 = 예정', ja: '実線 = 支払済 · 斜線 = 予定', en: 'Solid = paid · Hatched = projected' },
  fxBase:       { ko: '환율 ECB {d} 기준', ja: '為替 ECB {d} 基準', en: 'FX: ECB {d}' },
  fxFixed:      { ko: '고정 환율 기준', ja: '固定レート基準', en: 'Fixed FX rates' },
  alertOne:     { ko: '{name} — 3일 내 갱신', ja: '{name} — 3日以内に更新', en: '{name} renews within 3 days' },
  alertMulti:   { ko: '{name} 외 {n}건 — 3일 내 갱신', ja: '{name} 他{n}件 — 3日以内に更新', en: '{name} +{n} more renew within 3 days' },
  // 카테고리
  catAi:        { ko: 'AI·LLM', ja: 'AI・LLM', en: 'AI & LLM' },
  catDev:       { ko: '개발·인프라', ja: '開発・インフラ', en: 'Dev & Infra' },
  catEnt:       { ko: '영상·음악', ja: '動画・音楽', en: 'Media & Music' },
  catSto:       { ko: '클라우드·스토리지', ja: 'クラウド・ストレージ', en: 'Cloud Storage' },
  catStoShort:  { ko: '스토리지', ja: 'ストレージ', en: 'Storage' },
  catEtc:       { ko: '기타', ja: 'その他', en: 'Other' },
  // 차트
  detailOf:     { ko: '{mon} 내역', ja: '{mon}の内訳', en: '{mon} breakdown' },
  paidTag:      { ko: '결제 완료', ja: '支払い済み', en: 'Paid' },
  projTag:      { ko: '예정 · 오늘 환율 기준', ja: '予定 · 本日レート基準', en: 'Projected · today’s rate' },
  deltaUp:      { ko: '전월 대비 ▲ {v} 증가', ja: '前月比 ▲ {v} 増', en: '▲ {v} vs last month' },
  deltaDown:    { ko: '전월 대비 ▼ {v} 감소', ja: '前月比 ▼ {v} 減', en: '▼ {v} vs last month' },
  deltaFlat:    { ko: '전월과 동일', ja: '前月と同じ', en: 'Same as last month' },
  futureSuffix: { ko: ' 예정', ja: ' 予定', en: ' (proj.)' },
  emptyChart:   { ko: '구독을 등록하면 월별 지출 차트가 여기에 그려져요', ja: 'サブスクを登録すると月別支出チャートが表示されます', en: 'Add subscriptions to see your monthly spending chart' },
  // 갱신 리스트
  manualRenew:  { ko: '수동갱신', ja: '手動更新', en: 'Manual' },
  noUpcoming:   { ko: '30일 이내 갱신 예정이 없어요', ja: '30日以内の更新予定はありません', en: 'No renewals in the next 30 days' },
  // 목록
  scanTitle:    { ko: '사진으로 추가', ja: '写真から追加', en: 'Add from photo' },
  scanHint:     { ko: '영수증·구독 화면 인식', ja: 'レシート・サブスク画面を認識', en: 'Scan receipts & screenshots' },
  scanBtn:      { ko: '📷 사진 올려서 자동 인식', ja: '📷 写真をアップして自動認識', en: '📷 Upload a photo to auto-detect' },
  scanning:     { ko: '인식 중…', ja: '認識中…', en: 'Scanning…' },
  scanNotFound: { ko: '사진에서 구독 정보를 찾지 못했어요. 금액·서비스명이 보이게 다시 찍어보세요.', ja: '写真からサブスク情報が見つかりませんでした。金額・サービス名が写るように撮り直してください。', en: 'No subscription info found. Retake with the amount and service name visible.' },
  scanFailed:   { ko: '인식에 실패했어요. 잠시 후 다시 시도해주세요.\n({d})', ja: '認識に失敗しました。しばらくして再試行してください。\n({d})', en: 'Scan failed. Please try again shortly.\n({d})' },
  confidence:   { ko: '확신도 {p}%', ja: '確度 {p}%', en: '{p}% confident' },
  renewOn:      { ko: '갱신 {d}', ja: '更新 {d}', en: 'Renews {d}' },
  paidOn:       { ko: '결제일 {d}', ja: '支払日 {d}', en: 'Paid {d}' },
  register:     { ko: '등록', ja: '登録', en: 'Add' },
  edit:         { ko: '편집', ja: '編集', en: 'Edit' },
  dismiss:      { ko: '무시', ja: '無視', en: 'Dismiss' },
  activeSubs:   { ko: '활성 구독', ja: '利用中のサブスク', en: 'Active subscriptions' },
  activeHint:   { ko: '{n}건 · 탭하면 수정', ja: '{n}件 · タップで編集', en: '{n} items · tap to edit' },
  emptySubs:    { ko: '아직 등록된 구독이 없어요 — 오른쪽 아래 + 버튼으로 시작하세요', ja: 'まだサブスクがありません — 右下の＋ボタンから始めましょう', en: 'No subscriptions yet — tap the + button to get started' },
  catCount:     { ko: '{cat} · {n}건', ja: '{cat} · {n}件', en: '{cat} · {n}' },
  nextOn:       { ko: '다음 {d}', ja: '次回 {d}', en: 'Next {d}' },
  oneTimeTitle: { ko: '일회성 지출', ja: '単発の支出', en: 'One-time expenses' },
  oneTimeHint:  { ko: '해당 월 지출에 포함 · 구독료 총액 미포함', ja: '当月の支出に含む · 定期合計には含まない', en: 'Counted in that month · not in recurring total' },
  emptyOneTime: { ko: '일회성 지출이 없어요', ja: '単発の支出はありません', en: 'No one-time expenses' },
  oneTimeTag:   { ko: '일회성', ja: '単発', en: 'One-time' },
  delSub:       { ko: "'{name}' 구독을 삭제할까요?", ja: '「{name}」を削除しますか？', en: "Delete '{name}'?" },
  delOne:       { ko: "'{name}' 지출을 삭제할까요?", ja: '「{name}」の支出を削除しますか？', en: "Delete '{name}'?" },
  delete:       { ko: '삭제', ja: '削除', en: 'Delete' },
  // 등록 모달
  addTitle:     { ko: '구독 등록', ja: 'サブスク登録', en: 'Add subscription' },
  editTitle:    { ko: '구독 수정', ja: 'サブスク編集', en: 'Edit subscription' },
  service:      { ko: '서비스', ja: 'サービス', en: 'Service' },
  searchPh:     { ko: '이름 검색 또는 직접 입력', ja: '名前を検索または直接入力', en: 'Search or type a name' },
  refNote:      { ko: '참고가로 채웠어요 ({r} 기준) · 실제 청구액과 다르면 수정하세요', ja: '参考価格を入力しました（{r}基準）· 実際の請求額と違う場合は修正してください', en: 'Filled with reference price ({r}) — adjust if your bill differs' },
  amount:       { ko: '금액', ja: '金額', en: 'Amount' },
  cycle:        { ko: '결제 주기', ja: '支払いサイクル', en: 'Billing cycle' },
  everyMonth:   { ko: '매월', ja: '毎月', en: 'Monthly' },
  everyYear:    { ko: '매년', ja: '毎年', en: 'Yearly' },
  firstDate:    { ko: '최초 결제일', ja: '初回支払日', en: 'First payment date' },
  renewType:    { ko: '갱신 유형', ja: '更新タイプ', en: 'Renewal type' },
  autoRenew:    { ko: '자동갱신', ja: '自動更新', en: 'Auto-renew' },
  oneTimeOpt:   { ko: '일회성', ja: '単発', en: 'One-time' },
  saveNew:      { ko: '등록', ja: '登録', en: 'Add' },
  saveEdit:     { ko: '수정 저장', ja: '保存', en: 'Save changes' },
  validateMsg:  { ko: '서비스명과 금액을 입력해주세요', ja: 'サービス名と金額を入力してください', en: 'Enter a service name and amount' },
  close:        { ko: '닫기', ja: '閉じる', en: 'Close' },
  planCustom:   { ko: '커스텀', ja: 'カスタム', en: 'Custom' },
  paidNote:     { ko: '{d} 결제', ja: '{d} 支払い', en: 'Paid {d}' },
  // 웰컴
  wTitle1:      { ko: '디지털 구독료,', ja: 'サブスク料金、', en: 'Your subscriptions —' },
  wTitle2:      { ko: '얼마인지 알고 계신가요?', ja: 'いくらか把握できていますか？', en: 'do you know what they cost?' },
  wDesc:        { ko: '넷플릭스부터 AI 구독까지 — 매달 나가는 돈과 갱신 일정을 한눈에. 지금 관리하세요!', ja: 'NetflixからAIサブスクまで — 毎月の支出と更新日をひと目で。今すぐ管理！', en: 'From Netflix to AI tools — see your monthly spend and renewal dates at a glance.' },
  wStart:       { ko: '시작하기', ja: 'はじめる', en: 'Get started' },
  wSkip:        { ko: '일주일 동안 표시하지 않기', ja: '1週間表示しない', en: "Don't show for a week" },
  // 설정
  secDisplay:   { ko: '표시', ja: '表示', en: 'Display' },
  dispCur:      { ko: '표시 통화', ja: '表示通貨', en: 'Display currency' },
  uiLang:       { ko: 'UI 언어', ja: 'UI言語', en: 'Language' },
  priceRegion:  { ko: '가격 참조 지역', ja: '価格参照地域', en: 'Price region' },
  timezone:     { ko: '타임존', ja: 'タイムゾーン', en: 'Timezone' },
  autoBadge:    { ko: '자동', ja: '自動', en: 'Auto' },
  soon:         { ko: '준비 중', ja: '準備中', en: 'Coming soon' },
  secAlarm:     { ko: '알림', ja: '通知', en: 'Notifications' },
  renewAlertL:  { ko: '갱신 임박 알림 (앱 내)', ja: '更新間近の通知（アプリ内）', en: 'Renewal alerts (in-app)' },
  weeklyMail:   { ko: '주간 요약 메일', ja: '週間サマリーメール', en: 'Weekly summary email' },
  secReceipt:   { ko: '영수증 자동 등록', ja: 'レシート自動登録', en: 'Auto-import receipts' },
  mailFwd:      { ko: '메일 포워딩 감지', ja: 'メール転送の検出', en: 'Email forwarding' },
  noteDisplay:  { ko: '표시 통화는 홈의 ₩/¥/$ 토글과 연동되고, 가격 참조 지역은 구독 등록 시 카탈로그 참고가에 사용돼요. 모두 이 기기에 저장됩니다.', ja: '表示通貨はホームの₩/¥/$トグルと連動し、価格参照地域は登録時の参考価格に使われます。この端末に保存されます。', en: 'Display currency syncs with the ₩/¥/$ toggle on Home; price region sets catalog reference prices. Saved on this device.' },
  noteAlarm:    { ko: '갱신 임박 알림은 3일 내 갱신 예정이 있을 때 홈 상단에 표시돼요. 메일 알림은 발송 서버(유료 플랜)가 필요해 준비 중입니다.', ja: '更新間近の通知は3日以内の更新予定があるときホーム上部に表示されます。メール通知は送信サーバーが必要なため準備中です。', en: 'Renewal alerts appear on Home when something renews within 3 days. Email needs a mail server and is coming later.' },
  noteReceipt:  { ko: '지금은 목록 화면의 사진 인식으로 영수증·구독 화면을 올리면 자동 등록할 수 있어요.', ja: '現在はリスト画面の写真認識でレシート・サブスク画面を自動登録できます。', en: 'For now, use photo scan on the List screen to auto-add from receipts and screenshots.' },
  noteReceiptLink: { ko: '목록 화면의 사진 인식', ja: 'リスト画面の写真認識', en: 'photo scan on the List screen' },
  curJPY:       { ko: '엔 (JPY)', ja: '円 (JPY)', en: 'Yen (JPY)' },
  curUSD:       { ko: '달러 (USD)', ja: 'ドル (USD)', en: 'Dollar (USD)' },
  curKRW:       { ko: '원 (KRW)', ja: 'ウォン (KRW)', en: 'Won (KRW)' },
  regionJP:     { ko: '일본 (JP)', ja: '日本 (JP)', en: 'Japan (JP)' },
  regionKR:     { ko: '한국 (KR)', ja: '韓国 (KR)', en: 'Korea (KR)' },
  regionUS:     { ko: '미국 (US)', ja: '米国 (US)', en: 'US' },
  listFooter:   { ko: '행을 누르면 수정 · ×로 삭제', ja: '行をタップで編集 · ×で削除', en: 'Tap a row to edit · × to delete' },
  adding:       { ko: '등록 중…', ja: '登録中…', en: 'Adding…' },
  saving:       { ko: '저장 중…', ja: '保存中…', en: 'Saving…' },
  opFail:       { ko: '처리에 실패했습니다. 잠시 후 다시 시도해주세요.', ja: '処理に失敗しました。しばらくして再試行してください。', en: 'Something went wrong. Please try again.' },
  addManual:    { ko: '✏️ 직접 등록', ja: '✏️ 手動で登録', en: '✏️ Add manually' },
  addByPhoto:   { ko: '📷 사진 업로드하기', ja: '📷 写真をアップロード', en: '📷 Upload a photo' },
  scanTimeout:  { ko: '인식이 30초를 넘겨 중단했어요. 다시 시도하거나 직접 입력해 주세요.', ja: '認識が30秒を超えたため中断しました。再試行するか手動で入力してください。', en: 'Scan took over 30s and was stopped. Retry or enter manually.' },
  retry:        { ko: '다시 시도', ja: '再試行', en: 'Retry' },
  cancelBtn:    { ko: '취소', ja: 'キャンセル', en: 'Cancel' },
  enterManually:{ ko: '직접 입력', ja: '手動入力', en: 'Enter manually' },
  scanPrivacy:  { ko: '사진은 Google Gemini로 분석만 하고 저장하지 않아요', ja: '写真はGoogle Geminiで分析のみ行い、保存しません', en: 'Photos are analyzed by Google Gemini and never stored' },
  signingIn:    { ko: '로그인 중…', ja: 'ログイン中…', en: 'Signing in…' },
  loginBenefit: { ko: '로그인하면 구독 정보가 여러 기기에서 동기화돼요', ja: 'ログインするとサブスク情報が複数端末で同期されます', en: 'Sign in to sync your subscriptions across devices' },
  sampleBadge:  { ko: '샘플', ja: 'サンプル', en: 'Sample' },
  sampleNote:   { ko: '지금 보이는 것은 샘플 데이터예요 — 로그인하면 내 구독으로 시작해요', ja: '表示中はサンプルデータです — ログインすると自分のサブスクで始められます', en: 'This is sample data — sign in to start with your own subscriptions' },
  renewToday:   { ko: '오늘', ja: '今日', en: 'today' },
  renewTomorrow:{ ko: '내일', ja: '明日', en: 'tomorrow' },
  renewInDays:  { ko: '{n}일 후', ja: '{n}日後', en: 'in {n} days' },
  alertSingle:  { ko: '{name} — {when} 갱신', ja: '{name} — {when}更新', en: '{name} renews {when}' },
  alertMultiN:  { ko: '3일 안에 {n}건 갱신 — {name} {when}', ja: '3日以内に{n}件更新 — {name} {when}', en: '{n} renew within 3 days — {name} {when}' },
  monthlyEquiv: { ko: '월 환산 약 {v}', ja: '月換算 約 {v}', en: '≈ {v}/month' },
  category:     { ko: '카테고리', ja: 'カテゴリ', en: 'Category' },
};

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** 월 표기: ko/ja는 "8월/8月", en은 "Aug" */
  mon: (m1: number) => string;
}

const Ctx = createContext<LangCtx>({
  lang: 'ko', setLang: () => {},
  t: k => k, mon: m => `${m}월`,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ko');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('uiLang');
      if (saved && (LANGS as string[]).includes(saved)) setLangState(saved as Lang);
    } catch {}
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('uiLang', l); } catch {}
  };
  const t: LangCtx['t'] = (key, vars) => {
    let s = DICT[key]?.[lang] ?? DICT[key]?.ko ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
  const mon = (m1: number) =>
    lang === 'en' ? MON_EN[m1] : t('monthN', { m: m1, mon: MON_EN[m1] });
  return <Ctx.Provider value={{ lang, setLang, t, mon }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
