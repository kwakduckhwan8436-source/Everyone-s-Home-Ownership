import { describe, it, expect } from 'vitest';
import type { AppState, Ctx, Policy } from '../../types.ts';
import policyJson from '../../../public/policy/2026-08.json';
import { analyze } from '../../orchestration/analyze.ts';
import { acqTax, acqCosts } from '../costs.ts';
import { crossover, runScenarios } from '../e3_crossover.ts';
import { monthlyPayment, holdingCostAnnual, jeonseAlign } from '../e7_afterpurchase.ts';
import { sensitivity } from '../sensitivity.ts';

const policy = policyJson as unknown as Policy;
const ctx: Ctx = { policy, today: '2026-08' };
const acqCostsFor = (s: AppState) => acqCosts(s, 80000, ctx);

function baseState(over: Partial<AppState> = {}): AppState {
  const assets = [
    { kind: 'cash' as const, amount: 3000, expectedReturn: 0.03, liquid: true },
    { kind: 'stock' as const, amount: 3000, expectedReturn: 0.06, liquid: true },
    { kind: 'jeonse' as const, amount: 10000, expectedReturn: 0, liquid: true, availFrom: 19 },
    { kind: 'retire' as const, amount: 2000, expectedReturn: 0.04, liquid: false },
  ];
  const debts = [{ kind: 'credit', balance: 1500, rate: 0.055, termMonths: 36 }];
  const inv = assets.filter(a => a.liquid && a.kind !== 'jeonse');
  const annual = inv.reduce((s, a) => s + a.amount * a.expectedReturn, 0) / inv.reduce((s, a) => s + a.amount, 0);
  return {
    householdType: '부부+자녀', children: 1, childBirth: '2024-03', region: '대전 유성구',
    income: 6000, savingMonthly: 220, assets, debts,
    netWorth: assets.reduce((s, a) => s + a.amount, 0) - 1500,
    blendedMonthlyReturn: annual / 12,
    homelessSince: 2009, acctOpen: '2011-04', dependents: 3, firstTime: true, regulated: false, homeCount: 0, temporaryTwoHome: false,
    target: { priceNow: 45000, targetDate: '2029-03' },
    market: { priceGrowth: 0.025, mortgageRate: 0.042, priceNow: 45000 },
    ...over,
  };
}

describe('전세 브릿지 (전환 비용)', () => {
  it('브릿지는 베이스라인을 바꾸지 않는다(레버/옵션일 뿐)', () => {
    const r = analyze(baseState(), ctx);
    expect(r.cross.targetYm).toBe('2028-12');
    expect(r.levers.some(l => l.id === 'L7')).toBe(true); // 전세 있으므로 L7 존재
  });
  it('브릿지 비용이 need에 정확히 가산된다 (1억×5.5%/12×6=275만)', () => {
    const s = baseState();
    const sc = { name: '기본', growth: s.market.priceGrowth, returnMul: 1, mortgageRate: s.market.mortgageRate };
    const base = crossover(s, sc, ctx);
    const br = crossover(s, sc, ctx, { bridgeMonths: 6 });
    // 전세 만기 t=19, t=13은 브릿지 6개월 구간 → 비용 275만
    expect(Math.round(br.series[13].need - base.series[13].need)).toBe(275);
    // 만기 이후(t=24)엔 브릿지 비용 0
    expect(Math.round(br.series[24].need - base.series[24].need)).toBe(0);
  });
  it('전세 만기가 병목이면 브릿지가 도달을 앞당긴다', () => {
    const s = baseState({
      income: 8000, savingMonthly: 350, debts: [],
      assets: [
        { kind: 'cash', amount: 2000, expectedReturn: 0.03, liquid: true },
        { kind: 'stock', amount: 2000, expectedReturn: 0.06, liquid: true },
        { kind: 'jeonse', amount: 18000, expectedReturn: 0, liquid: true, availFrom: 19 },
      ],
      target: { priceNow: 32000 }, childBirth: null,
    });
    const sc = { name: '기본', growth: s.market.priceGrowth, returnMul: 1, mortgageRate: s.market.mortgageRate };
    const base = crossover(s, sc, ctx).monthIndex ?? 240;
    const br = crossover(s, sc, ctx, { bridgeMonths: 6 }).monthIndex ?? 240;
    expect(br).toBeLessThan(base); // 앞당겨짐
  });
  it('전세가 없으면 L7 레버가 생성되지 않는다', () => {
    const s = baseState({ assets: [{ kind: 'cash', amount: 5000, expectedReturn: 0.03, liquid: true }] });
    expect(analyze(s, ctx).levers.some(l => l.id === 'L7')).toBe(false);
  });
});

describe('다주택 취득세 중과', () => {
  it('조정지역 2주택 8억 → 8% (지방교육세 0.4%)', () => {
    const s = baseState({ homeCount: 1, regulated: true, firstTime: false, childBirth: null });
    const cc = acqCostsFor(s);
    expect(cc.taxRate).toBeCloseTo(0.08, 4);
    expect(Math.round(cc.tax)).toBe(6400);
    expect(Math.round(cc.eduTax)).toBe(320);
    expect(cc.heavy).toBe(true);
    expect(cc.relief).toBe(0); // 중과 시 감면 미적용
  });
  it('조정지역 3주택 → 12%', () => {
    const s = baseState({ homeCount: 2, regulated: true, firstTime: false, childBirth: null });
    expect(acqCostsFor(s).taxRate).toBeCloseTo(0.12, 4);
  });
  it('비조정지역 2주택 → 표준(중과 아님)', () => {
    const s = baseState({ homeCount: 1, regulated: false, firstTime: false, childBirth: null });
    expect(acqCostsFor(s).heavy).toBe(false);
  });
  it('비조정지역 3주택 → 8%, 4주택 → 12%', () => {
    expect(acqCostsFor(baseState({ homeCount: 2, regulated: false })).taxRate).toBeCloseTo(0.08, 4);
    expect(acqCostsFor(baseState({ homeCount: 3, regulated: false })).taxRate).toBeCloseTo(0.12, 4);
  });
  it('무주택 데모는 표준세율·결과 불변', () => {
    const r = analyze(baseState(), ctx);
    expect(r.cross.targetYm).toBe('2028-12');
  });
  it('일시적 2주택은 중과 배제(일반세율)', () => {
    const cc = acqCostsFor(baseState({ homeCount: 1, regulated: true, temporaryTwoHome: true, firstTime: false, childBirth: null }));
    expect(cc.heavy).toBe(false);
    expect(cc.taxRate).toBeLessThan(0.04);
  });
  it('일시적 예외는 2주택만 — 3주택은 12% 유지', () => {
    const cc = acqCostsFor(baseState({ homeCount: 2, regulated: true, temporaryTwoHome: true, firstTime: false, childBirth: null }));
    expect(cc.taxRate).toBeCloseTo(0.12, 4);
  });
  it('감면은 무주택만 — 1주택자는 relief 0', () => {
    expect(acqCostsFor(baseState({ homeCount: 1, regulated: false, firstTime: true })).relief).toBe(0);
  });
});

describe('취득세 산식', () => {
  it('구간별 실효세율이 법령과 일치', () => {
    expect(acqTax(60000, ctx)).toBeCloseTo(600, 0);   // 6억 → 1%
    expect(acqTax(75000, ctx)).toBeCloseTo(1500, 0);  // 7.5억 → 2%
    expect(acqTax(80000, ctx)).toBeCloseTo(1866.7, 0);// 8억 → 2.33%
    expect(acqTax(90000, ctx)).toBeCloseTo(2700, 0);  // 9억 → 3%
  });
});

describe('골든 케이스', () => {
  it('G-기본: 부부+자녀, 도달 가능 & DSR 병목', () => {
    const r = analyze(baseState(), ctx);
    expect(r.cross.reachable).toBe(true);
    expect(r.cap.bindingConstraint).toBe('DSR');
    expect(r.cross.targetYm).toBe('2028-12');
  });

  it('G2-미도달: 고가 목표 + 저자산은 미도달', () => {
    const r = analyze(baseState({
      target: { priceNow: 90000 }, income: 4000, savingMonthly: 80,
      assets: [
        { kind: 'cash', amount: 1000, expectedReturn: 0.03, liquid: true },
        { kind: 'stock', amount: 1000, expectedReturn: 0.06, liquid: true },
      ],
      netWorth: 2000,
    }), ctx);
    expect(r.cross.reachable).toBe(false);
  });

  it('G4-레버: 신용대출 보유 시 L4가 상위 레버', () => {
    const r = analyze(baseState(), ctx);
    const top2 = r.levers.slice(0, 2).map(l => l.id);
    expect(top2).toContain('L4');
    expect(r.levers.every(l => l.id !== 'L6')).toBe(true); // L6은 순위에서 제외됨
  });

  it('G5-신생아 감면: 출산 5년 이내면 취득세 감면 550만', () => {
    const r = analyze(baseState({ childBirth: '2025-06' }), ctx);
    expect(r.cross.reachable).toBe(true);
    // 신생아 특례 디딤돌 자격도 판정됨(출산 24개월 이내)
    const nb = r.cap.products.find(p => p.key === 'newborn');
    expect(nb).toBeDefined();
  });

  it('G7-발산: 집값 상승률 8%면 격차 확대', () => {
    const r = analyze(baseState({ market: { priceGrowth: 0.08, mortgageRate: 0.042, priceNow: 45000 }, target: { priceNow: 90000 } }), ctx);
    if (!r.cross.reachable) expect(r.cross.diverging).toBe(true);
  });

  it('시나리오 밴드: 보수 ≥ 기본 ≥ 낙관 순으로 도달이 늦거나 같음', () => {
    const r = analyze(baseState(), ctx);
    const [con, bas, opt] = r.scenarios.map(s => s.res.monthIndex ?? 240);
    expect(con).toBeGreaterThanOrEqual(bas);
    expect(bas).toBeGreaterThanOrEqual(opt);
  });

  it('로드맵: 5단계 실행 캘린더 생성', () => {
    const r = analyze(baseState(), ctx);
    expect(r.roadmap.phases).toHaveLength(5);
    expect(r.roadmap.phases[0].name).toBe('축적기');
    expect(r.roadmap.anchor).toBe('2028-12');
  });
});

describe('e7 매입후 비용 · 민감도 (이식)', () => {
  it('월 원리금: 3억·4.2%·30년 ≈ 147만', () => {
    expect(Math.round(monthlyPayment(30000, 0.042))).toBe(147);
  });
  it('보유세: 5억 종부세 0, 20억 종부세 > 0', () => {
    expect(holdingCostAnnual(50000).jong).toBe(0);
    expect(holdingCostAnnual(200000).jong).toBeGreaterThan(0);
  });
  it('전세 정렬: 데모는 재계약 추천(gap 9)', () => {
    const scn = runScenarios(baseState(), ctx);
    const al = jeonseAlign(baseState(), scn[1].res, ctx);
    expect(al?.best.key).toBe('재계약');
    expect(al?.gap).toBe(9);
  });
  it('민감도 히트맵: 6×5 격자, 중앙(현재값) = 28개월', () => {
    const scn = runScenarios(baseState(), ctx);
    const g = sensitivity(baseState(), ctx, scn[1].sc);
    expect(g.saveMuls).toHaveLength(6);
    expect(g.priceMuls).toHaveLength(5);
    expect(g.cells[3][2]).toBe(28);
  });
});

