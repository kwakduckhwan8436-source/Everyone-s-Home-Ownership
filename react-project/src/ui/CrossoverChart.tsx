import type { Crossover, Scenario } from '../types.ts';
import { eok } from '../engines/util.ts';

interface Props {
  scenarios: { sc: Scenario; res: Crossover }[];
  curr: number;                 // 0 보수 / 1 기본 / 2 낙관
  preview?: Crossover | null;   // 레버 미리보기
}

export function CrossoverChart({ scenarios, curr, preview }: Props) {
  const res = preview ?? scenarios[curr].res;
  const S = res.series;
  const W = 980, H = 360, pad = { l: 62, r: 18, t: 18, b: 34 }, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const band = !preview ? [scenarios[0].res.series, scenarios[2].res.series] : null;
  let maxY = Math.max(...S.map(p => Math.max(p.need, p.have)));
  if (band) maxY = Math.max(maxY, ...band[0].map(p => p.need));
  maxY *= 1.06;
  const maxT = S.length - 1, X = (t: number) => pad.l + (t / maxT) * iw, Y = (v: number) => pad.t + ih - (Math.max(0, v) / maxY) * ih;
  const path = (arr: typeof S, key: 'need' | 'have') => arr.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p[key]).toFixed(1)}`).join(' ');

  const gridEls: JSX.Element[] = [];
  for (let k = 0; k <= 4; k++) { const val = maxY * k / 4, y = Y(val);
    gridEls.push(<g key={'h' + k}><line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="var(--line-2)" /><text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize={11} fill="var(--ink-3)">{eok(val)}</text></g>); }
  for (let yr = 0; yr <= Math.floor(maxT / 12); yr += 2) { const x = X(yr * 12);
    gridEls.push(<g key={'v' + yr}><line x1={x} y1={pad.t} x2={x} y2={pad.t + ih} stroke="var(--line-2)" /><text x={x} y={H - 13} textAnchor="middle" fontSize={11} fill="var(--ink-3)">+{yr}년</text></g>); }

  let bandFill: JSX.Element | null = null;
  if (band) {
    const d = band[0].map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.need).toFixed(1)}`).join(' ')
      + ' ' + band[1].map((_, i) => `L${X(band[1][band[1].length - 1 - i].t).toFixed(1)},${Y(band[1][band[1].length - 1 - i].need).toFixed(1)}`).join(' ') + ' Z';
    bandFill = <path d={d} fill="var(--ink)" opacity={0.05} />;
  }
  let mark: JSX.Element;
  if (res.reachable && res.monthIndex != null) { const t = res.monthIndex, x = X(t), y = Y(res.series[t].have);
    mark = <g><line x1={x} y1={pad.t} x2={x} y2={pad.t + ih} stroke="var(--ok)" strokeWidth={1.5} strokeDasharray="4 4" /><circle cx={x} cy={y} r={9} fill="var(--ok)" opacity={0.16} /><circle cx={x} cy={y} r={5} fill="var(--ok)" stroke="#fff" strokeWidth={2} /><text x={x} y={pad.t - 3} textAnchor="middle" fontSize={12} fontWeight={800} fill="var(--ok)">{res.targetYm}</text></g>;
  } else mark = <text x={W - pad.r} y={pad.t + 15} textAnchor="end" fontSize={12} fontWeight={800} fill="var(--warn)">미도달 · 격차 {eok(res.gap)}</text>;

  const sc = scenarios[curr].sc;
  return <>
    <div className="chart-wrap"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="필요자본과 가용자본 교차 차트">
      {gridEls}{bandFill}
      <path d={path(S, 'need')} fill="none" stroke="var(--ink)" strokeWidth={2.5} opacity={preview ? 0.9 : 1} />
      <path d={path(S, 'have')} fill="none" stroke="var(--brass)" strokeWidth={2.5} />
      {mark}
    </svg></div>
    <div className="note">{preview
      ? '미리보기: 이 조정을 적용한 곡선입니다. 닫으면 원래 계획으로 돌아갑니다.'
      : `${sc.name} 시나리오 (집값 ${(sc.growth * 100).toFixed(1)}%/년, 금리 ${(sc.mortgageRate * 100).toFixed(1)}%) · 회색 밴드 = 보수~낙관 필요자본.`}</div>
  </>;
}
