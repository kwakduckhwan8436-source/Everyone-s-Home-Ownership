import { useState, useEffect } from 'react';
import { useStore } from '../../state/store.ts';
import { won, nowYM, addMonths, monthsBetween } from '../../engines/util.ts';
import { monthlyPayment, holdingCostAnnual } from '../../engines/e7_afterpurchase.ts';
import { acqCosts, brokerFee } from '../../engines/costs.ts';
import { crossover } from '../../engines/e3_crossover.ts';
import { ctxOf } from '../uiutil.ts';
import { Tip } from '../Tooltip.tsx';

export function Tools() {
  const report = useStore(s => s.report), state = useStore(s => s.state), policy = useStore(s => s.policy);
  const [date, setDate] = useState('');
  const [dep, setDep] = useState<number | null>(null);
  const [val, setVal] = useState<number | null>(null);
  const setField = useStore(s => s.setField);
  if (!report || !state || !policy) return null;

  const ctx = ctxOf(policy);
  const price = state.target.priceNow, r = state.market.mortgageRate, g = state.market.priceGrowth;
  const cap = report.cap, loan = Math.max(0, Math.min(cap.maxLoan, price * cap.ltvRate));
  const mpay = monthlyPayment(loan, r);
  const baseSc = { name: '기본', growth: g, returnMul: 1, mortgageRate: r };
  const jeonseAmt = (state.assets.find(a => a.kind === 'jeonse')?.amount) || 0;

  // 1) 목표 저축액 역산
  const tgt = date || state.target.targetDate || addMonths(nowYM(), 36);
  const tm = monthsBetween(nowYM(), tgt);
  const test = (sm: number) => { const res = crossover({ ...state, savingMonthly: sm }, baseSc, ctx); return res.reachable && res.monthIndex! <= tm; };
  let req: { saving?: number; bad?: boolean; impossible?: boolean } = {};
  if (tm <= 0) req = { bad: true }; else if (!test(3000)) req = { impossible: true };
  else { let lo = 0, hi = 3000; for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (test(m)) hi = m; else lo = m; } req = { saving: Math.ceil(hi) }; }
  const nowSave = state.savingMonthly, diff = req.saving ? req.saving - nowSave : 0;

  // 2) 금리 스트레스
  const stress = [0, 0.01, 0.02].map(d => { const res = crossover(state, { ...baseSc, mortgageRate: r + d }, ctx); return { d, ym: res.reachable ? res.targetYm! : '미도달', mp: monthlyPayment(loan, r + d) }; });
  const runS = (dRate: number, gOv: number | null, savMul: number) => {
    const s2 = savMul !== 1 ? { ...state, savingMonthly: Math.round(state.savingMonthly * savMul) } : state;
    return crossover(s2, { name: 's', growth: gOv != null ? gOv : g, returnMul: 1, mortgageRate: r + dRate }, ctx);
  };
  const [showStress, setShowStress] = useState(false);
  const stB = showStress ? runS(0, null, 1) : null; const stBm = stB && stB.reachable ? stB.monthIndex! : 240;
  const stressRows: [string, ReturnType<typeof runS>, boolean][] = showStress ? [
    ['기본 (현재 계획)', stB!, true],
    ['금리 +2%p', runS(0.02, null, 1), false],
    ['복합 악재 (금리+2%p·집값0%·저축-10%)', runS(0.02, 0, 0.9), false],
  ] : [];
  const stWorst = showStress ? stressRows[stressRows.length - 1][1] : null;
  const [mcSg, setMcSg] = useState(0.015);
  const [mcSr, setMcSr] = useState(0.007);
  const [mc, setMc] = useState<{ N: number; prob: number; p25: number | null; p50: number | null; p75: number | null; months: number[] } | null>(null);
  const [showMc, setShowMc] = useState(false);
  useEffect(() => {
    if (!showMc) return;
    let cancelled = false;
    const id = setTimeout(() => {
      const N = 160, sg = mcSg, sr = mcSr; let a = 20260822 >>> 0;
      const rng = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      const norm = () => { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
      const months: number[] = []; let reached = 0;
      for (let i = 0; i < N; i++) {
        const gg = Math.max(0, g + norm() * sg), rr = Math.max(0.02, r + norm() * sr);
        const res = crossover(state, { name: 'mc', growth: gg, returnMul: 1, mortgageRate: rr }, ctx);
        if (res.reachable) { reached++; months.push(res.monthIndex!); }
      }
      months.sort((x, y) => x - y);
      const q = (pp: number): number | null => months.length ? months[Math.min(months.length - 1, Math.round(pp * (months.length - 1)))] : null;
      if (!cancelled) setMc({ N, prob: reached / N, p25: q(0.25), p50: q(0.5), p75: q(0.75), months });
    }, 20);
    return () => { cancelled = true; clearTimeout(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, r, g, policy, mcSg, mcSr, showMc]);

  // 3) 전세 vs 매매 (5년)
  const yrs = 5, mr = r / 12, n = 60, f = Math.pow(1 + mr, n);
  const remain = mr > 0 ? loan * f - mpay * (f - 1) / mr : loan;
  const interest5 = Math.max(0, mpay * 60 - (loan - remain));
  const hold5 = holdingCostAnnual(price).total * yrs, acq = acqCosts(state, price, ctx).total;
  const sellBroker = brokerFee(price * Math.pow(1 + g, yrs), ctx), appr = price * (Math.pow(1 + g, yrs) - 1);
  const buyNet = Math.round(interest5 + hold5 + acq + sellBroker - appr);
  const RENT_CONV = { legalCap: 0.045, oppRate: 0.03 };
  const oppRate = RENT_CONV.oppRate, rentNet = Math.round(jeonseAmt * oppRate * yrs), buyWin = buyNet < rentNet;
  const convRate = RENT_CONV.legalCap;
  const wolseM = Math.round(jeonseAmt * convRate / 12);
  const jeonseM = Math.round(jeonseAmt * oppRate / 12);
  const buyM = Math.round(mpay + holdingCostAnnual(price).total / 12);

  // 4) 월부담
  const mgmt = 15, holdM = holdingCostAnnual(price).total / 12, monthlyIncome = Math.max(1, state.income / 12);
  const burdenSum = mpay + holdM + mgmt, burden = Math.round(burdenSum / monthlyIncome * 100);
  const bClass = burden < 30 ? 'free' : burden < 40 ? '' : 'reg', bMsg = burden < 30 ? '여유 있는 편' : burden < 40 ? '관리 가능하나 주의' : '부담이 큼 — 목표가·기간 재검토';

  // 5) 전세 안전
  const dep2 = dep ?? jeonseAmt, val2 = val ?? price, jr = val2 > 0 ? Math.round(dep2 / val2 * 100) : 0;
  const jClass = jr < 70 ? 'free' : jr < 80 ? '' : 'reg', jMsg = jr < 70 ? '비교적 안전 (여유 있음)' : jr < 80 ? '주의 — 선순위·근저당 꼭 확인' : '위험 — 깡통전세 우려, 보증보험·선순위 필수 확인';

  // 6) 생애 이벤트
  const evs: [string, string, string][] = [];
  const cm = state.childBirth ? monthsBetween(state.childBirth, nowYM()) : 999;
  if (cm >= 0 && cm <= 60) evs.push(['👶 신생아 특례', '2년 내 출산 — 신생아 특례대출(최저금리)·취득세 감면 대상일 수 있어요', 'https://nhuf.molit.go.kr']);
  if ((state.householdType === '부부' || state.householdType === '예비신혼') && state.firstTime) evs.push(['💑 신혼', '신혼부부 특별공급·버팀목/디딤돌 우대 대상일 수 있어요', 'https://www.applyhome.co.kr']);
  if (state.firstTime) evs.push(['🌱 생애최초', '생애최초 취득세 감면·특별공급 대상일 수 있어요', 'https://www.wetax.go.kr']);
  if (!evs.length) evs.push(['ℹ️ 해당 특례 없음', '현재 입력 기준으로 자동 감지된 생애 이벤트 특례가 없어요. 상황이 바뀌면 다시 확인하세요.', '']);

  const barColor = (p: number) => p < 30 ? 'var(--ok)' : p < 40 ? 'var(--brass)' : 'var(--warn)';
  return <>
    <div className="pane-intro">💡 집을 살 때 궁금한 것들을 <b>바로 계산·진단</b>해요. 숫자는 이 앱 엔진 기준의 <b>참고 근사값</b>이며, 최종은 은행·위택스에서 확인하세요. <button className="btn ink" style={{ float: 'right', padding: '6px 12px', fontSize: 12.5 }} onClick={() => window.print()}>🖨️ PDF로 저장</button></div>


    <div className="card"><div className="ch"><span className="n">🎯</span><h3>목표 저축액 역산 — "이 날짜에 사려면 매달 얼마?"</h3></div>
      <div className="f wide" style={{ maxWidth: 340 }}><label>사고 싶은 목표일 <span className="h">{tgt} · {tm}개월 뒤</span></label>
        <input type="month" value={tgt} onChange={e => setDate(e.target.value)} />
</div>
      <div className="mgoal" style={{ marginTop: 10 }}><span>필요한 월 저축</span>{req.bad ? '미래 날짜를 선택하세요' : req.impossible ? '월 3,000만원으로도 이 날짜엔 어려워요 (목표가·부채 조정 필요)' : <><b style={{ fontSize: 20, color: 'var(--accent-ink)' }}>{won(req.saving!)}만원/월</b> 저축하면 가능</>}</div>
      {req.saving && <div className="tiny muted" style={{ marginTop: 6 }}>현재 계획 {won(nowSave)}만원/월 {diff > 0 ? <>→ <b style={{ color: 'var(--warn-ink)' }}>{won(diff)}만원 더</b> 필요</> : diff < 0 ? <>→ 이미 충분 (여유 {won(-diff)}만원)</> : '→ 딱 맞아요'}</div>}</div>

    <div className="cols2" style={{ marginTop: 16 }}>
      <div className="card" data-adv><div className="ch"><span className="n">📈</span><h3>금리 오르면? 스트레스 테스트</h3><Tip text="주담대 금리가 오르면 월 원리금이 늘고 도달 시점이 늦어져요. +1~2%p 상황을 미리 봅니다." /></div>
        <table className="tbl"><thead><tr><th>금리</th><th>월 원리금</th><th>도달 시점</th></tr></thead><tbody>
          {stress.map(x => <tr key={x.d} style={x.d === 0 ? { fontWeight: 700 } : undefined}><td>{x.d === 0 ? '현재' : '+' + (x.d * 100) + '%p'} ({((r + x.d) * 100).toFixed(1)}%)</td><td className="n">{won(x.mp)}만</td><td className="n">{x.ym}</td></tr>)}
        </tbody></table>
        <div className="tiny muted" style={{ marginTop: 6 }}>변동금리라면 오를 때 대비가 필요해요. 고정·혼합금리도 함께 비교하세요.</div></div>
      <div className="card"><div className="ch"><span className="n">⚖️</span><h3>매입 후 월부담 (소득 대비)</h3><Tip text="월 원리금 + 보유세/12 + 관리비(가정 15만)를 월소득으로 나눈 실부담률입니다." /></div>
        <div className="gauge big"><div className="lab"><span><b>주거비 부담률</b></span><span className="v" style={{ fontSize: 20 }}>{burden}%</span></div><div className="track guides"><div className="fill" style={{ width: `${Math.min(100, burden)}%`, background: barColor(burden) }} /><i className="gl" style={{ left: '30%' }} /><i className="gl reg" style={{ left: '40%' }} /></div></div>
        <div className="tiny muted" style={{ marginTop: 4 }}>기준선: <b>30%</b> 일반 가이드 · <b>40%</b> = 은행권 DSR 규제 상한(개인)</div>
        <div className={`reg-note on ${bClass}`} style={{ marginTop: 8 }}>{bMsg}</div>
        <div className="stat-row" style={{ marginTop: 6 }}><span>월 원리금</span><span className="v">{won(mpay)}만</span></div>
        <div className="stat-row"><span>보유세/월 + 관리비(가정)</span><span className="v">{won(holdM + mgmt)}만</span></div>
        <div className="stat-row"><span><b>월 주거비 합계</b></span><span className="v">{won(burdenSum)}만</span></div></div>
    </div>

    <div className="card" data-adv style={{ marginTop: 16 }}><div className="ch"><span className="n">🏘️</span><h3>월세 vs 전세 vs 매수 — 월 주거비 비교</h3><Tip text="전세보증금을 기준으로 세 가지 주거 형태의 '매달 나가는 돈'을 비교해요. 월세 전환율은 법정 상한(기준금리+2%)을 씁니다." /></div>
      <div className="cmp3">
        <div className={`cbox${wolseM >= jeonseM && wolseM >= buyM ? '' : ' win'}`}><div className="ct">🔑 월세</div><div className="cv">{won(wolseM)}<span>만/월</span></div><div className="cd">전세금 {won(jeonseAmt)}만을 월세로 전환<br /><span className="tiny muted">전환율 {(convRate * 100).toFixed(1)}%(법정 상한)</span></div></div>
        <div className={`cbox${jeonseM <= wolseM && jeonseM <= buyM ? ' win' : ''}`}><div className="ct">🏦 전세 유지</div><div className="cv">{won(jeonseM)}<span>만/월</span></div><div className="cd">보증금이 묶여 못 버는 <b>기회비용</b><br /><span className="tiny muted">기회수익률 {(oppRate * 100).toFixed(0)}%(가정)</span></div></div>
        <div className={`cbox${buyM <= wolseM && buyM <= jeonseM ? ' win' : ''}`}><div className="ct">🏠 지금 매수</div><div className="cv">{won(buyM)}<span>만/월</span></div><div className="cd">월 원리금 + 보유세<br /><span className="tiny muted">집값 상승·하락은 별도</span></div></div>
      </div>
      <div className="tiny muted" style={{ marginTop: 8 }}>💡 월세·전세는 '거주 비용'만, 매수는 여기에 <b>집값 변동</b>(자산)이 더해져요. 5년으로 보면 ↓</div>
      <div className="cols2" style={{ marginTop: 10 }}>
        <div className="box" style={buyWin ? { borderColor: 'var(--ok)', background: '#f2faf7' } : undefined}><b>🏠 매수 5년 순비용</b><span style={{ fontSize: 17, fontWeight: 800, color: buyNet < 0 ? 'var(--ok-ink)' : 'var(--ink)' }}>{buyNet < 0 ? '−' : ''}{won(Math.abs(buyNet))}만</span><span>이자 {won(interest5)}+보유세 {won(hold5)}+거래 {won(acq + sellBroker)}−집값상승 {won(appr)}</span></div>
        <div className="box" style={!buyWin ? { borderColor: 'var(--ok)', background: '#f2faf7' } : undefined}><b>🏦 전세 5년 순비용</b><span style={{ fontSize: 17, fontWeight: 800 }}>{won(rentNet)}만</span><span>보증금 기회비용(연 {(oppRate * 100).toFixed(0)}%) · 보증금은 회수</span></div>
      </div>
      <div className={`reg-note on ${buyWin ? 'free' : ''}`} style={{ marginTop: 10 }}>{buyWin ? <>이 가정에선 <b>매수가 5년 기준 {won(rentNet - buyNet)}만원 유리</b>해요. 집값 상승률(연 {(g * 100).toFixed(1)}%) 가정에 민감합니다.</> : <>이 가정에선 <b>전세 유지가 {won(buyNet - rentNet)}만원 유리</b>해요. 집값이 더 오르면 매수가 유리해질 수 있어요.</>}</div>
      <div className="tiny muted" style={{ marginTop: 6 }}>전환율은 <b>법정 상한</b>(갱신·조건변경 시)이며, <b>신규계약 시장가는 더 높을 수</b> 있어요(전국 평균 6%대). <a href="https://www.reb.or.kr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>한국부동산원 실제 전환율 →</a></div></div>

    <div className="card" data-adv style={{ marginTop: 16 }}><div className="ch"><span className="n">🌧️</span><h3>나쁜 상황에도 버틸까? — 복합 스트레스</h3><Tip text="금리가 오르거나(＋2%p), 집값이 안 오르거나(상승 0%), 저축이 줄면(10%↓) 도달 시점이 어떻게 달라지는지 엔진으로 다시 계산해요. 마지막 '복합 악재'는 셋을 동시에 겪는 경우예요." /></div>
      {!showStress
        ? <div><button className="btn accent" type="button" onClick={() => setShowStress(true)}>🌧️ 복합 스트레스 계산하기</button> <span className="tiny muted" style={{ marginLeft: 6 }}>나쁜 상황들을 같은 엔진으로 다시 계산 · 눌러서 보기</span></div>
        : <>
      <p className="tiny muted" style={{ margin: '-4px 0 10px' }}>각 상황을 <b>같은 엔진으로 다시 계산</b>한 결과예요(추정 아님). '복합 악재'에서도 버티면 계획이 견고합니다.</p>
      <table className="tbl"><thead><tr><th>상황</th><th className="n">도달 시점</th><th className="n">기본 대비</th></tr></thead><tbody>
        {stressRows.map(([nm, res, isBase], i) => { const reach = res.reachable; const mi = reach ? res.monthIndex! : 240; const d = mi - stBm; const delay = isBase ? '—' : (reach ? (d <= 0 ? '변화 없음' : '+' + Math.round(d) + '개월') : '미도달'); const cls = !reach ? 'bad' : (d > 18 ? 'bad' : d > 6 ? 'warn' : 'good'); return <tr key={i}><td>{nm}</td><td className="n">{reach ? res.targetYm : '미도달'}</td><td className="n"><span className={`rate ${cls}`}>{delay}</span></td></tr>; })}
      </tbody></table>
      <div className={`reg-note on ${stWorst!.reachable ? 'free' : ''}`} style={{ marginTop: 10 }}>{stWorst!.reachable ? <>복합 악재에서도 <b>{stWorst!.targetYm}엔 도달</b> — 계획이 비교적 <b>견고</b>합니다. 그래도 비상금은 6개월치 이상 두는 걸 권해요.</> : <>복합 악재에선 <b>20년 내 도달이 어려워요</b>. 목표가를 낮추거나 저축을 늘려 <b>여유(완충)</b>를 두면 훨씬 안전해집니다.</>}</div></>}</div>

    <div className="card" data-adv style={{ marginTop: 16 }}><div className="ch"><span className="n">🎯</span><h3>목표 달성 확률 (간이 시뮬레이션)</h3><Tip text="집값 상승률과 금리가 매번 조금씩 달라진다고 가정하고 수백 번 다시 계산해, 목표 도달 확률과 시기 범위를 봅니다. 예측이 아니라 '가정 기반 추정'이에요." /></div>
      <p className="tiny muted" style={{ margin: '-4px 0 8px' }}>가정: 집값 상승률 ±<b>{(mcSg * 100).toFixed(1)}%p</b> · 금리 ±<b>{(mcSr * 100).toFixed(1)}%p</b>(정규분포)로 <b>400회</b> 시뮬레이션 · 예측 아님</p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
        <label className="tiny" style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 150 }}>집값 상승률 변동 ±{(mcSg * 100).toFixed(1)}%p<input type="range" className="rng" min={0} max={4} step={0.1} value={mcSg * 100} onChange={e => setMcSg(Number(e.target.value) / 100)} /></label>
        <label className="tiny" style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 150 }}>금리 변동 ±{(mcSr * 100).toFixed(1)}%p<input type="range" className="rng" min={0} max={2} step={0.1} value={mcSr * 100} onChange={e => setMcSr(Number(e.target.value) / 100)} /></label>
      </div>
      {!showMc
        ? <div><button className="btn accent" type="button" onClick={() => setShowMc(true)}>🎯 목표 달성 확률 계산하기</button> <span className="tiny muted" style={{ marginLeft: 6 }}>가정 기반 시뮬레이션 · 누르면 계산해요</span></div>
        : (() => {
        if (!mc) return <div className="tiny muted" style={{ padding: '10px 0' }}>계산 중…</div>;
        const pct = Math.round(mc.prob * 100); const ym = (i: number | null) => i == null ? '—' : addMonths(nowYM(), i);
        const cls = pct >= 80 ? 'good' : pct >= 50 ? 'warn' : 'bad';
        const byYear: Record<number, number> = {}; mc.months.forEach(m => { const y = Math.floor(m / 12); byYear[y] = (byYear[y] || 0) + 1; });
        const ys = Object.keys(byYear).map(Number).sort((x, y) => x - y); const mx = ys.length ? Math.max(...ys.map(y => byYear[y])) : 1; const baseY = +nowYM().slice(0, 4);
        return <>
          <div className="mgoal"><span>240개월 내 목표 도달 확률</span><b className={`rate ${cls}`} style={{ fontSize: 22 }}>{pct}%</b></div>
          <div className="tiny" style={{ margin: '8px 2px 4px', color: 'var(--ink-2)' }}>도달 시기 — <b>빠르면</b> {ym(mc.p25)} · <b>보통</b> {ym(mc.p50)} · <b>늦으면</b> {ym(mc.p75)}</div>
          {ys.length ? <><div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 8, padding: '6px 2px 0', overflowX: 'auto' }}>{ys.map(y => { const h = Math.max(3, Math.round(byYear[y] / mx * 44)); const pctY = Math.round(byYear[y] / mc.N * 100); return <div key={y} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }} title={`${baseY + y}년 도달 ${pctY}%`}><div style={{ width: 16, height: h, background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: '3px 3px 0 0' }} /><span className="tiny muted">{String(baseY + y).slice(2)}</span></div>; })}</div><div className="tiny muted" style={{ marginTop: 2 }}>연도별 도달 분포 — 막대는 그 해에 도달한 시뮬레이션 비율</div></> : <div className="tiny muted">대부분의 시뮬레이션에서 240개월 내 도달하지 못했어요. 목표가를 낮추거나 저축을 늘려 보세요.</div>}
          <div className="tiny muted" style={{ marginTop: 6 }}>※ 확률·시기는 위 가정에 따른 추정이며, 실제 금리·집값은 다르게 움직일 수 있어요.</div>
        </>;
      })()}</div>

    <div className="card" data-adv style={{ marginTop: 16 }}><div className="ch"><span className="n">🔒</span><h3>고정 vs 변동금리 — 어떤 걸 고를까</h3><Tip text="변동금리는 위 스트레스 표처럼 오를 위험이 있고, 고정금리는 그 위험이 없는 대신 초기 금리가 보통 조금 높아요." /></div>
      <div className="sgrid">
        <div className="box"><b>📈 변동금리</b><span>시작 금리는 낮은 편, <b>오르면 부담↑</b>·도달 지연 (위 스트레스 표 참고)</span></div>
        <div className="box"><b>🔒 고정·혼합금리</b><span>금리가 <b>고정</b>돼 예측 쉬움. 보금자리론 등 정책 고정상품도 검토</span></div>
      </div>
      <div className="tiny muted" style={{ marginTop: 8 }}>현재 금리({(r * 100).toFixed(1)}%)는 변동 가정이에요. 실제 고정·변동 금리는 은행마다 달라 <a href="https://finlife.fss.or.kr/finlife/ldng/houseMrtg/list.do?menuNo=700007" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>금융상품 한눈에</a>에서 비교하세요(추측값을 넣지 않았어요).</div></div>

    <div className="card" data-adv style={{ marginTop: 16 }}><div className="ch"><span className="n">🛡️</span><h3>전세보증금 안전 진단 (깡통전세 체크)</h3><Tip text="보증금이 그 집 매매시세의 얼마인지 봅니다. 80%를 넘으면 집값이 조금만 떨어져도 보증금 회수가 어려울 수 있어요." /></div>
      <div className="region-row" style={{ maxWidth: 420 }}>
        <div className="f"><label>전세보증금 <span className="h">만원</span></label><input type="number" value={dep2} onChange={e => setDep(Number(e.target.value))} /></div>
        <div className="f"><label>그 집 매매시세 <span className="h">만원</span></label><input type="number" value={val2} onChange={e => setVal(Number(e.target.value))} /></div>
      </div>
      <div className="gauge big" style={{ marginTop: 10 }}><div className="lab"><span><b>보증금 / 시세</b></span><span className="v" style={{ fontSize: 20 }}>{jr}%</span></div><div className="track"><div className="fill" style={{ width: `${Math.min(100, jr)}%`, background: jr < 70 ? 'var(--ok)' : jr < 80 ? 'var(--brass)' : 'var(--warn)' }} /></div></div>
      <div className={`reg-note on ${jClass}`} style={{ marginTop: 8 }}>{jMsg}</div>
      <div className="tiny muted" style={{ marginTop: 6 }}>등기부의 <b>선순위 근저당</b>이 있으면 (근저당+보증금)/시세로 봐야 해요. 계약 전 <b>등기부등본</b>과 <b>전세보증보험</b> 가입 가능 여부를 확인하세요. (공시가격은 realtyprice.kr)</div></div>

    <div className="card" data-adv style={{ marginTop: 16 }}><div className="ch"><span className="n">🎁</span><h3>내 상황 특례 자동 안내</h3></div>
      <div className="link-list">
        {evs.map((e, i) => e[2] ? <a key={i} className="olink" href={e[2]} target="_blank" rel="noopener noreferrer"><b>{e[0]}</b><span>{e[1]}</span></a> : <div key={i} className="olink" style={{ cursor: 'default' }}><b>{e[0]}</b><span>{e[1]}</span></div>)}
      </div></div>
  </>;
}
