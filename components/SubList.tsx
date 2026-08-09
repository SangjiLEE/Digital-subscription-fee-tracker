'use client';
import { fmt, toJPY } from '@/lib/fx';
import { useStore, CATNAME, CATCOLOR, type Cat } from '@/lib/store';

const ORDER: Cat[] = ['ai', 'dev', 'ent', 'sto', 'etc'];

/** 카테고리별 그룹 + 월 환산 소계 (연결제는 /12) */
export default function SubList() {
  const { cur, subs, oneTime } = useStore();
  return (
    <>
      <section>
        <div className="sec-head"><h2>확인 대기</h2><span className="hint">포워딩 감지</span></div>
        <div className="inbox-banner">
          <span>✉ <b>Adobe</b> 영수증이 감지됐어요 · $22.99</span>
          <button className="mini">확인</button>
        </div>
      </section>

      <section>
        <div className="sec-head"><h2>활성 구독</h2><span className="hint">{subs.length}건</span></div>
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
                {items.map((s, i) => (
                  <div className="sub-row" key={s.name + i}>
                    <div className="r-icon" style={{ background: CATCOLOR[s.cat] }}>{s.init}</div>
                    <div className="r-body">
                      <div className="r-name">{s.name}</div>
                      <div className="r-meta">{s.plan} · {s.cycle === 'year' ? '연 결제' : '월 결제'}</div>
                    </div>
                    <div className="r-right">
                      <div className="r-amt">{fmt(toJPY(s.amt, s.c), cur)}</div>
                      <div className="r-day">다음 {s.next}</div>
                    </div>
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
          {oneTime.map((o, i) => (
            <div className="sub-row" key={o.name + i}>
              <div className="r-icon" style={{ background: '#B7C0CC' }}>{o.init}</div>
              <div className="r-body">
                <div className="r-name">{o.name}</div>
                <div className="r-meta">{o.note} · 일회성</div>
              </div>
              <div className="r-right"><div className="r-amt">{fmt(toJPY(o.amt, o.c), cur)}</div></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
