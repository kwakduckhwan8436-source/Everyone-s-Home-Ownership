import type { AppState, Constraint, Ctx, Policy } from '../types.ts';
import { nowYM } from '../engines/util.ts';

export const ctxOf = (policy: Policy): Ctx => ({ policy, today: nowYM() });

export const bindKo = (k: Constraint): string => ({ LTV: '담보(LTV)', DSR: '소득(DSR)', REGION_CAP: '지역한도' }[k] ?? k);
export const bindPlain = (k: Constraint): string => ({
  LTV: '집값 대비 담보로 빌릴 수 있는 한도(LTV)에 걸려 있어요. 더 싼 집을 고르면 여유가 생겨요.',
  DSR: '소득 대비 갚을 수 있는 빚의 한도(DSR)에 걸려 있어요. 소득이 오르거나 기존 대출을 줄이면 더 빌릴 수 있어요.',
  REGION_CAP: '규제지역의 대출 총액 상한에 걸려 있어요. 규제가 아닌 지역이면 한도가 늘어요.',
}[k] ?? '대출 한도에 걸려 있어요.');

/** 레버 id → 상태 변경 + crossover 옵션 (미리보기용) */
export function applyLever(state: AppState, id: string): { s: AppState; opts: { bridgeMonths?: number } } {
  const s: AppState = structuredClone(state);
  const opts: { bridgeMonths?: number } = {};
  if (id === 'L1') s.savingMonthly += 30;
  else if (id === 'L2') s.target.priceNow *= 0.9;
  else if (id === 'L4') s.debts = [];
  else if (id === 'L5') s.market.mortgageRate = 0.02;
  else if (id === 'L7') opts.bridgeMonths = 6;
  return { s, opts };
}
