import { create } from 'zustand';
import type { AppState, Ctx, Policy, Report } from '../types.ts';
import { analyze } from '../orchestration/analyze.ts';
import { buildAppState, DEFAULT_FORM, type FormRaw } from './buildState.ts';
import { nowYM } from '../engines/util.ts';

export interface LedgerRow { ym: string; saved: number; nw: number }
export interface PlanSlot { name: string; raw: FormRaw }

const LS = {
  form: 'modu_form_v3', ledger: 'modu_ledger_v3', plans: 'modu_plans_v3',
  load<T>(k: string, fb: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fb; } catch { return fb; } },
  save(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};

function compute(formRaw: FormRaw, policy: Policy | null): { state: AppState | null; report: Report | null } {
  if (!policy) return { state: null, report: null };
  const ctx: Ctx = { policy, today: nowYM() };
  const state = buildAppState(formRaw, ctx);
  return { state, report: analyze(state, ctx) };
}

interface StoreState {
  formRaw: FormRaw;
  policy: Policy | null;
  report: Report | null;
  state: AppState | null;
  ledger: LedgerRow[];
  plans: PlanSlot[];
  setField: (id: string, val: string | boolean) => void;
  applyRaw: (raw: Partial<FormRaw>) => void;
  setPolicy: (p: Policy) => void;
  addLedger: (row: LedgerRow) => void;
  delLedger: (ym: string) => void;
  savePlan: (name: string) => void;
  delPlan: (i: number) => void;
  loadPlan: (i: number) => void;
}

function initialForm(): FormRaw {
  try {
    const h = typeof location !== 'undefined' ? location.hash : '';
    if (h.indexOf('#p=') === 0) return { ...DEFAULT_FORM, ...JSON.parse(decodeURIComponent(escape(atob(h.slice(3))))) } as FormRaw;
  } catch { /* ignore */ }
  return LS.load(LS.form, DEFAULT_FORM);
}
export const useStore = create<StoreState>((set) => ({
  formRaw: initialForm(),
  policy: null,
  report: null,
  state: null,
  ledger: LS.load<LedgerRow[]>(LS.ledger, []),
  plans: LS.load<PlanSlot[]>(LS.plans, []),

  setField: (id, val) => set(s => { const formRaw = { ...s.formRaw, [id]: val }; LS.save(LS.form, formRaw); return { formRaw, ...compute(formRaw, s.policy) }; }),
  applyRaw: (raw) => set(s => { const formRaw = { ...s.formRaw, ...raw } as FormRaw; LS.save(LS.form, formRaw); return { formRaw, ...compute(formRaw, s.policy) }; }),
  setPolicy: (policy) => set(s => ({ policy, ...compute(s.formRaw, policy) })),

  addLedger: (row) => set(s => { const ledger = [...s.ledger.filter(r => r.ym !== row.ym), row].sort((a, b) => a.ym.localeCompare(b.ym)); LS.save(LS.ledger, ledger); return { ledger }; }),
  delLedger: (ym) => set(s => { const ledger = s.ledger.filter(r => r.ym !== ym); LS.save(LS.ledger, ledger); return { ledger }; }),

  savePlan: (name) => set(s => { const plans = [...s.plans, { name, raw: s.formRaw }]; LS.save(LS.plans, plans); return { plans }; }),
  delPlan: (i) => set(s => { const plans = s.plans.filter((_, idx) => idx !== i); LS.save(LS.plans, plans); return { plans }; }),
  loadPlan: (i) => set(s => { const p = s.plans[i]; if (!p) return {}; const formRaw = { ...p.raw }; LS.save(LS.form, formRaw); return { formRaw, ...compute(formRaw, s.policy) }; }),
}));

/** raw로부터 즉석 분석 (A/B 비교·프리셋 미리보기용, store 미변경) */
export function analyzeRaw(formRaw: FormRaw, policy: Policy): Report {
  const ctx: Ctx = { policy, today: nowYM() };
  return analyze(buildAppState(formRaw, ctx), ctx);
}
