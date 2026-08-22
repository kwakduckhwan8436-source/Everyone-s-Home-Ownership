import type { AppState, Ctx, Scenario } from '../types.ts';
import { crossover } from './e3_crossover.ts';

export interface HeatGrid { saveMuls: number[]; priceMuls: number[]; cells: (number | null)[][] }
/** 저축 × 목표가 격자에서 도달 개월(미도달 null) — 민감도 히트맵용 */
export function sensitivity(state: AppState, ctx: Ctx, sc: Scenario): HeatGrid {
  const saveMuls = [1.6, 1.4, 1.2, 1.0, 0.8, 0.6];
  const priceMuls = [0.8, 0.9, 1.0, 1.1, 1.2];
  const cells = saveMuls.map(sm => priceMuls.map(pm => {
    const price = state.target.priceNow * pm;
    const s: AppState = { ...state, savingMonthly: state.savingMonthly * sm,
      target: { ...state.target, priceNow: price }, market: { ...state.market, priceNow: price } };
    const r = crossover(s, sc, ctx);
    return r.reachable ? r.monthIndex! : null;
  }));
  return { saveMuls, priceMuls, cells };
}
