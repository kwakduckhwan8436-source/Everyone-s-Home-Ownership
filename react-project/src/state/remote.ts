// 선택적 서버 동기화 클라이언트. 개인정보 없음 — 익명 device key(UUID)만 헤더로 전송.
import type { LedgerRow } from './store.ts';

const DKEY = 'modu_device';
export function getDeviceKey(): string {
  let k = localStorage.getItem(DKEY);
  if (!k) {
    k = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DKEY, k);
  }
  return k;
}

async function req(base: string, path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(base.replace(/\/$/, '') + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Device-Key': getDeviceKey(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

export async function pullLedger(base: string): Promise<LedgerRow[]> {
  const j = await req(base, '/ledger');
  return (j.rows ?? []) as LedgerRow[];
}
export async function pushLedger(base: string, rows: LedgerRow[]): Promise<LedgerRow[]> {
  const j = await req(base, '/ledger/bulk', { method: 'POST', body: JSON.stringify({ rows }) });
  return (j.rows ?? []) as LedgerRow[];
}
export async function pushPlan(base: string, savingMonthly: number, anchorYm: string): Promise<void> {
  await req(base, '/plan', { method: 'POST', body: JSON.stringify({ savingMonthly, anchorYm }) });
}

export interface Reminder { code: string; severity: 'info' | 'warn'; title: string; detail: string; }
export async function fetchDueReminders(base: string, todayYm: string): Promise<Reminder[]> {
  const j = await req(base, `/reminders/due?today=${encodeURIComponent(todayYm)}`);
  return (j.due ?? []) as Reminder[];
}
