import { useStore } from '../../state/store.ts';
import { eok, won } from '../../engines/util.ts';
import { acqCosts } from '../../engines/costs.ts';
import { ctxOf } from '../uiutil.ts';
import { Tip } from '../Tooltip.tsx';

const STEPS: [string, string][] = [
  ['매물·시세 확인', '호갱노노·아실로 시세, KB시세로 대출한도, 실거래가(국토부)로 실제 체결가를 확인해요. 등기부등본으로 소유자·근저당도 미리 봐요.'],
  ['가계약 → 계약', '계약금(보통 매매가의 10%)을 넣고 계약서 작성. 특약(잔금일·대출특약·하자책임)을 꼭 넣어요.'],
  ['중도금', '계약~잔금 사이 일부 지급(생략되기도 함). 중도금 지급 후엔 일방 해제가 어려워요.'],
  ['잔금 · 소유권이전등기', '잔금과 등기를 같은 날 동시에! 대출 실행→잔금→등기 접수를 법무사가 진행해요.'],
  ['전입신고 + 확정일자', '이사 후 즉시. (전세라면) 대항력·우선변제권 확보의 핵심이에요.'],
];
const CHECKS = [
  '등기부등본에서 소유자 = 계약자 일치 확인',
  '근저당·가압류 등 권리관계 확인(잔금으로 말소 조건)',
  '건축물대장 위반건축물 여부 확인',
  '잔금일 = 등기접수일 동시이행 특약',
  '대출 거절 시 계약해제·계약금 반환 특약',
  '(전세 낀 집) 보증금·만기·대항력 승계 확인',
];

export function Buyguide() {
  const report = useStore(s => s.report), state = useStore(s => s.state), policy = useStore(s => s.policy);
  if (!report || !state || !policy) return null;
  const ctx = ctxOf(policy), price = state.target.priceNow;
  const cc = acqCosts(state, price, ctx);
  const w = (v: number) => won(Math.round(v)) + '만';
  return <>
    <div className="lead-note">집을 <b>처음</b> 사는 분을 위한 순서예요. 아래 부대비용은 지금 목표가 <b>{eok(price)}</b> 기준으로 <b>자동 계산</b>했어요.</div>
    <div className="card"><div className="ch"><span className="n">📋</span><h3>매수 절차 5단계</h3></div>
      <div className="g-steps" style={{ gridTemplateColumns: '1fr' }}>
        {STEPS.map((s, i) => <div key={i} className="g-step"><span className="g-n">{i + 1}</span><div><b>{s[0]}</b><span>{s[1]}</span></div></div>)}
      </div></div>
    <div className="cols2" style={{ marginTop: 16 }}>
      <div className="card"><div className="ch"><span className="n">💰</span><h3>집값 외 부대비용 (현금 필요)</h3><Tip text="집값 말고 계약·등기 때 추가로 드는 현금입니다. 목표가·주택수·지역(중과)·특례를 반영해 계산했어요." /></div>
        <div className="stat-row"><span>취득세{cc.heavy ? ` · 중과 ${(cc.taxRate * 100).toFixed(0)}%` : ` (${(cc.taxRate * 100).toFixed(1)}%)`}</span><span className="v">{w(cc.tax)}</span></div>
        <div className="stat-row"><span>지방교육세 등</span><span className="v">{w(cc.eduTax)}</span></div>
        {cc.relief > 0 && <div className="stat-row"><span>생애최초·신생아 감면</span><span className="v" style={{ color: 'var(--ok-ink)' }}>−{w(cc.relief)}</span></div>}
        <div className="stat-row"><span>중개보수 <span className="tiny muted">상한</span></span><span className="v">{w(cc.broker)}</span></div>
        <div className="stat-row"><span>법무사 등기비 <span className="tiny muted">대략</span></span><span className="v">{w(cc.legal)}</span></div>
        <div className="stat-row"><span>이사·예비비 <span className="tiny muted">3%</span></span><span className="v">{w(cc.reserve)}</span></div>
        <div className="stat-row" style={{ borderTop: '2px solid var(--line)', marginTop: 4, paddingTop: 8 }}><span><b>합계</b></span><span className="v" style={{ fontSize: 16 }}>{w(cc.total)}</span></div>
        <div className="tiny muted" style={{ marginTop: 8 }}>중개보수는 <b>법정 상한</b>이며 협의로 낮출 수 있어요. 취득세·감면은 <b>위택스</b>에서 확정됩니다.</div></div>
      <div className="card"><div className="ch"><span className="n">🛡️</span><h3>계약 전·중 안전 체크</h3></div>
        {CHECKS.map((c, i) => <div key={i} className="chk"><label><input type="checkbox" /> {c}</label></div>)}
        <div className="tiny muted" style={{ marginTop: 6 }}>서류 발급은 <b>🏦 발급·비교</b> 탭에서 바로 열 수 있어요.</div></div>
    </div>
  </>;
}
