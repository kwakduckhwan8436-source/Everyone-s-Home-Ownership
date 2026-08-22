> ## ▶ 실행 방법 (중요)
>
> 이 폴더는 **소스코드**입니다. `index.html`을 그냥 더블클릭하면 실행되지 않습니다
> (브라우저가 TypeScript/JSX인 `src/main.tsx`를 바로 못 읽기 때문). 아래 중 하나로 실행하세요.
>
> ### ⚠ 블랙 화면이면 먼저 확인
> - **원본 `index.html`(맨 위 폴더)을 더블클릭하면 흰 화면이 정상입니다.** 이건 소스 진입점이에요.
> - 반드시 아래 **A(개발서버)** 또는 **B(빌드→`dist/index.html`)** 로 실행하세요.
> - 그래도 비어 있으면 브라우저에서 **F12 → Console** 의 빨간 오류를 캡처해 알려주세요(이제 오류가 화면·콘솔에 표시됩니다).

> **A. 개발 서버로 보기**
> ```bash
> npm install
> npm run dev          # http://localhost:5173 자동 열림
> ```
>
> **B. 더블클릭되는 단일 HTML 만들기 (설치·서버 없이 실행)**
> ```bash
> npm install
> npm run build        # dist/index.html 한 파일로 생성 (정책 인라인)
> ```
> 만들어진 **`dist/index.html`을 더블클릭**하면 표준 HTML판처럼 바로 실행됩니다.
> (이 단일 파일은 GitHub Pages·Render 정적 호스팅에도 그대로 올릴 수 있습니다.)
>
> **C. 빌드 미리보기 / 배포용 분할 빌드**
> ```bash
> npm run preview      # 빌드 결과를 로컬 서버로 확인
> npm run build:multi  # 자산을 분리한 일반 빌드(캐싱 유리)
> ```
>
> 더 간단히 지금 당장 더블클릭으로 쓰고 싶다면, 함께 제공된 **`모두의내집마련.html`**(표준 단일 파일판)을 열면 됩니다.


# 모두의 내집마련 (React/Vite)

언제 살 수 있나 · 못 사면 뭘 바꾸나 · 이번 달엔 뭘 하나 — 계산으로 답하는 내집마련 프로젝트 플래너.
스냅샷 계산기가 아니라 3~5년 프로젝트를 역산하는 도구입니다.

## 실행

```bash
npm install
npm run dev        # 개발 서버
npm run test       # 골든 테스트 (vitest)
npm run typecheck  # tsc --noEmit
npm run build      # 타입체크 + 프로덕션 빌드 → dist/
npm run verify:engine  # 프레임워크 독립 엔진 회귀 스모크(node 22)
```

GitHub Pages 하위경로(`/레포명/`)로 배포하면 `vite.config.ts`의 `base`를 `'/레포명/'`로 바꾸세요.

## 설계 3원칙

1. **정책은 코드가 아니라 데이터** — 모든 제도 수치는 `public/policy/2026-08.json`에만.
   공식(취득세 누진 등)은 코드, 임계값·요율·한도는 JSON. 갱신은 JSON만 교체.
   `verifiedAt`에서 90일 지나면 UI가 자동으로 "검증 필요"를 띄웁니다.
2. **숫자는 엔진, 말은 LLM** — 엔진(E1~E6)이 모든 수치를 계산하고, AI는 결과 JSON을
   한국어로 요약만. 응답에 엔진에 없는 숫자가 섞이면 `ai/guard`가 차단.
3. **3-시나리오 강제** — 보수·기본·낙관을 밴드로 항상 함께 제시.

정책 버전은 `public/policy/index.json` 매니페스트로 관리하고, 헤더의 셀렉터로
전환하면 즉시 재계산됩니다. 새 스냅샷을 추가하려면 `<버전>.json`을 넣고
매니페스트의 `versions`·`latest`만 갱신하면 됩니다.

## 구조

```
public/policy/2026-08.json   정책 데이터(SSOT, 함수 없음)
src/
  types.ts                   도메인·정책·결과 타입
  policy/loader.ts           정책 fetch + 90일 staleness
  engines/                   순수함수. ctx={policy,today} 명시 주입 → 테스트 가능
    util.ts                  pv/fv/pmt·날짜·표기
    costs.ts                 취득세(다주택 중과·일시적2주택 예외)·중개보수·부대비용
    e1_capacity.ts           LTV/DSR/지역한도 → 최소값 병목 + 정책대출 자격
    e2_growth.ts             유동 순자산 성장(전세=회수시점 자산, 브릿지 옵션)
    e3_crossover.ts          ★ 교차점 솔버 + 3시나리오 · 전세 브릿지 · 금리/상승률 곡선
    e4_levers.ts             레버 민감도(가속 레버만; 목표지연 제외)
    e5_route.ts              경로 스코어링 + 청약 가점
    e6_roadmap.ts            게이트 M0~M8 + 실행 캘린더(잔금일 역산)
    __tests__/golden.test.ts 골든 케이스
  orchestration/analyze.ts   상태 → 리포트 파이프라인
  ai/{prompts,guard,client}  A2 프롬프트·숫자 guard·프록시 호출
  state/{buildState,store}   폼→AppState, zustand 스토어(localStorage)
  ui/                        App(탭) + 7개 뷰 + CrossoverChart
```

## 엔진 핵심: 교차점 솔버

240개월에 걸쳐 두 곡선을 그립니다.
- **필요 자기자본** = 집값(상승률 g로 성장) − 최대대출 + 취득부대비용
- **가용 자기자본** = 자산 성장 + 매월 저축 누적 (전세보증금은 만기 이후에만 가산)

두 곡선이 만나는 달 = 내집마련 가능 시점. 안 만나면 정직하게 "도달 어려움" + 발산 여부 표시.

## 주의

계산 시뮬레이터이며 투자·금융·세무 자문이 아닙니다. 특히 `confidence: "low"`
항목(디딤돌·신생아 특례·청약 가점)은 출처 간 차이가 있어 계약 전 원문
(청약홈·주택도시기금·해당 금융기관)으로 반드시 재확인하세요.

## AI 해설 연결(선택)

정적 배포에선 키 노출·CORS 때문에 본인 프록시를 경유합니다. Render FastAPI 예시는
별도 제공된 `proxy_main.py` 참조. AI 탭에 `https://<서비스>.onrender.com/explain` 입력.

## CI

`.github/workflows/ci.yml` 이 push/PR마다 `typecheck · test · build`(node 20)와,
별도 잡에서 `verify:engine`(node 22, vitest 독립 회귀 스모크)을 돌립니다.
`deploy.yml` 은 main push 시 GitHub Pages로 자동 배포합니다.

## 백엔드(선택) — 실적 저장 + 리마인더

`backend/` 는 선택적 FastAPI 서비스입니다(없어도 로컬로 완전 동작).
익명 device key만으로 기기 간 실적 백업/복원과 월간 리마인더를 제공합니다.
데이터·리마인더 로직은 `storage.py`·`remind.py`(stdlib, 단독 테스트), `main.py`는 노출만.
배포·엔드포인트는 `backend/README.md` 참조. '실적 추적' 탭에서 백엔드 URL을 넣으면 동기화됩니다.

## 문제해결 — "실행이 안 돼요"

이 앱은 Vite/React라 **반드시 HTTP로 서빙**해야 합니다.
`index.html`(또는 `dist/index.html`)을 브라우저에서 **파일로 직접 열면**
ES 모듈 로딩과 정책 JSON `fetch`가 `file://`에서 차단돼 화면이 비거나
"교차점 계산"이 동작하지 않습니다.

- 개발:  `npm install && npm run dev` → http://localhost:5173
- 빌드 확인:  `npm run build && npm run preview`
- Vite 없이 빌드 서빙:  `python3 -m http.server -d dist 8080` → http://localhost:8080

정책 데이터가 로드되기 전에는 상단 배지가 "정책 로딩…"으로 표시되고
계산 버튼이 비활성화됩니다. 계속 로딩 상태면 서버로 접속했는지,
`public/policy/2026-08.json` 이 배포에 포함됐는지 확인하세요.

## 실시간 UI 전면 개편 (이 버전)

계산 버튼 없는 **실시간 2-pane** 구조로 재작성했습니다. 왼쪽 입력을 바꾸면 오른쪽 결과가 즉시 갱신됩니다.

### 추가·이식된 기능 (14종)
- **프리셋 4종** (신혼부부·사회초년생·아이 있는 3~4인·1주택 갈아타기): `src/data/presets.ts`
- **슬라이더 병행** (목표가·저축·금리·상승률): `src/ui/Field.tsx`
- **모바일 툴팁** (탭하면 뜨는 말풍선): `src/ui/Tooltip.tsx`
- **레버 미리보기 + 적용** (L1/L2/L4/L5 → 입력 반영): `src/ui/Results.tsx`
- **매입 후 월부담** (월 원리금·보유세·종부세·중도상환수수료): `src/engines/e7_afterpurchase.ts`
- **전세 → 매매 타이밍 추천** (브릿지/재계약/단기월세 최저비용): `jeonseAlign()`
- **A/B 비교 + 계획 슬롯** (localStorage): `src/ui/tabs/Compare.tsx`
- **민감도 히트맵** (저축 × 목표가): `src/engines/sensitivity.ts`, `src/ui/Heatmap.tsx`
- **곡선 드래그 편집기** (상승률·금리): `src/ui/CurveEditor.tsx`
- **실적 진행 피드백** (계획선 대비 앞섬/격려): `src/ui/tabs/Ledger.tsx`
- **정책 최신성 강화** (검증 경과일·스냅샷 안내): `src/ui/App.tsx`, `src/ui/tabs/Basis.tsx`

### 원칙 유지
- 정책 = 데이터(`public/policy/*.json`), 수식 = 코드
- 숫자는 엔진, 말은 LLM (검증기 `src/ai/guard.ts`가 없는 숫자 표시)
- 보수/기본/낙관 3-시나리오 강제
- 보유세·종부세·중도상환수수료는 **참고 근사** — 계약 전 위택스/은행 확인

### 검증
- `npm run verify:engine` → 엔진 회귀 16/16 (데모 2028-12·DSR 병목 불변 포함)
- `npm test` → vitest 골든 (e7·민감도 포함)
- 타입: strict 0오류
