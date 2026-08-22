import { useStore } from '../state/store.ts';
import { sensitivity } from '../engines/sensitivity.ts';
import { eok, won } from '../engines/util.ts';
import { ctxOf } from './uiutil.ts';

const color = (mi: number | null): string => {
  if (mi == null) return '#e7ebee';
  const x = Math.min(1, mi / 180);
  return `rgb(${Math.round(30 + x * 200)},${Math.round(150 - x * 110)},${Math.round(110 - x * 70)})`;
};

export function Heatmap() {
  const state = useStore(s => s.state), policy = useStore(s => s.policy), report = useStore(s => s.report);
  if (!state || !policy || !report) return null;
  const g = sensitivity(state, ctxOf(policy), report.scenarios[1].sc);
  const curSave = state.savingMonthly, curPrice = state.target.priceNow;
  const label = (mi: number | null) => mi == null ? '—' : `${Math.floor(mi / 12)}년${mi % 12 ? (mi % 12) + '월' : ''}`;
  return <table className="heat"><thead><tr><th className="axis">저축＼목표가</th>{g.priceMuls.map(pm => <th key={pm}>{eok(curPrice * pm)}</th>)}</tr></thead>
    <tbody>{g.saveMuls.map((sm, ri) => <tr key={sm}><td className="axis">{won(curSave * sm)}만</td>
      {g.priceMuls.map((pm, ci) => { const mi = g.cells[ri][ci], cur = Math.abs(sm - 1) < 0.01 && Math.abs(pm - 1) < 0.01;
        return <td key={pm} style={{ background: color(mi), color: mi == null ? '#8393a3' : '#fff', outline: cur ? '3px solid var(--ink)' : undefined, outlineOffset: cur ? '-3px' : undefined }}>{label(mi)}</td>; })}
    </tr>)}</tbody></table>;
}
