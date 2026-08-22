/**
 * 프레임워크 독립 엔진 회귀 스모크 — `node --experimental-strip-types` 로 실행.
 * vitest와 별개의 이중 안전망. 핵심 불변식만 빠르게 검증하고, 실패 시 비정상 종료.
 * 로컬:  npm run verify:engine
 * CI:    node 22에서 별도 잡으로 실행
 */
import type { AppState, Ctx, Policy } from '../src/types.ts';
import policyJson from '../public/policy/2026-08.json' with { type: 'json' };
import { analyze } from '../src/orchestration/analyze.ts';
import { buildAppState, DEFAULT_FORM } from '../src/state/buildState.ts';
import { acqCosts } from '../src/engines/costs.ts';
import { crossover } from '../src/engines/e3_crossover.ts';

const ctx: Ctx = { policy: policyJson as unknown as Policy, today: '2026-08' };
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean) => { if (cond) pass++; else { fail++; console.error('  ✗', name); } };
const S = buildAppState(DEFAULT_FORM, ctx);
const sc = { name: '기본', growth: S.market.priceGrowth, returnMul: 1, mortgageRate: S.market.mortgageRate };

// 핵심 불변식
const r = analyze(S, ctx);
ok('데모 도달=2028-12', r.cross.targetYm === '2028-12');
ok('병목=DSR', r.cap.bindingConstraint === 'DSR');
ok('레버 L6 제외', r.levers.every(l => l.id !== 'L6'));
ok('전세 있으니 L7 존재', r.levers.some(l => l.id === 'L7'));

// 취득세 표준
ok('취득세 8억=1867', Math.round(acqCosts({ ...S, target: { priceNow: 80000 } }, 80000, ctx).tax) === 1867);

// 다주택 중과
const heavy = acqCosts({ ...S, homeCount: 1, regulated: true, firstTime: false, childBirth: null }, 80000, ctx);
ok('규제 2주택=8%', Math.abs(heavy.taxRate - 0.08) < 1e-9 && heavy.heavy);
const tmp = acqCosts({ ...S, homeCount: 1, regulated: true, temporaryTwoHome: true, firstTime: false, childBirth: null }, 80000, ctx);
ok('일시적 2주택=표준', !tmp.heavy && tmp.taxRate < 0.04);

// 브릿지 비용 정확 + 손해 없음
const base = crossover(S, sc, ctx), br = crossover(S, sc, ctx, { bridgeMonths: 6 });
ok('브릿지 t=13 비용=275', Math.round(br.series[13].need - base.series[13].need) === 275);
ok('브릿지 손해 없음', (br.monthIndex ?? 240) <= (base.monthIndex ?? 240));

// 곡선 등가성
const Sc = buildAppState({ ...DEFAULT_FORM, growthCurve: '2.5,2.5,2.5,2.5,2.5,2.5' }, ctx);
ok('곡선=상수 등가', analyze(Sc, ctx).cross.targetYm === '2028-12');
ok('곡선 t=60 가격 등가', Math.abs(crossover(Sc, sc, ctx).series[60].price - crossover(S, sc, ctx).series[60].price) < 1e-6);


// e7 매입후 비용 · 민감도 (이식 추가분)
import { monthlyPayment, holdingCostAnnual, jeonseAlign } from '../src/engines/e7_afterpurchase.ts';
import { sensitivity } from '../src/engines/sensitivity.ts';
import { runScenarios } from '../src/engines/e3_crossover.ts';
const _scn = runScenarios(S, ctx);
ok('월 원리금 3억·4.2% ≈147', Math.round(monthlyPayment(30000, 0.042)) === 147);
ok('보유세 5억 종부세 0', holdingCostAnnual(50000).jong === 0);
ok('보유세 20억 종부세 >0', holdingCostAnnual(200000).jong > 0);
ok('전세정렬 데모 재계약', jeonseAlign(S, _scn[1].res, ctx)?.best.key === '재계약');
ok('민감도 중앙 도달 = 2028-12(28개월)', sensitivity(S, ctx, _scn[1].sc).cells[3][2] === 28);

console.log(`engine regression: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
