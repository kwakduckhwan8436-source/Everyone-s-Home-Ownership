import type { AppState, Ctx, Lever } from '../types.ts';
import { crossover } from './e3_crossover.ts';

/** E4 — 레버 민감도: 각 조정의 도달월 단축 효과 (가속 레버만) */
export function levers(state: AppState, ctx: Ctx): Lever[] {
  const baseSc = { name: '기본', growth: state.market.priceGrowth, returnMul: 1.0, mortgageRate: state.market.mortgageRate };
  const base = crossover(state, baseSc, ctx);
  const baseMonth = base.reachable ? base.monthIndex! : 240;

  const defs: { id: string; name: string; desc: string; apply: (s: AppState) => AppState; skipIf?: (s: AppState) => boolean }[] = [
    { id: 'L1', name: '월 저축 +30만원', desc: '가장 즉시 실행 가능',
      apply: s => ({ ...s, savingMonthly: s.savingMonthly + 30 }) },
    { id: 'L4', name: '신용대출 전액 상환', desc: 'DSR 여력 회복 → 대출한도 증가 (이중효과)',
      apply: s => ({ ...s, debts: [] }), skipIf: s => s.debts.length === 0 },
    { id: 'L2', name: '목표가격 −10%', desc: '효과 가장 크나 심리적 저항',
      apply: s => ({ ...s, target: { ...s.target, priceNow: s.target.priceNow * 0.9 } }) },
    { id: 'L5', name: '신생아 특례대출 적용', desc: '자격 충족 시 금리·한도 점프',
      apply: s => ({ ...s, market: { ...s.market, mortgageRate: 0.020 } }), skipIf: s => !s._newbornEligible },
    // L6(목표시점 지연)은 "더 빨리 도달"이 아니라 "목표 자체 변경" → 가속 순위에서 제외.
  ];

  const out: Lever[] = [];
  for (const L of defs) {
    if (L.skipIf && L.skipIf(state)) continue;
    const s2 = L.apply(structuredClone(state));
    const r = crossover(s2, { ...baseSc, growth: state.market.priceGrowth }, ctx);
    const month = r.reachable ? r.monthIndex! : 240;
    out.push({ id: L.id, name: L.name, desc: L.desc, monthsSaved: baseMonth - month });
  }

  // L7 — 전세 브릿지: 상태 변경이 아니라 crossover 옵션이라 별도 처리 (전세 있을 때만)
  const hasJeonse = state.assets.some(a => a.kind === 'jeonse' && a.amount > 0);
  if (hasJeonse && ctx.policy.transition.maxBridgeMonths > 0) {
    const rB = crossover(state, baseSc, ctx, { bridgeMonths: ctx.policy.transition.maxBridgeMonths });
    const monthB = rB.reachable ? rB.monthIndex! : 240;
    out.push({ id: 'L7', name: '전세금 브릿지론으로 앞당기기', desc: `전세 만기 전 최대 ${ctx.policy.transition.maxBridgeMonths}개월 브릿지 (이자비용 발생)`, monthsSaved: baseMonth - monthB });
  }
  return out.sort((a, b) => b.monthsSaved - a.monthsSaved);
}
