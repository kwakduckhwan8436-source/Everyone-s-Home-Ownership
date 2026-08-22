import { useState } from 'react';
import { useStore } from '../../state/store.ts';
import { eok, won, nowYM, monthsBetween } from '../../engines/util.ts';
import { netWorthLiquid } from '../../engines/e2_growth.ts';

export function Ledger() {
  const state = useStore(s => s.state), report = useStore(s => s.report);
  const ledger = useStore(s => s.ledger), addLedger = useStore(s => s.addLedger), delLedger = useStore(s => s.delLedger);
  const [ym, setYm] = useState(nowYM()); const [saved, setSaved] = useState(''); const [nw, setNw] = useState('');
  const [icsDay, setIcsDay] = useState(25);
  const exportIcs = () => {
    const day = Math.min(28, Math.max(1, icsDay || 25));
    const now = new Date(); let y = now.getFullYear(), m = now.getMonth();
    if (now.getDate() >= day) { m++; if (m > 11) { m = 0; y++; } }
    const p2 = (n: number) => String(n).padStart(2, '0');
    const dt = `${y}${p2(m + 1)}${p2(day)}T090000`;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//모두의 내집마련//KR', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', 'UID:modu-save-' + Date.now() + '@modu.local', 'DTSTAMP:' + stamp, 'DTSTART:' + dt,
      'RRULE:FREQ=MONTHLY;BYMONTHDAY=' + day,
      'SUMMARY:💰 이번 달 저축 ' + won(plan) + '만원 넣기 (모두의 내집마련)',
      'DESCRIPTION:내집마련 목표를 향해 이번 달도 저축해요!',
      'BEGIN:VALARM', 'TRIGGER:PT0S', 'ACTION:DISPLAY', 'DESCRIPTION:저축 리마인더', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const b = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = '모두의내집마련-저축알림.ics'; a.click();
  };
  if (!state || !report) return null;
  const plan = state.savingMonthly;
  const avg = ledger.length ? Math.round(ledger.reduce((s, r) => s + r.saved, 0) / ledger.length) : 0;
  const rate = plan ? Math.round(avg / plan * 100) : 0;

  let fb: JSX.Element | null = null;
  if (ledger.length) {
    const last = ledger[ledger.length - 1], t = Math.max(0, monthsBetween(nowYM(), last.ym));
    const planNW = netWorthLiquid(state, t);
    let t2 = 0; while (t2 < 240 && netWorthLiquid(state, t2) < last.nw) t2++;
    const ahead = t2 - t;
    fb = last.nw >= planNW
      ? <div className="ok-note" style={{ fontSize: 14 }}>🎉 <b>잘하고 있어요!</b> 지금 순자산이 계획선보다 {ahead > 0 ? <><b>{ahead}개월</b> 앞서</> : '앞서'} 있어요. 이 페이스라면 도달 시점이 당겨질 수 있어요.</div>
      : <div className="warn-note" style={{ fontSize: 14 }}>계획선보다 조금 뒤처져 있어요. <b>자책은 금물</b> — 한 달만 저축을 조금 늘리거나, 목표 시점을 현실에 맞게 살짝 미뤄도 괜찮아요. 꾸준함이 속도보다 중요해요.</div>;
  }

  const W = 980, H = 280, pad = { l: 58, r: 18, t: 12, b: 28 }, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const maxT = Math.max(24, report.roadmap.runway + 2);
  const planLine: { t: number; v: number }[] = []; for (let t = 0; t <= maxT; t++) planLine.push({ t, v: netWorthLiquid(state, t) });
  const act = ledger.map(r => ({ t: Math.max(0, monthsBetween(nowYM(), r.ym)), v: r.nw })).filter(p => p.t <= maxT);
  const maxY = Math.max(...planLine.map(p => p.v), ...act.map(p => p.v), 1) * 1.05;
  const X = (t: number) => pad.l + (t / maxT) * iw, Y = (v: number) => pad.t + ih - (v / maxY) * ih;
  const pp = planLine.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');

  const add = () => { addLedger({ ym, saved: Number(saved) || 0, nw: Number(nw) || 0 }); setSaved(''); setNw(''); };

  return <>
    <div className="card"><div className="ch"><span className="n">LOG</span><h3>계획 대비 실제</h3></div>
      <p className="tiny muted" style={{ margin: '-4px 0 12px' }}>매달 실제 저축·순자산을 기록하면 계획선과 얼마나 붙어 가는지 보입니다.</p>
      <div className="lform">
        <div className="f"><label>연월</label><input type="month" value={ym} onChange={e => setYm(e.target.value)} /></div>
        <div className="f"><label>실제 저축(만원)</label><input className="n" type="number" placeholder={String(plan)} value={saved} onChange={e => setSaved(e.target.value)} /></div>
        <div className="f"><label>실제 순자산(만원)</label><input className="n" type="number" placeholder="8000" value={nw} onChange={e => setNw(e.target.value)} /></div>
        <button className="btn ink" onClick={add}>기록 추가</button></div>
      {ledger.length ? <><div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        <div><div className="tiny muted">계획 월저축</div><div style={{ fontSize: 21, fontWeight: 850 }}>{won(plan)}만</div></div>
        <div><div className="tiny muted">실제 평균 · 달성률</div><div style={{ fontSize: 21, fontWeight: 850 }}>{won(avg)}만 <span className={`rate ${rate >= 95 ? 'good' : 'bad'}`}>{rate}%</span></div></div></div>
        {fb}</> : <p className="tiny muted">아직 기록이 없습니다.</p>}</div>

    <div className="card" style={{ marginTop: 16 }}><div className="ch"><span className="n">△</span><h3>순자산: 계획선 vs 실제</h3></div>
      <svg viewBox={`0 0 ${W} ${H}`}>
        {[0, 1, 2, 3, 4].map(k => { const val = maxY * k / 4, y = Y(val); return <g key={k}><line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="var(--line-2)" /><text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize={11} fill="var(--ink-3)">{eok(val)}</text></g>; })}
        <path d={pp} fill="none" stroke="var(--ink)" strokeWidth={2} strokeDasharray="5 4" />
        {act.length > 1 && <path d={act.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ')} fill="none" stroke="var(--brass)" strokeWidth={2.5} />}
        {act.map((p, i) => <circle key={i} cx={X(p.t).toFixed(1)} cy={Y(p.v).toFixed(1)} r={5} fill="var(--brass)" stroke="#fff" strokeWidth={2} />)}
      </svg>
      <div className="lgd" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '6px 2px 0', fontSize: 12.5, color: 'var(--ink-2)' }}>
        <span><svg width={22} height={8} style={{ verticalAlign: 'middle' }}><line x1={0} y1={4} x2={22} y2={4} stroke="var(--ink)" strokeWidth={2} strokeDasharray="5 4" /></svg> 계획선</span>
        <span><svg width={22} height={8} style={{ verticalAlign: 'middle' }}><line x1={0} y1={4} x2={22} y2={4} stroke="var(--brass)" strokeWidth={2.5} /></svg> <span style={{ color: 'var(--brass)' }}>●</span> 실제 저축·순자산</span>
      </div>
      <div className="note">실제선이 계획선(점선) 위에 있으면 계획보다 앞선 것이고, 아래면 조금 뒤처진 거예요.</div></div>

    {ledger.length > 0 && <div className="card" style={{ marginTop: 16 }}><div className="ch"><span className="n">TBL</span><h3>기록</h3></div>
      <table className="tbl"><thead><tr><th>연월</th><th className="n">저축</th><th className="n">달성률</th><th className="n">순자산</th><th /></tr></thead><tbody>
        {ledger.slice().reverse().map(r => { const rt = plan ? Math.round(r.saved / plan * 100) : 0; return <tr key={r.ym}><td>{r.ym}</td><td className="n">{won(r.saved)}만</td><td className="n"><span className={`rate ${rt >= 95 ? 'good' : 'bad'}`}>{rt}%</span></td><td className="n">{won(r.nw)}만</td><td className="n"><button className="btn" style={{ padding: '4px 9px' }} onClick={() => delLedger(r.ym)}>삭제</button></td></tr>; })}
      </tbody></table></div>}
  </>;
}
