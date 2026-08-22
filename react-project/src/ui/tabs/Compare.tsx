import { useState } from 'react';
import { useStore, analyzeRaw } from '../../state/store.ts';
import type { FormRaw } from '../../state/buildState.ts';
import type { Report } from '../../types.ts';
import { eok, won } from '../../engines/util.ts';
import { acqCosts } from '../../engines/costs.ts';
import { monthlyPayment, holdingCostAnnual } from '../../engines/e7_afterpurchase.ts';
import { buildAppState } from '../../state/buildState.ts';
import { bindKo, ctxOf } from '../uiutil.ts';
import { Tip } from '../Tooltip.tsx';
import { Heatmap } from '../Heatmap.tsx';

interface Metrics { reach: boolean; ym: string; mi: number; need: number; price: number; bind: string; mpay: number; top: string }
function metricsOf(raw: FormRaw, policy: import('../../types.ts').Policy): Metrics {
  const ctx = ctxOf(policy), r: Report = analyzeRaw(raw, policy);
  const s = buildAppState(raw, ctx), cr = r.cross;
  const loan = r.cap.maxLoan === Infinity ? 0 : r.cap.maxLoan;
  const hc = holdingCostAnnual(s.target.priceNow);
  const lev = r.levers.filter(l => l.monthsSaved > 0)[0];
  const cc = acqCosts(s, s.target.priceNow, ctx); void cc;
  return { reach: cr.reachable, ym: cr.reachable ? cr.targetYm! : '미도달', mi: cr.reachable ? cr.monthIndex! : 999,
    need: cr.reachable && cr.monthIndex != null ? cr.series[cr.monthIndex].need : cr.gap, price: s.target.priceNow,
    bind: r.cap.bindingConstraint, mpay: monthlyPayment(loan, s.market.mortgageRate) + hc.total / 12, top: lev ? `${lev.name} (−${lev.monthsSaved}개월)` : '—' };
}

export function Compare() {
  const policy = useStore(s => s.policy), formRaw = useStore(s => s.formRaw);
  const plans = useStore(s => s.plans), savePlan = useStore(s => s.savePlan), delPlan = useStore(s => s.delPlan), loadPlan = useStore(s => s.loadPlan);
  const [a, setA] = useState('__now__'); const [b, setB] = useState('0'); const [c, setC] = useState('1');
  if (!policy) return null;

  const rawByKey = (k: string): FormRaw => k === '__now__' ? formRaw : (plans[Number(k)]?.raw ?? formRaw);
  const nameByKey = (k: string): string => k === '__now__' ? '지금 입력값' : (plans[Number(k)]?.name ?? '—');
  const items = ([['A', a], ['B', b], ['C', c]] as const).map(([who, k]) => ({ who, name: nameByKey(k), m: metricsOf(rawByKey(k), policy) }));
  const reached = items.filter(x => x.m.reach);
  const fastest = reached.length ? reached.reduce((x, y) => x.m.mi <= y.m.mi ? x : y).who : null;
  const opts = ['__now__', ...plans.map((_, i) => String(i))];

  const col = (m: Metrics, who: string, name: string) => <div className="col">
    <div className="h">{who}. {name}{fastest === who && reached.length > 1 && <span className="win">↑ 가장 빠름</span>}</div>
    <div className="row"><span>도달 시점</span><span className="v">{m.ym}</span></div>
    <div className="row"><span>목표가</span><span className="v">{eok(m.price)}</span></div>
    <div className="row"><span>필요 자기자본</span><span className="v">{eok(m.need)}{m.reach ? '' : ' 부족'}</span></div>
    <div className="row"><span>병목</span><span className="v">{bindKo(m.bind as never)}</span></div>
    <div className="row"><span>매입 후 월부담</span><span className="v">{won(m.mpay)}만</span></div>
    <div className="row"><span>가장 빠른 조정</span><span className="v" style={{ fontWeight: 600 }}>{m.top}</span></div>
  </div>;
  let msg = '';
  if (reached.length === 0) msg = '선택한 계획 모두 20년 내 도달이 어렵습니다.';
  else if (reached.length === 1) msg = `${reached[0].name}만 도달 가능합니다.`;
  else { const sorted = [...reached].sort((x, y) => x.m.mi - y.m.mi); const dd = sorted[sorted.length - 1].m.mi - sorted[0].m.mi;
    msg = dd === 0 ? '선택한 계획들의 도달 시점이 같습니다.' : `가장 빠른 ${sorted[0].name}가 가장 느린 ${sorted[sorted.length - 1].name}보다 ${dd}개월 빠릅니다.`; }

  return <>
    <div className="card"><div className="ch"><h3>계획 저장 · 슬롯</h3><Tip text="지금 입력값을 이름 붙여 저장해 두면, 나중에 불러오거나 두 안을 나란히 비교할 수 있어요. 이 브라우저에만 저장됩니다." /></div>
      <button className="btn ink" onClick={() => { const n = prompt('계획 이름', '계획 ' + (plans.length + 1)); if (n) savePlan(n); }}>지금 입력값을 계획으로 저장</button>
      <div style={{ marginTop: 10 }}>{plans.length ? plans.map((p, i) => <div key={i} className="slot"><span className="nm">{p.name}</span>
        <span className="meta">목표 {eok(Number(p.raw.priceNow) || 0)} · 저축 {p.raw.saving}만</span>
        <button className="btn" style={{ padding: '5px 10px' }} onClick={() => loadPlan(i)}>불러오기</button>
        <button className="btn" style={{ padding: '5px 10px' }} onClick={() => delPlan(i)}>삭제</button></div>) : <p className="tiny muted">저장된 계획이 없습니다. 위 버튼으로 지금 입력값을 저장해 보세요.</p>}</div></div>

    <div className="card" style={{ marginTop: 16 }}><div className="ch"><h3>A / B / C 비교</h3><Tip text="두 계획(또는 지금 입력값)을 골라 도달 시점·필요자본·월부담을 나란히 비교합니다." /></div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ alignSelf: 'center', fontWeight: 700 }}>A</span><select value={a} onChange={e => setA(e.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px', fontSize: 13.5 }}>{opts.map(o => <option key={o} value={o}>{nameByKey(o)}</option>)}</select>
        <span style={{ alignSelf: 'center', fontWeight: 700 }}>B</span><select value={b} onChange={e => setB(e.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px', fontSize: 13.5 }}>{opts.map(o => <option key={o} value={o}>{nameByKey(o)}</option>)}</select>
        <span style={{ alignSelf: 'center', fontWeight: 700 }}>C</span><select value={c} onChange={e => setC(e.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px', fontSize: 13.5 }}>{opts.map(o => <option key={o} value={o}>{nameByKey(o)}</option>)}</select>
      </div>
      <div className="cmp cmp-3">{items.map(it => col(it.m, it.who, it.name))}</div>
      <div className="ok-note" style={{ marginTop: 12 }}>{msg}</div></div>

    <div className="card" style={{ marginTop: 16 }}><div className="ch"><h3>민감도 — 저축 × 목표가에 따른 도달 시점</h3><Tip text="가로는 목표가, 세로는 월 저축입니다. 초록에 가까울수록 빨리, 빨강일수록 늦게, 회색은 20년내 미도달이에요. 지금 값은 테두리로 표시됩니다." /></div>
      <Heatmap />
      <div className="note">가운데가 지금 값. 색이 초록 = 더 빠름, 빨강 = 더 늦음, 회색 = 미도달.</div></div>
  </>;
}
