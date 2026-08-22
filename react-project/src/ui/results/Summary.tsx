import { useStore } from '../../state/store.ts';
import { eok } from '../../engines/util.ts';
import { bindKo, bindPlain } from '../uiutil.ts';

export function Summary() {
  const report = useStore(s => s.report);
  if (!report) return null;
  const r = report.cross, cap = report.cap;
  const priceTxt = eok(report.scenarios[1].res.series[0].price);
  const top = report.levers.filter(l => l.monthsSaved > 0)[0];
  let p1: JSX.Element, p2: JSX.Element;
  if (r.reachable && r.targetYm) {
    const [y, m] = r.targetYm.split('-');
    p1 = <>지금처럼 모으면 <span className="hl ok">{y}년 {Number(m)}월</span>쯤 목표한 <b>{priceTxt}</b> 집을 살 수 있어요.</>;
    p2 = <>지금 가장 발목을 잡는 건 <span className="hl warn">{bindKo(cap.bindingConstraint)}</span>예요 — {bindPlain(cap.bindingConstraint)}</>;
  } else {
    p1 = <>지금 계획으로는 <span className="hl warn">목표에 닿기 어려워요</span>. 20년 뒤에도 약 <b>{eok(r.gap)}</b> 부족해요{r.diverging ? ' (게다가 격차가 벌어지는 중이에요)' : ''}.</>;
    p2 = <>가장 큰 벽은 <span className="hl warn">{bindKo(cap.bindingConstraint)}</span> — {bindPlain(cap.bindingConstraint)}</>;
  }
  const p3 = top
    ? <>가장 빠른 방법: <b>{top.name}</b>이에요. 이것만 해도 <span className="hl brass">{top.monthsSaved}개월</span> 당겨져요. <span className="tiny muted">(아래 카드를 탭해 차트로 확인)</span></>
    : <>목표가를 조금 낮추거나 월 저축을 늘리면 시점이 당겨져요. 아래 카드를 탭해 얼마나 빨라지는지 확인해 보세요.</>;
  return <div className="summary"><h3>📋 한눈에 요약</h3><p>{p1}</p><p>{p2}</p><p>{p3}</p></div>;
}
