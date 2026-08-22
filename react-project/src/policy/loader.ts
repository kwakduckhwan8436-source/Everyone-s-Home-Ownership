import type { Policy } from '../types.ts';
import bundled2026 from './policy-2026-08.json';

export interface PolicyManifest { versions: string[]; latest: string; }

/** 빌드에 인라인되는 기본 정책 (file:// 더블클릭·오프라인에서도 동작) */
const BUNDLED: Record<string, Policy> = { '2026-08': bundled2026 as unknown as Policy };
const DEFAULT_VER = '2026-08';
const base = () => import.meta.env.BASE_URL;
const isFile = () => typeof location !== 'undefined' && location.protocol === 'file:';

/** 사용 가능한 정책 버전 목록 */
export async function loadManifest(): Promise<PolicyManifest> {
  if (isFile()) return { versions: Object.keys(BUNDLED), latest: DEFAULT_VER };
  try {
    const res = await fetch(`${base()}policy/index.json`);
    if (!res.ok) throw new Error();
    return (await res.json()) as PolicyManifest;
  } catch {
    return { versions: Object.keys(BUNDLED), latest: DEFAULT_VER };
  }
}

/** 정책은 코드가 아니라 데이터. 서버 배포 시 public/policy/<version>.json 을 fetch,
 *  file:// 더블클릭 시 번들 인라인본을 사용. */
export async function loadPolicy(version = DEFAULT_VER): Promise<Policy> {
  if (isFile()) return BUNDLED[version] ?? BUNDLED[DEFAULT_VER];
  try {
    const res = await fetch(`${base()}policy/${version}.json`);
    if (!res.ok) throw new Error();
    return (await res.json()) as Policy;
  } catch {
    const b = BUNDLED[version] ?? BUNDLED[DEFAULT_VER];
    if (b) return b;
    throw new Error(`정책을 불러오지 못했습니다: ${version}`);
  }
}

/** verifiedAt 로부터 90일 경과 여부 */
export function isPolicyStale(policy: Policy, today = new Date()): boolean {
  const days = (today.getTime() - Date.parse(policy.verifiedAt)) / 86400000;
  return days > 90;
}
