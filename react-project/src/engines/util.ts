// 금융 계산 primitives + 날짜 유틸 (전부 순수함수)

/** 연금 현가계수: 월납입 P, 월금리 r, n개월 → 대출가능원금 (PMT 역산) */
export const pvAnnuity = (P: number, r: number, n: number): number =>
  r === 0 ? P * n : (P * (1 - Math.pow(1 + r, -n))) / r;

/** 연금 종가계수: 매월 C 적립, 월금리 r, n개월 → 미래가치 */
export const fvAnnuity = (C: number, r: number, n: number): number =>
  r === 0 ? C * n : (C * (Math.pow(1 + r, n) - 1)) / r;

/** 원리금균등 월상환액 */
export const pmt = (bal: number, r: number, n: number): number =>
  r === 0 ? bal / n : (bal * r) / (1 - Math.pow(1 + r, -n));

/** 두 'YYYY-MM' 간 개월 차 (to - from) */
export function monthsBetween(from: string, to: string): number {
  const [a, b] = from.split('-').map(Number);
  const [c, d] = to.split('-').map(Number);
  return (c - a) * 12 + (d - b);
}

/** 'YYYY-MM' 에 m개월 더하기 */
export function addMonths(ym: string, m: number): string {
  let [y, mo] = ym.split('-').map(Number);
  mo += m;
  y += Math.floor((mo - 1) / 12);
  mo = ((mo - 1) % 12 + 12) % 12 + 1;
  return `${y}-${String(mo).padStart(2, '0')}`;
}

export const nowYM = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** 만원 → 사람친화 표기 */
export function eok(v: number): string {
  const e = v / 10000;
  return Math.abs(e) >= 1
    ? e.toFixed(e >= 10 ? 0 : 1) + '억'
    : Math.round(v).toLocaleString('ko-KR') + '만';
}
export const won = (v: number): string => Math.round(v).toLocaleString('ko-KR');
