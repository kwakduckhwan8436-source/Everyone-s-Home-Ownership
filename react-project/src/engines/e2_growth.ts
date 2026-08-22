import type { AppState } from '../types.ts';
import { fvAnnuity, pmt } from './util.ts';

/** E2 — t개월 후 계약금으로 쓸 수 있는 유동 순자산.
 *  bridgeMonths>0이면 전세보증금을 만기 그 개월 수 전부터 가용으로 간주(브릿지론 가정). */
export function netWorthLiquid(state: AppState, t: number, bridgeMonths = 0): number {
  let v = 0;
  for (const a of state.assets) {
    if (!a.liquid) continue;
    if (a.kind === 'jeonse') {
      // 전세보증금은 만기(availFrom) 이후 회수. 브릿지 사용 시 만기 bridgeMonths 전부터 가용.
      if (t >= (a.availFrom ?? 0) - bridgeMonths) v += a.amount;
    } else {
      v += a.amount * Math.pow(1 + a.expectedReturn, t / 12);
    }
  }
  v += fvAnnuity(state.savingMonthly, state.blendedMonthlyReturn, t);
  for (const d of state.debts) {
    const r = d.rate / 12, term = Math.max(1, d.termMonths), m = pmt(d.balance, r, term);
    let bal = d.balance;
    for (let i = 0; i < Math.min(t, term); i++) bal = bal * (1 + r) - m;
    v -= Math.max(0, bal);
  }
  return v;
}
