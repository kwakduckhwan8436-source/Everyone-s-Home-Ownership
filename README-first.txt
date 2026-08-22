모두의 내집마련 — 전체 파일 (파일명은 호환성을 위해 영문)

[바로 실행 — 설치 불필요]
  app-react-online.html      더블클릭 실행. React 정식판. ★인터넷 필요(React를 CDN에서 로드)
  app-standalone-offline.html  더블클릭 실행. 표준 단일 파일판. 인터넷 없이도 동작.
  → 둘 다 같은 14개 기능(프리셋·슬라이더·히트맵·A/B비교·곡선편집·매입후비용 등)

[정식 개발·배포]
  react-project/   React + Vite + TypeScript 소스
     cd react-project
     npm install
     npm run dev        (개발 서버 http://localhost:5173)
     npm run build      (dist/index.html 단일 HTML 생성 — 더블클릭·배포 모두 가능)
     npm run verify:engine   (엔진 회귀 16/16)
     npm test           (vitest)
   주의: react-project/index.html 을 그냥 더블클릭하면 흰 화면이 정상입니다(소스 진입점).
        반드시 dev 서버나 build 후 dist/index.html 을 여세요.

[선택]
  ai-proxy/        '근거·해설' 탭의 AI 해설용 프록시(Render 등에 배포)
  docs/            설계서·배포가이드

[주의]
  본 도구는 계산 시뮬레이터이며 금융·법률·세무 자문이 아닙니다.
  대출·세제·청약 수치는 계약 전 원문(청약홈·주택도시기금·위택스·금융기관) 확인 필요.
