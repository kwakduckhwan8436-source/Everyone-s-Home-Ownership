import type { AppState, Ctx } from '../types.ts';
import { monthsBetween } from './util.ts';

export interface AcqTaxOpts { homeCount: number; regulated: boolean; temporaryTwoHome?: boolean; }

/** 표준 취득세율: 6억↓ 1%, 6~9억 (가액(억)×2/3−3)%, 9억↑ 3% */
function standardRate(price: number, ctx: Ctx): number {
  const { t1, t2, rateLow, rateHigh } = ctx.policy.acqTax;
  const eok = price / 10000;
  if (price <= t1) return rateLow;
  if (price <= t2) return (eok * 2 / 3 - 3) / 100;
  return rateHigh;
}

/** 다주택 중과 반영 실효 취득세율 + 중과 여부.
 *  조정: 2주택 8%·3주택+ 12% / 비조정: 3주택 8%·4주택+ 12% (취득 후 주택 수 기준) */
function rateFor(price: number, ctx: Ctx, opts: AcqTaxOpts): { rate: number; heavy: boolean } {
  const h = ctx.policy.acqTaxHeavy;
  const after = opts.homeCount + 1; // 이번 취득 후 보유 주택 수
  const tempExempt = after === 2 && opts.temporaryTwoHome; // 일시적 2주택 → 일반세율
  if (opts.regulated && !tempExempt) {
    if (after >= 3) return { rate: h.regulated.thirdPlus, heavy: true };
    if (after === 2) return { rate: h.regulated.second, heavy: true };
  } else if (!opts.regulated) {
    if (after >= 4) return { rate: h.nonRegulated.fourthPlus, heavy: true };
    if (after === 3) return { rate: h.nonRegulated.third, heavy: true };
  }
  return { rate: standardRate(price, ctx), heavy: false };
}

/** 취득세 (만원). 기본은 무주택→1주택(표준). opts로 다주택·규제지역 중과 반영. */
export function acqTax(price: number, ctx: Ctx, opts: AcqTaxOpts = { homeCount: 0, regulated: false }): number {
  return price * rateFor(price, ctx, opts).rate;
}

/** 중개보수 (만원) — 구간요율 상한 근사 */
export function brokerFee(price: number, ctx: Ctx): number {
  const band = ctx.policy.brokerFee.find(b => b.maxPrice === null || price < b.maxPrice)!;
  return Math.min(price * band.rate, band.cap ?? Infinity);
}

export interface AcqCosts {
  total: number; tax: number; eduTax: number; relief: number;
  broker: number; legal: number; reserve: number;
  heavy: boolean; taxRate: number;
}

/** 취득 부대비용 전체 분해 (다주택 중과 반영) */
export function acqCosts(state: AppState, price: number, ctx: Ctx): AcqCosts {
  const p = ctx.policy;
  const { rate, heavy } = rateFor(price, ctx, { homeCount: state.homeCount ?? 0, regulated: state.regulated, temporaryTwoHome: state.temporaryTwoHome });
  const tax = price * rate;
  // 지방교육세: 표준 취득세는 취득세의 10% 근사, 중과 시 가액의 0.4% 근사
  const eduTax = heavy ? price * p.acqTaxHeavy.eduTaxRate : tax * 0.1;
  // 감면: 생애최초·신생아 감면은 무주택 요건 → 중과(다주택) 시 미적용
  let relief = 0;
  if (!heavy && (state.homeCount ?? 0) === 0) { // 생애최초·신생아 감면은 무주택만
    const cm = state.childBirth ? monthsBetween(state.childBirth, ctx.today) : 999;
    if (cm >= 0 && cm <= p.newbornTaxWithinMonths) relief = p.acqTaxReliefNewborn;
    else if (state.firstTime) relief = p.acqTaxReliefFirst;
  }
  const taxNet = Math.max(0, tax + eduTax - relief);
  const broker = brokerFee(price, ctx);
  const legal = p.legalFee;
  const reserve = price * p.reserveRate;
  return { total: taxNet + broker + legal + reserve, tax, eduTax, relief, broker, legal, reserve, heavy, taxRate: rate };
}
