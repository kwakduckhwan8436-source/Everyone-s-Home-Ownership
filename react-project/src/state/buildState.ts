import type { AppState, Ctx } from '../types.ts';
import { monthsBetween } from '../engines/util.ts';

export type FormRaw = Record<string, string | boolean>;

export const DEFAULT_FORM: FormRaw = {
  householdType: '부부+자녀', children: '1', childBirth: '2024-03', region: '대전 유성구',
  income: '6000', saving: '220',
  cash: '3000', stock: '3000', jeonse: '10000', jeonseEnd: '2028-03', retire: '2000',
  debtBal: '1500', debtRate: '5.5', debtTerm: '36',
  homelessSince: '2009', acctOpen: '2011-04', dependents: '3',
  firstTime: true, regulated: false, homeCount: '0', tempTwoHome: false,
  priceNow: '45000', targetDate: '2029-03', growth: '2.5', mortRate: '4.2', growthCurve: '', rateCurve: '',
};

const num = (raw: FormRaw, k: string): number => Number(raw[k]) || 0;

/** "5,4,3.5" → [0.05,0.04,0.035] (퍼센트 → 소수). 빈 값이면 undefined. */
function parseCurve(raw: FormRaw, k: string): number[] | undefined {
  const v = (raw[k] as string | undefined)?.trim();
  if (!v) return undefined;
  const arr = v.split(',').map(x => Number(x.trim()) / 100).filter(x => !Number.isNaN(x));
  return arr.length ? arr : undefined;
}

/** 폼 입력 → AppState (readForm 이식) */
export function buildAppState(raw: FormRaw, ctx: Ctx): AppState {
  const jeonseAvailFrom = Math.max(0, monthsBetween(ctx.today, (raw.jeonseEnd as string) || ctx.today));
  const assets: AppState['assets'] = [
    { kind: 'cash', amount: num(raw, 'cash'), expectedReturn: 0.03, liquid: true },
    { kind: 'stock', amount: num(raw, 'stock'), expectedReturn: 0.06, liquid: true },
    { kind: 'jeonse', amount: num(raw, 'jeonse'), expectedReturn: 0.0, liquid: true, availFrom: jeonseAvailFrom },
    { kind: 'retire', amount: num(raw, 'retire'), expectedReturn: 0.04, liquid: false },
  ];
  const debts = num(raw, 'debtBal') > 0
    ? [{ kind: 'credit', balance: num(raw, 'debtBal'), rate: num(raw, 'debtRate') / 100, termMonths: num(raw, 'debtTerm') }]
    : [];
  const netWorth = assets.reduce((s, a) => s + a.amount, 0) - debts.reduce((s, d) => s + d.balance, 0);
  const inv = assets.filter(a => a.liquid && a.kind !== 'jeonse');
  const tot = inv.reduce((s, a) => s + a.amount, 0) || 1;
  const annual = inv.reduce((s, a) => s + a.amount * a.expectedReturn, 0) / tot;
  return {
    householdType: raw.householdType as string, children: num(raw, 'children'),
    childBirth: (raw.childBirth as string) || null, region: raw.region as string,
    income: num(raw, 'income'), savingMonthly: num(raw, 'saving'),
    assets, debts, netWorth, blendedMonthlyReturn: annual / 12,
    homelessSince: num(raw, 'homelessSince'), acctOpen: raw.acctOpen as string, dependents: num(raw, 'dependents'),
    firstTime: !!raw.firstTime, regulated: !!raw.regulated, homeCount: num(raw, 'homeCount'),
    temporaryTwoHome: !!raw.tempTwoHome,
    target: { priceNow: num(raw, 'priceNow'), targetDate: (raw.targetDate as string) || undefined },
    market: {
      priceGrowth: num(raw, 'growth') / 100, mortgageRate: num(raw, 'mortRate') / 100, priceNow: num(raw, 'priceNow'),
      priceGrowthCurve: parseCurve(raw, 'growthCurve'), mortgageRateCurve: parseCurve(raw, 'rateCurve'),
    },
  };
}
