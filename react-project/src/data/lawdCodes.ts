// 법정동코드(LAWD_CD, 시군구 앞 5자리) — 서울 25개 자치구
// 출처: 행정안전부 행정표준코드관리시스템(code.go.kr) 시도시군구코드 / 2026-07-01 시군구 행정코드 (교차 확인, 추측 없음).
// 그 외 지역은 code.go.kr '법정동코드 전체자료'에서 확인해 직접 입력하세요.
export const SEOUL_LAWD: { name: string; code: string }[] = [
  { name: '종로구', code: '11110' }, { name: '중구', code: '11140' }, { name: '용산구', code: '11170' },
  { name: '성동구', code: '11200' }, { name: '광진구', code: '11215' }, { name: '동대문구', code: '11230' },
  { name: '중랑구', code: '11260' }, { name: '성북구', code: '11290' }, { name: '강북구', code: '11305' },
  { name: '도봉구', code: '11320' }, { name: '노원구', code: '11350' }, { name: '은평구', code: '11380' },
  { name: '서대문구', code: '11410' }, { name: '마포구', code: '11440' }, { name: '양천구', code: '11470' },
  { name: '강서구', code: '11500' }, { name: '구로구', code: '11530' }, { name: '금천구', code: '11545' },
  { name: '영등포구', code: '11560' }, { name: '동작구', code: '11590' }, { name: '관악구', code: '11620' },
  { name: '서초구', code: '11650' }, { name: '강남구', code: '11680' }, { name: '송파구', code: '11710' },
  { name: '강동구', code: '11740' },
];

// 전국 주요 시군구 (출처: 행정안전부 시도시군구코드 xls, moe.go.kr 교차확인 — 추측 없음)
// 그 외/누락 지역은 code.go.kr '법정동코드 전체자료'에서 확인해 직접 입력하세요.
export const LAWD_GROUPS: { sido: string; items: { name: string; code: string }[] }[] = [
  { sido: '서울', items: SEOUL_LAWD },
  { sido: '인천', items: [
    { name: '계양구', code: '28245' }, { name: '부평구', code: '28237' }, { name: '남동구', code: '28200' },
    { name: '연수구', code: '28185' }, { name: '미추홀구', code: '28177' }, { name: '강화군', code: '28710' },
  ]},
  { sido: '대전', items: [
    { name: '동구', code: '30110' }, { name: '서구', code: '30170' }, { name: '대덕구', code: '30230' },
    { name: '유성구', code: '30200' }, { name: '중구', code: '30140' },
  ]},
  { sido: '울산', items: [
    { name: '남구', code: '31140' }, { name: '북구', code: '31200' }, { name: '울주군', code: '31710' },
    { name: '동구', code: '31170' }, { name: '중구', code: '31110' },
  ]},
  { sido: '세종', items: [ { name: '세종시', code: '36110' } ]},
  { sido: '경기(일부)', items: [
    { name: '광명시', code: '41210' }, { name: '의왕시', code: '41430' }, { name: '수원 영통구', code: '41117' },
    { name: '용인 기흥구', code: '41463' }, { name: '고양 일산서구', code: '41287' }, { name: '안산 단원구', code: '41273' },
    { name: '광주시', code: '41610' }, { name: '김포시', code: '41570' }, { name: '파주시', code: '41480' },
    { name: '양주시', code: '41630' }, { name: '동두천시', code: '41250' }, { name: '여주시', code: '41670' },
    { name: '포천시', code: '41650' }, { name: '안성시', code: '41550' }, { name: '가평군', code: '41820' },
    { name: '연천군', code: '41800' }, { name: '양평군', code: '41830' },
  ]},
];
