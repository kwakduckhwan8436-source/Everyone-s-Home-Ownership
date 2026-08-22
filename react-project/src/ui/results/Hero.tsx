import { useStore } from '../../state/store.ts';
import { eok } from '../../engines/util.ts';
import { bindKo } from '../uiutil.ts';
import { HERO_ART } from '../heroArt.ts';

export function Hero() {
  const report = useStore(s => s.report);
  if (!report) return null;
  const r = report.scenarios[1].res, c = report.scenarios[0].res, o = report.scenarios[2].res, rm = report.roadmap;
  if (r.reachable && r.monthIndex != null) {
    const band = (c.reachable && o.reachable) ? `보수 ${c.targetYm} · 낙관 ${o.targetYm}` : '시나리오 편차 큼';
    const yrs = Math.floor(r.monthIndex / 12), mos = r.monthIndex % 12;
    return <div className="hero"><div className="hero-art-wrap" dangerouslySetInnerHTML={{ __html: HERO_ART }} /><div className="hero-in">
      <div><div className="lead">지금 계획대로면 내집마련 가능</div>
        <div className="date reach">{r.targetYm}</div>
        <div className="sub">약 {yrs}년 {mos}개월 후 · {band}</div>
        <div className="runway"><span className="chip ok">도달 가능</span><span className="chip">지금부터 {rm.runway}개월</span><span className="chip">병목 {bindKo(report.cap.bindingConstraint)}</span></div></div>
      <div className="divider" />
      <div className="side"><div className="lead">그때 필요한 자기자본</div>
        <div className="big mono">{eok(r.series[r.monthIndex].need)}</div>
        <div className="sub">목표가 {eok(r.series[r.monthIndex].price)} 기준</div></div>
    </div></div>;
  }
  return <div className="hero"><div className="hero-art-wrap" dangerouslySetInnerHTML={{ __html: HERO_ART }} /><div className="hero-in">
    <div><div className="lead">지금 계획으로는</div>
      <div className="date miss">도달 어려움</div>
      <div className="sub">20년 뒤에도 약 {eok(r.gap)} 부족{r.diverging ? ' · 격차가 벌어지는 중' : ''}</div>
      <div className="runway"><span className="chip warn">미도달</span><span className="chip">아래 레버로 목표·저축·부채를 조정해 보세요</span></div></div>
  </div></div>;
}
