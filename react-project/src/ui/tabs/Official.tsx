export function Official() {
  return <>
    <div className="lead-note">여기서 <b>실제로</b> 서류를 떼고, 금리를 비교하세요. 전부 정부·공공 <b>공식</b> 사이트이며, 사설 대행은 피하는 게 안전합니다.</div>
    <div className="card"><div className="ch"><span className="n">📄</span><h3>부동산 서류 발급</h3></div>
      <p className="tiny muted" style={{ margin: '-4px 0 12px' }}>집 보러 가기 전·계약 전에 꼭 확인할 서류예요. 클릭하면 공식 사이트로 이동합니다.</p>
      <div className="link-list">
        <a className="olink" href="https://www.iros.go.kr" target="_blank" rel="noopener noreferrer"><b>등기사항전부증명서 <span className="tiny muted">(등기부등본)</span></b><span>대법원 인터넷등기소 · 진짜 주인이 누구인지, 빚(근저당)이 얼마인지 확인</span></a>
        <a className="olink" href="https://www.gov.kr" target="_blank" rel="noopener noreferrer"><b>건축물대장 · 토지대장 · 토지이용계획</b><span>정부24 · 면적·용도·불법건축 여부·규제 확인</span></a>
        <a className="olink" href="https://www.kras.go.kr" target="_blank" rel="noopener noreferrer"><b>부동산종합증명서 <span className="tiny muted">(한 장 통합)</span></b><span>일사편리 · 토지+건물+지적+공시가격을 한 번에</span></a>
        <a className="olink" href="https://rt.molit.go.kr" target="_blank" rel="noopener noreferrer"><b>실거래가 조회</b><span>국토교통부 · 부르는 값(호가)이 아닌 실제 팔린 가격</span></a>
      </div></div>
    <div className="card" style={{ marginTop: 16 }}><div className="ch"><span className="n">🏦</span><h3>대출 금리 — "어디가 가장 싼지" 공식 비교</h3></div>
      <p className="tiny muted" style={{ margin: '-4px 0 12px' }}>이 앱의 금리는 <b>계획용 가정값</b>입니다. 실제 최저 금리는 아래 <b>공식 비교공시</b>에서 확인하세요.</p>
      <div className="link-list">
        <a className="olink" href="https://finlife.fss.or.kr/finlife/ldng/houseMrtg/list.do?menuNo=700007" target="_blank" rel="noopener noreferrer"><b>주택담보대출 금리 비교</b><span>금융감독원 "금융상품 한눈에" · 약 140개 금융회사 한눈에</span></a>
        <a className="olink" href="https://finlife.fss.or.kr" target="_blank" rel="noopener noreferrer"><b>전·월세보증금 · 신용대출 비교</b><span>금융감독원 "금융상품 한눈에" 메인</span></a>
        <a className="olink" href="https://nhuf.molit.go.kr" target="_blank" rel="noopener noreferrer"><b>정책대출 (디딤돌·버팀목)</b><span>주택도시기금 · 무주택·소득요건 맞으면 가장 저렴</span></a>
        <a className="olink" href="https://www.hf.go.kr" target="_blank" rel="noopener noreferrer"><b>보금자리론 · 특례보금자리</b><span>한국주택금융공사 · 장기 고정금리</span></a>
      </div>
      <div className="tiny muted" style={{ marginTop: 10 }}>실제 금리·한도는 신용·담보·소득에 따라 달라지고, 최종 조건은 각 금융회사 심사로 확정됩니다.</div></div>
    <div className="card" style={{ marginTop: 16 }}><div className="ch"><span className="n">📈</span><h3>공식 시세 · 공시가격 (신뢰 기준)</h3></div>
      <p className="tiny muted" style={{ margin: '-4px 0 12px' }}>호갱노노·아실·직방은 <b>매물·시세 탐색</b>에 좋고, 아래는 대출·세금의 <b>공식 기준값</b>입니다. 이 앱의 숫자를 실제 값으로 검증하세요.</p>
      <div className="link-list">
        <a className="olink" href="https://kbland.kr" target="_blank" rel="noopener noreferrer"><b>KB부동산 시세</b><span>은행 <b>LTV·대출한도</b>는 보통 KB시세 기준으로 산정 — 실제 한도의 출발점</span></a>
        <a className="olink" href="https://www.realtyprice.kr" target="_blank" rel="noopener noreferrer"><b>부동산 공시가격 알리미</b><span>국토부 · <b>보유세·종부세·전세보증 한도</b>의 기준이 되는 공시가격 조회</span></a>
        <a className="olink" href="https://www.reb.or.kr" target="_blank" rel="noopener noreferrer"><b>한국부동산원</b><span>청약홈·실거래가·공시가격·부동산통계(R-ONE)를 운영하는 <b>공식 기관</b></span></a>
      </div>
      <div className="lead-note" style={{ margin: '14px 0 0' }}>이 앱은 <b>자금·시기 계획 시뮬레이터</b>입니다. 매물·시세는 위 앱·기관에서, 대출 한도는 KB시세와 은행 심사로, 세금은 위택스·홈택스로 확정하세요. 앱의 금리·시세·공시가는 <b>계획용 가정·근사값</b>입니다.</div></div>
  </>;
}
