// ============================================================
// 도메인 타입 — 단일 진실 원천(SSOT)
// ============================================================
export type AssetKind = 'cash' | 'stock' | 'jeonse' | 'retire';

export interface Asset {
  kind: AssetKind;
  amount: number;            // 만원
  expectedReturn: number;    // 연 수익률 (0.06 = 6%)
  liquid: boolean;           // 계약금으로 쓸 수 있는가
  availFrom?: number;        // (전세) 회수 가능 개월 (지금 기준)
}

export interface Debt {
  kind: string;
  balance: number;           // 만원
  rate: number;              // 연이율
  termMonths: number;
}

export interface AppState {
  householdType: string;
  children: number;
  childBirth: string | null; // 'YYYY-MM'
  region: string;
  income: number;            // 세전 연소득 만원
  savingMonthly: number;     // 만원
  assets: Asset[];
  debts: Debt[];
  netWorth: number;          // 총자산 - 총부채 (만원)
  blendedMonthlyReturn: number; // 투자자산 혼합 월수익률
  homelessSince: number;     // 연도
  acctOpen: string;          // 청약통장 가입 'YYYY-MM'
  dependents: number;
  firstTime: boolean;
  regulated: boolean;
  homeCount: number;          // 현재 보유 주택 수 (0 = 무주택)
  temporaryTwoHome: boolean;  // 일시적 2주택(종전주택 3년내 처분) → 2주택 중과 배제
  target: { priceNow: number; targetDate?: string };
  market: {
    priceGrowth: number; mortgageRate: number; priceNow: number;
    priceGrowthCurve?: number[];   // 연도별 상승률(있으면 상수 대신 사용, 시나리오 델타 가산)
    mortgageRateCurve?: number[];  // 연도별 주담대 금리(있으면 상수 대신 사용)
  };
  _newbornEligible?: boolean;
}

// ---- 정책 (JSON 스키마) ----
export type Confidence = 'high' | 'medium' | 'low';
export interface PolicyProduct {
  key: string; name: string;
  incomeMax: number; netWorthMax: number; priceMax: number;
  limit: number; rate: number; needChild: boolean; childWithinMonths: number;
}
export interface Policy {
  version: string;
  verifiedAt: string;
  dsrLimit: number;
  stressAddRate: number;
  ltv: { regulated: number; nonRegulated: number; firstTime: number };
  regionCap: { maxPrice: number | null; cap: number }[];
  acqTax: { t1: number; t2: number; rateLow: number; rateHigh: number };
  acqTaxReliefFirst: number;
  acqTaxReliefNewborn: number;
  newbornTaxWithinMonths: number;
  acqTaxHeavy: {
    regulated: { second: number; thirdPlus: number };
    nonRegulated: { third: number; fourthPlus: number };
    eduTaxRate: number;
  };
  transition: { bridgeRate: number; maxBridgeMonths: number };
  brokerFee: { maxPrice: number | null; rate: number; cap?: number }[];
  legalFee: number;
  reserveRate: number;
  products: PolicyProduct[];
  cheongyakScore: { homelessMax: number; dependentsMax: number; acctMax: number };
  meta: { k: string; v: string; note: string; conf: Confidence }[];
}

// 엔진에 주입되는 실행 컨텍스트 (정책 + 기준일). 순수함수 유지를 위해 명시 전달.
export interface Ctx {
  policy: Policy;
  today: string; // 'YYYY-MM'
}

// ---- 계산 결과 타입 ----
export type Constraint = 'LTV' | 'DSR' | 'REGION_CAP';
export interface ProductEligibility {
  key: string; name: string; limit: number; rate: number;
  eligible: boolean; failed: string[];
}
export interface Capacity {
  maxLoan: number;
  bindingConstraint: Constraint;
  breakdown: Record<Constraint, number>;
  debtAnnual: number;
  availAnnual: number;
  products: ProductEligibility[];
  ltvRate: number;
}
export interface Scenario { name: string; growth: number; returnMul: number; mortgageRate: number; }
export interface CrossPoint { t: number; price: number; need: number; have: number; }
export interface Crossover {
  reachable: boolean;
  monthIndex: number | null;
  targetYm: string | null;
  series: CrossPoint[];
  gap: number;
  diverging: boolean;
}
export interface Lever { id: string; name: string; desc: string; monthsSaved: number; }
export interface Milestone { code: string; name: string; pass: boolean; cond: string; }
export interface Task { t: string; why: string; due: string; }
export interface Phase { name: string; from: string; to: string; tasks: string[]; past: boolean; started: boolean; }
export interface Roadmap { ms: Milestone[]; tasks: Task[]; phases: Phase[]; anchor: string; runway: number; }
export interface RouteResult {
  score: { total: number; homeless: number; dep: number; acct: number };
  routes: { key: string; name: string; fit: number; reason: string; risk: string }[];
  newbornOk: boolean;
}
export interface Report {
  cap: Capacity;
  scenarios: { sc: Scenario; res: Crossover }[];
  cross: Crossover;
  levers: Lever[];
  route: RouteResult;
  roadmap: Roadmap;
}
