# 모두의 내집마련 — 배포 가이드

두 조각으로 구성됩니다.

1. **정적 웹앱** (`모두의내집마련.html`) — 단일 파일. 계산 엔진·차트·로드맵·실적추적이 전부 브라우저에서 돕니다. 서버 없이 GitHub Pages로 배포.
2. **AI 프록시** (`proxy_main.py`) — 선택 사항. AI 해설 탭을 실제로 켜려면 필요. Anthropic 키를 브라우저에 노출하지 않기 위한 얇은 서버.

앱은 프록시 없이도 **AI 해설을 뺀 모든 기능이 완전 동작**합니다. 프록시는 나중에 붙여도 됩니다.

---

## 1) 정적 웹앱 — GitHub Pages

```
1. 새 레포 생성 (예: modu-house)
2. 모두의내집마련.html 을 index.html 로 이름 바꿔 커밋
   (또는 그대로 두고 URL 뒤에 /모두의내집마련.html)
3. Settings → Pages → Source: main 브랜치 / root
4. 몇 분 뒤  https://<아이디>.github.io/modu-house/  접속
```

- 외부 라이브러리·CDN 의존성 0. 오프라인에서도 열립니다.
- 입력값·실적 기록은 브라우저 localStorage에만 저장 (서버 전송 없음).
- 계획 공유는 `JSON 내보내기`로 파일 전달.

## 2) AI 프록시 — Render

```
1. proxy_main.py 를 main.py 로,
   proxy_requirements.txt 를 requirements.txt 로 이름 변경 후 레포에 추가
2. Render → New → Web Service → 레포 연결
3. Environment:
     ANTHROPIC_API_KEY = sk-ant-...        (필수)
     MODEL             = claude-haiku-4-5-20251001   (선택)
     ALLOW_ORIGIN      = https://<아이디>.github.io   (선택, 기본 *)
4. Start Command:
     uvicorn main:app --host 0.0.0.0 --port $PORT
5. 배포된 주소 확인:  https://<서비스>.onrender.com
6. 웹앱 'AI 해설' 탭 → 엔드포인트 URL 칸에
     https://<서비스>.onrender.com/explain   입력 → 해설 생성
```

### 프록시가 하는 일
- 프론트가 보낸 `{system, data}`를 받아 Anthropic 호출, **해설 텍스트만** 반환.
- `data`(엔진 결과 JSON)에 있는 숫자만 허용 목록으로 두고, 응답에 없는 숫자가 섞이면 `flagged`로 표시 → 환각 숫자 차단. (프론트에서도 한 번 더 검증)
- 키는 서버 환경변수에만. 브라우저로 내려가지 않음.

---

## 파일 목록

| 파일 | 역할 | 배포처 |
|------|------|--------|
| `모두의내집마련.html` | 본체(엔진+UI+차트+로드맵+실적) | GitHub Pages |
| `proxy_main.py` | AI 해설 프록시 (FastAPI) | Render |
| `proxy_requirements.txt` | 프록시 의존성 | Render |
| `HomeRoad_설계서.md` | 아키텍처·엔진 명세·빌드 프롬프트 | 문서 |

---

## 정책 수치 갱신 (중요)

계산에 쓰이는 정책값은 HTML 상단 `POLICY` 객체 한 곳에 모여 있습니다.
매년/분기 바뀌므로 여기만 갈아끼우면 됩니다. 특히 `confidence:"low"` 항목
(디딤돌·신생아 특례·청약 가점 배점)은 계약 전 아래 원문으로 재확인하세요.

- 청약 자격·가점·특별공급 → applyhome.co.kr
- 정책대출(디딤돌·신생아·보금자리) → nhuf.molit.go.kr
- LTV·DSR·스트레스금리 → 금융위·금감원 보도자료
- 취득세·감면 → 위택스 / 관할 시군구

`verifiedAt`을 갱신일로 바꾸면, 90일이 지날 때 앱 상단에 "정책 검증 필요"
배지와 정책 탭 경고가 자동으로 뜹니다.

---

## 다음 단계 (P2 이후)

- **엔진 모듈 분리**: HTML 안의 순수함수(POLICY, E1~E6)를 그대로 `src/engines/*.ts`로 들어내 React/Vite 프로젝트로 이관. 로직은 검증돼 있어 그대로 옮기면 됩니다.
- **정책 JSON 외부화**: `POLICY`를 `public/policy/2026-08.json`으로 빼서 코드 없이 갱신.
- **계정·알림**: 실적 추적을 서버에 저장하고 월간 리마인더(P3).
