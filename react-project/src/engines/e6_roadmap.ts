import type { AppState, Ctx, Capacity, Crossover, Lever, Roadmap, Phase } from '../types.ts';
import { addMonths, monthsBetween, eok } from './util.ts';

const PHASE_DEFS = [
  { name: '축적기', a: -36, b: -18, tasks: [
    '청약통장 월 인정한도까지 자동이체 설정',
    '무주택 기간 유지 — 소형주택 매수 유혹 차단',
    '고금리 신용대출·카드론 우선 상환(DSR 회복)',
    '신용점수 관리(카드 사용률 30%↓, 연체 0)',
    '목표지역 3곳 후보 유지, 월 1회 시세 기록'] },
  { name: '압축기', a: -18, b: -9, tasks: [
    '후보 단지 5개 → 2개로 압축',
    '임장: 주중 저녁 1회 + 주말 1회 (같은 단지 2회)',
    '실거래가 12개월 추이 직접 기록(호가 아님)',
    '학군·교통·개발계획·입주물량 체크',
    '정책대출 자격 시뮬 → 부족분 정비 착수'] },
  { name: '준비기', a: -9, b: -4, tasks: [
    '은행 2~3곳 대출 사전상담(한도·금리 서면 확인)',
    '소득증빙 서류 세팅(원천징수·소득금액증명원)',
    '청약 시: 모집공고 알림 등록 · 서류 사전 준비',
    '계약금(주택가 10%) 현금 확보 완료',
    '★ 전세 만기·퇴거 일정과 잔금일 정렬'] },
  { name: '실행기', a: -4, b: 0, tasks: [
    '매물 최종 3개 → 1개, 가격 협상',
    '등기부등본 열람(갑구 소유자·가압류 / 을구 근저당)',
    '★ 계약: 계약금 10% + 대출 미승인 시 반환 특약',
    '확정일자 · 실거래 신고(30일 내)',
    '대출 정식 접수 → 심사 → 승인',
    '잔금 전 등기부 재열람(신규 근저당 확인)',
    '잔금 + 소유권이전등기(법무사 동석)'] },
  { name: '정착기', a: 0, b: 3, tasks: [
    '취득세 신고·납부(취득일 60일 내)',
    '전입신고',
    '생애최초/신생아 취득세 감면 신청',
    '대출 상환 스케줄 등록 · 중도상환 계획',
    '연말정산: 장기주택저당차입금 이자상환액 공제'] },
];

export function buildPhases(D: string, today: string): Phase[] {
  return PHASE_DEFS.map(p => {
    const rawFrom = addMonths(D, p.a), to = addMonths(D, p.b);
    const past = monthsBetween(today, to) < 0;
    const started = monthsBetween(today, rawFrom) < 0 && !past;
    return { name: p.name, from: (started || past) ? today : rawFrom, to, tasks: p.tasks, past, started };
  });
}

/** E6 — 로드맵 · 게이트 · 태스크 · 실행 캘린더 */
export function roadmap(
  state: AppState,
  analysis: { cap: Capacity; cross: Crossover; levers: Lever[] },
  ctx: Ctx,
): Roadmap {
  const { cap, cross, levers } = analysis;
  const reach = cross.reachable;
  const acctYears = monthsBetween(state.acctOpen, ctx.today) / 12;
  const hasEligible = cap.products.some(p => p.eligible);

  const ms = [
    { code: 'M0', name: '진단 완료', pass: true, cond: '필수 입력 완료 · 순자산 산출됨' },
    { code: 'M1', name: '목표 확정', pass: !!state.target.priceNow, cond: '목표지역·가격·시점 확정, 교차점 계산됨' },
    { code: 'M2', name: '자금계획 확정', pass: reach, cond: reach ? '기본 시나리오 도달 가능' : '미도달 — 레버 조정 필요' },
    { code: 'M3', name: '자격 정비', pass: acctYears >= 2 && hasEligible, cond: hasEligible ? '통장 요건 충족 · 정책대출 자격 확보' : '정책대출 자격 미충족 → 부채/자산 정비' },
    { code: 'M4', name: '경로 확정', pass: false, cond: '주경로·보조경로 선택 (E5 참조)' },
    { code: 'M5', name: '시장 진입', pass: false, cond: `가용현금 ≥ 계약금(${eok(state.target.priceNow * 0.1)}) + 예비비` },
    { code: 'M6', name: '계약 체결', pass: false, cond: '대출 사전심사 통과 후 계약 (미승인 시 반환 특약)' },
    { code: 'M7', name: '자금 조달', pass: false, cond: '대출 승인액 ≥ 잔금 부족분' },
    { code: 'M8', name: '등기·입주', pass: false, cond: '소유권이전등기 · 취득세 신고(60일 내)' },
  ];

  const tasks = [];
  if (!reach && levers[0]) tasks.push({ t: `${levers[0].name} 검토`, why: `이 조정만으로 도달 시점이 <b>${levers[0].monthsSaved}개월</b> 당겨집니다`, due: ctx.today });
  if (state.debts.length > 0) {
    const L4 = levers.find(l => l.id === 'L4');
    tasks.push({ t: '고금리 신용대출 상환 계획 수립', why: L4 ? `DSR 여력 회복으로 <b>${L4.monthsSaved}개월</b> 단축 효과` : 'DSR 여력 회복 → 주담대 한도 증가', due: addMonths(ctx.today, 1) });
  }
  tasks.push({ t: '청약통장 월 인정한도까지 자동이체 설정', why: '가점·순위 유지의 기본. 매달 최소액이라도 지속', due: ctx.today });
  tasks.push({ t: '목표지역 후보 3곳 시세 월 1회 기록', why: '호가 아닌 <b>실거래가</b> 12개월 추이를 직접 축적', due: ctx.today });
  if (cap.products.some(p => !p.eligible && p.failed.some(f => f.includes('순자산'))))
    tasks.push({ t: '순자산 요건 정비(부채 상환 등)', why: '정책대출 자격 회복 시 금리·한도 크게 개선', due: addMonths(ctx.today, 2) });

  const anchor = reach ? cross.targetYm! : (state.target.targetDate || addMonths(ctx.today, 36));
  return { ms, tasks: tasks.slice(0, 5), phases: buildPhases(anchor, ctx.today), anchor, runway: monthsBetween(ctx.today, anchor) };
}
