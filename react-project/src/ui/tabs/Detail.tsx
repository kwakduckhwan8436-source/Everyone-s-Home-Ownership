import { useStore } from '../../state/store.ts';
import { eok, won } from '../../engines/util.ts';
import { acqCosts } from '../../engines/costs.ts';
import { netWorthLiquid } from '../../engines/e2_growth.ts';
import { monthlyPayment, holdingCostAnnual, jeonseOppMonthly, earlyRepayFee, jeonseAlign } from '../../engines/e7_afterpurchase.ts';
import { ctxOf } from '../uiutil.ts';
import { Tip } from '../Tooltip.tsx';

export function Detail() {
  const report = useStore(s => s.report), state = useStore(s => s.state), policy = useStore(s => s.policy);
  if (!report || !state || !policy) return null;
  const ctx = ctxOf(policy), price = state.target.priceNow, cap = report.cap;
  const cc = acqCosts(state, price, ctx);
  const rows: [string, number, string][] = [['담보 기준 (LTV)', cap.breakdown.LTV, 'LTV'], ['소득 기준 (DSR)', cap.breakdown.DSR, 'DSR'], ['지역 절대한도', cap.breakdown.REGION_CAP, 'REGION_CAP']];
  const growth = [0, 12, 24, 36, 60];

  const loan = cap.maxLoan === Infinity ? 0 : cap.maxLoan;
  const mpay = monthlyPayment(loan, state.market.mortgageRate);
  const hc = holdingCostAnnual(price);
  const j = state.assets.find(a => a.kind === 'jeonse' && a.amount > 0);
  const jOpp = j ? jeonseOppMonthly(j.amount) : 0;
  const early = earlyRepayFee(loan);
  const align = jeonseAlign(state, report.cross, ctx);
  const monthly = mpay + hc.total / 12;

  return <>
    <div className="pane-intro">💡 <b>내가 받을 수 있는 대출·필요한 현금</b>을 자세히 풀어서 보여줘요. 어려우면 위 <b>언제 살까</b>만 봐도 충분해요.</div>
    <div className="cols2">
      <div className="card"><div className="ch"><span className="n">E1</span><h3>대출 한도 구성</h3></div>
        <table className="tbl"><thead><tr><th>기준</th><th className="n">한도</th></tr></thead><tbody>
          {rows.map(([l, v, k]) => <tr key={k} className={cap.bindingConstraint === k ? 'bind' : ''}><td>{l}{cap.bindingConstraint === k ? ' ← 병목' : ''}</td><td className="n">{v === Infinity ? '—' : eok(v)}</td></tr>)}
          <tr className="tot"><td>실제 최대대출</td><td className="n">{eok(cap.maxLoan)}</td></tr>
        </tbody></table>
        <p className="tiny muted" style={{ margin: '9px 0 0' }}>LTV·DSR·지역한도 중 <b>가장 낮은 값</b>이 실제 한도. 스트레스 금리 {((state.market.mortgageRate + policy.stressAddRate) * 100).toFixed(1)}% 적용.</p></div>
      <div className="card"><div className="ch"><span className="n">$</span><h3>취득 부대비용</h3></div>
        <table className="tbl"><tbody>
          <tr><td>취득세{cc.heavy ? ` · 중과 ${(cc.taxRate * 100).toFixed(0)}%` : ''}</td><td className="n">{won(cc.tax)}만</td></tr>
          <tr><td>지방교육세</td><td className="n">{won(cc.eduTax)}만</td></tr>
          {cc.relief > 0 && <tr><td>{cc.relief >= 550 ? '신생아' : '생애최초'} 감면</td><td className="n" style={{ color: 'var(--ok)' }}>−{won(cc.relief)}만</td></tr>}
          <tr><td>중개보수</td><td className="n">{won(cc.broker)}만</td></tr>
          <tr><td>법무·등기</td><td className="n">{won(cc.legal)}만</td></tr>
          <tr><td>이사·예비비(3%)</td><td className="n">{won(cc.reserve)}만</td></tr>
          <tr className="tot"><td>합계</td><td className="n">{eok(cc.total)}</td></tr>
        </tbody></table>
        {cc.heavy && <div className="warn-note">다주택 중과 적용. 일시적 2주택·지방저가주택 예외, 지방교육세·농특세 정산은 단순화 → 위택스·관할 시군구 확인.</div>}</div>
    </div>

    <div className="card" style={{ marginTop: 16 }}><div className="ch"><span className="n">E3</span><h3>시나리오 비교</h3></div>
      <table className="tbl"><thead><tr><th>시나리오</th><th className="n">집값상승</th><th className="n">금리</th><th>도달시점</th><th className="n">필요자본</th></tr></thead><tbody>
        {report.scenarios.map(({ sc, res }) => <tr key={sc.name}><td><b>{sc.name}</b></td><td className="n">{(sc.growth * 100).toFixed(1)}%</td><td className="n">{(sc.mortgageRate * 100).toFixed(1)}%</td>
          <td>{res.reachable ? res.targetYm : <span style={{ color: 'var(--warn)' }}>미도달</span>}</td>
          <td className="n">{res.reachable && res.monthIndex != null ? eok(res.series[res.monthIndex].need) : eok(res.gap) + ' 부족'}</td></tr>)}
      </tbody></table></div>

    <div className="cols2" style={{ marginTop: 16 }}>
      <div className="card"><div className="ch"><span className="n">E2</span><h3>유동 순자산 성장</h3></div>
        <table className="tbl"><thead><tr><th>시점</th><th className="n">유동 순자산</th></tr></thead><tbody>
          {growth.map(t => <tr key={t}><td>{t === 0 ? '현재' : '+' + t + '개월'}</td><td className="n">{eok(netWorthLiquid(state, t))}</td></tr>)}
        </tbody></table></div>
      <div className="card"><div className="ch"><span className="n">POL</span><h3>정책대출 자격</h3></div>
        {cap.products.map(p => <div key={p.key} style={{ padding: '9px 0', borderBottom: '1px dashed var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><b>{p.name}</b>
            {p.eligible ? <span className="pill prod">가능 · {eok(p.limit)} · {(p.rate * 100).toFixed(1)}%</span> : <span className="pill dsr">불가</span>}</div>
          {p.failed.length > 0 && <div className="tiny muted" style={{ marginTop: 4 }}>{p.failed.map((f, i) => <span key={i}>· {f}<br /></span>)}</div>}
        </div>)}</div>
    </div>

    <div className="cols2" style={{ marginTop: 16 }}>
      <div className="card"><div className="ch"><h3>매입 후 매달 얼마?</h3><Tip text="대출 원리금은 30년 원리금균등 기준 근사입니다. 보유세는 공시가·공정시장가액비율을 단순화한 참고값이며 실제는 위택스에서 확인하세요." /></div>
        <div className="stat-row"><span>월 원리금 <span className="tiny muted">30년·원리금균등</span></span><span className="v">{won(mpay)}만</span></div>
        <div className="stat-row"><span>보유세(재산세{hc.jong > 0 ? '+종부세' : ''}) <span className="tiny muted">연·참고</span></span><span className="v">{won(hc.total)}만/년 · {won(hc.total / 12)}만/월</span></div>
        <div className="stat-row"><span>월 주거비 합계 <span className="tiny muted">원리금+보유세</span></span><span className="v">{won(monthly)}만/월</span></div>
        {j && <><div className="stat-row"><span>지금 전세보증금 기회비용 <span className="tiny muted">전환율 4% 근사</span></span><span className="v">{won(jOpp)}만/월</span></div>
          <div className="tiny muted" style={{ marginTop: 8 }}>매입 시 월 부담이 지금보다 <b style={{ color: monthly > jOpp ? 'var(--warn)' : 'var(--ok)' }}>{monthly > jOpp ? '+' : '−'}{won(Math.abs(monthly - jOpp))}만</b> 정도 바뀝니다(대략).</div></>}
        <div className="warn-note">3년 내 조기상환 시 대략 <b>{won(early)}만</b> 이내의 중도상환수수료가 붙을 수 있어요(기간따라 감소). 보유세·종부세·수수료는 <b>참고 근사</b>이니 계약 전 확인하세요.</div></div>
      {align ? <div className="card"><div className="ch"><h3>전세 → 매매 타이밍</h3><Tip text="전세 만기와 잔금일이 어긋나면 브릿지론·단기월세·재계약 중 하나로 메워야 합니다. 가장 저렴한 쪽을 추천합니다." /></div>
        <div className="stat-row"><span>전세 만기</span><span className="v">{align.from}</span></div>
        <div className="stat-row"><span>예상 도달(잔금)</span><span className="v">{align.t}</span></div>
        <div className="ok-note" style={{ margin: '10px 0' }}><b>추천: {align.best.key}</b> — {align.best.desc}{align.best.cost > 0 ? ` (대략 ${won(align.best.cost)}만)` : ''}</div>
        {align.opts.length > 1 && <table className="tbl"><tbody>{align.opts.map(o => <tr key={o.key}><td>{o.key}</td><td className="n">{o.cost > 0 ? won(o.cost) + '만' : '추가비용 적음'}</td></tr>)}</tbody></table>}</div>
        : <div className="card"><div className="ch"><h3>전세 → 매매 타이밍</h3></div><p className="tiny muted">전세보증금이 없거나 아직 도달 시점이 정해지지 않아 정렬 안내를 건너뜁니다.</p></div>}
    </div>
  </>;
}
