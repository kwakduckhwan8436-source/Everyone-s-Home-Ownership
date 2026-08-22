import type { AppState, Ctx, Scenario, Crossover } from '../types.ts';
import { addMonths } from './util.ts';
import { capacity } from './e1_capacity.ts';
import { netWorthLiquid } from './e2_growth.ts';
import { acqCosts } from './costs.ts';

/** 전세 브릿지 비용(만원): 만기 전 t개월에 브릿지 사용 시 이자비용.
 *  각 전세자산에 대해 (만기 - t)개월, 단 [0, maxBridgeMonths] 범위만. */
function bridgeCost(state: AppState, t: number, ctx: Ctx, bridgeMonths: number): number {
  if (bridgeMonths <= 0) return 0;
  const r = ctx.policy.transition.bridgeRate;
  let cost = 0;
  for (const a of state.assets) {
    if (a.kind !== 'jeonse') continue;
    const from = a.availFrom ?? 0;
    // 실제 브릿지 구간에서만 이자 부과: 만기 bridgeMonths 전 ~ 만기 직전.
    // 그 이전(t < from - bridgeMonths)엔 보증금이 아직 가용이 아니라 브릿지도 없음 → 0.
    if (t >= from - bridgeMonths && t < from) {
      cost += a.amount * (r / 12) * (from - t);
    }
  }
  return cost;
}

/** priceNow에서 t개월 후 가격. 연도별 성장률 함수를 받아 연 단위로 복리, 마지막 부분연도는 지수보간.
 *  상수 g일 때 priceNow*(1+g)^(t/12)와 정확히 일치. */
function priceAtMonth(priceNow: number, t: number, gForYear: (y: number) => number): number {
  let price = priceNow;
  const fullYears = Math.floor(t / 12);
  for (let y = 0; y < fullYears; y++) price *= 1 + gForYear(y);
  const frac = (t % 12) / 12;
  if (frac > 0) price *= Math.pow(1 + gForYear(fullYears), frac);
  return price;
}

/** E3 — 교차점 솔버 ★ 필요자본 vs 가용자본이 만나는 시점.
 *  opts.bridgeMonths>0이면 전세를 만기 전 그 개월 수만큼 브릿지로 앞당겨 쓰되 이자비용을 need에 가산.
 *  state.market에 곡선이 있으면 연도별 상승률/금리 사용(시나리오 델타를 각 연도에 가산). */
export function crossover(state: AppState, scenario: Scenario, ctx: Ctx, opts: { bridgeMonths?: number } = {}): Crossover {
  const maxT = 240;
  const bridgeMonths = opts.bridgeMonths ?? 0;
  const s2: AppState = {
    ...state,
    market: { ...state.market, mortgageRate: scenario.mortgageRate },
    blendedMonthlyReturn: state.blendedMonthlyReturn * scenario.returnMul,
  };
  // 곡선(있으면): 시나리오 편차를 각 연도값에 가산. 없으면 시나리오 상수 그대로 → 베이스라인 불변.
  const gCurve = state.market.priceGrowthCurve;
  const gDelta = scenario.growth - state.market.priceGrowth;
  const gForYear = (y: number) => gCurve && gCurve.length ? gCurve[Math.min(y, gCurve.length - 1)] + gDelta : scenario.growth;
  const rCurve = state.market.mortgageRateCurve;
  const rDelta = scenario.mortgageRate - state.market.mortgageRate;
  const rForYear = (y: number) => rCurve && rCurve.length ? Math.max(0.005, rCurve[Math.min(y, rCurve.length - 1)] + rDelta) : scenario.mortgageRate;

  const series = [];
  let hit: number | null = null;
  for (let t = 0; t <= maxT; t++) {
    const price = priceAtMonth(state.target.priceNow, t, gForYear);
    const mRate = rForYear(Math.floor(t / 12));
    const capState = mRate === s2.market.mortgageRate ? s2 : { ...s2, market: { ...s2.market, mortgageRate: mRate } };
    const cap = capacity(capState, price, ctx);
    const costs = acqCosts(s2, price, ctx).total;
    const need = price - cap.maxLoan + costs + bridgeCost(s2, t, ctx, bridgeMonths);
    const have = netWorthLiquid(s2, t, bridgeMonths);
    series.push({ t, price, need, have });
    if (hit === null && have >= need) hit = t;
  }
  const last = series[series.length - 1];
  const gap = last.need - last.have;
  const prev = series[series.length - 13] ?? series[0];
  return {
    reachable: hit !== null,
    monthIndex: hit,
    targetYm: hit !== null ? addMonths(ctx.today, hit) : null,
    series, gap,
    diverging: last.need - last.have > prev.need - prev.have,
  };
}

/** 보수·기본·낙관 3시나리오 */
export function runScenarios(state: AppState, ctx: Ctx): { sc: Scenario; res: Crossover }[] {
  const base = state.market.priceGrowth, mr = state.market.mortgageRate;
  const scns: Scenario[] = [
    { name: '보수', growth: base + 0.02, returnMul: 0.6, mortgageRate: mr + 0.008 },
    { name: '기본', growth: base, returnMul: 1.0, mortgageRate: mr },
    { name: '낙관', growth: Math.max(0, base - 0.01), returnMul: 1.3, mortgageRate: Math.max(0.02, mr - 0.005) },
  ];
  return scns.map(sc => ({ sc, res: crossover(state, sc, ctx) }));
}
