'use client';
import ScanBanner from '@/components/ScanBanner';
import { fmt, toJPY } from '@/lib/fx';
import { useLang } from '@/lib/i18n';
import { nextChargeDate } from '@/lib/monthly';
import { useStore, isActive, CATCOLOR, CAT_ORDER, CAT_KEY, type SubRow, type OneTimeRow } from '@/lib/store';

// 구버전 데이터에 언어별로 박제된 '커스텀' 플랜명 — 표시 시점에 현재 언어로 통일
const CUSTOM_SENTINELS = ['커스텀', 'カスタム', 'Custom'];
export const planLabel = (plan: string, t: (k: string) => string) =>
  !plan || CUSTOM_SENTINELS.includes(plan) ? t('planCustom') : plan;

/** 카테고리별 그룹 + 월 환산 소계 (연결제는 /12). 행 탭 = 수정, × = 삭제 */
export default function SubList() {
  const { cur, subs, oneTime, openEdit, removeSub, removeOneTime,
    addSub, addOneTime, askConfirm, showToast } = useStore();
  const { t } = useLang();
  const active = subs.filter(isActive);
  const inactive = subs.filter(s => !isActive(s));

  // 다음 결제일: 저장된 next 문자열 대신 항상 계산값 사용
  const nextLabel = (s: SubRow): string => {
    const d = nextChargeDate(s);
    return t('nextOn', { d: d ? `${d.getMonth() + 1}/${d.getDate()}` : s.next });
  };

  // 삭제: 인앱 확인 → 삭제 → 5초 undo 토스트 (undo = 같은 데이터로 재등록)
  const del = async (s: SubRow) => {
    if (!(await askConfirm(t('delSub', { name: s.name }), t('delete'), true))) return;
    const { id: _drop, ...data } = s;
    if (await removeSub(s.id)) {
      showToast(t('deletedToast', { name: s.name }), { undo: () => { addSub(data); } });
    }
  };
  const delOne = async (o: OneTimeRow) => {
    if (!(await askConfirm(t('delOne', { name: o.name }), t('delete'), true))) return;
    const { id: _drop, ...data } = o;
    if (await removeOneTime(o.id)) {
      showToast(t('deletedToast', { name: o.name }), { undo: () => { addOneTime(data); } });
    }
  };

  return (
    <>
      <ScanBanner />

      <section>
        <div className="sec-head">
          <h2>{t('activeSubs')}</h2>
          <span className="hint">{t('activeHint', { n: active.length })}</span>
        </div>
        {active.length === 0 && (
          <div className="sub-card"><div className="renew-empty">{t('emptySubs')}</div></div>
        )}
        {CAT_ORDER.map(cat => {
          const items = active.filter(s => s.cat === cat);
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
                  <div className="sub-row" key={s.id}>
                    <button className="row-main" aria-label={`${s.name} ${t('edit')}`}
                      onClick={() => openEdit(s)}>
                      <div className="r-icon" style={{ background: CATCOLOR[s.cat] }}>{s.init}</div>
                      <div className="r-body">
                        <div className="r-name">{s.name}</div>
                        <div className="r-meta">{planLabel(s.plan, t)} · {s.cycle === 'year' ? t('yearly') : t('monthly')}</div>
                      </div>
                      <div className="r-right">
                        <div className="r-amt">{fmt(toJPY(s.amt, s.c), cur)}</div>
                        <div className="r-day">{nextLabel(s)}</div>
                      </div>
                    </button>
                    <button className="row-del" aria-label={`${s.name} ${t('delete')}`}
                      onClick={() => del(s)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {inactive.length > 0 && (
        <section>
          <div className="sec-head"><h2>{t('inactiveTitle')}</h2><span className="hint">{t('inactiveHint')}</span></div>
          <div className="sub-card">
            {inactive.map(s => (
              <div className="sub-row inactive" key={s.id}>
                <button className="row-main" aria-label={`${s.name} ${t('edit')}`}
                  onClick={() => openEdit(s)}>
                  <div className="r-icon" style={{ background: CATCOLOR[s.cat] }}>{s.init}</div>
                  <div className="r-body">
                    <div className="r-name">{s.name}</div>
                    <div className="r-meta">
                      <i className="status-badge">{t(s.status === 'paused' ? 'statusPaused' : 'statusCanceled')}</i>
                      {' '}{planLabel(s.plan, t)}
                      {s.endDate && <> · {t('endedOn', { d: s.endDate.slice(5).replace('-', '/') })}</>}
                    </div>
                  </div>
                  <div className="r-right"><div className="r-amt">{fmt(toJPY(s.amt, s.c), cur)}</div></div>
                </button>
                <button className="row-del" aria-label={`${s.name} ${t('delete')}`}
                  onClick={() => del(s)}>×</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="sec-head"><h2>{t('oneTimeTitle')}</h2><span className="hint">{t('oneTimeHint')}</span></div>
        <div className="sub-card">
          {oneTime.length === 0 && <div className="renew-empty">{t('emptyOneTime')}</div>}
          {oneTime.map(o => (
            <div className="sub-row" key={o.id}>
              <div className="row-main static">
                <div className="r-icon" style={{ background: '#B7C0CC' }}>{o.init}</div>
                <div className="r-body">
                  <div className="r-name">{o.name}</div>
                  <div className="r-meta">{o.note} · {t('oneTimeTag')}</div>
                </div>
                <div className="r-right"><div className="r-amt">{fmt(toJPY(o.amt, o.c), cur)}</div></div>
              </div>
              <button className="row-del" aria-label={`${o.name} ${t('delete')}`}
                onClick={() => delOne(o)}>×</button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
