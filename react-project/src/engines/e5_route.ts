import type { AppState, Ctx, RouteResult, ProductEligibility } from '../types.ts';
import { monthsBetween } from './util.ts';
import { netWorthLiquid } from './e2_growth.ts';

export function cheongyakScore(state: AppState, ctx: Ctx) {
  const cs = ctx.policy.cheongyakScore;
  const y = Number(ctx.today.split('-')[0]);
  const homeless = Math.min(cs.homelessMax, Math.max(0, y - state.homelessSince) * 2);
  const dep = Math.min(cs.dependentsMax, 5 + state.dependents * 5);
  const acctYears = Math.max(0, monthsBetween(state.acctOpen, ctx.today) / 12);
  const acct = Math.min(cs.acctMax, Math.floor(acctYears) * 1 + 2);
  return { total: Math.round(homeless + dep + acct), homeless: Math.round(homeless), dep: Math.round(dep), acct: Math.round(acct) };
}

/** E5 — 경로 스코어링 (룰 기반, 결정론적) */
export function route(state: AppState, capProducts: ProductEligibility[], ctx: Ctx): RouteResult {
  const score = cheongyakScore(state, ctx);
  const newbornOk = capProducts.find(p => p.key === 'newborn')?.eligible ?? false;
  const routes = [
    { key: 'special', name: '특별공급', fit: 0, reason: '', risk: '소득·자산 상한 초과 시 탈락' },
    { key: 'cheongyak', name: '청약(민영 가점)', fit: 0, reason: '', risk: '당첨 불확실, 대기 장기화' },
    { key: 'resale', name: '기존주택 매매', fit: 0, reason: '', risk: '시세 리스크 전액 부담' },
    { key: 'public', name: '공공분양·뉴홈', fit: 0, reason: '', risk: '지역·물량 제한' },
  ];
  let sp = 0;
  const marr = state.householdType.includes('신혼') || state.householdType.includes('부부');
  if (state.children > 0) sp += 3;
  if (state.firstTime) sp += 2;
  if (newbornOk) sp += 3;
  if (marr) sp += 1;
  routes[0].fit = sp;
  routes[0].reason = [state.children > 0 ? '자녀 보유' : null, newbornOk ? '신생아 특례 자격' : null, state.firstTime ? '생애최초' : null]
    .filter(Boolean).join(' · ') || '자격 확인 필요';
  routes[1].fit = score.total / 12;
  routes[1].reason = `예상 가점 ${score.total}점 (무주택 ${score.homeless}·부양 ${score.dep}·통장 ${score.acct})`;
  const liquid = netWorthLiquid(state, 0);
  routes[2].fit = liquid > state.target.priceNow * 0.35 ? 5 : 2;
  routes[2].reason = liquid > state.target.priceNow * 0.35 ? '가용현금 충분 · 시점 확실성 확보' : '자금 축적 후 검토';
  routes[3].fit = (state.income < 6000 ? 3 : 1) + (score.acct > 10 ? 2 : 0);
  routes[3].reason = state.income < 6000 ? '소득요건 유리 · 통장 납입 강점' : '소득요건 확인 필요';
  return { score, routes: routes.sort((a, b) => b.fit - a.fit), newbornOk };
}
