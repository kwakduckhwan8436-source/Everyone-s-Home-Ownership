import { useStore } from '../../state/store.ts';
import { Tip } from '../Tooltip.tsx';

function Gauge({ label, val, max, big }: { label: string; val: number; max: number; big?: boolean }) {
  return <div className={`gauge${big ? ' big' : ''}`}>
    <div className="lab"><span>{label} {!big && <span className="tiny muted">최대 {max}점</span>}</span><span className="v" style={big ? { fontSize: 20 } : undefined}>{val} / {max}</span></div>
    <div className="track"><div className="fill" style={{ width: `${Math.min(100, val / max * 100)}%` }} /></div>
  </div>;
}

export function Cheongyak() {
  const report = useStore(s => s.report);
  if (!report) return null;
  const sc = report.route.score; // {total, homeless(≤32), dep(≤35), acct(≤17)}
  const cut = sc.total >= 70 ? '수도권 인기 단지도 노려볼 만' : sc.total >= 60 ? '수도권 일반 단지권' : sc.total >= 50 ? '수도권 외곽·지방 유리' : '가점보다 특별공급·추첨을 함께 노리는 편이 현실적';
  return <>
    <div className="card"><div className="ch"><span className="n">🎟️</span><h3>내 예상 청약 가점 (민영 · 가점제 84점 만점)</h3><Tip text="입력값(무주택 시작연도·부양가족·청약통장 가입월)으로 추정한 참고값입니다. 정확한 가점은 세대 구성·거주요건에 따라 달라지니 청약홈 가점계산기로 확인하세요." /></div>
      <div className="gauge big"><div className="lab"><span><b>총점</b></span><span className="v" style={{ fontSize: 20 }}>{sc.total} / 84</span></div>
        <div className="track"><div className="fill" style={{ width: `${Math.min(100, sc.total / 84 * 100)}%` }} /></div>
        <div className="cutline"><span className="c">지금 수준: {cut}</span><span className="c">2026 수도권 인기 커트라인 대략 60~74점</span></div></div>
      <Gauge label="무주택기간" val={sc.homeless} max={32} />
      <Gauge label="부양가족 수" val={sc.dep} max={35} />
      <Gauge label="청약통장 가입기간" val={sc.acct} max={17} />
      <div className="note">무주택기간은 만 30세(또는 혼인신고일)부터 1년당 2점, 부양가족은 본인 포함 기본 5점에서 1명당 5점, 통장은 6개월마다 1점입니다. <b>무주택기간+부양가족(합 67점)</b>이 당락을 좌우해요.</div></div>

    <div className="card" style={{ marginTop: 16 }}><div className="ch"><span className="n">특공</span><h3>특별공급 — 경쟁이 덜한 우선 트랙</h3><Tip text="특별공급은 일반공급과 별도 물량으로, 자격만 맞으면 경쟁이 훨씬 덜합니다. 소득·자산·무주택 요건은 유형별로 다르며 매년 바뀌니 청약홈에서 확인하세요." /></div>
      <p className="tiny muted" style={{ margin: '-4px 0 10px' }}>자격이 되면 <b>일반 가점 경쟁을 건너뛰는</b> 별도 물량입니다. 대표 유형:</p>
      <div className="sgrid">
        <div className="box"><b>💑 신혼부부</b><span>혼인 7년 이내(또는 예비). 소득·자산 요건. 자녀 수 등 우선순위.</span></div>
        <div className="box"><b>🌱 생애최초</b><span>세대 구성원 전원 무주택 + 생애 최초 구입. 소득 요건(맞벌이 완화).</span></div>
        <div className="box"><b>👨‍👩‍👧‍👦 다자녀</b><span>미성년 자녀 2명 이상(기준 완화 추세). 자녀 수 배점.</span></div>
        <div className="box"><b>👵 노부모 부양</b><span>만 65세 이상 직계존속을 3년 이상 부양(무주택).</span></div>
      </div>
      <div className="note">신혼부부·생애최초는 <b>신생아 특례</b>와 함께 자금·금리에서 가장 유리한 조합이 되기도 합니다. 본 계획의 대출 자격과 함께 보세요.</div></div>

    <div className="cols2" style={{ marginTop: 16 }}>
      <div className="card"><div className="ch"><span className="n">통장</span><h3>청약통장 관리 핵심</h3></div>
        <div className="stat-row"><span>월 납입</span><span className="v">10만원 정석</span></div>
        <div className="tiny muted" style={{ margin: '2px 0 8px' }}>인정 납입액은 1회 최대 10만원. 국민주택은 <b>납입 횟수·총액</b>, 민영주택은 <b>예치금 기준</b>이 중요해요.</div>
        <div className="stat-row"><span>배우자 합산</span><span className="v">최대 +3점</span></div>
        <div className="tiny muted" style={{ margin: '2px 0 0' }}>배우자 통장 가입기간의 50%를 합산(2024.7~). 부부가 각자 통장을 유지하면 유리.</div></div>
      <div className="card"><div className="ch"><span className="n">공식</span><h3>청약 공식 확인·신청</h3></div>
        <div className="link-list">
          <a className="olink" href="https://www.applyhome.co.kr" target="_blank" rel="noopener noreferrer"><b>청약홈 (한국부동산원)</b><span>청약 신청·일정·경쟁률·가점계산기 · 자격 조회</span></a>
          <a className="olink" href="https://www.khug.or.kr" target="_blank" rel="noopener noreferrer"><b>주택청약 도우미 (HUG)</b><span>가점제·특별공급 제도 안내</span></a>
          <a className="olink" href="https://nhuf.molit.go.kr" target="_blank" rel="noopener noreferrer"><b>주택도시기금</b><span>디딤돌·버팀목 등 정책대출 자격·금리</span></a>
        </div></div>
    </div>
  </>;
}
