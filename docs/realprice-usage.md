# 실거래가 자동조회 사용법 (B-2 · 무료 API)

## 0) 무료 여부
공공데이터포털 '국토교통부_아파트 매매 실거래가 자료'는 **무료**입니다(이용범위 제한 없음).
일일 호출 기본 1,000회(개발계정 최대 10,000). 회원가입 후 인증키만 발급하면 됩니다.

## 1) 무료 인증키 발급
1. data.go.kr 로그인 → '국토교통부_아파트 매매 실거래가 자료'(dataset 15126469) 검색
2. [활용신청] (자동승인) → 마이페이지 > 오픈API > 인증키(Decoding 키) 확인 (발급 후 사용까지 최대 1시간)

## 2) 서버(ai-proxy) 실행
```
export MOLIT_SERVICE_KEY="<발급받은 Decoding 인증키>"
uvicorn main:app --host 0.0.0.0 --port 8000
```
확인: `GET http://localhost:8000/`  → `{"ok":true,...,"realprice":true}`

## 3) 실거래가 조회
```
GET /realprice?lawd_cd=11110&deal_ymd=202608
```
- lawd_cd: 법정동코드 앞 5자리 (예 11110 = 서울 종로구)
  · 전체 코드: 행정표준코드관리시스템 code.go.kr → '법정동코드 전체자료' 다운로드 (추측 금지, 원본 사용)
- deal_ymd: 계약년월 YYYYMM
응답 예:
```
{ "count": 37, "avgMan": 112500,
  "deals": [ { "apt":"OO아파트", "amountMan":125000, "areaM2":"84.99",
               "floor":"10", "buildYear":"2008", "dong":"청운동", "date":"2026-08-05" }, ... ] }
```

## 4) 프론트 연동 스니펫 (React 온라인판 · 붙여넣기용)
목표가(priceNow)에 평균 실거래가를 반영하는 최소 예시:
```tsx
const PROXY = "https://<본인-render-서비스>.onrender.com"; // ai-proxy 주소
const [lawd, setLawd] = useState("11110");
const [ym, setYm] = useState(nowYM().replace("-", ""));
const [rp, setRp] = useState<any>(null);
const load = async () => {
  try {
    const r = await fetch(`${PROXY}/realprice?lawd_cd=${lawd}&deal_ymd=${ym}`);
    if (!r.ok) throw new Error(await r.text());
    setRp(await r.json());
  } catch (e) { setRp({ error: String(e) }); }
};
// setField("target.priceNow", rp.avgMan) 로 목표가에 반영
```
> 주의: 브라우저 직접 호출은 CORS로 막히므로 반드시 이 프록시(서버) 경유. 인증키는 서버에만.

## 상태
- [x] 백엔드 /realprice 구현 (검증된 무료 API 사양, py_compile 통과)
- [x] 프론트 UI: react-project/src/ui/tabs/Tools.tsx에 "실거래가 자동조회" 카드 추가 (ai-proxy 주소·구 선택·계약년월·조회·목표가 반영)
- [x] 법정동코드: 서울 25개 자치구 검증값 포함 (src/data/lawdCodes.ts). 그 외 지역은 code.go.kr에서 직접 입력
- [ ] 단일 HTML(React CDN) 재번들: 커스텀 번들러가 샌드박스 초기화로 유실 → npm run build로 생성하거나 다음 턴에 번들러 재구성
- [ ] 경기 등 전국 법정동코드 매핑표 확장 (code.go.kr 원본)
