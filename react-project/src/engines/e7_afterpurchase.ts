import type { AppState, Ctx, Crossover } from '../types.ts';
import { pmt, addMonths } from './util.ts';

/** 매입 후 비용 파라미터 (참고용 근사 — 정확값은 위택스/은행 확인) */
export const AFTER = { pubRatio: 0.69, jeonseConvRate: 0.04, earlyRepayRate: 0.012 } as const;

/** 월 원리금 (30년·원리금균등) */
export function monthlyPayment(loan: number, annualRate: number): number {
  return loan > 0 ? pmt(loan, annualRate / 12, 360) : 0;
}

export interface HoldingCost { pub: number; propTax: number; jong: number; total: number }
/** 연 보유세 근사: 재산세(+도시지역분) + 1주택 종부세(공시가 12억 초과분) */
export function holdingCostAnnual(price: number): HoldingCost {
  const pub = price * AFTER.pubRatio;
  const base = pub * 0.45; // 과표 = 공시가 × 공정시장가액비율(1주택 근사)
  let r: number;
  if (base <= 6000) r = 0.001; else if (base <= 15000) r = 0.0015; else if (base <= 30000) r = 0.0025; else r = 0.0035;
  const propTax = base * r + base * 0.0014;
  const jong = pub > 120000 ? (pub - 120000) * 0.005 : 0;
  return { pub, propTax, jong, total: propTax + jong };
}

export const jeonseOppMonthly = (deposit: number): number => deposit * AFTER.jeonseConvRate / 12;
export const earlyRepayFee = (loan: number): number => loan * AFTER.earlyRepayRate;

export interface AlignOption { key: string; cost: number; desc: string }
export interface JeonseAlign { from: string; t: string; gap: number; best: AlignOption; opts: AlignOption[] }
/** 전세 만기 vs 잔금일 정렬: 브릿지 / 재계약 / 단기월세 중 최저비용 추천 */
export function jeonseAlign(state: AppState, cross: Crossover, ctx: Ctx): JeonseAlign | null {
  const j = state.assets.find(a => a.kind === 'jeonse' && a.amount > 0);
  if (!j || !cross.reachable || cross.monthIndex == null) return null;
  const from = j.availFrom ?? 0, t = cross.monthIndex, dep = j.amount, gap = t - from;
  const today = ctx.today, opts: AlignOption[] = [];
  if (gap > 0) {
    opts.push({ key: '재계약', cost: 0, desc: `전세 만기(${addMonths(today, from)})를 잔금일 근처로 재계약해 공백을 없앰` });
    opts.push({ key: '단기월세', cost: Math.round(dep * AFTER.jeonseConvRate / 12 * gap), desc: `만기에 나와 ${gap}개월 단기월세 (보증금 기회비용 근사)` });
  } else if (gap < 0) {
    const bm = Math.min(-gap, ctx.policy.transition.maxBridgeMonths);
    opts.push({ key: '브릿지론', cost: Math.round(dep * ctx.policy.transition.bridgeRate / 12 * bm), desc: `잔금일이 전세 만기보다 ${-gap}개월 빠름 → ${bm}개월 브릿지` });
    opts.push({ key: '만기 대기', cost: 0, desc: `전세 만기(${addMonths(today, from)})까지 기다렸다 잔금` });
  } else {
    opts.push({ key: '정렬 양호', cost: 0, desc: '도달 시점이 전세 만기와 거의 맞아 추가 비용이 적음' });
  }
  opts.sort((a, b) => a.cost - b.cost);
  return { from: addMonths(today, from), t: cross.targetYm ?? '', gap, best: opts[0], opts };
}
