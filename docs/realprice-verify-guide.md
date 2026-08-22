# 실거래가 백엔드(B2/B3) 실호출 검증 가이드

> 이 환경은 네트워크가 차단돼 실제 API 호출을 검증할 수 없습니다.
> 아래 순서대로 **본인 무료 인증키 + 백엔드 실행**으로 직접 확인하세요.

## 1) 무료 인증키 발급 (약 5분)
1. data.go.kr 로그인 → '국토교통부_아파트 매매 실거래가 자료'(dataset 15126469) → **활용신청(자동승인)**
2. 마이페이지 > 오픈API > **일반 인증키(Decoding)** 복사 (발급 후 사용까지 최대 1시간)

## 2) 백엔드(ai-proxy) 실행
```bash
cd ai-proxy
pip install -r requirements.txt
export MOLIT_SERVICE_KEY="<Decoding 인증키>"
uvicorn main:app --host 0.0.0.0 --port 8000
```
헬스체크: `curl http://localhost:8000/`  → `{"ok":true,...,"realprice":true}` 이면 키 인식됨.

## 3) B2 단일월 조회 검증
```bash
curl "http://localhost:8000/realprice?lawd_cd=11110&deal_ymd=202607"
```
기대: `{"count":N,"avgMan":..., "deals":[{apt,amountMan,areaM2,floor,buildYear,dong,date}, ...]}`
- count가 0이면 그 달 신고가 없는 것 → 다른 deal_ymd로 재시도.
- 401/사용불가 → 키 오류/미승인, 잠시 후(최대 1시간) 재시도.

## 4) B3 최근 3개월 평균 검증
```bash
curl "http://localhost:8000/realprice_avg?lawd_cd=11110&months=3"
```
기대: `{"months":3,"baseYmd":"YYYYMM","count":N,"avgMan":...,"perMonth":[{ym,count,avgMan}x3]}`
- baseYmd가 '지난달'부터 시작하는지 확인(신고지연 감안).

## 5) 프론트(React 온라인판) 연결
- '🧮 계산기' → '실거래가 자동조회' 카드에서 **ai-proxy 주소**(예: http://localhost:8000)를 넣고
- 지역 선택(서울 25구 + 인천·대전·울산·세종·경기 일부 검증값) 또는 **법정동코드 직접 입력**
- '실거래가 불러오기' / '최근 3개월 평균으로 목표가 제안' 동작 확인
- CORS 오류 시: ai-proxy의 `ALLOW_ORIGIN` 환경변수에 프론트 주소 지정.

## 6) 지역코드 범위
- 포함(검증): 서울 25구 전체, 인천 6, 대전 5, 울산 5, 세종 1, 경기 일부 17.
- 그 외/누락: code.go.kr '법정동코드 전체자료' 다운로드 후 `src/data/lawdCodes.ts`에 추가(추측 금지, 원본 사용).

## 체크리스트
- [ ] `/` 헬스체크 realprice:true
- [ ] `/realprice` 단일월 정상(거래목록)
- [ ] `/realprice_avg` 3개월 평균 정상
- [ ] 프론트에서 목표가 반영/제안 적용 동작
- [ ] 서울 외 지역(예: 인천 부평 28237) 조회 확인

## 면적대(전용㎡) 필터 (추가)
- `/realprice`·`/realprice_avg`에 `area_min`·`area_max`(전용면적 ㎡) 파라미터 지원.
  - 예: `curl "http://localhost:8000/realprice_avg?lawd_cd=11110&months=3&area_min=60&area_max=85"` (중소형 60~85㎡).
  - min만 지정=이상, max만 지정=미만, 둘 다 0=전체.
- 프론트 "면적대" 선택(전체/소형~60/중소형60~85/중대형85~135/대형135~)이 조회·평균·지역비교에 함께 적용됩니다.

## 중앙값(medianMan) 추가
- `/realprice`·`/realprice_avg` 응답에 `medianMan`(중앙값, 만원) 포함.
- 평균은 초고가·초저가 거래에 흔들리므로, 프론트는 **중앙값을 기본 제안값**으로 사용합니다.
- 지역 비교 표도 **중앙값 기준**으로 최저/최고를 강조합니다.

## 거래 분포(사분위) 추가
- `/realprice`·`/realprice_avg` 응답에 `minMan`·`maxMan`·`p25Man`·`p75Man` 포함(만원).
- 프론트는 **분포 바**(최저~최고, 중간 50% 구간 P25~P75, 중앙값 마커)로 편차를 시각화합니다.

## 이상치(IQR) 안내 추가
- 응답에 `outlierLow`·`outlierHigh`·`outlierCount`·`fenceLowMan`·`fenceHighMan` 포함.
- 기준: P25-1.5×IQR 미만(초저가) / P75+1.5×IQR 초과(초고가). 프론트는 "이상치 N건(%)"로 안내하고 중앙값 사용을 권장합니다.

## 월별 평당 추이 · CSV 내보내기 (추가)
- `/realprice_avg`의 `perMonth[]`에 `pyeongMan`(월별 평당 중앙값) 포함 → 프론트 추이 그래프에서 평균/평당 전환 가능.
- 단일월 조회 결과에 **⬇ CSV** 버튼(아파트·거래가·전용㎡·평·평당·층·계약일, UTF-8 BOM). 오프라인 동작.

## 단지명·층수 필터 (추가)
- `/realprice`·`/realprice_avg`에 `apt_query`(단지명 부분일치)·`floor_min`·`floor_max`(층수) 지원.
  - 예: `...&apt_query=래미안&floor_min=16` (래미안·16층 이상).
- 프론트: 단지명 입력 + 층수(저 1~5/중 6~15/고 16~) 선택이 조회·평균·비교에 함께 적용.
