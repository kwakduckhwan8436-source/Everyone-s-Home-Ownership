import { useStore } from '../../state/store.ts';
import { eok } from '../../engines/util.ts';
import { acqCosts } from '../../engines/costs.ts';
import { bindKo, bindPlain, ctxOf } from '../uiutil.ts';
import { Tip } from '../Tooltip.tsx';

export function Stats() {
  const report = useStore(s => s.report);
  const state = useStore(s => s.state);
  const policy = useStore(s => s.policy);
  if (!report || !state || !policy) return null;
  const cap = report.cap, r = report.cross;
  const need = r.reachable && r.monthIndex != null ? eok(r.series[r.monthIndex].need) : '—';
  const cc = acqCosts(state, state.target.priceNow, ctxOf(policy));
  const pm: Record<string, string> = { LTV: 'ltv', DSR: 'dsr', REGION_CAP: 'cap' };
  return <div className="stats">
    <div className="stat"><div className="l">지금 막는 병목 <Tip text={bindPlain(cap.bindingConstraint)} /></div><div className="v"><span className={`pill ${pm[cap.bindingConstraint]}`}>{bindKo(cap.bindingConstraint)}</span></div></div>
    <div className="stat"><div className="l">최대 대출 여력 <Tip text="LTV(담보)·DSR(소득)·지역한도 중 가장 낮은 값이 실제 한도예요." /></div><div className="v mono">{eok(cap.maxLoan)}</div></div>
    <div className="stat"><div className="l">도달 시 필요자본 <Tip text="집값에서 대출을 빼고, 취득세 등 부대비용을 더한 '내가 준비해야 할 현금'이에요." /></div><div className="v mono">{need}</div></div>
    <div className="stat"><div className="l">취득 부대비용{cc.heavy ? ' · 중과' : ''} <Tip text="집값 외에 추가로 드는 현금: 취득세·중개보수·법무비·이사/예비비." /></div><div className="v mono">{eok(cc.total)}</div></div>
  </div>;
}
