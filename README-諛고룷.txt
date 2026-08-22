============================================================
 모두의 내집마련 — 최적화 업데이트 (배포 안내)
============================================================
포함 기능(이번 반영): 회원 접속키 게이트 + 등급 · 로그아웃(🔒) · 
고유 방문자 통계(새로고침 중복 제외) · 프록시가 앱 화면도 서빙 · 
계산기 병목 제거(크로스오버 54→16, 240ms 디바운스) · 실거래가 자동조회

------------------------------------------------------------
[A] 웹서비스(프록시) 하나로 앱+API 다 쓰기  ← 권장
------------------------------------------------------------
1) GitHub의 ai-proxy 폴더에 아래 4개를 넣기(덮어쓰기):
     main.py  requirements.txt  index.html  app-standalone-offline.html
2) Render → 그 Web Service → Settings → Build & Deploy:
     Root Directory : ai-proxy
     Build Command  : pip install -r requirements.txt
     Start Command  : uvicorn main:app --host 0.0.0.0 --port $PORT
        ※ 'ai-proxy.main' 처럼 쓰면 하이픈 때문에 ModuleNotFoundError 납니다.
          반드시 Root Directory=ai-proxy + 'uvicorn main:app' 형태로!
3) Environment 변수:
     MOLIT_SERVICE_KEY = (공공데이터포털 실거래가 무료 Decoding 키)
     ACCESS_KEYS       = VIP2026:premium,NORMAL2026:basic  (원하는 코드)
     ANTHROPIC_API_KEY = (AI 해설 쓸 때만, 선택)
     ALLOW_ORIGIN      = *  또는 앱 주소
4) Manual Deploy → Deploy latest commit
5) 로그에 'Uvicorn running' 뜨면 성공 → 주소 열면 앱 화면.
     상태점검: 주소/health  (JSON)

------------------------------------------------------------
[B] 앱을 정적 사이트로 (API는 프록시 별도)
------------------------------------------------------------
- index.html 을 Static Site 로 배포 (파일명 반드시 index.html)
- 앱 첫 화면에서 서버 주소에 프록시 주소 입력 → 접속 코드 입력

------------------------------------------------------------
문제 해결
------------------------------------------------------------
- 화면이 안 바뀜 → 브라우저 Ctrl+F5 (캐시)
- '{"appReady":false,...}' → ai-proxy 폴더에 index.html 이 없음 → 넣기
- 'No module named ai-proxy' → Start Command를 uvicorn main:app 로 (위 2번)
- 로그아웃: 헤더 🔒 버튼 → 다음 접속 때 코드 재입력
- 통계는 인메모리라 서버 재시작 시 0으로 초기화(영구보관은 DB 필요)
