'use client';
import ScanBanner from '@/components/ScanBanner';
import { fmt, toJPY } from '@/lib/fx';
import { useLang } from '@/lib/i18n';
import { nextChargeDate } from '@/lib/monthly';
import { useStore, CATCOLOR, type Cat, type SubRow } from '@/lib/store';

const ORDER: Cat[] = ['ai', 'dev', 'ent', 'sto', 'etc'];
// 구버전 데이터에 언어별로 박제된 '커스텀' 플랜명 — 표시 시점에 현재 언어로 통일
const CUSTOM_SENTINELS = ['커스텀', 'カスタム', 'Custom'];
export const planLabel = (plan: string, t: (k: string) => string) =>
  !plan || CUSTOM_SENTINELS.includes(plan) ? t('planCustom') : plan;
const CAT_KEY: Record<Cat, string> = {
  ai: 'catAi', dev: 'catDev', ent: 'catEnt', sto: 'catSto', etc: 'catEtc',
};

/** 카테고리별 그룹 + 월 환산 소계 (연결제는 /12). 행 탭 = 수정, × = 삭제 */
export default function SubList() {
  const { cur, subs, oneTime, openEdit, removeSub, removeOneTime } = useStore();
  const { t } = useLang();

  // 다음 결제일: 저장된 next 문자열 대신 항상 계산값 사용
  const nextLabel = (s: SubRow): string => {
    const d = nextChargeDate(s);
    return t('nextOn', { d: d ? `${d.getMonth() + 1}/${d.getDate()}` : s.next });
  };

  const del = (e: React.MouseEvent, s: SubRow) => {
    e.stopPropagation();
    if (confirm(t('delSub', { name: s.name }))) removeSub(s.id);
  };

  return (
    <>
      <ScanBanner />

      <section>
        <div className="sec-head">
          <h2>{t('activeSubs')}</h2>
          <span className="hint">{t('activeHint', { n: subs.length })}</span>
        </div>
        {subs.length === 0 && (
          <div className="sub-card"><div className="renew-empty">{t('emptySubs')}</div></div>
        )}
        {ORDER.map(cat => {
          const items = subs.filter(s => s.cat === cat);
          if (!items.length) return null;
          const subtotal = items.reduce(
            (acc, s) => acc + toJPY(s.amt, s.c) / (s.cycle === 'year' ? 12 : 1), 0);
          return (
            <div key={cat} className="cat-group">
              <div className="cat-label">
                <span><i className="dot" style={{ background: CATCOLOR[cat] }} />
                  {t('catCount', { cat: t(CAT_KEY[cat]), n: items.length })}</span>
                <b>{fmt(subtotal, cur)}</b>
              </div>
              <div className="sub-card">
                {items.map(s => (
                  <div className="sub-row tappable" key={s.id} role="button" tabIndex={0}
                    aria-label={`${s.name} ${t('edit')}`}
                    onClick={() => openEdit(s)}
                    onKeyDown={e => { if (e.key === 'Enter') openEdit(s); }}>
                    <div className="r-icon" style={{ background: CATCOLOR[s.cat] }}>{s.init}</div>
                    <div className="r-body">
                      <div className="r-name">{s.name}</div>
                      <div className="r-meta">{planLabel(s.plan, t)} · {s.cycle === 'year' ? t('yearly') : t('monthly')}</div>
                    </div>
                    <div className="r-right">
                      <div className="r-amt">{fmt(toJPY(s.amt, s.c), cur)}</div>
                      <div className="r-day">{nextLabel(s)}</div>
                    </div>
                    <button className="row-del" aria-label={`${s.name} ${t('delete')}`}
                      onClick={e => del(e, s)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <div className="sec-head"><h2>{t('oneTimeTitle')}</h2><span className="hint">{t('oneTimeHint')}</span></div>
        <div className="sub-card">
          {oneTime.length === 0 && <div className="renew-empty">{t('emptyOneTime')}</div>}
          {oneTime.map(o => (
            <div className="sub-row" key={o.id}>
              <div className="r-icon" style={{ background: '#B7C0CC' }}>{o.init}</div>
              <div className="r-body">
                <div className="r-name">{o.name}</div>
                <div className="r-meta">{o.note} · {t('oneTimeTag')}</div>
              </div>
              <div className="r-right"><div className="r-amt">{fmt(toJPY(o.amt, o.c), cur)}</div></div>
              <button className="row-del" aria-label={`${o.name} ${t('delete')}`}
                onClick={() => { if (confirm(t('delOne', { name: o.name }))) removeOneTime(o.id); }}>×</button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
