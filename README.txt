================= 모두의 내집마련 — 전체 파일 =================
[최신 상태] 심플·고급 디자인 리프레시 반영 (여백↑·노이즈↓·클릭영역↑, 배경/강조색 유지)

■ 앱 본체
  · index-react.html          ← 실배포 메인(React판, 최신 기능 전부)
  · 모두의내집마련-표준앱.html   ← 오프라인 자기완결형(표준판, 청약·대출 병합)
  · index.html                ← 표준앱과 동일(정적 호스팅용 메인 이름)

■ 배포용 ai-proxy/ (웹서비스)
  · main.py, requirements.txt
  · index.html, app-standalone-offline.html  ← 프록시가 / 에서 앱 서빙

■ docs/  참고 문서

────────── 배포(프록시 웹서비스) ──────────
 1) ai-proxy 폴더 4개를 저장소 ai-proxy 에 덮어쓰기 → 커밋
 2) Render Settings:
      Root Directory : ai-proxy
      Build Command  : pip install -r requirements.txt
      Start Command  : uvicorn main:app --host 0.0.0.0 --port $PORT
 3) Environment:
      MOLIT_SERVICE_KEY = data.go.kr 실거래가 무료 Decoding 키
      ACCESS_KEYS       = 코드:등급  (예: VIP2026:premium,NORMAL2026:basic)
      ANTHROPIC_API_KEY = (AI 해설 쓸 때만, 선택)
 4) Manual Deploy → 로그 'Uvicorn running' → 주소에서 Ctrl+F5

문제시: 주소/health 로 상태 JSON 확인. '{"appReady":false}'면 ai-proxy에 index.html 확인.
=============================================================
