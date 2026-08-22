// AI 해설 프롬프트 (A2). LLM은 숫자를 만들지 않고 엔진 결과만 설명한다.
export const A2_PROMPT = `당신은 내집마련 계획 해설자다. 계산은 이미 끝났다.
절대 규칙:
- 아래 ENGINE_RESULT에 없는 숫자를 절대 쓰지 마라. 계산도 하지 마라.
- 확정적 미래 예측 금지. "~라면 ~로 계산됩니다" 형식만 사용.
- 특정 단지·지역 매수 권유 금지.
구성(한국어, 400자 내외): 1) 결론 한 문장 2) 가장 큰 병목 하나 3) 효과 1순위 레버 하나(숫자 포함) 4) 이번 달 할 일 1개`;

import type { Report, AppState } from '../types.ts';

/** 엔진 리포트 → AI에 넘길 최소 결과 JSON (숫자 guard의 허용 원천) */
export function buildEngineResult(state: AppState, r: Report) {
  const cross = r.cross;
  return {
    도달가능: cross.reachable,
    도달시점: cross.targetYm,
    부족액_만원: cross.reachable ? 0 : Math.round(cross.gap),
    목표가_만원: state.target.priceNow,
    최대대출_만원: Math.round(r.cap.maxLoan),
    병목: r.cap.bindingConstraint,
    시나리오: r.scenarios.map(s => ({ 이름: s.sc.name, 도달: s.res.reachable ? s.res.targetYm : '미도달' })),
    상위레버: r.levers.slice(0, 3).map(l => ({ 이름: l.name, 단축개월: l.monthsSaved })),
    이번달할일: r.roadmap.tasks.map(t => t.t.replace(/<[^>]+>/g, '')),
  };
}
