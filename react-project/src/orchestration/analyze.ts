import type { AppState, Ctx, Report } from '../types.ts';
import { capacity } from '../engines/e1_capacity.ts';
import { runScenarios } from '../engines/e3_crossover.ts';
import { levers } from '../engines/e4_levers.ts';
import { route } from '../engines/e5_route.ts';
import { roadmap } from '../engines/e6_roadmap.ts';

/** 전체 분석 파이프라인: 상태 → 리포트 */
export function analyze(state: AppState, ctx: Ctx): Report {
  // 신생아 특례 사전 판정(레버 L5용)
  const capPre = capacity(state, state.target.priceNow, ctx);
  const s: AppState = { ...state, _newbornEligible: capPre.products.find(p => p.key === 'newborn')?.eligible ?? false };

  const scenarios = runScenarios(s, ctx);
  const cross = scenarios[1].res; // 기본
  const cap = capacity(s, s.target.priceNow, ctx);
  const lev = levers(s, ctx);
  const rt = route(s, cap.products, ctx);
  const rm = roadmap(s, { cap, cross, levers: lev }, ctx);

  return { cap, scenarios, cross, levers: lev, route: rt, roadmap: rm };
}
