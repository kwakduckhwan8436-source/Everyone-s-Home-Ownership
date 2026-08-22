import { useStore } from '../../state/store.ts';

export function Shortcut({ onGoto }: { onGoto: (id: string) => void }) {
  const report = useStore(s => s.report);
  if (!report) return null;
  const levers = report.levers.filter(l => l.monthsSaved > 0).slice(0, 5);
  const maxSave = Math.max(1, ...levers.map(l => l.monthsSaved));
  return <>
    <div className="pane-intro">💡 지금 <b>내 상황</b>에서 내집마련을 <b>가장 빨리 앞당기는 방법</b>을 순서대로 모았어요. 카드를 누르면 <b>얼마나 빨라지는지</b> 그래프로 보여줘요.</div>
    <div className="card"><div className="ch"><span className="n">⚡</span><h3>내 상황 맞춤 지름길</h3></div>
      <div className="sc-list">
        {levers.length ? levers.map((l, i) => <button key={l.id} className="sc-item" onClick={() => onGoto(l.id)}>
          <div className="sc-top"><span className="sc-rk">{i + 1}</span><span className="sc-nm">{l.name}</span><span className="sc-sv">{l.monthsSaved}개월 ↑</span></div>
          <div className="bar"><i style={{ width: `${l.monthsSaved / maxSave * 100}%` }} /></div>
          <div className="sc-ds">{l.desc} · <b>효과 보기 →</b></div></button>)
          : <div className="tiny muted">지금은 추가로 당길 만한 지름길이 뚜렷하지 않아요. 목표가·저축을 조정해 보세요.</div>}
      </div></div>
    <div className="card" style={{ marginTop: 16 }}><div className="ch"><span className="n">🏛️</span><h3>제도 지름길 — 자격만 되면 크게 당겨요</h3></div>
      <p className="tiny muted" style={{ margin: '-4px 0 10px' }}>이자를 낮추거나 경쟁을 건너뛰는 <b>공식 제도</b>예요. 자격은 아래에서 확인하세요.</p>
      <div className="link-list">
        <a className="olink" href="https://nhuf.molit.go.kr" target="_blank" rel="noopener noreferrer"><b>디딤돌·신생아 특례대출</b><span>무주택·소득요건 충족 시 <b>최저금리</b> → 이자↓·한도↑로 시점을 크게 앞당김</span></a>
        <a className="olink" href="https://www.applyhome.co.kr" target="_blank" rel="noopener noreferrer"><b>청약 특별공급</b><span>신혼·생애최초·다자녀·노부모 — 일반 경쟁을 <b>건너뛰는</b> 별도 물량</span></a>
        <a className="olink" href="https://www.wetax.go.kr" target="_blank" rel="noopener noreferrer"><b>생애최초·신생아 취득세 감면</b><span>부대비용을 줄여 <b>필요 현금</b>을 낮춤 (위택스에서 확인)</span></a>
      </div></div>
    <div className="card" style={{ marginTop: 16 }}><div className="ch"><span className="n">🐷</span><h3>습관 지름길 — 오늘 바로</h3></div>
      <div className="sgrid">
        <div className="box"><b>월급날 자동이체</b><span>저축을 '쓰고 남기기'가 아니라 <b>먼저 떼기</b>. 급여일 자동이체로 고정.</span></div>
        <div className="box"><b>통장 쪼개기</b><span>생활비·저축·비상금 통장 분리로 새는 돈을 막아요.</span></div>
        <div className="box"><b>부부 각자 청약통장</b><span>가입기간 50% 합산(+최대 3점). 둘 다 유지가 유리.</span></div>
        <div className="box"><b>신용대출 먼저 상환</b><span>DSR 여력이 회복돼 <b>대출한도까지</b> 늘어나는 이중효과.</span></div>
      </div>
      <div className="tiny muted" style={{ marginTop: 8 }}>위 '내 상황 맞춤 지름길'의 숫자는 <b>이 앱 엔진</b>이 계산한 값이고, 제도·습관은 일반 안내예요.</div></div>
  </>;
}
