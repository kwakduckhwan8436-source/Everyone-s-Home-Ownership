import type { AppState, Ctx, Capacity, Constraint, ProductEligibility } from '../types.ts';
import { pvAnnuity, pmt, monthsBetween, eok } from './util.ts';

/** E1 — 자금여력: LTV·DSR·지역한도 중 최소값 + 정책대출 자격 */
export function capacity(state: AppState, price: number, ctx: Ctx): Capacity {
  const p = ctx.policy;
  const mRate = (state.market.mortgageRate + p.stressAddRate) / 12; // 스트레스 금리
  const n = 30 * 12;

  const debtAnnual = state.debts.reduce(
    (s, d) => s + pmt(d.balance, d.rate / 12, Math.max(1, d.termMonths)) * 12, 0,
  );
  const availAnnual = Math.max(0, state.income * p.dsrLimit - debtAnnual);
  const dsrLimit = pvAnnuity(availAnnual / 12, mRate, n);

  const ltvRate = state.regulated
    ? (state.firstTime ? p.ltv.firstTime : p.ltv.regulated)
    : p.ltv.nonRegulated;
  const ltvLimit = price * ltvRate;

  let regionCap = Infinity;
  if (state.regulated) {
    const band = p.regionCap.find(b => b.maxPrice === null || price <= b.maxPrice)!;
    regionCap = band.cap;
  }

  const breakdown: Record<Constraint, number> = { LTV: ltvLimit, DSR: dsrLimit, REGION_CAP: regionCap };
  let bindingConstraint: Constraint = 'DSR';
  let maxLoan = Infinity;
  (Object.keys(breakdown) as Constraint[]).forEach(k => {
    if (breakdown[k] < maxLoan) { maxLoan = breakdown[k]; bindingConstraint = k; }
  });

  const products: ProductEligibility[] = p.products.map(prod => {
    const failed: string[] = [];
    if (state.income > prod.incomeMax) failed.push(`소득 ${eok(state.income)} > 기준 ${eok(prod.incomeMax)}`);
    if (state.netWorth > prod.netWorthMax) failed.push(`순자산 ${eok(state.netWorth)} > 기준 ${eok(prod.netWorthMax)}`);
    if (price > prod.priceMax) failed.push(`주택가 ${eok(price)} > 기준 ${eok(prod.priceMax)}`);
    if (prod.needChild) {
      const m = state.childBirth ? monthsBetween(state.childBirth, ctx.today) : 999;
      if (!(m >= 0 && m <= prod.childWithinMonths)) failed.push(`출산 ${prod.childWithinMonths}개월 이내 아님`);
    }
    return { key: prod.key, name: prod.name, limit: prod.limit, rate: prod.rate, eligible: failed.length === 0, failed };
  });

  return { maxLoan, bindingConstraint, breakdown, debtAnnual, availAnnual, products, ltvRate };
}
