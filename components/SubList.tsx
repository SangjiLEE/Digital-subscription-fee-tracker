'use client';
import { fmt, toJPY } from '@/lib/fx';
import { nextChargeDate } from '@/lib/monthly';
import { useStore, CATNAME, CATCOLOR, type Cat, type SubRow } from '@/lib/store';

/** 다음 결제일 표시 — 저장된 next 문자열 대신 항상 계산값 사용 */
function nextLabel(s: SubRow): string {
  const d = nextChargeDate(s);
  return d ? `다음 ${d.getMonth() + 1}/${d.getDate()}` : `다음 ${s.next}`;
}

const ORDER: Cat[] = ['ai', 'dev', 'ent', 'sto', 'etc'];

/** 카테고리별 그룹 + 월 환산 소계 (연결제는 /12). 행 탭 = 수정, × = 삭제 */
export default function SubList() {
  const { cur, subs, oneTime, isDemo, openEdit, removeSub, removeOneTime } = useStore();

  const del = (e: React.MouseEvent, s: SubRow) => {
    e.stopPropagation();
    if (confirm(`'${s.name}' 구독을 삭제할까요?`)) removeSub(s.id);
  };

  return (
    <>
      {isDemo && (
        <section>
          <div className="sec-head"><h2>확인 대기</h2><span className="hint">포워딩 감지 (데모)</span></div>
          <div className="inbox-banner">
            <span>✉ <b>Adobe</b> 영수증이 감지됐어요 · $22.99</span>
            <button className="mini">확인</button>
          </div>
        </section>
      )}

      <section>
        <div className="sec-head"><h2>활성 구독</h2><span className="hint">{subs.length}건 · 탭하면 수정</span></div>
        {subs.length === 0 && (
          <div className="sub-card"><div className="renew-empty">아직 등록된 구독이 없어요 — 오른쪽 아래 + 버튼으로 시작하세요</div></div>
        )}
        {ORDER.map(cat => {
          const items = subs.filter(s => s.cat === cat);
          if (!items.length) return null;
          const subtotal = items.reduce(
            (t, s) => t + toJPY(s.amt, s.c) / (s.cycle === 'year' ? 12 : 1), 0);
          return (
            <div key={cat}>
              <div className="cat-label">
                <span><i className="dot" style={{ background: CATCOLOR[cat] }} />{CATNAME[cat]} · {items.length}건</span>
                <b>{fmt(subtotal, cur)}</b>
              </div>
              <div className="sub-card">
                {items.map(s => (
                  <div className="sub-row tappable" key={s.id} role="button" tabIndex={0}
                    aria-label={`${s.name} 수정`}
                    onClick={() => openEdit(s)}
                    onKeyDown={e => { if (e.key === 'Enter') openEdit(s); }}>
                    <div className="r-icon" style={{ background: CATCOLOR[s.cat] }}>{s.init}</div>
                    <div className="r-body">
                      <div className="r-name">{s.name}</div>
                      <div className="r-meta">{s.plan} · {s.cycle === 'year' ? '연 결제' : '월 결제'}</div>
                    </div>
                    <div className="r-right">
                      <div className="r-amt">{fmt(toJPY(s.amt, s.c), cur)}</div>
                      <div className="r-day">{nextLabel(s)}</div>
                    </div>
                    <button className="row-del" aria-label={`${s.name} 삭제`}
                      onClick={e => del(e, s)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <div className="sec-head"><h2>일회성 지출</h2><span className="hint">월 총액 미포함</span></div>
        <div className="sub-card">
          {oneTime.length === 0 && <div className="renew-empty">일회성 지출이 없어요</div>}
          {oneTime.map(o => (
            <div className="sub-row" key={o.id}>
              <div className="r-icon" style={{ background: '#B7C0CC' }}>{o.init}</div>
              <div className="r-body">
                <div className="r-name">{o.name}</div>
                <div className="r-meta">{o.note} · 일회성</div>
              </div>
              <div className="r-right"><div className="r-amt">{fmt(toJPY(o.amt, o.c), cur)}</div></div>
              <button className="row-del" aria-label={`${o.name} 삭제`}
                onClick={() => { if (confirm(`'${o.name}' 지출을 삭제할까요?`)) removeOneTime(o.id); }}>×</button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
